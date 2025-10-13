# 📊 OFAC XML Analysis & Implementation Plan

## ═══════════════════════════════════════════════════════════════
## 🔍 الجزء 1: فهم هيكل XML الموجود
## ═══════════════════════════════════════════════════════════════

### 1.1 الهيكل العام
```xml
<Sanctions>
  <DateOfIssue>2025-10-09</DateOfIssue>
  
  <ReferenceValueSets>
    <!-- معلومات مرجعية -->
    <PartyTypeValues>
      <PartyType ID="1">Individual</PartyType>
      <PartyType ID="2">Entity</PartyType>       ← 🎯 الشركات
      <PartyType ID="3">Location</PartyType>
      <PartyType ID="4">Transport</PartyType>
      <PartyType ID="5">Other Entity</PartyType> ← 🎯 شركات أخرى
    </PartyTypeValues>
    
    <AreaCodeValues>
      <!-- قائمة الدول -->
      <AreaCode ID="11082" CountryID="11082" Description="Egypt">EG</AreaCode>
      <AreaCode ID="11179" CountryID="11179" Description="Saudi Arabia">SA</AreaCode>
      <AreaCode ID="11210" CountryID="11210" Description="United Arab Emirates">AE</AreaCode>
      <AreaCode ID="11218" CountryID="11218" Description="Yemen">YE</AreaCode>
      <AreaCode ID="11110" CountryID="11110" Description="Iraq">IQ</AreaCode>
      <AreaCode ID="11197" CountryID="11197" Description="Syria">SY</AreaCode>
      <AreaCode ID="11126" CountryID="11126" Description="Lebanon">LB</AreaCode>
      <AreaCode ID="11116" CountryID="11116" Description="Jordan">JO</AreaCode>
      <AreaCode ID="11169" CountryID="11169" Description="Qatar">QA</AreaCode>
      <AreaCode ID="11122" CountryID="11122" Description="Kuwait">KW</AreaCode>
      <AreaCode ID="11041" CountryID="11041" Description="Bahrain">BH</AreaCode>
      <AreaCode ID="11159" CountryID="11159" Description="Oman">OM</AreaCode>
      <AreaCode ID="11129" CountryID="11129" Description="Libya">LY</AreaCode>
      <AreaCode ID="11192" CountryID="11192" Description="Sudan">SD</AreaCode>
      <AreaCode ID="11204" CountryID="11204" Description="Tunisia">TN</AreaCode>
      <AreaCode ID="11148" CountryID="11148" Description="Morocco">MA</AreaCode>
      <AreaCode ID="11031" CountryID="11031" Description="Algeria">DZ</AreaCode>
      <AreaCode ID="11141" CountryID="11141" Description="Mauritania">MR</AreaCode>
      <AreaCode ID="11067" CountryID="11067" Description="Comoros">KM</AreaCode>
      <AreaCode ID="11077" CountryID="11077" Description="Djibouti">DJ</AreaCode>
      <AreaCode ID="11188" CountryID="11188" Description="Somalia">SO</AreaCode>
    </AreaCodeValues>
    
    <SanctionsProgramValues>
      <!-- برامج العقوبات -->
      <SanctionsProgram ID="1">SDGT</SanctionsProgram>
      <SanctionsProgram ID="2">SDN</SanctionsProgram>
      <!-- ... -->
    </SanctionsProgramValues>
  </ReferenceValueSets>
  
  <Locations>
    <!-- معلومات العناوين -->
    <Location ID="1">
      <LocationCountry CountryID="11082" />
      <LocationPart LocPartTypeID="1454">
        <LocationPartValue><Value>Cairo</Value></LocationPartValue>
      </LocationPart>
    </Location>
  </Locations>
  
  <IDRegDocuments>
    <!-- أرقام التسجيل والهويات -->
    <IDRegDocument ID="123" IDRegDocTypeID="1596" IssuedBy-CountryID="11082">
      <IDRegistrationNo>123456789</IDRegistrationNo>
    </IDRegDocument>
  </IDRegDocuments>
  
  <DistinctParties>
    <!-- الكيانات (أشخاص + شركات) -->
    <DistinctParty FixedRef="12345">
      <Profile ID="12345" PartySubTypeID="3">
        <!-- PartySubTypeID=3 → Entity -->
        
        <Identity ID="1001" Primary="true">
          <Alias AliasTypeID="1403" Primary="true">
            <DocumentedName>
              <DocumentedNamePart>
                <NamePartValue>Company Name Inc</NamePartValue>
              </DocumentedNamePart>
            </DocumentedName>
          </Alias>
          
          <Alias AliasTypeID="1400">
            <!-- أسماء بديلة -->
          </Alias>
        </Identity>
        
        <Feature FeatureTypeID="10">
          <!-- LocationFeature → Address -->
          <FeatureVersion>
            <VersionLocation LocationID="123" />
          </FeatureVersion>
        </Feature>
        
        <Feature FeatureTypeID="224">
          <!-- SanctionsProgram -->
          <FeatureVersion>
            <VersionDetail DetailReferenceID="1" />
          </FeatureVersion>
        </Feature>
      </Profile>
    </DistinctParty>
  </DistinctParties>
</Sanctions>
```

### 1.2 Feature Types المهمة
```
FeatureTypeID:
- 8  → Date of Birth (للأشخاص)
- 9  → Place of Birth
- 10 → Address (مكان)
- 224 → Sanctions Program
- 504 → Additional Sanctions
- 25  → Listed On (تاريخ الإدراج)
```

### 1.3 LocPartTypeID (أجزاء العنوان)
```
LocPartTypeID:
- 1451 → Street Address
- 1452 → District/Neighborhood
- 1454 → City
- 1455 → State/Province
- 1456 → Postal Code
```

### 1.4 AliasTypeID (أنواع الأسماء)
```
AliasTypeID:
- 1400 → A.K.A. (Also Known As)
- 1401 → F.K.A. (Formerly Known As)
- 1402 → N.K.A. (Now Known As)
- 1403 → Name (الاسم الرسمي)
```

## ═══════════════════════════════════════════════════════════════
## 🗄️ الجزء 2: الـ Database Tables الموجودة
## ═══════════════════════════════════════════════════════════════

### ✅ الجداول الموجودة حالياً:

#### 2.1 `ofac_entities` - الجدول الرئيسي
```sql
CREATE TABLE ofac_entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT UNIQUE NOT NULL,              -- FixedRef من XML
  name TEXT NOT NULL,                    -- الاسم الرئيسي
  type TEXT NOT NULL,                    -- Entity/Individual/Vessel/Aircraft
  sector TEXT,                           -- Food & Agriculture / Construction
  listed_date TEXT,                      -- تاريخ الإدراج
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2.2 `entity_countries` - الدول
```sql
CREATE TABLE entity_countries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  country TEXT NOT NULL,
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid)
);
```

#### 2.3 `entity_programs` - برامج العقوبات
```sql
CREATE TABLE entity_programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  program TEXT NOT NULL,                 -- SDN, SDGT, etc.
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid)
);
```

#### 2.4 `entity_legal_basis` - الأساس القانوني
```sql
CREATE TABLE entity_legal_basis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  legal_basis TEXT NOT NULL,             -- Executive Order 13224, etc.
  reason TEXT,
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid)
);
```

#### 2.5 `entity_aliases` - الأسماء البديلة
```sql
CREATE TABLE entity_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  alias TEXT NOT NULL,
  alias_type TEXT,                       -- A.K.A., F.K.A., N.K.A.
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid)
);
```

#### 2.6 `entity_addresses` - العناوين
```sql
CREATE TABLE entity_addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  address TEXT NOT NULL,
  country TEXT,
  city TEXT,
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid)
);
```

#### 2.7 `entity_id_numbers` - أرقام التسجيل
```sql
CREATE TABLE entity_id_numbers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  id_type TEXT NOT NULL,
  id_number TEXT NOT NULL,
  issuing_authority TEXT,
  issued_date TEXT,
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid)
);
```

#### 2.8 `entity_remarks` - الملاحظات
```sql
CREATE TABLE entity_remarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  remark TEXT NOT NULL,
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid)
);
```

#### 2.9 `ofac_sync_metadata` - معلومات المزامنة
```sql
CREATE TABLE ofac_sync_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  last_sync_date DATETIME,
  total_entities INTEGER DEFAULT 0,
  filtered_entities INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## ═══════════════════════════════════════════════════════════════
## ⚠️ الجزء 3: ما الناقص في الـ Database؟
## ═══════════════════════════════════════════════════════════════

### ❌ 3.1 حقول ناقصة في `ofac_entities`:
```sql
-- محتاجين نضيف:
ALTER TABLE ofac_entities ADD COLUMN party_type_id INTEGER;  -- 1=Individual, 2=Entity
ALTER TABLE ofac_entities ADD COLUMN party_subtype_id INTEGER; -- 3=Entity Unknown
ALTER TABLE ofac_entities ADD COLUMN fixed_ref TEXT;         -- FixedRef من XML
```

### ❌ 3.2 جدول ناقص: `entity_features`
```sql
-- للـ Features زي Date of Birth, Place of Birth, etc.
CREATE TABLE entity_features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_uid TEXT NOT NULL,
  feature_type_id INTEGER NOT NULL,      -- 8, 9, 10, 224, etc.
  feature_value TEXT,
  date_value TEXT,
  location_id INTEGER,
  FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid)
);
```

### ❌ 3.3 جدول ناقص: `location_details`
```sql
-- تفاصيل العناوين الكاملة
CREATE TABLE location_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER UNIQUE NOT NULL,   -- من XML
  country_id INTEGER,
  street TEXT,
  district TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  full_address TEXT
);
```

### ❌ 3.4 جدول ناقص: `id_document_types`
```sql
-- أنواع الوثائق
CREATE TABLE id_document_types (
  id INTEGER PRIMARY KEY,
  type_name TEXT NOT NULL,
  description TEXT
);

-- أمثلة:
-- 1596 → Tax ID
-- 1636 → Registration Number
-- 91761 → Business License
```

### ⚠️ 3.5 حقول ناقصة في `entity_addresses`:
```sql
-- محتاجين نضيف:
ALTER TABLE entity_addresses ADD COLUMN street TEXT;
ALTER TABLE entity_addresses ADD COLUMN district TEXT;
ALTER TABLE entity_addresses ADD COLUMN province TEXT;
ALTER TABLE entity_addresses ADD COLUMN postal_code TEXT;
ALTER TABLE entity_addresses ADD COLUMN location_id INTEGER; -- Reference للـ XML Location
```

## ═══════════════════════════════════════════════════════════════
## 🎯 الجزء 4: الخطة - الخطوة الأولى
## ═══════════════════════════════════════════════════════════════

### 📋 Step 1: استخراج الشركات من الدول العربية فقط

#### 4.1 الدول المستهدفة (Country IDs):
```javascript
const TARGET_COUNTRIES = {
  // دول الخليج
  '11179': 'Saudi Arabia',      // السعودية
  '11210': 'United Arab Emirates', // الإمارات
  '11169': 'Qatar',              // قطر
  '11122': 'Kuwait',             // الكويت
  '11041': 'Bahrain',            // البحرين
  '11159': 'Oman',               // عمان
  '11218': 'Yemen',              // اليمن
  
  // بلاد الشام
  '11116': 'Jordan',             // الأردن
  '11126': 'Lebanon',            // لبنان
  '11197': 'Syria',              // سوريا
  '11110': 'Iraq',               // العراق
  '91021': 'Palestine',          // فلسطين
  
  // شمال أفريقيا
  '11082': 'Egypt',              // مصر
  '11129': 'Libya',              // ليبيا
  '11192': 'Sudan',              // السودان
  '91501': 'South Sudan',        // جنوب السودان
  '11204': 'Tunisia',            // تونس
  '11148': 'Morocco',            // المغرب
  '11031': 'Algeria',            // الجزائر
  '11141': 'Mauritania',         // موريتانيا
  
  // أفريقيا (عربية)
  '11067': 'Comoros',            // جزر القمر
  '11077': 'Djibouti',           // جيبوتي
  '11188': 'Somalia'             // الصومال
};
```

#### 4.2 فلترة الشركات (Entity فقط):
```javascript
const TARGET_PARTY_TYPES = [2, 5]; // Entity, Other Entity
const TARGET_PARTY_SUBTYPES = [3]; // Unknown Entity

// NOT Individual:
const EXCLUDE_PARTY_TYPES = [1];    // Individual
const EXCLUDE_PARTY_SUBTYPES = [4]; // Unknown Individual
```

#### 4.3 فلترة القطاعات (اختياري):
```javascript
const SECTOR_KEYWORDS = {
  'Food & Agriculture': [
    'food', 'agricultural', 'farming', 'dairy', 'meat',
    'vegetables', 'fruits', 'grain', 'livestock',
    'مواد غذائية', 'زراعة', 'أغذية'
  ],
  'Construction': [
    'construction', 'building', 'contractor', 'infrastructure',
    'engineering', 'cement', 'steel', 'real estate',
    'إنشاءات', 'بناء', 'مقاولات', 'عقارات'
  ]
};
```

#### 4.4 خطوات Parsing:

```javascript
// ═══════════════════════════════════════════════════════════════
// Step 1.1: Parse Reference Data (Lookup Tables)
// ═══════════════════════════════════════════════════════════════
const referenceData = {
  countries: {},      // ID → Name mapping
  programs: {},       // ID → Name mapping
  aliasTypes: {},     // ID → Type mapping
  featureTypes: {},   // ID → Type mapping
  locPartTypes: {}    // ID → Type mapping
};

// ═══════════════════════════════════════════════════════════════
// Step 1.2: Parse Locations (All addresses)
// ═══════════════════════════════════════════════════════════════
const locations = {};  // LocationID → {country, city, street, ...}

// ═══════════════════════════════════════════════════════════════
// Step 1.3: Parse IDRegDocuments (Registration numbers)
// ═══════════════════════════════════════════════════════════════
const idDocuments = {}; // DocumentID → {type, number, country, ...}

// ═══════════════════════════════════════════════════════════════
// Step 1.4: Parse DistinctParties (Main entities)
// ═══════════════════════════════════════════════════════════════
for each DistinctParty:
  1. Extract FixedRef (UID)
  2. Extract Profile → PartySubTypeID
  3. Check if Entity (not Individual)
  4. Extract Primary Name from Identity/Alias
  5. Extract All Aliases
  6. Extract Features:
     - Addresses (FeatureTypeID=10)
     - Programs (FeatureTypeID=224)
     - Listed Date (FeatureTypeID=25)
  7. Get Countries from Addresses
  8. Filter: Keep only if has Arab country
  9. Extract ID Numbers
  10. Extract Remarks
  11. Determine Sector (from name/remarks)
  12. Insert into database
```

## ═══════════════════════════════════════════════════════════════
## 🚀 الجزء 5: Implementation Plan
## ═══════════════════════════════════════════════════════════════

### Phase 1: Fix Database Schema ✅
1. Add missing columns to existing tables
2. Create missing tables
3. Create proper indexes

### Phase 2: XML Parser 🔄
1. Parse Reference Data
2. Parse Locations
3. Parse ID Documents
4. Parse Distinct Parties (with filters)

### Phase 3: Data Insertion 📥
1. Bulk insert entities
2. Insert related data (countries, aliases, addresses)
3. Update sync metadata

### Phase 4: Testing 🧪
1. Verify data quality
2. Test search functionality
3. Validate Arab countries filter

## ═══════════════════════════════════════════════════════════════
## 📊 الجزء 6: Expected Results
## ═══════════════════════════════════════════════════════════════

### Estimates:
- Total Entities in XML: ~15,000
- Entities (not Individuals): ~5,000
- Entities in Arab Countries: **~200-500** 🎯
- Food & Agriculture: ~50-100
- Construction: ~30-60

### Quality:
```
✅ Complete Data:
- Name (100%)
- Type (100%)
- UID (100%)

✅ Good Data:
- Countries (90%)
- Programs (95%)
- Aliases (70%)

⚠️ Partial Data:
- Addresses (60%)
- ID Numbers (40%)
- Sector (needs inference)
```

## ═══════════════════════════════════════════════════════════════
## ✅ Next Steps
## ═══════════════════════════════════════════════════════════════

1. **أصلح الـ Database Schema** (5 دقائق)
2. **اكتب الـ XML Parser** (30 دقيقة)
3. **نفذ الـ Parsing والـ Insertion** (10 دقائق تشغيل)
4. **اختبر النتائج** (5 دقائق)

### Total Time: ~50 minutes

---

**🎯 الخلاصة:**
- الـ XML فيه ~2.5 مليون سطر
- محتاجين نستخرج **فقط الشركات** من **الدول العربية**
- الـ Database جاهز تقريباً، محتاج تعديلات بسيطة
- الـ Parser هيبقى complex بس straightforward
- النتيجة المتوقعة: **200-500 شركة عربية**

