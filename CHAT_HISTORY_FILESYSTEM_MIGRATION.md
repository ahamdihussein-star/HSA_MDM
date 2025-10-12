# 📚 Chat History: Filesystem Migration for Documents

## 🎯 Project Context
**Master Data Management (MDM) System**
- **Frontend**: Angular (TypeScript)
- **Backend**: Node.js + Express + SQLite
- **Main Feature**: Data Entry AI Agent with OpenAI integration

---

## 🚨 Original Problem
**Date**: October 11, 2025

### Issue Description
Documents uploaded via the Data Entry AI Agent were:
1. ❌ Not visible in Reviewer/Compliance components
2. ❌ Preview functionality broken after reject/resubmit flow
3. ❌ Documents being re-encoded to Base64 on every update

### Root Cause
Documents were stored as Base64 in the database, causing:
- Encoding/decoding issues
- Large database size
- Content loss on updates

---

## ✅ Solution Implemented

### 1️⃣ **Migration: Database → Filesystem Storage**

#### Backend Changes (`api/better-sqlite-server.js`)

**A. Multer Configuration for File Uploads**
```javascript
const multer = require('multer');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Storage configuration with date-based folders
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sessionId = req.body.sessionId || 'unknown';
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const uploadPath = path.join(UPLOADS_DIR, today, sessionId);
    
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueId = `${Date.now()}_${nanoid(8)}`;
    cb(null, `doc_${uniqueId}_${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /^(image\/|application\/pdf)/;
    if (allowedTypes.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});
```

**B. New API Endpoints**

1. **Upload Files Directly**
```javascript
app.post('/api/session/upload-files-direct', upload.array('files', 5), (req, res) => {
  const { sessionId } = req.body;
  
  const documentIds = req.files.map(file => {
    const docId = `${Date.now()}_${nanoid(8)}`;
    const relativePath = path.relative(UPLOADS_DIR, file.path);
    
    // Save metadata to session_documents_temp
    db.prepare(`
      INSERT INTO session_documents_temp 
      (session_id, document_id, document_name, document_type, document_size, document_path, document_content)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sessionId, docId, file.originalname, file.mimetype, file.size, relativePath, '');
    
    return docId;
  });
  
  res.json({ success: true, sessionId, documentIds });
});
```

2. **Get Documents for Processing**
```javascript
app.post('/api/session/get-documents-for-processing-files', (req, res) => {
  const { sessionId, documentIds } = req.body;
  
  const documents = db.prepare(`
    SELECT * FROM session_documents_temp 
    WHERE session_id = ? AND document_id IN (${documentIds.map(() => '?').join(',')})
  `).all(sessionId, ...documentIds);
  
  const processedDocs = documents.map(doc => {
    const filePath = path.join(UPLOADS_DIR, doc.document_path);
    const fileBuffer = fs.readFileSync(filePath);
    const base64Content = fileBuffer.toString('base64');
    
    return {
      id: doc.document_id,
      name: doc.document_name,
      type: doc.document_type,
      content: base64Content
    };
  });
  
  res.json({ documents: processedDocs });
});
```

3. **Get Documents for Modal Display**
```javascript
app.get('/api/session/documents/:sessionId/:companyId', (req, res) => {
  const { sessionId, companyId } = req.params;
  
  const documents = db.prepare(`
    SELECT * FROM session_documents_temp 
    WHERE session_id = ? AND company_id = ?
  `).all(sessionId, companyId);
  
  const processedDocs = documents.map(doc => ({
    id: doc.document_id,
    name: doc.document_name,
    type: doc.document_type,
    size: doc.document_size,
    mime: doc.document_type,
    fileUrl: `http://localhost:3000/uploads/${doc.document_path}`,
    document_path: doc.document_path
  }));
  
  res.json(processedDocs);
});
```

**C. Static File Serving**
```javascript
app.use('/uploads', express.static(UPLOADS_DIR));
```

**D. Database Schema Update**
```sql
-- Add document_path column to session_documents_temp
ALTER TABLE session_documents_temp ADD COLUMN document_path TEXT;

-- Add document_path column to documents table
ALTER TABLE documents ADD COLUMN document_path TEXT;
```

**E. Hybrid Support in POST /api/requests**
```javascript
app.post('/api/requests', (req, res) => {
  // ... request creation logic ...
  
  if (body.documents && Array.isArray(body.documents)) {
    body.documents.forEach((doc, index) => {
      insertDoc.run(
        id,
        doc.id || nanoid(8),
        doc.name,
        doc.type,
        doc.description,
        doc.size,
        doc.mime,
        doc.contentBase64 || '',        // Empty for filesystem docs
        doc.document_path || null,       // Filesystem path
        doc.source || 'Data Steward',
        doc.uploadedBy || 'data_entry',
        new Date().toISOString()
      );
    });
  }
});
```

**F. Hybrid Support in GET /api/requests/:id**
```javascript
app.get('/api/requests/:id', (req, res) => {
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
  const documents = db.prepare('SELECT * FROM documents WHERE requestId = ?').all(id);
  
  const processedDocuments = documents.map(d => {
    if (d.document_path) {
      // Filesystem document
      return {
        ...d,
        fileUrl: `http://localhost:3000/uploads/${d.document_path}`,
        contentBase64: ''
      };
    } else {
      // Base64 document (old way)
      return {
        ...d,
        contentBase64: d.contentBase64,
        fileUrl: null
      };
    }
  });
  
  res.json({ ...request, documents: processedDocuments });
});
```

**G. Hybrid Support in PUT /api/requests/:id**
```javascript
app.put('/api/requests/:id', (req, res) => {
  // ... update logic ...
  
  if (data.documents && Array.isArray(data.documents)) {
    const existingDocuments = db.prepare('SELECT * FROM documents WHERE requestId = ?').all(id);
    const existingDocsMap = new Map(existingDocuments.map(d => [d.documentId, d]));
    
    const newDocsMap = new Map();
    data.documents.forEach(doc => {
      // ✅ Accept documents with EITHER contentBase64 OR fileUrl/document_path
      if (doc.name && (doc.contentBase64 || doc.fileUrl || doc.document_path)) {
        const docId = doc.id || doc.documentId;
        if (docId) {
          newDocsMap.set(docId, doc);
        }
      }
    });
    
    // Only update if there are actual changes
    existingDocsMap.forEach((existingDoc, docId) => {
      if (!newDocsMap.has(docId)) {
        // Document removed
        db.prepare('DELETE FROM documents WHERE requestId = ? AND documentId = ?').run(id, docId);
      }
    });
    
    newDocsMap.forEach((newDoc, docId) => {
      if (!existingDocsMap.has(docId)) {
        // New document - insert with filesystem support
        db.prepare(`
          INSERT INTO documents (requestId, documentId, name, type, description, size, mime, contentBase64, document_path, uploadedAt, uploadedBy, source)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id, 
          newDoc.id || nanoid(8),
          newDoc.name, 
          newDoc.type || 'other', 
          newDoc.description || '',
          newDoc.size || 0, 
          newDoc.mime || 'application/octet-stream', 
          newDoc.contentBase64 || '',     // Empty for filesystem docs
          newDoc.document_path || null,    // Filesystem path
          new Date().toISOString(),
          data.updatedBy || 'system',
          newDoc.source || 'Data Steward'
        );
      }
    });
  }
});
```

---

#### Frontend Changes

### **A. Session Staging Service** (`src/app/services/session-staging.service.ts`)

**New Methods:**

1. **Save Documents to Filesystem**
```typescript
saveDocumentsDirect(documents: File[]): Observable<any> {
  const formData = new FormData();
  formData.append('sessionId', this.sessionId);
  
  documents.forEach(file => {
    formData.append('files', file);
  });
  
  return this.http.post(`${this.apiBase}/session/upload-files-direct`, formData);
}
```

2. **Get Documents for Modal**
```typescript
getDocumentsForModal(companyId: string): Observable<any[]> {
  return this.http.get<any[]>(
    `${this.apiBase}/session/documents/${this.sessionId}/${companyId}`
  );
}
```

3. **Get Documents for Submit**
```typescript
async getDocumentsForSubmit(companyId: string): Promise<any[]> {
  const documents = await firstValueFrom(this.getDocumentsForModal(companyId));
  return documents;
}
```

---

### **B. Data Entry Agent Service** (`src/app/services/data-entry-agent.service.ts`)

**New Methods:**

1. **Process Documents from Filesystem**
```typescript
async processDocumentsFromFilesystem(sessionId: string, documentIds: string[]): Promise<ExtractedData> {
  // Get documents from backend (reads from filesystem and converts to base64)
  const documentsResponse = await firstValueFrom(
    this.sessionStaging.getDocumentsForProcessingFiles(documentIds)
  );
  
  // Send to OpenAI for extraction
  return this.extractDataFromDocuments(documentsResponse.documents, false);
}
```

2. **Set Documents for Submit**
```typescript
public setDocumentsForSubmit(documents: any[]): void {
  (this as any).documentsForSubmit = documents;
}
```

3. **Build Request Payload (Updated)**
```typescript
buildRequestPayload(): any {
  const payload: any = {
    // ... other fields ...
  };
  
  // ✅ Use filesystem documents if available (new way)
  const documentsForSubmit = (this as any).documentsForSubmit;
  if (documentsForSubmit && documentsForSubmit.length > 0) {
    payload.documents = documentsForSubmit.map((doc: any) => ({
      id: doc.id,
      name: doc.name,
      type: doc.type,
      description: doc.description || '',
      size: doc.size,
      mime: doc.mime,
      document_path: doc.document_path,  // ✅ Filesystem path
      contentBase64: '',                 // Empty for filesystem docs
      source: 'AI Agent',
      uploadedBy: 'data_entry'
    }));
  }
  // Fallback to old way (base64)
  else if (this.uploadedDocuments && this.uploadedDocuments.length > 0) {
    payload.documents = this.uploadedDocuments.map(doc => ({
      contentBase64: doc.content,
      document_path: null,
      // ... other fields ...
    }));
  }
  
  return payload;
}
```

---

### **C. Data Entry Chat Widget** (`src/app/data-entry-agent/data-entry-chat-widget.component.ts`)

**Key Changes:**

1. **File Upload Flow**
```typescript
async onFileSelected(event: any): Promise<void> {
  const files: File[] = Array.from(event.target.files || []);
  
  // Use database-first approach (filesystem storage)
  await this.processDocumentsWithDatabaseFirst(files);
}

private async processDocumentsWithDatabaseFirst(files: File[]): Promise<void> {
  // Save to filesystem via backend
  const result = await firstValueFrom(
    this.sessionStaging.saveDocumentsDirect(files)
  );
  
  // Process with OpenAI (backend reads from filesystem)
  const extractedData = await this.agentService.processDocumentsFromFilesystem(
    result.sessionId,
    result.documentIds
  );
  
  // Show modal with extracted data
  this.showUnifiedModalFromDatabase(extractedData);
}
```

2. **Load Documents for Modal**
```typescript
async loadCompanyData(companyId: string): Promise<void> {
  const companyData = await firstValueFrom(
    this.sessionStaging.getCompanyData(companyId)
  );
  
  // Get documents with fileUrl from filesystem
  const filesystemDocs = await firstValueFrom(
    this.sessionStaging.getDocumentsForModal(companyId)
  );
  
  this.unifiedModalData.documents = filesystemDocs;
}
```

3. **Submit with Filesystem Documents**
```typescript
async finalizeAndSubmit(): Promise<void> {
  // Get documents for submission (includes document_path)
  const documentsForSubmit = await this.sessionStaging.getDocumentsForSubmit(
    this.currentCompanyId
  );
  
  // Set in service for payload building
  this.agentService.setDocumentsForSubmit(documentsForSubmit);
  
  // Submit request
  await this.agentService.submitCustomerRequest();
}
```

4. **Preview Document (Hybrid Support)**
```typescript
previewDocument(doc: any): void {
  this.currentPreviewDocument = doc;
  
  // Determine preview type from mime or file extension
  if (doc.mime) {
    this.previewDocumentType = doc.mime;
  } else if (doc.name || doc.fileUrl) {
    const fileName = doc.name || doc.fileUrl;
    const ext = fileName.toLowerCase().split('.').pop();
    if (ext === 'pdf') {
      this.previewDocumentType = 'application/pdf';
    } else if (['png', 'jpg', 'jpeg'].includes(ext)) {
      this.previewDocumentType = `image/${ext}`;
    }
  }
  
  // Support both fileUrl and contentBase64
  if (doc.fileUrl) {
    this.previewDocumentUrl = this.sanitizer.bypassSecurityTrustResourceUrl(doc.fileUrl);
  } else if (doc.contentBase64) {
    const dataUrl = doc.contentBase64.startsWith('data:') 
      ? doc.contentBase64 
      : `data:${doc.mime};base64,${doc.contentBase64}`;
    this.previewDocumentUrl = this.sanitizer.bypassSecurityTrustResourceUrl(dataUrl);
  }
  
  this.showDocumentPreview = true;
}
```

---

### **D. New Request Component** (`src/app/new-request/new-request.component.ts`)

**Key Changes:**

1. **Load Documents with fileUrl**
```typescript
private patchFromRecord(rec: TaskRecord): void {
  // ... other patching logic ...
  
  const documents = rec.documents || [];
  if (Array.isArray(documents) && documents.length > 0) {
    documents.forEach((d: any) => {
      const docGroup = this.fb.group({
        id: [d.id || this.uid()],
        name: [d.name || ''],
        type: [d.type || 'Other'],
        description: [d.description || ''],
        size: [d.size || 0],
        mime: [d.mime || ''],
        uploadedAt: [d.uploadedAt || new Date().toISOString()],
        contentBase64: [d.contentBase64 || ''],
        fileUrl: [d.fileUrl || '']  // ✅ Include fileUrl
      });
      this.documentsFA.push(docGroup);
    });
  }
}
```

2. **Preview Document (Hybrid Support)**
```typescript
previewDocument(doc: any): void {
  const previewUrl = this.getPreviewUrl(doc);
  
  if (previewUrl) {
    this.previewDocumentUrl = this.sanitizer.bypassSecurityTrustResourceUrl(previewUrl);
    this.previewDocumentType = doc.mime || this.getMimeFromExtension(doc.name);
    this.showDocumentPreview = true;
  }
}

getPreviewUrl(doc: any): string {
  // ✅ HYBRID: Support filesystem documents (fileUrl)
  if (doc.fileUrl) {
    return doc.fileUrl;
  }
  
  // ✅ HYBRID: Support base64 documents (contentBase64)
  if (doc.contentBase64) {
    if (doc.contentBase64.startsWith('data:')) {
      return doc.contentBase64;
    }
    return `data:${doc.mime || 'application/pdf'};base64,${doc.contentBase64}`;
  }
  
  return '';
}
```

---

### **E. Golden Summary Component** (`src/app/dashboard/golden-summary/golden-summary.component.ts`)

**Key Changes:**

1. **Load Documents from API if Missing Content**
```typescript
private loadFromRouterState(state: any): void {
  // ... load master, contacts, etc. ...
  
  this.documents = state.record?.documents || [];
  
  // ✅ Check if documents have valid content
  const hasValidDocuments = this.documents.some(d => d.fileUrl || d.contentBase64);
  if (this.documents.length > 0 && !hasValidDocuments && this.master.id) {
    // Fetch full documents from API
    this.loadGoldenRecord(this.master.id);
  }
}
```

2. **Preview Support (Hybrid)**
```typescript
canPreview(doc: any): boolean {
  if (!doc) return false;
  
  // Check mime type if available
  if (doc.mime) {
    const mime = doc.mime.toLowerCase();
    if (mime.includes('image') || mime.includes('pdf')) {
      return true;
    }
  }
  
  // ✅ Fallback to file extension if mime is not available
  if (doc.name) {
    const ext = doc.name.toLowerCase().split('.').pop();
    return ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '');
  }
  
  // ✅ Check fileUrl extension
  if (doc.fileUrl) {
    const ext = doc.fileUrl.toLowerCase().split('.').pop()?.split('?')[0];
    return ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '');
  }
  
  return false;
}

getPreviewUrl(doc: any): string {
  if (!doc) return '';
  
  // ✅ HYBRID: Support filesystem documents
  if (doc.fileUrl) {
    return doc.fileUrl;
  }
  
  // ✅ HYBRID: Support base64 documents
  if (doc.contentBase64) {
    if (doc.contentBase64.startsWith('data:')) {
      return doc.contentBase64;
    }
    return `data:${doc.mime || 'application/pdf'};base64,${doc.contentBase64}`;
  }
  
  return '';
}
```

---

### **F. Duplicate Customer Component** (`src/app/duplicate-customer/duplicate-customer.component.ts`)

Similar hybrid support added for:
- `getPreviewUrl()`
- `downloadDocument()`

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     File Upload Flow                         │
└─────────────────────────────────────────────────────────────┘

Frontend (Angular)
  │
  ├─ User selects file
  │
  ├─ DataEntryChatWidgetComponent.onFileSelected()
  │   │
  │   └─> SessionStagingService.saveDocumentsDirect()
  │       │
  │       └─> POST /api/session/upload-files-direct (FormData)
  │
Backend (Node.js + Multer)
  │
  ├─ Multer saves file to: uploads/YYYY-MM-DD/sessionId/doc_*
  │
  ├─ Save metadata to session_documents_temp:
  │   - document_id
  │   - document_name
  │   - document_path (relative path)
  │   - document_content (empty string)
  │
  └─> Return: { sessionId, documentIds }

Frontend continues...
  │
  ├─ DataEntryAgentService.processDocumentsFromFilesystem()
  │   │
  │   └─> POST /api/session/get-documents-for-processing-files
  │
Backend reads files and returns base64 for OpenAI
  │
  └─> OpenAI extracts data
  
Frontend saves to main database on submit
  │
  ├─ Include document_path in payload
  │
  └─> POST /api/requests
      │
      └─> Save to documents table with document_path


┌─────────────────────────────────────────────────────────────┐
│                 Document Retrieval Flow                      │
└─────────────────────────────────────────────────────────────┘

Frontend requests document list
  │
  └─> GET /api/requests/:id
      │
Backend checks document storage type
  │
  ├─ If document_path exists:
  │   └─> Return: { fileUrl: 'http://localhost:3000/uploads/...', contentBase64: '' }
  │
  └─ If contentBase64 exists:
      └─> Return: { contentBase64: '...', fileUrl: null }

Frontend displays/previews
  │
  ├─ If fileUrl: Use directly in <img> or <iframe>
  │
  └─ If contentBase64: Convert to data URL and display
```

---

## 🗂️ Folder Structure

```
master-data-mangment-local/
│
├── api/
│   ├── better-sqlite-server.js       ✅ Modified (Multer + Filesystem)
│   ├── mdm_database.db                ✅ Modified (Added document_path column)
│   └── uploads/                       🆕 NEW
│       └── YYYY-MM-DD/                📅 Date-based folders
│           └── sessionId/             📁 Session-based subfolders
│               └── doc_*_filename.ext 📄 Actual files
│
├── src/
│   ├── app/
│   │   ├── services/
│   │   │   ├── session-staging.service.ts        ✅ Modified (Filesystem methods)
│   │   │   └── data-entry-agent.service.ts       ✅ Modified (Filesystem support)
│   │   │
│   │   ├── data-entry-agent/
│   │   │   └── data-entry-chat-widget.component.ts  ✅ Modified (Upload flow)
│   │   │
│   │   ├── new-request/
│   │   │   └── new-request.component.ts          ✅ Modified (Hybrid preview)
│   │   │
│   │   ├── dashboard/
│   │   │   └── golden-summary/
│   │   │       └── golden-summary.component.ts   ✅ Modified (Hybrid preview)
│   │   │
│   │   └── duplicate-customer/
│   │       └── duplicate-customer.component.ts   ✅ Modified (Hybrid preview)
│   │
│   └── environments/
│       └── environment.ts                        ✅ Has apiBaseUrl
│
└── CHAT_HISTORY_FILESYSTEM_MIGRATION.md         🆕 THIS FILE
```

---

## 🔑 Key Files Modified

### Backend
1. **`api/better-sqlite-server.js`**
   - Added Multer configuration
   - New endpoints: upload-files-direct, get-documents-for-processing-files, /session/documents
   - Modified POST /api/requests to support document_path
   - Modified GET /api/requests/:id for hybrid document retrieval
   - Modified PUT /api/requests/:id to preserve document_path on updates
   - Added static file serving: `app.use('/uploads', express.static(UPLOADS_DIR))`

### Frontend Services
2. **`src/app/services/session-staging.service.ts`**
   - Added `saveDocumentsDirect()` for FormData upload
   - Added `getDocumentsForModal()` to retrieve filesystem docs
   - Added `getDocumentsForSubmit()` for submission

3. **`src/app/services/data-entry-agent.service.ts`**
   - Added `processDocumentsFromFilesystem()`
   - Added `setDocumentsForSubmit()`
   - Modified `buildRequestPayload()` for hybrid support

### Frontend Components
4. **`src/app/data-entry-agent/data-entry-chat-widget.component.ts`**
   - Modified `onFileSelected()` to use filesystem flow
   - Modified `loadCompanyData()` to get filesystem docs
   - Modified `finalizeAndSubmit()` to include document_path
   - Added hybrid preview support

5. **`src/app/new-request/new-request.component.ts`**
   - Modified `patchFromRecord()` to include fileUrl
   - Added hybrid preview in `getPreviewUrl()`
   - Added hybrid download in `downloadDocument()`

6. **`src/app/dashboard/golden-summary/golden-summary.component.ts`**
   - Added API fetch if documents missing content
   - Enhanced `canPreview()` to check file extensions
   - Added hybrid preview in `getPreviewUrl()`

7. **`src/app/duplicate-customer/duplicate-customer.component.ts`**
   - Added hybrid preview and download support

---

## 🗄️ Database Schema Changes

### `session_documents_temp` Table
```sql
ALTER TABLE session_documents_temp ADD COLUMN document_path TEXT;
```

**Columns:**
- `session_id` (TEXT)
- `document_id` (TEXT)
- `company_id` (TEXT)
- `document_name` (TEXT)
- `document_type` (TEXT)
- `document_size` (INTEGER)
- `document_content` (TEXT) - Now empty for filesystem docs
- `document_path` (TEXT) - **NEW**: Relative path in uploads/

### `documents` Table
```sql
ALTER TABLE documents ADD COLUMN document_path TEXT;
```

**Columns:**
- `requestId` (TEXT)
- `documentId` (TEXT)
- `name` (TEXT)
- `type` (TEXT)
- `description` (TEXT)
- `size` (INTEGER)
- `mime` (TEXT)
- `contentBase64` (TEXT) - Empty for filesystem docs
- `document_path` (TEXT) - **NEW**: Relative path in uploads/
- `source` (TEXT)
- `uploadedBy` (TEXT)
- `uploadedAt` (TEXT)

---

## 🧪 Testing Scenarios

### ✅ Scenario 1: New Upload via Agent
1. Data Entry uploads document via AI Agent
2. Document saved to filesystem: `uploads/2025-10-11/sessionId/doc_*.png`
3. Metadata saved to `session_documents_temp` with `document_path`
4. OpenAI processes document (backend reads from filesystem)
5. Data Entry submits → document saved to `documents` table with `document_path`
6. Reviewer opens request → sees document via `fileUrl`
7. Reviewer clicks preview → document displays correctly

### ✅ Scenario 2: Reject & Resubmit
1. Reviewer rejects request
2. Data Entry opens rejected request
3. Documents load with `fileUrl` from filesystem
4. Data Entry resubmits without changes
5. Backend preserves `document_path` (doesn't re-encode to Base64)
6. Reviewer opens again → documents still work with `fileUrl`

### ✅ Scenario 3: Legacy Base64 Documents
1. Open old request (created before filesystem migration)
2. Documents have `contentBase64` but no `document_path`
3. Preview uses Base64 data URL
4. Download converts Base64 to blob
5. Everything works as before

### ✅ Scenario 4: Golden Summary
1. Navigate to Golden Records
2. Click on a golden record
3. If documents missing content → fetch from API
4. Preview works for both filesystem and Base64 docs

---

## 🚨 Important Notes

### 1. **Hybrid System**
The system now supports **BOTH** storage methods:
- **Filesystem**: New documents from Data Entry Agent
- **Database Base64**: Legacy documents and documents from other sources

### 2. **Backward Compatibility**
All existing requests with Base64 documents continue to work without migration.

### 3. **File Path Format**
```
uploads/YYYY-MM-DD/sessionId/doc_TIMESTAMP_NANOID_ORIGINALNAME.ext
```
Example: `uploads/2025-10-11/session_123/doc_1760193923732_tFWPcbT9_Commercial_Registration.png`

### 4. **API Base URL**
Configured in `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api'
};
```

### 5. **Document Lifecycle**

```
Upload → Temp Storage → Processing → Main Storage → Retrieval
   ↓           ↓            ↓             ↓           ↓
Multer  session_docs   OpenAI      documents    Hybrid
         _temp         Extract       table      Preview
```

---

## 🐛 Debugging Tips

### Check if Document is in Filesystem
```bash
cd api/uploads
ls -la 2025-10-11/session_*/
```

### Check Database Records
```bash
cd api
sqlite3 mdm_database.db

-- Check temp documents
SELECT document_id, document_name, document_path FROM session_documents_temp WHERE session_id = 'YOUR_SESSION_ID';

-- Check final documents
SELECT documentId, name, document_path FROM documents WHERE requestId = 'YOUR_REQUEST_ID';
```

### Check Backend Logs
Look for these patterns:
```
[BACKEND] 📥 POST /api/session/upload-files-direct
[BACKEND] ✅ [DIRECT SESSION] Documents uploaded directly
[BACKEND] 📄 [SUBMIT] Document has filesystem path
[BACKEND] 📁 [FILESYSTEM] Document: { fileUrl: 'http://localhost:3000/uploads/...' }
```

### Check Frontend Logs
Look for these patterns:
```
📁 [DIRECT SESSION] Saving documents directly to filesystem...
✅ [DIRECT SESSION] Documents uploaded directly
📁 [SUBMIT] Documents retrieved: 1
📄 [SET DOCS] Document 1: { document_path: '2025-10-11/...' }
🔍 [GOLDEN] canPreview() called with: { fileUrl: 'http://localhost:3000/uploads/...' }
```

---

## 📞 Common Issues & Solutions

### Issue 1: "404 Not Found" for document preview
**Solution:** Check if file exists in filesystem and `document_path` is correct in database.

### Issue 2: Preview shows blank/error
**Solution:** Ensure `mime` type or file extension is recognized. Check `canPreview()` logic.

### Issue 3: Old documents not working after migration
**Solution:** System should handle both. Check `getPreviewUrl()` falls back to Base64.

### Issue 4: Documents disappear after resubmit
**Solution:** Ensure PUT /api/requests/:id preserves `document_path` and doesn't delete unchanged docs.

---

## 🎯 Future Enhancements

1. **File Cleanup**: Implement cleanup for orphaned files in filesystem
2. **File Compression**: Add image compression before saving
3. **Cloud Storage**: Migrate to AWS S3 or Azure Blob Storage
4. **Migration Script**: Create script to migrate old Base64 documents to filesystem
5. **Thumbnail Generation**: Auto-generate thumbnails for images

---

## 📝 How to Use This Documentation

### If Starting a New Chat:
1. Share this file with the AI
2. Say: "Read `CHAT_HISTORY_FILESYSTEM_MIGRATION.md` - we implemented filesystem storage for documents"
3. Continue from where you left off

### If Encountering Issues:
1. Check the "Debugging Tips" section
2. Look at "Common Issues & Solutions"
3. Review relevant code sections

### If Adding New Features:
1. Review "Architecture Overview" to understand the flow
2. Check "Key Files Modified" to see what was changed
3. Ensure hybrid support (filesystem + Base64) is maintained

---

## ✅ Success Criteria

All of these are now working:
- ✅ Data Entry Agent uploads documents to filesystem
- ✅ Documents are stored with date-based folder structure
- ✅ OpenAI can process documents from filesystem
- ✅ Reviewer can view and preview documents
- ✅ Reject & Resubmit preserves filesystem documents
- ✅ Compliance can view documents
- ✅ Golden Summary can preview documents
- ✅ Duplicate Customer can preview documents
- ✅ Legacy Base64 documents still work
- ✅ Hybrid system supports both storage methods

---

**Last Updated:** October 11, 2025
**Session Duration:** Full day collaboration
**Total Changes:** 8 files modified, 1 new folder structure, 2 database columns added

---

## 🙏 Acknowledgments

Successfully migrated from database storage to filesystem storage while maintaining backward compatibility with existing Base64 documents. The system now supports both storage methods seamlessly across all components.

**Status:** ✅ **COMPLETE & WORKING**


