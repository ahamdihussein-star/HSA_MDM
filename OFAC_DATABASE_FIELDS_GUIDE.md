# 📊 OFAC Database Fields - Complete Guide
## دليل شامل لحقول OFAC في قاعدة البيانات

---

## 🗄️ Database Schema Overview

### Tables Structure:
```
ofac_entities (Main table)
  ├─ entity_aliases (Aliases)
  ├─ entity_addresses (Addresses)
  ├─ entity_countries (Countries)
  ├─ entity_programs (Programs)
  ├─ entity_legal_basis (Legal basis)
  ├─ entity_id_numbers (ID numbers)
  └─ entity_remarks (Remarks)
```

---

## ═══════════════════════════════════════════════════════════════
## 1️⃣ Main Entity Table: `ofac_entities`
## ═══════════════════════════════════════════════════════════════

### Schema:
```sql
CREATE TABLE ofac_entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT UNIQUE NOT NULL,           -- 🔥 UID
  source TEXT NOT NULL DEFAULT 'OFAC',
  source_id TEXT,
  name TEXT NOT NULL,                 -- 🔥 Name
  type TEXT NOT NULL,                 -- 🔥 Type
  sector TEXT,                        -- 🔥 Sector (derived)
  listed_date TEXT,                   -- 🔥 Listed Date
  created_at DATETIME,
  updated_at DATETIME
);
```

### Fields Explanation:

#### 1. **uid** - المعرف الفريد
```javascript
/**
 * uid: المعرف الفريد
 * - رقم فريد لكل كيان في OFAC
 * - Format: "OFAC-{FixedRef}"
 * - مثال: "OFAC-12345"
 * - متوفر: ✅ دائماً (100%)
 * - Source: XML FixedRef attribute
 */
```

**How to Get:**
```sql
SELECT uid, name FROM ofac_entities WHERE uid = 'OFAC-12345';
```

**Example Output:**
```
uid          | name
-------------|----------------------------------
OFAC-12345   | AL-HAMATI SWEETS BAKERIES
```

---

#### 2. **name** - اسم الشركة/الكيان
```javascript
/**
 * name: اسم الشركة/الكيان
 * - الاسم الرسمي الكامل
 * - مثال: "ABC FOOD INDUSTRIES LLC"
 * - متوفر: ✅ دائماً (100%)
 * - Source: XML Primary Alias > DocumentedName > NamePartValue
 * - Language: Usually English, sometimes Arabic/Other
 */
```

**How to Get:**
```sql
-- Get entity name
SELECT name FROM ofac_entities WHERE uid = 'OFAC-12345';

-- Search by name
SELECT uid, name FROM ofac_entities WHERE name LIKE '%FOOD%';
```

**Example Output:**
```
name
----------------------------------
AL-HAMATI SWEETS BAKERIES
GLOBAL RELIEF FOUNDATION, INC.
BENEVOLENCE INTERNATIONAL FOUNDATION
```

---

#### 3. **type** - نوع الكيان
```javascript
/**
 * type: نوع الكيان
 * - القيم: "Entity" | "Individual" | "Vessel" | "Aircraft"
 * - نحن نفلتر: Entity فقط
 * - متوفر: ✅ دائماً (100%)
 * - Source: XML PartyTypeID (mapped from PartySubTypeID)
 */
```

**Possible Values:**
- `Entity` - شركة/مؤسسة (✅ we filter only these)
- `Individual` - شخص (❌ excluded)
- `Vessel` - سفينة (❌ excluded)
- `Aircraft` - طائرة (❌ excluded)

**How to Get:**
```sql
-- Count by type
SELECT type, COUNT(*) as count FROM ofac_entities GROUP BY type;

-- Filter by type
SELECT * FROM ofac_entities WHERE type = 'Entity';
```

**Example Output:**
```
type   | count
-------|------
Entity | 917
```

---

#### 4. **sector** - القطاع (مشتق)
```javascript
/**
 * sector: القطاع
 * - القيم: "Food & Agriculture" | "Construction" | NULL
 * - متوفر: ⚠️ مشتق من الاسم والملاحظات (keyword matching)
 * - Source: Derived from name + aliases + remarks
 * - Algorithm: Keyword matching
 */
```

**How to Get:**
```sql
-- Count by sector
SELECT 
  COALESCE(sector, 'Unknown') as sector, 
  COUNT(*) as count 
FROM ofac_entities 
GROUP BY sector;

-- Filter by sector
SELECT name, sector FROM ofac_entities WHERE sector = 'Food & Agriculture';
```

**Current Status:**
```
sector            | count
------------------|------
Unknown           | 917   (needs better detection)
Food & Agriculture| 0     (algorithm needs improvement)
Construction      | 0     (algorithm needs improvement)
```

---

#### 5. **listed_date** - تاريخ الإدراج
```javascript
/**
 * listedDate: تاريخ الإدراج
 * - متى تم إضافة الكيان للقائمة
 * - صيغة: "YYYY-MM-DD"
 * - مثال: "2023-05-15"
 * - متوفر: ⚠️ غالباً (لكن currently NULL في parser)
 * - Source: XML Feature FeatureTypeID=25 > DatePeriod (not implemented yet)
 */
```

**How to Get:**
```sql
SELECT name, listed_date FROM ofac_entities WHERE listed_date IS NOT NULL;
```

**Current Status:**
```
⚠️ Currently all NULL - needs implementation in parser
```

---

## ═══════════════════════════════════════════════════════════════
## 2️⃣ Aliases Table: `entity_aliases`
## ═══════════════════════════════════════════════════════════════

### Schema:
```sql
CREATE TABLE entity_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  alias TEXT NOT NULL,                -- 🔥 Alias name
  alias_type TEXT,                    -- 🔥 Alias type
  source TEXT NOT NULL DEFAULT 'OFAC',
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid)
);
```

### Fields Explanation:

#### **aliases** - الأسماء البديلة
```javascript
/**
 * aliases: الأسماء البديلة
 * - أسماء تجارية، أسماء سابقة، اختصارات
 * - Types: "A.K.A." | "F.K.A." | "N.K.A." | "Name"
 * - مثال: ["ABC Foods", "المجموعة العربية"]
 * - متوفر: ✅ غالباً (70% have aliases)
 * - Source: XML Alias > DocumentedName
 */
```

**Alias Types:**
- `A.K.A.` - Also Known As (معروف أيضاً باسم)
- `F.K.A.` - Formerly Known As (كان يُعرف باسم)
- `N.K.A.` - Now Known As (يُعرف الآن باسم)
- `Name` - Official name variant

**How to Get:**
```sql
-- Get all aliases for an entity
SELECT alias, alias_type 
FROM entity_aliases 
WHERE entity_uid = 'OFAC-12345';

-- Get entities with specific alias
SELECT e.name, a.alias, a.alias_type
FROM ofac_entities e
JOIN entity_aliases a ON e.uid = a.entity_uid
WHERE a.alias LIKE '%FOOD%';

-- Count aliases per entity
SELECT 
  e.name, 
  COUNT(a.id) as alias_count
FROM ofac_entities e
LEFT JOIN entity_aliases a ON e.uid = a.entity_uid
GROUP BY e.uid
ORDER BY alias_count DESC
LIMIT 10;
```

**Statistics:**
```sql
SELECT 
  'Total Entities' as metric, 
  COUNT(*) as count 
FROM ofac_entities
UNION ALL
SELECT 
  'Entities with Aliases', 
  COUNT(DISTINCT entity_uid) 
FROM entity_aliases;
```

**Output:**
```
metric                  | count
------------------------|------
Total Entities          | 917
Entities with Aliases   | 647   (70%)
Total Aliases           | 2083  (avg 2.3 per entity)
```

---

## ═══════════════════════════════════════════════════════════════
## 3️⃣ Addresses Table: `entity_addresses`
## ═══════════════════════════════════════════════════════════════

### Schema:
```sql
CREATE TABLE entity_addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  address TEXT NOT NULL,              -- 🔥 Full address
  country TEXT,                       -- 🔥 Country
  city TEXT,                          -- 🔥 City
  street TEXT,                        -- 🔥 Street
  province TEXT,                      -- 🔥 Province
  postal_code TEXT,                   -- 🔥 Postal code
  source TEXT NOT NULL DEFAULT 'OFAC',
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid)
);
```

### Fields Explanation:

#### **addresses** - العناوين الكاملة
```javascript
/**
 * addresses: العناوين الكاملة
 * - كل شركة قد يكون لها عناوين متعددة
 * - يحتوي: شارع، مبنى، مدينة، رمز بريدي
 * - متوفر: ✅ غالباً (100% have at least location/country)
 * - Source: XML Feature FeatureTypeID=25 > VersionLocation > LocationID
 */
```

**How to Get:**
```sql
-- Get all addresses for an entity
SELECT 
  address, 
  street, 
  city, 
  province, 
  postal_code, 
  country
FROM entity_addresses 
WHERE entity_uid = 'OFAC-12345';

-- Get entities by city
SELECT DISTINCT e.name, a.city, a.country
FROM ofac_entities e
JOIN entity_addresses a ON e.uid = a.entity_uid
WHERE a.city = 'Dubai';

-- Count addresses per country
SELECT 
  country, 
  COUNT(*) as address_count
FROM entity_addresses
GROUP BY country
ORDER BY address_count DESC
LIMIT 10;
```

**Current Data Quality:**
```sql
SELECT 
  'With Full Address' as metric,
  COUNT(DISTINCT entity_uid) as count
FROM entity_addresses WHERE address IS NOT NULL
UNION ALL
SELECT 
  'With Street',
  COUNT(DISTINCT entity_uid)
FROM entity_addresses WHERE street IS NOT NULL
UNION ALL
SELECT 
  'With City',
  COUNT(DISTINCT entity_uid)
FROM entity_addresses WHERE city IS NOT NULL
UNION ALL
SELECT 
  'With Country',
  COUNT(DISTINCT entity_uid)
FROM entity_addresses WHERE country IS NOT NULL;
```

---

## ═══════════════════════════════════════════════════════════════
## 4️⃣ Countries Table: `entity_countries`
## ═══════════════════════════════════════════════════════════════

### Schema:
```sql
CREATE TABLE entity_countries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  country TEXT NOT NULL,              -- 🔥 Country name
  source TEXT NOT NULL DEFAULT 'OFAC',
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid)
);
```

### Fields Explanation:

#### **countries** - قائمة الدول
```javascript
/**
 * countries: قائمة الدول
 * - مستخرجة من العناوين
 * - مثال: ["Egypt", "United Arab Emirates"]
 * - متوفر: ✅ دائماً (100% - from addresses)
 * - الاستخدام: للفلترة (نحن فلترنا الدول العربية فقط)
 * - Source: XML Location > LocationCountry > CountryID
 */
```

**Arab Countries (23):**
```javascript
const ARAB_COUNTRIES = [
  // Gulf
  'Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 
  'Bahrain', 'Oman', 'Yemen',
  
  // Levant
  'Jordan', 'Lebanon', 'Syria', 'Iraq', 'Palestine',
  
  // North Africa
  'Egypt', 'Libya', 'Sudan', 'South Sudan', 'Tunisia', 
  'Morocco', 'Algeria', 'Mauritania',
  
  // Africa (Arab)
  'Comoros', 'Djibouti', 'Somalia'
];
```

**How to Get:**
```sql
-- Get countries for an entity
SELECT country 
FROM entity_countries 
WHERE entity_uid = 'OFAC-12345';

-- Count entities per country
SELECT 
  country, 
  COUNT(DISTINCT entity_uid) as entity_count
FROM entity_countries
GROUP BY country
ORDER BY entity_count DESC;

-- Get entities in specific country
SELECT e.name, c.country
FROM ofac_entities e
JOIN entity_countries c ON e.uid = c.entity_uid
WHERE c.country = 'United Arab Emirates';

-- Get entities in multiple countries
SELECT 
  e.name,
  GROUP_CONCAT(DISTINCT c.country) as countries
FROM ofac_entities e
JOIN entity_countries c ON e.uid = c.entity_uid
GROUP BY e.uid
HAVING COUNT(DISTINCT c.country) > 1;
```

**Current Distribution:**
```
country                  | entity_count
-------------------------|-------------
United Arab Emirates     | 478
Lebanon                  | 173
Syria                    | 111
Yemen                    | 50
Iraq                     | 46
Iran                     | 32
Sudan                    | 21
Oman                     | 17
```

---

## ═══════════════════════════════════════════════════════════════
## 5️⃣ Programs Table: `entity_programs`
## ═══════════════════════════════════════════════════════════════

### Schema:
```sql
CREATE TABLE entity_programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  program TEXT NOT NULL,              -- 🔥 Program name
  source TEXT NOT NULL DEFAULT 'OFAC',
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid)
);
```

### Fields Explanation:

#### **programs** - برامج العقوبات
```javascript
/**
 * programs: برامج العقوبات
 * - القوائم التي تنتمي لها الشركة
 * - أمثلة: "SDN", "SDGT", "IRAN", "SYRIA"
 * - متوفر: ⚠️ Currently not extracted (needs implementation)
 * - ملاحظة: شركة واحدة قد تكون في عدة برامج
 * - Source: XML Feature FeatureTypeID=224 (Gender - not programs!)
 */
```

**Common Programs:**
- `SDN` - Specially Designated Nationals
- `SDGT` - Specially Designated Global Terrorist
- `IRAN` - Iran Sanctions
- `SYRIA` - Syria Sanctions
- `DPRK` - North Korea Sanctions

**How to Get:**
```sql
-- Get programs for an entity
SELECT program 
FROM entity_programs 
WHERE entity_uid = 'OFAC-12345';

-- Count entities per program
SELECT 
  program, 
  COUNT(DISTINCT entity_uid) as entity_count
FROM entity_programs
GROUP BY program;
```

**Current Status:**
```
⚠️ Currently empty - parser incorrectly uses FeatureTypeID=224 (Gender)
✅ TODO: Find correct feature type for programs in XML
```

---

## ═══════════════════════════════════════════════════════════════
## 6️⃣ Legal Basis Table: `entity_legal_basis`
## ═══════════════════════════════════════════════════════════════

### Schema:
```sql
CREATE TABLE entity_legal_basis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  legal_basis TEXT NOT NULL,          -- 🔥 Legal basis
  reason TEXT,                        -- 🔥 Reason
  source TEXT NOT NULL DEFAULT 'OFAC',
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid)
);
```

### Fields Explanation:

#### **legalBasis** - الأساس القانوني
```javascript
/**
 * legalBasis: الأساس القانوني
 * - الأمر التنفيذي أو القانون
 * - أمثلة:
 *   - "Executive Order 13224" (مكافحة الإرهاب)
 *   - "Executive Order 13382" (أسلحة دمار شامل)
 *   - "Foreign Narcotics Kingpin Act" (مخدرات)
 * - متوفر: ⚠️ أحياناً (not extracted yet)
 * - Source: XML (needs investigation)
 */
```

**How to Get:**
```sql
SELECT legal_basis, reason 
FROM entity_legal_basis 
WHERE entity_uid = 'OFAC-12345';
```

**Current Status:**
```
⚠️ Currently empty - needs implementation
```

---

## ═══════════════════════════════════════════════════════════════
## 7️⃣ ID Numbers Table: `entity_id_numbers`
## ═══════════════════════════════════════════════════════════════

### Schema:
```sql
CREATE TABLE entity_id_numbers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  id_type TEXT NOT NULL,              -- 🔥 ID type
  id_number TEXT NOT NULL,            -- 🔥 ID number
  issuing_authority TEXT,
  issuing_country TEXT,
  issued_date TEXT,
  source TEXT NOT NULL DEFAULT 'OFAC',
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid)
);
```

### Fields Explanation:

#### **idNumbers** - أرقام التسجيل الرسمية
```javascript
/**
 * idNumbers: أرقام التسجيل الرسمية
 * - أنواع متعددة:
 *   • Business Registration Number
 *   • Tax ID Number
 *   • Trade License Number
 *   • VAT Number
 *   • Chamber of Commerce Number
 *   • Legal Entity Number
 * - متوفر: ⚠️ أحياناً (not extracted yet)
 * - Source: XML IDRegDocuments
 */
```

**How to Get:**
```sql
SELECT id_type, id_number, issuing_country
FROM entity_id_numbers 
WHERE entity_uid = 'OFAC-12345';
```

**Current Status:**
```
⚠️ Currently empty - needs implementation
✅ TODO: Parse IDRegDocuments section
```

---

## ═══════════════════════════════════════════════════════════════
## 8️⃣ Remarks Table: `entity_remarks`
## ═══════════════════════════════════════════════════════════════

### Schema:
```sql
CREATE TABLE entity_remarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  remark TEXT NOT NULL,               -- 🔥 Remark text
  source TEXT NOT NULL DEFAULT 'OFAC',
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid)
);
```

### Fields Explanation:

#### **remarks** - ملاحظات وتفاصيل
```javascript
/**
 * remarks: ملاحظات وتفاصيل
 * - معلومات نصية إضافية
 * - قد يحتوي على:
 *   • وصف النشاط
 *   • معلومات الملكية
 *   • علاقات مع أشخاص/شركات أخرى
 *   • تواريخ مهمة
 * - متوفر: ⚠️ Currently empty (Comment tags exist but not parsed)
 * - مهم جداً: يستخدم في فلترة القطاع
 * - Source: XML DistinctParty > Comment
 */
```

**How to Get:**
```sql
SELECT remark 
FROM entity_remarks 
WHERE entity_uid = 'OFAC-12345';

-- Search in remarks
SELECT e.name, r.remark
FROM ofac_entities e
JOIN entity_remarks r ON e.uid = r.entity_uid
WHERE r.remark LIKE '%terrorism%';
```

**Current Status:**
```
⚠️ Currently empty - Comment tags in XML but not extracted
✅ TODO: Extract Comment elements from DistinctParty
```

---

## ═══════════════════════════════════════════════════════════════
## 📊 Complete Data Availability Summary
## ═══════════════════════════════════════════════════════════════

### ✅ متوفر دائماً (100%):
- ✅ `uid` - Unique identifier
- ✅ `name` - Entity name
- ✅ `type` - Entity type (all filtered to "Entity")
- ✅ `countries` - Countries list (from addresses)
- ✅ `addresses` - At least location/country

### ✅ متوفر غالباً (50-90%):
- ✅ `aliases` - 70% of entities have aliases
- ✅ `addresses` - Full addresses with details

### ⚠️ متوفر جزئياً أو يحتاج تحسين:
- ⚠️ `sector` - Currently all "Unknown" (needs better keyword detection)
- ⚠️ `street`, `city` - Partial (from location data)
- ⚠️ `postal_code`, `province` - Partial

### ❌ غير متوفر حالياً (needs implementation):
- ❌ `programs` - Not extracted (wrong feature type)
- ❌ `legalBasis` - Not extracted
- ❌ `sanctionsReasons` - Not extracted
- ❌ `listedDate` - Not extracted
- ❌ `idNumbers` - Not extracted (IDRegDocuments not parsed)
- ❌ `remarks` - Not extracted (Comment tags not parsed)

### ❌ غير متوفر في OFAC XML:
- ❌ Website
- ❌ Phone Numbers
- ❌ Email Addresses
- ❌ Legal Form (LLC, Corp) - may be in name only

---

## ═══════════════════════════════════════════════════════════════
## 🔍 Common Queries Reference
## ═══════════════════════════════════════════════════════════════

### 1. Get Complete Entity Info
```sql
-- Main info
SELECT * FROM ofac_entities WHERE uid = 'OFAC-12345';

-- With aliases
SELECT 
  e.name,
  GROUP_CONCAT(DISTINCT a.alias) as aliases
FROM ofac_entities e
LEFT JOIN entity_aliases a ON e.uid = a.entity_uid
WHERE e.uid = 'OFAC-12345';

-- With countries
SELECT 
  e.name,
  GROUP_CONCAT(DISTINCT c.country) as countries
FROM ofac_entities e
LEFT JOIN entity_countries c ON e.uid = c.entity_uid
WHERE e.uid = 'OFAC-12345';

-- Complete (all tables)
SELECT 
  e.*,
  GROUP_CONCAT(DISTINCT a.alias) as aliases,
  GROUP_CONCAT(DISTINCT c.country) as countries,
  GROUP_CONCAT(DISTINCT ad.address) as addresses
FROM ofac_entities e
LEFT JOIN entity_aliases a ON e.uid = a.entity_uid
LEFT JOIN entity_countries c ON e.uid = c.entity_uid
LEFT JOIN entity_addresses ad ON e.uid = ad.entity_uid
WHERE e.uid = 'OFAC-12345'
GROUP BY e.uid;
```

### 2. Search by Name (Fuzzy)
```sql
-- Simple search
SELECT uid, name 
FROM ofac_entities 
WHERE name LIKE '%FOOD%';

-- Search in name and aliases
SELECT DISTINCT e.uid, e.name
FROM ofac_entities e
LEFT JOIN entity_aliases a ON e.uid = a.entity_uid
WHERE e.name LIKE '%FOOD%' 
   OR a.alias LIKE '%FOOD%';
```

### 3. Filter by Country
```sql
-- Single country
SELECT e.name, c.country
FROM ofac_entities e
JOIN entity_countries c ON e.uid = c.entity_uid
WHERE c.country = 'United Arab Emirates';

-- Multiple countries
SELECT e.name, GROUP_CONCAT(c.country) as countries
FROM ofac_entities e
JOIN entity_countries c ON e.uid = c.entity_uid
WHERE c.country IN ('Egypt', 'United Arab Emirates', 'Saudi Arabia')
GROUP BY e.uid;
```

### 4. Statistics
```sql
-- Total counts
SELECT 
  'Total Entities' as metric, COUNT(*) as count FROM ofac_entities
UNION ALL
SELECT 'With Aliases', COUNT(DISTINCT entity_uid) FROM entity_aliases
UNION ALL
SELECT 'Total Aliases', COUNT(*) FROM entity_aliases
UNION ALL
SELECT 'Total Countries', COUNT(*) FROM entity_countries
UNION ALL
SELECT 'Unique Countries', COUNT(DISTINCT country) FROM entity_countries;

-- By country
SELECT country, COUNT(DISTINCT entity_uid) as count
FROM entity_countries
GROUP BY country
ORDER BY count DESC;
```

---

## ✅ تم!

هذا الـ documentation يشرح:
1. ✅ كل الـ tables والـ fields
2. ✅ ما متوفر وما مش متوفر
3. ✅ أمثلة SQL queries لكل حقل
4. ✅ Current status of data
5. ✅ TODO items for improvements

**الآن لما تسألني عن أي معلومة من OFAC، هعرف أجيبها من فين! 🎯**

