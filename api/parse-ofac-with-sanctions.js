const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { XMLParser } = require('fast-xml-parser');

console.log('\n🔥 OFAC Parser with Sanctions Info');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const startTime = Date.now();
const dbPath = path.join(__dirname, 'mdm_database.db');
const xmlPath = path.join(__dirname, 'sanctions', 'sdn_advanced.xml');

console.log(`📂 Database: ${dbPath}`);
console.log(`📄 XML File: ${xmlPath}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Arab countries list
const arabCountries = [
  "Algeria", "Bahrain", "Comoros", "Djibouti", "Egypt", "Iraq", "Jordan", "Kuwait",
  "Lebanon", "Libya", "Mauritania", "Morocco", "Oman", "Palestine", "Qatar",
  "Saudi Arabia", "Somalia", "Sudan", "Syria", "Tunisia", "United Arab Emirates", "Yemen"
];

// Sector keywords
const FOOD_KEYWORDS = ['food', 'agriculture', 'agricultural', 'farm', 'grain', 'livestock', 'fishing', 'crop'];
const CONSTRUCTION_KEYWORDS = ['construction', 'building', 'contractor', 'engineering', 'infrastructure'];

function detectSector(name, remarks = []) {
  const allText = [name, ...remarks].join(' ').toLowerCase();
  
  if (FOOD_KEYWORDS.some(k => allText.includes(k))) {
    return 'Food & Agriculture';
  }
  if (CONSTRUCTION_KEYWORDS.some(k => allText.includes(k))) {
    return 'Construction';
  }
  
  return null;
}

// Initialize database
const db = new Database(dbPath);

// Prepare statements
const insertSanctionsEntry = db.prepare(`
  INSERT OR IGNORE INTO sanctions_entry (
    entry_id, profile_id, entity_uid, list_id, entry_event_date, 
    entry_event_type_id, legal_basis_id, entry_event_comment, source
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OFAC')
`);

const insertSanctionsMeasure = db.prepare(`
  INSERT OR IGNORE INTO sanctions_measures (
    entry_id, measure_id, sanctions_type_id, sanctions_type_name,
    date_period_start, date_period_end, comment, source
  ) VALUES (?, ?, ?, ?, ?, ?, ?, 'OFAC')
`);

// Reference data mapping
const sanctionsTypeMap = new Map();
const listMap = new Map();

// Parse XML
console.log('📖 Reading XML file...');
const xmlData = fs.readFileSync(xmlPath, 'utf8');
const fileSize = (xmlData.length / (1024 * 1024)).toFixed(2);
console.log(`✅ File read successfully (${fileSize} MB)\n`);

console.log('🔍 Parsing XML...');
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  isArray: (name) => {
    return ['SanctionsEntry', 'Profile', 'SanctionsMeasure', 'Alias', 'Location', 
            'Address', 'ID', 'Feature', 'DistinctParty', 'Identity'].includes(name);
  }
});

const jsonObj = parser.parse(xmlData);
console.log('✅ XML parsed successfully\n');

// Extract reference data
console.log('📚 Extracting reference data...');
const refData = jsonObj.Sanctions.ReferenceValueSets || {};

// Sanctions Types
if (refData.SanctionsTypeValues && refData.SanctionsTypeValues.SanctionsType) {
  const types = Array.isArray(refData.SanctionsTypeValues.SanctionsType) 
    ? refData.SanctionsTypeValues.SanctionsType 
    : [refData.SanctionsTypeValues.SanctionsType];
  
  types.forEach(type => {
    const id = type['@_ID'];
    const name = type['#text'] || type;
    sanctionsTypeMap.set(id, name);
  });
  console.log(`   ✓ Loaded ${sanctionsTypeMap.size} sanctions types`);
}

// Lists
if (refData.SanctionsListValues && refData.SanctionsListValues.SanctionsList) {
  const lists = Array.isArray(refData.SanctionsListValues.SanctionsList) 
    ? refData.SanctionsListValues.SanctionsList 
    : [refData.SanctionsListValues.SanctionsList];
  
  lists.forEach(list => {
    const id = list['@_ID'];
    const name = list['#text'] || list;
    listMap.set(id, name);
  });
  console.log(`   ✓ Loaded ${listMap.size} sanctions lists\n`);
}

// Extract Sanctions Entries
const sanctionsEntries = jsonObj.Sanctions.SanctionsEntries?.SanctionsEntry || [];
console.log(`📊 Found ${sanctionsEntries.length} sanctions entries\n`);

// Build FixedRef -> EntityUID mapping from existing database
// UIDs are in format: OFAC-{FixedRef}
console.log('🔗 Building FixedRef to EntityUID mapping...');
const fixedRefToUidMap = new Map();
const existingEntities = db.prepare("SELECT uid FROM ofac_entities WHERE source = 'OFAC'").all();
existingEntities.forEach(e => {
  // Extract FixedRef from UID (format: OFAC-{FixedRef})
  const fixedRef = e.uid.replace('OFAC-', '');
  fixedRefToUidMap.set(fixedRef, e.uid);
});
console.log(`   ✓ Mapped ${fixedRefToUidMap.size} FixedRefs to entities\n`);

// Process sanctions entries
console.log('⚙️  Processing sanctions entries...\n');
let processed = 0;
let matched = 0;
let measuresInserted = 0;

db.transaction(() => {
  sanctionsEntries.forEach((entry, index) => {
    processed++;
    
    const entryId = entry['@_ID'];
    const profileId = entry['@_ProfileID'];
    const listId = entry['@_ListID'];
    
    // Check if we have this entity in our database
    // ProfileID = FixedRef, and UID = OFAC-{FixedRef}
    const entityUid = fixedRefToUidMap.get(profileId);
    if (!entityUid) {
      // Skip if not in our filtered entities
      return;
    }
    
    matched++;
    
    // Extract EntryEvent
    const entryEvent = entry.EntryEvent || {};
    const eventDate = entryEvent.Date 
      ? `${entryEvent.Date.Year}-${String(entryEvent.Date.Month || 1).padStart(2, '0')}-${String(entryEvent.Date.Day || 1).padStart(2, '0')}`
      : null;
    const eventTypeId = entryEvent['@_EntryEventTypeID'];
    const legalBasisId = entryEvent['@_LegalBasisID'];
    const eventComment = entryEvent.Comment || null;
    
    // Insert sanctions entry
    insertSanctionsEntry.run(
      entryId,
      profileId,
      entityUid,
      listId,
      eventDate,
      eventTypeId,
      legalBasisId,
      eventComment
    );
    
    // Extract SanctionsMeasures
    const measures = Array.isArray(entry.SanctionsMeasure) 
      ? entry.SanctionsMeasure 
      : entry.SanctionsMeasure ? [entry.SanctionsMeasure] : [];
    
    measures.forEach(measure => {
      const measureId = measure['@_ID'];
      const sanctionsTypeId = measure['@_SanctionsTypeID'];
      const sanctionsTypeName = sanctionsTypeMap.get(sanctionsTypeId) || null;
      const comment = measure.Comment || null;
      
      // Extract date period if exists
      const datePeriod = measure.DatePeriod || {};
      const startDate = datePeriod.Start 
        ? `${datePeriod.Start.Year}-${String(datePeriod.Start.Month || 1).padStart(2, '0')}-${String(datePeriod.Start.Day || 1).padStart(2, '0')}`
        : null;
      const endDate = datePeriod.To 
        ? `${datePeriod.To.Year}-${String(datePeriod.To.Month || 1).padStart(2, '0')}-${String(datePeriod.To.Day || 1).padStart(2, '0')}`
        : null;
      
      insertSanctionsMeasure.run(
        entryId,
        measureId,
        sanctionsTypeId,
        sanctionsTypeName,
        startDate,
        endDate,
        comment
      );
      
      measuresInserted++;
    });
    
    // Progress indicator
    if (processed % 5000 === 0) {
      const progress = ((processed / sanctionsEntries.length) * 100).toFixed(1);
      console.log(`   📊 Progress: ${processed.toLocaleString()}/${sanctionsEntries.length.toLocaleString()} (${progress}%) - Matched: ${matched}`);
    }
  });
})();

const duration = ((Date.now() - startTime) / 1000).toFixed(2);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🎉 Processing Complete!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📊 Sanctions entries processed: ${processed.toLocaleString()}`);
console.log(`✅ Matched with existing entities: ${matched}`);
console.log(`📋 Sanctions measures inserted: ${measuresInserted}`);
console.log(`⏱️  Duration: ${duration}s`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Verify results
console.log('🔍 Verification:\n');
const entriesCount = db.prepare('SELECT COUNT(*) as count FROM sanctions_entry').get().count;
const measuresCount = db.prepare('SELECT COUNT(*) as count FROM sanctions_measures').get().count;
console.log(`   ✓ Sanctions entries in DB: ${entriesCount}`);
console.log(`   ✓ Sanctions measures in DB: ${measuresCount}\n`);

// Sample
console.log('📋 Sample sanctions entry:\n');
const sample = db.prepare(`
  SELECT 
    se.*,
    oe.name as entity_name,
    (SELECT COUNT(*) FROM sanctions_measures WHERE entry_id = se.entry_id) as measures_count
  FROM sanctions_entry se
  JOIN ofac_entities oe ON se.entity_uid = oe.uid
  LIMIT 1
`).get();

if (sample) {
  console.log(`   Entity: ${sample.entity_name}`);
  console.log(`   Entry Date: ${sample.entry_event_date}`);
  console.log(`   List ID: ${sample.list_id}`);
  console.log(`   Measures: ${sample.measures_count}\n`);
}

db.close();
console.log('✅ Database closed');
console.log('\n🚀 Ready to use! All sanctions information has been extracted.\n');

