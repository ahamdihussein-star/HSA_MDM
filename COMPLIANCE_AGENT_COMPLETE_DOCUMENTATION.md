# 📋 Compliance Agent - Complete Documentation

**Date**: October 12, 2025  
**Version**: 2.0 (With UN Integration + Embeddings)  
**Status**: ✅ Production Ready

---

## 📁 **File Structure**
 
```
src/app/compliance-agent/
├── compliance-agent.component.ts        # Main component
├── compliance-agent.component.html      # Main template
├── compliance-agent.component.scss      # Main styles
├── compliance-agent.module.ts           # Module definition
├── compliance-chat-widget/
│   ├── compliance-chat-widget.component.ts    # Chat widget (modal)
│   ├── compliance-chat-widget.component.html  # Chat template
│   └── compliance-chat-widget.component.scss  # Chat styles
└── services/
    ├── compliance-chat.service.ts       # Chat logic & state
    └── compliance.service.ts            # HTTP API calls

api/
├── better-sqlite-server.js              # Main backend server
├── ofac-sync.js                         # OFAC search logic
├── ofac-embeddings.js                   # Embeddings search (NEW)
├── parse-ofac-enhanced.js               # OFAC XML parser
├── parse-un-sanctions.js                # UN XML parser
├── extract-ofac-reference-data.js       # OFAC reference tables
└── mdm_database.db                      # SQLite database
```

---

## 🗄️ **Database Structure**

### **1. OFAC Entities Tables**

#### **`ofac_entities`** (917 entities)
```sql
CREATE TABLE ofac_entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT UNIQUE NOT NULL,              -- OFAC-{FixedRef}
  source TEXT NOT NULL DEFAULT 'OFAC',
  source_id TEXT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,                    -- Entity, Individual, Vessel, Aircraft
  sector TEXT,                           -- Food & Agriculture, Construction
  listed_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- `idx_ofac_uid` on `uid`
- `idx_ofac_source` on `source`
- `idx_ofac_name` on `name`
- `idx_ofac_sector` on `sector`

---

#### **`entity_aliases`** (2,083 aliases)
```sql
CREATE TABLE entity_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,              -- FK to ofac_entities.uid
  alias TEXT NOT NULL,
  alias_type TEXT,
  source TEXT NOT NULL DEFAULT 'OFAC',
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid) ON DELETE CASCADE
);
```

---

#### **`entity_addresses`** (1,890 addresses)
```sql
CREATE TABLE entity_addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,              -- FK to ofac_entities.uid
  address TEXT NOT NULL,
  country TEXT,
  city TEXT,
  street TEXT,
  province TEXT,
  postal_code TEXT,
  source TEXT NOT NULL DEFAULT 'OFAC',
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid) ON DELETE CASCADE
);
```

---

#### **`entity_countries`** (917+ records)
```sql
CREATE TABLE entity_countries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,              -- FK to ofac_entities.uid
  country TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'OFAC',
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid) ON DELETE CASCADE
);
```

---

#### **`entity_programs`** (Programs/sanctions)
```sql
CREATE TABLE entity_programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,              -- FK to ofac_entities.uid
  program TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'OFAC',
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid) ON DELETE CASCADE
);
```

---

#### **`entity_id_numbers`** (1,000+ IDs)
```sql
CREATE TABLE entity_id_numbers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,              -- FK to ofac_entities.uid
  id_number TEXT NOT NULL,
  id_type TEXT,
  country TEXT,
  issuing_country TEXT,
  source TEXT NOT NULL DEFAULT 'OFAC',
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid) ON DELETE CASCADE
);
```

---

#### **`sanctions_entry`** (OFAC sanctions info)
```sql
CREATE TABLE sanctions_entry (
  entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,              -- FK to ofac_entities.uid
  profile_id TEXT,
  entry_event_date TEXT,
  entry_event_type_id TEXT,
  legal_basis_id TEXT,
  list_id TEXT,
  entry_event_comment TEXT,
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid) ON DELETE CASCADE
);
```

---

#### **`sanctions_measures`** (Sanctions details)
```sql
CREATE TABLE sanctions_measures (
  measure_id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER NOT NULL,             -- FK to sanctions_entry
  sanctions_type_id TEXT,
  sanctions_type_name TEXT,
  date_period_start TEXT,
  date_period_end TEXT,
  comment TEXT,
  FOREIGN KEY (entry_id) REFERENCES sanctions_entry(entry_id) ON DELETE CASCADE
);
```

---

#### **Reference Tables** (Lookup data)

```sql
-- Legal Basis (e.g., "Executive Order 13224")
CREATE TABLE ofac_legal_basis (
  id TEXT PRIMARY KEY,
  short_ref TEXT,
  full_name TEXT
);

-- Entry Event Types (e.g., "Created", "Modified")
CREATE TABLE ofac_entry_event_types (
  id TEXT PRIMARY KEY,
  name TEXT
);

-- Sanctions Types (e.g., "Asset Freeze")
CREATE TABLE ofac_sanctions_types (
  id TEXT PRIMARY KEY,
  name TEXT
);
```

---

### **2. UN Entities Tables**

#### **`un_entities`** (131 entities)
```sql
CREATE TABLE un_entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dataid TEXT UNIQUE NOT NULL,           -- UN's unique ID
  reference_number TEXT,                 -- e.g., "QDe.153"
  first_name TEXT NOT NULL,              -- Entity name
  un_list_type TEXT,                     -- Al-Qaida, Yemen, Iraq, etc.
  listed_on TEXT,                        -- Date listed
  comments TEXT,                         -- Reason (clear text!)
  name_original_script TEXT,             -- Arabic name
  last_updated TEXT,                     -- Last update dates
  source TEXT NOT NULL DEFAULT 'UN',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- `idx_un_entities_dataid` on `dataid`
- `idx_un_entities_list_type` on `un_list_type`
- `idx_un_entities_name` on `first_name`

---

#### **`un_entity_aliases`** (365 aliases)
```sql
CREATE TABLE un_entity_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_dataid TEXT NOT NULL,           -- FK to un_entities.dataid
  quality TEXT,                          -- "a.k.a.", "f.k.a."
  alias_name TEXT,
  source TEXT NOT NULL DEFAULT 'UN',
  FOREIGN KEY (entity_dataid) REFERENCES un_entities(dataid) ON DELETE CASCADE
);
```

---

#### **`un_entity_addresses`** (225 addresses)
```sql
CREATE TABLE un_entity_addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_dataid TEXT NOT NULL,           -- FK to un_entities.dataid
  street TEXT,
  city TEXT,
  state_province TEXT,
  zip_code TEXT,
  country TEXT,
  note TEXT,
  source TEXT NOT NULL DEFAULT 'UN',
  FOREIGN KEY (entity_dataid) REFERENCES un_entities(dataid) ON DELETE CASCADE
);
```

---

## 🔌 **Backend APIs**

### **Base URL**: `http://localhost:3000/api`

---

### **1. OFAC Search API**

#### **POST `/api/ofac/search`**

Search OFAC sanctions database with AI fuzzy matching.

**Request:**
```json
{
  "companyName": "Hanifa",
  "country": "Syria",      // Optional
  "useAI": true            // Enable embeddings (default: true)
}
```

**Response:**
```json
[
  {
    "id": 123,
    "uid": "OFAC-18553",
    "name": "HANIFA MONEY EXCHANGE OFFICE",
    "type": "Entity",
    "sector": "Financial Services",
    "countries": ["Syria"],
    "aliases": ["Hanifa Exchange", "Hanifah Currency"],
    "matchScore": 98,
    "matchReason": "Exact or near-exact semantic match",
    "source": "OFAC"
  }
]
```

**Code Location**: `api/better-sqlite-server.js:6946`

```javascript
app.post('/api/ofac/search', async (req, res) => {
  try {
    const { companyName, country, useAI = true } = req.body;
    
    if (!companyName) {
      return res.status(400).json({ error: 'Company name required' });
    }
    
    console.log(`🔍 [OFAC SEARCH] Searching: "${companyName}"${country ? ` in ${country}` : ''}`);
    console.log(`🤖 [OFAC SEARCH] AI Fuzzy Matching: ${useAI ? 'Enabled ✅' : 'Disabled ❌'}`);
    
    // Use AI-powered search if enabled
    const results = useAI 
      ? await searchLocalOFACWithAI(db, companyName, country)
      : searchLocalOFAC(db, companyName, country);
    
    console.log(`✓ [OFAC SEARCH] Found ${results.length} results`);
    
    res.json(results);
  } catch (error) {
    console.error(`❌ [OFAC SEARCH] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});
```

**Search Logic** (`api/ofac-sync.js`):
```javascript
async function searchLocalOFACWithAI(db, companyName, country) {
  // Step 1: SQL LIKE search (get candidates)
  const candidates = searchLocalOFAC(db, companyName, country);
  
  // Step 2: Use embeddings for semantic ranking
  const API_KEY = process.env.OPENAI_API_KEY;
  const results = await searchOFACWithEmbeddings(companyName, candidates, API_KEY);
  
  return results;
}
```

**Embeddings Search** (`api/ofac-embeddings.js`):
```javascript
async function searchOFACWithEmbeddings(searchQuery, candidates, apiKey) {
  // 1. Get query embedding
  const queryEmbedding = await getEmbedding(searchQuery, apiKey);
  
  // 2. Get candidate embeddings (batch)
  const candidateTexts = candidates.map(c => `${c.name} ${c.aliases.join(' ')}`);
  const candidateEmbeddings = await getBatchEmbeddings(candidateTexts, apiKey);
  
  // 3. Calculate cosine similarities
  const results = candidates.map((candidate, idx) => {
    const similarity = cosineSimilarity(queryEmbedding, candidateEmbeddings[idx]);
    return {
      ...candidate,
      matchScore: Math.round(similarity * 100),
      matchReason: getMatchReason(similarity)
    };
  });
  
  // 4. Sort and filter
  results.sort((a, b) => b.matchScore - a.matchScore);
  return results.filter(r => r.matchScore >= 50);
}
```

---

### **2. UN Search API**

#### **POST `/api/un/search`**

Search UN sanctions database with AI fuzzy matching.

**Request:**
```json
{
  "companyName": "Hanifa",
  "country": "Syria",
  "useAI": true
}
```

**Response:**
```json
[
  {
    "id": 108,
    "dataid": "6908604.0",
    "name": "HANIFA MONEY EXCHANGE OFFICE",
    "reference_number": "QDe.153",
    "un_list_type": "Al-Qaida",
    "listed_on": "2017-07-20",
    "countries": "Syrian Arab Republic",
    "comments": "Money exchange business facilitating ISIL...",
    "matchScore": 98,
    "matchReason": "Exact or near-exact semantic match",
    "source": "UN"
  }
]
```

**Code Location**: `api/better-sqlite-server.js:7152`

```javascript
app.post('/api/un/search', async (req, res) => {
  try {
    const { companyName, country, useAI = true } = req.body;
    
    if (!companyName) {
      return res.status(400).json({ error: 'Company name required' });
    }
    
    console.log(`🇺🇳 [UN SEARCH] Searching: "${companyName}"${country ? ` in ${country}` : ''}`);
    
    const results = useAI 
      ? await searchUNWithAI(db, companyName, country)
      : searchLocalUN(db, companyName, country);
    
    console.log(`✓ [UN SEARCH] Found ${results.length} results`);
    
    res.json(results);
  } catch (error) {
    console.error(`❌ [UN SEARCH] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});
```

---

### **3. OFAC Entity Details API**

#### **GET `/api/ofac/entity/:id`**

Get full details for a single OFAC entity.

**Request:**
```
GET /api/ofac/entity/OFAC-18553
```

**Response:**
```json
{
  "id": 123,
  "uid": "OFAC-18553",
  "name": "HANIFA MONEY EXCHANGE OFFICE",
  "type": "Entity",
  "sector": "Financial Services",
  "countries": ["Syria"],
  "aliases": ["Hanifa Exchange", "Hanifah Currency"],
  "aliasDetails": [
    {"alias": "Hanifa Exchange", "alias_type": "a.k.a."}
  ],
  "addresses": [
    {
      "address": "Damascus, Syria",
      "city": "Damascus",
      "country": "Syria",
      "street": "Main St"
    }
  ],
  "idNumbers": [
    {
      "id_number": "12345",
      "id_type": "Registration Number",
      "issuing_country": "Syria"
    }
  ],
  "programs": ["SYRIA"],
  "remarks": [],
  "sanctionsInfo": {
    "entryDate": "2017-07-20",
    "entryEventType": "Created",
    "legalBasis": "E.O. 13224",
    "listName": "SDN (Specially Designated Nationals)",
    "measures": [
      {
        "type": "Asset Freeze",
        "typeId": "1",
        "startDate": "2017-07-20",
        "comment": "Syria-related sanctions"
      }
    ]
  }
}
```

**Code Location**: `api/better-sqlite-server.js:6979`

```javascript
app.get('/api/ofac/entity/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Get basic entity info
    const entity = db.prepare(`
      SELECT * FROM ofac_entities 
      WHERE id = ? OR uid = ?
    `).get(id, id);
    
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    // Get countries
    const countries = db.prepare(`
      SELECT country FROM entity_countries 
      WHERE entity_uid = ?
    `).all(entity.uid).map(r => r.country);
    
    // Get aliases
    const aliases = db.prepare(`
      SELECT alias, alias_type FROM entity_aliases 
      WHERE entity_uid = ?
    `).all(entity.uid);
    
    // Get addresses
    const addresses = db.prepare(`
      SELECT * FROM entity_addresses 
      WHERE entity_uid = ?
    `).all(entity.uid);
    
    // Get ID numbers
    const idNumbers = db.prepare(`
      SELECT * FROM entity_id_numbers 
      WHERE entity_uid = ?
    `).all(entity.uid);
    
    // Get programs
    const programs = db.prepare(`
      SELECT program FROM entity_programs 
      WHERE entity_uid = ?
    `).all(entity.uid).map(r => r.program);
    
    // Get sanctions entry info
    const sanctionsEntry = db.prepare(`
      SELECT * FROM sanctions_entry 
      WHERE entity_uid = ?
    `).get(entity.uid);
    
    // Get sanctions measures
    let sanctionsMeasures = [];
    if (sanctionsEntry) {
      sanctionsMeasures = db.prepare(`
        SELECT * FROM sanctions_measures 
        WHERE entry_id = ?
      `).all(sanctionsEntry.entry_id);
    }
    
    // Get reference data for human-readable names
    let legalBasisName = null;
    let entryEventTypeName = null;
    let listName = null;
    
    if (sanctionsEntry) {
      const legalBasis = db.prepare(
        'SELECT full_name, short_ref FROM ofac_legal_basis WHERE id = ?'
      ).get(sanctionsEntry.legal_basis_id);
      legalBasisName = legalBasis ? legalBasis.short_ref : null;
      
      const eventType = db.prepare(
        'SELECT name FROM ofac_entry_event_types WHERE id = ?'
      ).get(sanctionsEntry.entry_event_type_id);
      entryEventTypeName = eventType ? eventType.name : null;
      
      if (sanctionsEntry.list_id === '1550') {
        listName = 'SDN (Specially Designated Nationals)';
      } else {
        listName = `List ${sanctionsEntry.list_id}`;
      }
    }
    
    const fullDetails = {
      ...entity,
      countries,
      aliases: aliases.map(a => a.alias),
      aliasDetails: aliases,
      addresses,
      idNumbers,
      programs,
      sanctionsInfo: sanctionsEntry ? {
        entryDate: sanctionsEntry.entry_event_date,
        entryEventType: entryEventTypeName || sanctionsEntry.entry_event_type_id,
        legalBasis: legalBasisName || sanctionsEntry.legal_basis_id,
        listName: listName,
        comment: sanctionsEntry.entry_event_comment,
        measures: sanctionsMeasures.map(m => ({
          type: m.sanctions_type_name || m.sanctions_type_id,
          typeId: m.sanctions_type_id,
          startDate: m.date_period_start,
          endDate: m.date_period_end,
          comment: m.comment
        }))
      } : null
    };
    
    res.json(fullDetails);
    
  } catch (error) {
    console.error(`❌ [OFAC DETAILS] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});
```

---

### **4. UN Entity Details API**

#### **GET `/api/un/entity/:dataid`**

Get full details for a single UN entity.

**Request:**
```
GET /api/un/entity/6908604.0
```

**Response:**
```json
{
  "id": 108,
  "dataid": "6908604.0",
  "first_name": "HANIFA MONEY EXCHANGE OFFICE",
  "reference_number": "QDe.153",
  "un_list_type": "Al-Qaida",
  "listed_on": "2017-07-20",
  "comments": "Money exchange business in Albu Kamal...",
  "name_original_script": "مكتب حنيفة للصرافة",
  "last_updated": "2022-11-08",
  "source": "UN",
  "aliases": [
    "Hanifah Currency Exchange",
    "Hanifeh Exchange",
    "Hanifa Exchange"
  ],
  "aliasDetails": [
    {
      "quality": "a.k.a.",
      "alias_name": "Hanifah Currency Exchange"
    }
  ],
  "addresses": [
    {
      "city": "Albu Kamal",
      "country": "Syrian Arab Republic",
      "street": null,
      "postal_code": null
    }
  ]
}
```

**Code Location**: `api/better-sqlite-server.js:7180`

```javascript
app.get('/api/un/entity/:dataid', (req, res) => {
  try {
    const { dataid } = req.params;
    
    // Get basic entity info
    const entity = db.prepare(`
      SELECT * FROM un_entities 
      WHERE dataid = ?
    `).get(dataid);
    
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    // Get aliases
    const aliases = db.prepare(`
      SELECT quality, alias_name FROM un_entity_aliases 
      WHERE entity_dataid = ?
    `).all(dataid);
    
    // Get addresses
    const addresses = db.prepare(`
      SELECT * FROM un_entity_addresses 
      WHERE entity_dataid = ?
    `).all(dataid);
    
    const fullDetails = {
      ...entity,
      aliases: aliases.map(a => a.alias_name),
      aliasDetails: aliases,
      addresses,
      source: 'UN'
    };
    
    res.json(fullDetails);
    
  } catch (error) {
    console.error(`❌ [UN DETAILS] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});
```

---

### **5. Compliance Smart Match API**

#### **POST `/api/compliance/smart-match`**

AI-powered comparison between request data and OFAC results.

**Request:**
```json
{
  "requestData": {
    "firstName": "Ahmed",
    "companyName": "Hanifa Exchange",
    "country": "Syria"
  },
  "ofacResults": [
    {
      "name": "HANIFA MONEY EXCHANGE OFFICE",
      "countries": ["Syria"]
    }
  ]
}
```

**Response:**
```json
{
  "matches": [
    {
      "ofacEntity": "HANIFA MONEY EXCHANGE OFFICE",
      "confidence": 95,
      "reasoning": "Strong name similarity and country match"
    }
  ],
  "recommendation": "block",
  "explanation": "High confidence match with sanctioned entity"
}
```

---

### **6. Compliance Block API**

#### **POST `/api/compliance/block-with-sanctions`**

Block a request and associate sanctions information.

**Request:**
```json
{
  "requestId": "12345",
  "sanctions": [
    {
      "name": "HANIFA MONEY EXCHANGE OFFICE",
      "uid": "OFAC-18553",
      "source": "OFAC"
    }
  ],
  "reason": "Matched with OFAC sanctioned entity"
}
```

**Response:**
```json
{
  "success": true,
  "requestId": "12345",
  "status": "Blocked",
  "sanctionsCount": 1
}
```

---

## 🎨 **Frontend Components**

### **1. Main Component** (`compliance-agent.component.ts`)

**Purpose**: Main compliance agent page with tabs and modals.

**Key Methods**:
```typescript
export class ComplianceAgentComponent {
  // Search sanctions
  async searchCompany(name: string, country?: string): Promise<void> {
    const results = await this.complianceService.searchSanctions(name, country);
    this.searchResults = results;
  }
  
  // View sanction details
  viewSanctionDetails(sanction: any): void {
    this.selectedSanction = sanction;
    this.isDetailsModalVisible = true;
  }
  
  // Block request with sanctions
  async blockRequestWithSanctions(requestId: string, sanctions: any[]): Promise<void> {
    await this.complianceService.blockWithSanctions(requestId, sanctions);
  }
}
```

---

### **2. Chat Widget** (`compliance-chat-widget.component.ts`)

**Purpose**: Modal-based chat interface for sanctions search.

**Key Methods**:
```typescript
export class ComplianceChatWidgetComponent {
  // Handle user message
  async sendMessage(message: string): Promise<void> {
    // Add user message
    this.chatService.addMessage({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    // Search sanctions
    const results = await this.chatService.searchOFAC(message);
    
    // Display results
    this.chatService.addMessage({
      role: 'assistant',
      type: 'search_results',
      data: { results }
    });
  }
  
  // View sanction details
  async viewSanctionDetails(sanction: any): Promise<void> {
    const entityId = sanction.source === 'UN' 
      ? sanction.dataid 
      : (sanction.id || sanction.uid);
    const source = sanction.source || 'OFAC';
    
    const fullDetails = await this.chatService.getEntityDetails(entityId, source);
    this.viewDetailsRequested.emit(fullDetails);
  }
}
```

---

### **3. Chat Service** (`compliance-chat.service.ts`)

**Purpose**: Manage chat state and API calls.

**Key Methods**:
```typescript
@Injectable()
export class ComplianceChatService {
  // Search both OFAC and UN
  async searchOFAC(companyName: string, country?: string): Promise<any[]> {
    // Search OFAC and UN in parallel
    const [ofacResults, unResults] = await Promise.all([
      this.http.post(`${this.apiUrl}/ofac/search`, {
        companyName,
        country,
        useAI: true
      }).toPromise(),
      
      this.http.post(`${this.apiUrl}/un/search`, {
        companyName,
        country,
        useAI: true
      }).toPromise()
    ]);
    
    // Mark source
    const ofacMarked = (ofacResults || []).map(r => ({ ...r, source: 'OFAC' }));
    const unMarked = (unResults || []).map(r => ({ ...r, source: 'UN' }));
    
    // Combine and sort by match score
    const combined = [...ofacMarked, ...unMarked]
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    
    return combined;
  }
  
  // Get entity details
  async getEntityDetails(id: string, source: string = 'OFAC'): Promise<any> {
    const endpoint = source === 'UN' 
      ? `${this.apiUrl}/un/entity/${id}`
      : `${this.apiUrl}/ofac/entity/${id}`;
    
    return this.http.get(endpoint).toPromise();
  }
  
  // Fetch golden records
  async fetchGoldenRecords(): Promise<any[]> {
    const records = await this.http.get(`${this.apiUrl}/requests/golden`).toPromise();
    // Filter same as golden-requests component
    return records.filter(r => 
      r.status === 'Golden' && 
      r.isDuplicate === 0 && 
      r.isMaster === 1
    );
  }
}
```

---

### **4. Compliance Service** (`compliance.service.ts`)

**Purpose**: HTTP API calls for compliance operations.

**Key Methods**:
```typescript
@Injectable()
export class ComplianceService {
  // Search sanctions
  searchSanctions(name: string, country?: string): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}/ofac/search`, {
      companyName: name,
      country,
      useAI: true
    });
  }
  
  // Block with sanctions
  blockWithSanctions(requestId: string, sanctions: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/compliance/block-with-sanctions`, {
      requestId,
      sanctions
    });
  }
  
  // Smart match
  smartMatch(requestData: any, ofacResults: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/compliance/smart-match`, {
      requestData,
      ofacResults
    });
  }
}
```

---

## 📊 **Data Flow**

### **Search Flow:**

```
1. User enters search query: "حنيفة"
   ↓
2. Frontend (Chat Widget)
   → complianceService.searchOFAC("حنيفة")
   ↓
3. Backend API
   → POST /api/ofac/search
   → POST /api/un/search
   ↓
4. Search Logic (ofac-sync.js)
   → SQL LIKE: Get candidates
   → Embeddings: Rank by semantic similarity
   ↓
5. Return results
   → [{name: "HANIFA", score: 98, source: "OFAC"}]
   ↓
6. Frontend displays results
   → Result cards with match scores
   → Click to view details
```

### **Details Flow:**

```
1. User clicks on search result
   ↓
2. Frontend (Chat Widget)
   → viewSanctionDetails(result)
   ↓
3. Get full details
   → GET /api/ofac/entity/{id} or /api/un/entity/{id}
   ↓
4. Backend queries database
   → Join entity + aliases + addresses + sanctions
   ↓
5. Return full details
   → All data including sanctions measures
   ↓
6. Frontend displays in modal
   → Formatted with sections and styling
```

---

## 🔐 **Environment Variables**

Required in `.env`:

```bash
# OpenAI API Key (for embeddings)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx

# Database Path
DATABASE_PATH=./api/mdm_database.db

# Server Port
PORT=3000
```

---

## 📈 **Performance Metrics**

| Operation | Time | Cost |
|-----------|------|------|
| **OFAC Search** (with embeddings) | 0.5-1s | $0.0001 |
| **UN Search** (with embeddings) | 0.5-1s | $0.0001 |
| **Combined Search** (both) | 0.8-1.5s | $0.0002 |
| **Get Entity Details** | 10-50ms | Free |
| **SQL LIKE only** (no AI) | 5-10ms | Free |

---

## 🎯 **Key Features**

### ✅ **Implemented:**
1. **Dual Source Search**: OFAC + UN simultaneously
2. **AI Embeddings**: Semantic search with OpenAI
3. **Multilingual**: Arabic ↔ English transliteration
4. **Fuzzy Matching**: Typo tolerance, word order flexibility
5. **Match Scoring**: Confidence scores (0-100%)
6. **Human-Readable**: Clear explanations, not codes
7. **Source Badges**: Visual distinction (🇺🇸 OFAC / 🇺🇳 UN)
8. **Detailed View**: Full sanctions information
9. **Modal Interface**: Chat-based interaction
10. **Reference Data**: Lookup tables for codes

### ⚠️ **Known Issues:**
1. **SQL LIKE Limitation**: Arabic queries may miss English entities
2. **No Pre-computed Embeddings**: Each search calls API
3. **Limited Fallback**: Doesn't search all entities if SQL returns 0

---

## 🚀 **Future Improvements**

1. **Pre-compute Embeddings**: Store in database for faster searches
2. **Elasticsearch Integration**: Better full-text search
3. **Caching**: Redis for frequent queries
4. **Batch Processing**: Process multiple entities at once
5. **Audit Logging**: Track all searches and actions
6. **Export Features**: Generate compliance reports

---

## 📚 **Related Documentation**

- `OFAC_INTEGRATION_COMPLETE_SUMMARY.md` - OFAC implementation
- `UN_INTEGRATION_COMPLETE.md` - UN implementation
- `OPENAI_FUZZY_MATCHING_EXPLAINED.md` - AI search explanation
- `AI_SEARCH_IMPROVEMENT_PROPOSAL.md` - Embeddings approach
- `UN_ARAB_COMPANIES_LIST.md` - Test data

---

**Last Updated**: October 12, 2025  
**Maintained By**: Development Team  
**Status**: ✅ **Production Ready**

