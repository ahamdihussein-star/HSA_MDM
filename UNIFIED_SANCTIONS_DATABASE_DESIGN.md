# 🌍 Unified Sanctions Database Design
## Support for OFAC + EU + UK + UN

---

## ═══════════════════════════════════════════════════════════════
## 🎯 Overview
## ═══════════════════════════════════════════════════════════════

### الهدف:
قاعدة بيانات موحدة تدعم **4 مصادر عقوبات دولية**:
- 🇺🇸 **OFAC** (US Treasury)
- 🇪🇺 **EU** (European Union Financial Sanctions)
- 🇬🇧 **UK** (UK Office of Financial Sanctions Implementation)
- 🇺🇳 **UN** (United Nations Security Council)

### المميزات الرئيسية:
✅ **Source Tracking**: كل بيانة تعرف منين جاية  
✅ **Multi-Source Entities**: شركة واحدة ممكن تكون في أكثر من قائمة  
✅ **Data Quality**: نعرف أي مصدر عنده معلومات أفضل  
✅ **Historical Tracking**: نعرف امتى الشركة اتضافت/اتشالت من كل قائمة  
✅ **Flexible Queries**: نقدر نبحث حسب مصدر واحد أو كل المصادر  

---

## ═══════════════════════════════════════════════════════════════
## 📊 Database Schema
## ═══════════════════════════════════════════════════════════════

### 1️⃣ Main Entity Table: `ofac_entities`

```sql
CREATE TABLE ofac_entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Unified ID (unique across all sources)
  uid TEXT UNIQUE NOT NULL,
  -- Examples:
  --   OFAC-12345
  --   EU-67890
  --   UK-ABC123
  --   UN-QDe.001
  
  -- 🔥 Source Identifier
  source TEXT NOT NULL DEFAULT 'OFAC',
  -- Values: 'OFAC', 'EU', 'UK', 'UN'
  
  -- Original ID in source system
  source_id TEXT,
  -- Examples:
  --   OFAC: "12345" (FixedRef from XML)
  --   EU: "eu-fsf-entity-67890"
  --   UK: "UK-ABC123" (UniqueID)
  --   UN: "QDe.001" (UN Reference Number)
  
  -- Entity Info
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- Entity, Individual, Organization, Vessel, Aircraft
  sector TEXT,         -- Food & Agriculture, Construction, NULL
  listed_date TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Prevent duplicates per source
  UNIQUE(source, source_id)
);
```

### 🔍 UID Generation Strategy:
```javascript
// OFAC
uid = `OFAC-${fixedRef}`  // OFAC-12345

// EU
uid = `EU-${extractedId}`  // EU-entity-67890

// UK
uid = `UK-${uniqueID}`     // UK-ABC123

// UN
uid = `UN-${referenceNumber}`  // UN-QDe.001
```

---

### 2️⃣ Entity Sources Table: `entity_sources`

```sql
CREATE TABLE entity_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  
  -- 🔥 Source
  source TEXT NOT NULL,  -- OFAC, EU, UK, UN
  
  -- Tracking
  first_seen_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active INTEGER DEFAULT 1,  -- 1=active, 0=removed
  
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid) ON DELETE CASCADE,
  UNIQUE(entity_uid, source)
);
```

#### 💡 Use Cases:
```sql
-- 1. شركات موجودة في أكثر من قائمة
SELECT 
  e.name,
  COUNT(DISTINCT s.source) as source_count,
  GROUP_CONCAT(s.source) as sources
FROM ofac_entities e
JOIN entity_sources s ON e.uid = s.entity_uid
WHERE s.is_active = 1
GROUP BY e.uid
HAVING source_count > 1;

-- 2. شركات OFAC فقط
SELECT e.*
FROM ofac_entities e
JOIN entity_sources s ON e.uid = s.entity_uid
WHERE s.source = 'OFAC' AND s.is_active = 1;

-- 3. شركات في OFAC و EU
SELECT e.name
FROM ofac_entities e
WHERE e.uid IN (
  SELECT entity_uid FROM entity_sources WHERE source = 'OFAC' AND is_active = 1
)
AND e.uid IN (
  SELECT entity_uid FROM entity_sources WHERE source = 'EU' AND is_active = 1
);
```

---

### 3️⃣ Related Tables (All with Source Tracking)

#### `entity_countries`
```sql
CREATE TABLE entity_countries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  country TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'OFAC',  -- 🔥 Track source
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid) ON DELETE CASCADE
);
```

**Example:**
| entity_uid | country | source |
|------------|---------|--------|
| OFAC-123 | Egypt | OFAC |
| OFAC-123 | Egypt | EU |
| OFAC-123 | UAE | UK |

**Query: Countries from all sources**
```sql
SELECT DISTINCT country, GROUP_CONCAT(DISTINCT source) as sources
FROM entity_countries
WHERE entity_uid = 'OFAC-123'
GROUP BY country;
```

#### `entity_programs`
```sql
CREATE TABLE entity_programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  program TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'OFAC',  -- 🔥 Track source
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid) ON DELETE CASCADE
);
```

**Example:**
| entity_uid | program | source |
|------------|---------|--------|
| OFAC-123 | SDN | OFAC |
| OFAC-123 | EU-RUSSIA | EU |
| OFAC-123 | Russia | UK |

#### `entity_aliases`
```sql
CREATE TABLE entity_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  alias TEXT NOT NULL,
  alias_type TEXT,
  source TEXT NOT NULL DEFAULT 'OFAC',  -- 🔥 Track source
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid) ON DELETE CASCADE
);
```

**Example:**
| entity_uid | alias | alias_type | source |
|------------|-------|------------|--------|
| OFAC-123 | ABC Corp | A.K.A. | OFAC |
| OFAC-123 | ABC Trading | Name | EU |
| OFAC-123 | شركة ABC | A.K.A. | UN |

#### `entity_addresses`
```sql
CREATE TABLE entity_addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  address TEXT NOT NULL,
  country TEXT,
  city TEXT,
  street TEXT,
  province TEXT,
  postal_code TEXT,
  source TEXT NOT NULL DEFAULT 'OFAC',  -- 🔥 Track source
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid) ON DELETE CASCADE
);
```

#### `entity_id_numbers`
```sql
CREATE TABLE entity_id_numbers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  id_type TEXT NOT NULL,
  id_number TEXT NOT NULL,
  issuing_authority TEXT,
  issuing_country TEXT,
  issued_date TEXT,
  source TEXT NOT NULL DEFAULT 'OFAC',  -- 🔥 Track source
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid) ON DELETE CASCADE
);
```

#### `entity_remarks`
```sql
CREATE TABLE entity_remarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  remark TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'OFAC',  -- 🔥 Track source
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid) ON DELETE CASCADE
);
```

#### `entity_legal_basis`
```sql
CREATE TABLE entity_legal_basis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  legal_basis TEXT NOT NULL,
  reason TEXT,
  source TEXT NOT NULL DEFAULT 'OFAC',  -- 🔥 Track source
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid) ON DELETE CASCADE
);
```

---

### 4️⃣ Sync Metadata: `ofac_sync_metadata`

```sql
CREATE TABLE ofac_sync_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL DEFAULT 'OFAC',  -- 🔥 Per-source metadata
  last_sync_date DATETIME,
  total_entities INTEGER DEFAULT 0,
  filtered_entities INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Example:**
| id | source | last_sync_date | total_entities | filtered_entities | sync_status |
|----|--------|----------------|----------------|-------------------|-------------|
| 1 | OFAC | 2025-10-12 10:00 | 15000 | 234 | success |
| 2 | EU | 2025-10-12 11:00 | 8000 | 156 | success |
| 3 | UK | 2025-10-12 12:00 | 6000 | 89 | success |
| 4 | UN | 2025-10-12 13:00 | 2000 | 45 | success |

---

## ═══════════════════════════════════════════════════════════════
## 🔥 Benefits of Source Tracking
## ═══════════════════════════════════════════════════════════════

### ✅ 1. Data Quality Comparison
```sql
-- Which source has the most aliases for this entity?
SELECT source, COUNT(*) as alias_count
FROM entity_aliases
WHERE entity_uid = 'OFAC-123'
GROUP BY source;

-- Which source has the most complete address info?
SELECT source, COUNT(*) as address_count
FROM entity_addresses
WHERE entity_uid = 'OFAC-123'
  AND street IS NOT NULL
  AND city IS NOT NULL
GROUP BY source;
```

### ✅ 2. Multi-Source Verification
```sql
-- Entities in both OFAC and EU
SELECT e.name, e.uid
FROM ofac_entities e
WHERE EXISTS (
  SELECT 1 FROM entity_sources s1 
  WHERE s1.entity_uid = e.uid AND s1.source = 'OFAC' AND s1.is_active = 1
)
AND EXISTS (
  SELECT 1 FROM entity_sources s2 
  WHERE s2.entity_uid = e.uid AND s2.source = 'EU' AND s2.is_active = 1
);
```

### ✅ 3. Risk Scoring
```javascript
// Higher risk if entity is in multiple lists
const getRiskScore = (uid) => {
  const sources = db.prepare(`
    SELECT COUNT(DISTINCT source) as count
    FROM entity_sources
    WHERE entity_uid = ? AND is_active = 1
  `).get(uid);
  
  // 1 source = Medium Risk
  // 2 sources = High Risk
  // 3+ sources = Critical Risk
  return sources.count >= 3 ? 'CRITICAL' :
         sources.count >= 2 ? 'HIGH' :
         'MEDIUM';
};
```

### ✅ 4. Historical Tracking
```sql
-- When was entity added to each list?
SELECT source, first_seen_date, is_active
FROM entity_sources
WHERE entity_uid = 'OFAC-123'
ORDER BY first_seen_date;
```

### ✅ 5. Source-Specific Queries
```sql
-- Get all OFAC entities with Food & Agriculture sector
SELECT e.*
FROM ofac_entities e
JOIN entity_sources s ON e.uid = s.entity_uid
WHERE s.source = 'OFAC'
  AND s.is_active = 1
  AND e.sector = 'Food & Agriculture';

-- Get entities ONLY in OFAC (not in other lists)
SELECT e.*
FROM ofac_entities e
WHERE e.uid IN (
  SELECT entity_uid
  FROM entity_sources
  WHERE source = 'OFAC' AND is_active = 1
)
AND e.uid NOT IN (
  SELECT entity_uid
  FROM entity_sources
  WHERE source IN ('EU', 'UK', 'UN') AND is_active = 1
);
```

---

## ═══════════════════════════════════════════════════════════════
## 📊 Usage Examples
## ═══════════════════════════════════════════════════════════════

### Example 1: Insert OFAC Entity
```javascript
const insertOFACEntity = (entity) => {
  const uid = `OFAC-${entity.fixedRef}`;
  
  // 1. Insert main entity
  db.prepare(`
    INSERT INTO ofac_entities (uid, source, source_id, name, type, sector, listed_date)
    VALUES (?, 'OFAC', ?, ?, ?, ?, ?)
  `).run(uid, entity.fixedRef, entity.name, entity.type, entity.sector, entity.listedDate);
  
  // 2. Track source
  db.prepare(`
    INSERT INTO entity_sources (entity_uid, source)
    VALUES (?, 'OFAC')
  `).run(uid);
  
  // 3. Insert aliases
  entity.aliases.forEach(alias => {
    db.prepare(`
      INSERT INTO entity_aliases (entity_uid, alias, alias_type, source)
      VALUES (?, ?, ?, 'OFAC')
    `).run(uid, alias.name, alias.type);
  });
  
  // 4. Insert countries
  entity.countries.forEach(country => {
    db.prepare(`
      INSERT INTO entity_countries (entity_uid, country, source)
      VALUES (?, ?, 'OFAC')
    `).run(uid, country);
  });
};
```

### Example 2: Search Across All Sources
```javascript
const searchAllSources = (companyName) => {
  return db.prepare(`
    SELECT DISTINCT
      e.uid,
      e.name,
      e.source,
      e.type,
      e.sector,
      GROUP_CONCAT(DISTINCT s.source) as all_sources
    FROM ofac_entities e
    LEFT JOIN entity_sources s ON e.uid = s.entity_uid AND s.is_active = 1
    LEFT JOIN entity_aliases a ON e.uid = a.entity_uid
    WHERE (e.name LIKE ? OR a.alias LIKE ?)
    GROUP BY e.uid
  `).all(`%${companyName}%`, `%${companyName}%`);
};
```

### Example 3: Get Full Entity Info (All Sources)
```javascript
const getFullEntityInfo = (uid) => {
  const entity = db.prepare('SELECT * FROM ofac_entities WHERE uid = ?').get(uid);
  
  const sources = db.prepare(`
    SELECT source, first_seen_date, is_active
    FROM entity_sources
    WHERE entity_uid = ?
  `).all(uid);
  
  const aliases = db.prepare(`
    SELECT alias, alias_type, source
    FROM entity_aliases
    WHERE entity_uid = ?
  `).all(uid);
  
  const countries = db.prepare(`
    SELECT DISTINCT country, GROUP_CONCAT(source) as sources
    FROM entity_countries
    WHERE entity_uid = ?
    GROUP BY country
  `).all(uid);
  
  const programs = db.prepare(`
    SELECT program, source
    FROM entity_programs
    WHERE entity_uid = ?
  `).all(uid);
  
  return {
    ...entity,
    sources,
    aliases,
    countries,
    programs
  };
};
```

---

## ═══════════════════════════════════════════════════════════════
## 🎯 Migration from Old Schema
## ═══════════════════════════════════════════════════════════════

### Old vs New:

**Old Schema:**
```sql
-- No source tracking
CREATE TABLE ofac_entities (
  uid TEXT UNIQUE,
  name TEXT,
  type TEXT
);
```

**New Schema:**
```sql
-- With source tracking
CREATE TABLE ofac_entities (
  uid TEXT UNIQUE,
  source TEXT NOT NULL DEFAULT 'OFAC',
  source_id TEXT,
  name TEXT,
  type TEXT,
  UNIQUE(source, source_id)
);
```

### Migration Steps:
1. ✅ **Schema updated** (done)
2. ⏳ **Add default source to existing data** (if any)
3. ⏳ **Add EU/UK/UN parsers**

### Migrating Existing Data:
```sql
-- Update existing entities to have source = 'OFAC'
UPDATE ofac_entities SET source = 'OFAC' WHERE source IS NULL;

-- Create entity_sources entries for existing entities
INSERT INTO entity_sources (entity_uid, source)
SELECT uid, 'OFAC' FROM ofac_entities
WHERE uid NOT IN (SELECT entity_uid FROM entity_sources WHERE source = 'OFAC');
```

---

## ═══════════════════════════════════════════════════════════════
## 📈 Future Enhancements
## ═══════════════════════════════════════════════════════════════

### 1. Entity Matching Across Sources
```sql
-- Potential duplicate detection
CREATE TABLE entity_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid_1 TEXT NOT NULL,
  entity_uid_2 TEXT NOT NULL,
  match_confidence REAL,  -- 0.0 to 1.0
  match_type TEXT,        -- name_exact, name_fuzzy, alias_match, id_match
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Data Quality Scores
```sql
-- Track data completeness per source
CREATE TABLE entity_quality_scores (
  entity_uid TEXT PRIMARY KEY,
  completeness_score REAL,  -- 0.0 to 1.0
  has_aliases INTEGER,
  has_addresses INTEGER,
  has_id_numbers INTEGER,
  has_programs INTEGER,
  data_quality TEXT,  -- Excellent, Good, Fair, Poor
  calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Change History
```sql
-- Track when entity was added/removed from lists
CREATE TABLE entity_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  source TEXT NOT NULL,
  action TEXT NOT NULL,  -- added, removed, modified
  change_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);
```

---

## ✅ Summary

### What We Have Now:
- ✅ Unified database supporting 4 sources
- ✅ Source tracking in all tables
- ✅ Multi-source entity support
- ✅ Historical tracking via `entity_sources`
- ✅ Flexible queries per source or all sources

### Next Steps:
1. **Parse OFAC XML** → Insert with `source = 'OFAC'`
2. **Add EU Parser** → Insert with `source = 'EU'`
3. **Add UK Parser** → Insert with `source = 'UK'`
4. **Add UN Parser** → Insert with `source = 'UN'`

### Query Examples Ready:
```sql
-- All sources
SELECT * FROM ofac_entities;

-- OFAC only
SELECT * FROM ofac_entities WHERE source = 'OFAC';

-- Multi-source entities
SELECT e.name, COUNT(DISTINCT s.source) as source_count
FROM ofac_entities e
JOIN entity_sources s ON e.uid = s.entity_uid
GROUP BY e.uid
HAVING source_count > 1;
```

**🎉 Database is now ready for multi-source sanctions data!**

