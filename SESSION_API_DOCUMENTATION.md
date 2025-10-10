# 📚 Session Management API Documentation

## 🗄️ **Database Schema**

### **1️⃣ `session_staging` Table**
جدول البيانات الأساسية للشركة في الـ Session

```sql
CREATE TABLE IF NOT EXISTS session_staging (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  
  -- Company Basic Info
  first_name TEXT,
  first_name_ar TEXT,
  tax_number TEXT,
  customer_type TEXT,
  company_owner TEXT,
  
  -- Address Info
  building_number TEXT,
  street TEXT,
  country TEXT,
  city TEXT,
  
  -- Document Content for parsing
  document_content TEXT,
  
  -- Sales Info
  sales_org TEXT,
  distribution_channel TEXT,
  division TEXT,
  
  -- Additional Info
  registration_number TEXT,
  legal_form TEXT,
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(session_id, company_id)
);
```

**ملاحظة:** `UNIQUE(session_id, company_id)` يضمن عدم تكرار الشركة في نفس الـ Session

---

### **2️⃣ `session_documents` Table**
جدول المستندات المرفقة

```sql
CREATE TABLE IF NOT EXISTS session_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  document_name TEXT NOT NULL,
  document_content TEXT NOT NULL,  -- Base64 encoded
  document_type TEXT NOT NULL,     -- MIME type (e.g., image/png)
  document_size INTEGER NOT NULL,  -- File size in bytes
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(session_id, company_id, document_name)
);
```

**ملاحظات:**
- `document_content`: يحتوي على الملف بصيغة Base64 (بدون الـ `data:` prefix)
- `UNIQUE(session_id, company_id, document_name)`: يمنع تكرار نفس الملف

---

### **3️⃣ `session_contacts` Table**
جدول جهات الاتصال

```sql
CREATE TABLE IF NOT EXISTS session_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  contact_position TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 **API Endpoints**

### **1️⃣ POST `/api/session/save-company`**

**الوصف:** حفظ بيانات الشركة والمستندات في الـ Session

**Request Body:**
```json
{
  "sessionId": "session_1760119266083_2upiyx818",
  "companyId": "americana_foods",
  "companyName": "Americana Foods",
  "firstName": "Americana Foods",
  "firstNameAr": "",
  "taxNumber": "3787409068",
  "customerType": "joint_stock",
  "companyOwner": "Dina Taha",
  "buildingNumber": "1075",
  "street": "Al-Qasr Street",
  "country": "Egypt",
  "city": "Luxor",
  "documentContent": "",
  "salesOrg": "",
  "distributionChannel": "",
  "division": "",
  "registrationNumber": "EG-6492342",
  "legalForm": "",
  "documents": [
    {
      "name": "Commercial_Registration.png",
      "content": "iVBORw0KGgoAAAANSUhEUgAA...",  // Base64 بدون prefix
      "type": "image/png",
      "size": 145236
    }
  ],
  "contacts": [
    {
      "name": "Ahmed Ali",
      "email": "ahmed@example.com",
      "phone": "+20123456789",
      "position": "Manager"
    }
  ]
}
```

**Backend Code:**
```javascript
app.post('/api/session/save-company', (req, res) => {
  const { 
    sessionId, companyId, companyName,
    firstName, firstNameAr, taxNumber, customerType, companyOwner,
    buildingNumber, street, country, city, documentContent,
    salesOrg, distributionChannel, division,
    registrationNumber, legalForm,
    documents, contacts
  } = req.body;
  
  try {
    // 1️⃣ حفظ بيانات الشركة في session_staging
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO session_staging 
      (session_id, company_id, company_name, first_name, first_name_ar, 
       tax_number, customer_type, company_owner, building_number, street, 
       country, city, document_content, sales_org, distribution_channel, division, 
       registration_number, legal_form, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(sessionId, companyId, companyName, firstName, firstNameAr, 
        taxNumber, customerType, companyOwner, buildingNumber, street, 
        country, city, documentContent, salesOrg, distributionChannel, division,
        registrationNumber, legalForm);
    
    // 2️⃣ حفظ المستندات في session_documents
    if (documents && documents.length > 0) {
      // ✅ CRITICAL FIX: مسح المستندات القديمة أولاً
      const deleteStmt = db.prepare(`
        DELETE FROM session_documents 
        WHERE session_id = ? AND company_id = ?
      `);
      deleteStmt.run(sessionId, companyId);
      
      // حفظ المستندات الجديدة
      const docStmt = db.prepare(`
        INSERT INTO session_documents 
        (session_id, company_id, document_name, document_content, document_type, document_size)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      for (const doc of documents) {
        if (!doc.content || doc.content.trim() === '') {
          console.warn(`⚠️ Skipping document with empty content: ${doc.name}`);
          continue;
        }
        docStmt.run(sessionId, companyId, doc.name, doc.content, doc.type, doc.size);
      }
    }
    
    // 3️⃣ حفظ جهات الاتصال في session_contacts
    if (contacts && contacts.length > 0) {
      const deleteStmt = db.prepare(`DELETE FROM session_contacts WHERE session_id = ? AND company_id = ?`);
      deleteStmt.run(sessionId, companyId);
      
      const contactStmt = db.prepare(`
        INSERT INTO session_contacts 
        (session_id, company_id, contact_name, contact_email, contact_phone, contact_position)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      for (const contact of contacts) {
        contactStmt.run(sessionId, companyId, contact.name, contact.email, contact.phone, contact.position);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error saving company data:', error);
    res.status(500).json({ error: error.message });
  }
});
```

**Response:**
```json
{
  "success": true
}
```

**Console Logs (عند النجاح):**
```
🏛️ [SESSION] Saving company data: {sessionId, companyId, companyName, documentsCount: 1}
📄 [SESSION] Saving documents: 1
📄 [SESSION] Document names: ["Commercial_Registration.png"]
🗑️ [SESSION] Cleared 1 existing documents
📄 [SESSION] Saving document "Commercial_Registration.png" (145236 bytes, content starts with: iVBORw0KGgoAAAAN...)
✅ [SESSION] Document saved: Commercial_Registration.png
✅ [SESSION] Total documents saved: 1/1
✅ [SESSION] Contacts saved: 1
✅ [SESSION] All data saved successfully
```

---

### **2️⃣ GET `/api/session/company/:sessionId/:companyId`**

**الوصف:** استرجاع بيانات الشركة والمستندات من الـ Session

**URL Parameters:**
- `sessionId`: Session ID (e.g., `session_1760119266083_2upiyx818`)
- `companyId`: Company ID (e.g., `americana_foods`)

**Example Request:**
```
GET /api/session/company/session_1760119266083_2upiyx818/americana_foods
```

**Backend Code:**
```javascript
app.get('/api/session/company/:sessionId/:companyId', (req, res) => {
  try {
    // 1️⃣ Get company data from session_staging
    const company = db.prepare(`
      SELECT * FROM session_staging 
      WHERE session_id = ? AND company_id = ?
    `).get(req.params.sessionId, req.params.companyId);
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    // 2️⃣ Get documents from session_documents
    const documents = db.prepare(`
      SELECT document_name, document_content, document_type, document_size, created_at
      FROM session_documents 
      WHERE session_id = ? AND company_id = ?
    `).all(req.params.sessionId, req.params.companyId);
    
    // 3️⃣ Get contacts from session_contacts
    const contacts = db.prepare(`
      SELECT contact_name, contact_email, contact_phone, contact_position
      FROM session_contacts 
      WHERE session_id = ? AND company_id = ?
    `).all(req.params.sessionId, req.params.companyId);
    
    // 4️⃣ Combine all data
    const response = {
      ...company,
      documents,
      contacts
    };
    
    res.json(response);
  } catch (error) {
    console.error('❌ Error getting company data:', error);
    res.status(500).json({ error: error.message });
  }
});
```

**Response:**
```json
{
  "id": 1,
  "session_id": "session_1760119266083_2upiyx818",
  "company_id": "americana_foods",
  "company_name": "Americana Foods",
  "first_name": "Americana Foods",
  "first_name_ar": "",
  "tax_number": "3787409068",
  "customer_type": "joint_stock",
  "company_owner": "Dina Taha",
  "building_number": "1075",
  "street": "Al-Qasr Street",
  "country": "Egypt",
  "city": "Luxor",
  "document_content": "",
  "sales_org": "",
  "distribution_channel": "",
  "division": "",
  "registration_number": "EG-6492342",
  "legal_form": "",
  "created_at": "2025-01-10 12:34:56",
  "updated_at": "2025-01-10 12:34:56",
  "documents": [
    {
      "document_name": "Commercial_Registration.png",
      "document_content": "iVBORw0KGgoAAAANSUhEUgAA...",
      "document_type": "image/png",
      "document_size": 145236,
      "created_at": "2025-01-10 12:34:56"
    }
  ],
  "contacts": [
    {
      "contact_name": "Ahmed Ali",
      "contact_email": "ahmed@example.com",
      "contact_phone": "+20123456789",
      "contact_position": "Manager"
    }
  ]
}
```

**Console Logs (عند النجاح):**
```
📋 [GET SESSION] Request params: {sessionId: "session_xxx", companyId: "americana_foods"}
✅ [GET SESSION] Company data found: Americana Foods
📄 [GET SESSION] Documents found: 1
📄 [GET SESSION] Document 1: Commercial_Registration.png (193648 chars, starts with: iVBORw0KGgoAAAAN...)
👥 [GET SESSION] Contacts found: 1
✅ [GET SESSION] Sending response with 1 documents and 1 contacts
```

---

### **3️⃣ DELETE `/api/session/:sessionId`**

**الوصف:** مسح جميع بيانات الـ Session

**URL Parameters:**
- `sessionId`: Session ID to delete

**Example Request:**
```
DELETE /api/session/session_1760119266083_2upiyx818
```

**Backend Code:**
```javascript
app.delete('/api/session/:sessionId', (req, res) => {
  try {
    db.prepare(`DELETE FROM session_staging WHERE session_id = ?`).run(req.params.sessionId);
    db.prepare(`DELETE FROM session_documents WHERE session_id = ?`).run(req.params.sessionId);
    db.prepare(`DELETE FROM session_contacts WHERE session_id = ?`).run(req.params.sessionId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing session:', error);
    res.status(500).json({ error: error.message });
  }
});
```

**Response:**
```json
{
  "success": true
}
```

---

## 🔄 **Data Flow**

### **عند Upload مستند جديد:**

```
1️⃣ User uploads file
    ↓
2️⃣ Frontend converts to Base64
    ↓
3️⃣ Frontend sends to OpenAI for extraction
    ↓
4️⃣ OpenAI returns extracted data (8 fields only)
    ↓
5️⃣ Frontend maps data to system format
    ↓
6️⃣ Frontend calls POST /api/session/save-company
    ↓
7️⃣ Backend deletes old documents (if any)
    ↓
8️⃣ Backend saves new document in session_documents
    ↓
9️⃣ Backend saves company data in session_staging
    ↓
🔟 Backend saves contacts in session_contacts
```

### **عند فتح الـ Modal:**

```
1️⃣ User opens modal
    ↓
2️⃣ Frontend calls GET /api/session/company/:sessionId/:companyId
    ↓
3️⃣ Backend retrieves data from session_staging
    ↓
4️⃣ Backend retrieves documents from session_documents
    ↓
5️⃣ Backend retrieves contacts from session_contacts
    ↓
6️⃣ Backend combines all data and returns
    ↓
7️⃣ Frontend displays in modal
    ↓
8️⃣ Frontend converts Base64 back to File for preview
```

---

## 🔍 **Key Points**

### **1️⃣ Document Storage:**
- **Format:** Base64 (بدون `data:` prefix)
- **Location:** `session_documents.document_content`
- **Storage Logic:** **يمسح المستندات القديمة قبل حفظ الجديدة**

### **2️⃣ Session Management:**
- **Session ID:** يتم توليده مرة واحدة عند بدء الجلسة
- **Company ID:** يتم توليده من اسم الشركة (e.g., `americana_foods`)
- **Uniqueness:** `UNIQUE(session_id, company_id)` في كل الجداول

### **3️⃣ Critical Fix:**
```javascript
// ✅ BEFORE SAVING: مسح المستندات القديمة
const deleteStmt = db.prepare(`
  DELETE FROM session_documents 
  WHERE session_id = ? AND company_id = ?
`);
deleteStmt.run(sessionId, companyId);

// ✅ THEN: حفظ المستندات الجديدة
docStmt.run(sessionId, companyId, doc.name, doc.content, doc.type, doc.size);
```

هذا يضمن أن المستند المعروض هو **دائماً المستند الأخير المرفوع**.

---

## 📊 **Example Data Flow**

### **Scenario: User uploads Commercial_Registration.png**

**1️⃣ Frontend → Backend (POST):**
```json
{
  "sessionId": "session_xxx",
  "companyId": "americana_foods",
  "documents": [
    {
      "name": "Commercial_Registration.png",
      "content": "iVBORw0KGgoAAAA...", // 193648 chars
      "type": "image/png",
      "size": 145236
    }
  ]
}
```

**2️⃣ Backend → Database:**
```sql
-- مسح المستندات القديمة
DELETE FROM session_documents WHERE session_id = 'session_xxx' AND company_id = 'americana_foods';

-- حفظ المستند الجديد
INSERT INTO session_documents 
(session_id, company_id, document_name, document_content, document_type, document_size)
VALUES ('session_xxx', 'americana_foods', 'Commercial_Registration.png', 'iVBORw0KGgoAAAA...', 'image/png', 145236);
```

**3️⃣ Backend → Frontend (GET):**
```json
{
  "documents": [
    {
      "document_name": "Commercial_Registration.png",
      "document_content": "iVBORw0KGgoAAAA...", // نفس الـ Base64 الأصلي
      "document_type": "image/png",
      "document_size": 145236
    }
  ]
}
```

**4️⃣ Frontend Display:**
```typescript
// تحويل Base64 إلى Data URL للعرض
const dataUrl = `data:${doc.document_type};base64,${doc.document_content}`;

// عرض في Modal
<img [src]="dataUrl" />
```

---

## ✅ **الخلاصة**

- **Backend يحفظ الملف كما هو** (Base64 بدون `data:` prefix)
- **يمسح المستندات القديمة قبل حفظ الجديدة** (Fix الأساسي)
- **GET endpoint يرجع نفس الـ Base64 الأصلي**
- **Frontend يحول Base64 إلى Data URL للعرض**

هذا يضمن أن **المستند المعروض = المستند المرفوع** دائماً! ✅

