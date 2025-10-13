const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { XMLParser } = require('fast-xml-parser');

console.log('\n📚 OFAC Reference Data Extractor');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const dbPath = path.join(__dirname, 'mdm_database.db');
const xmlPath = path.join(__dirname, 'sanctions', 'sdn_advanced.xml');

const db = new Database(dbPath);

// Create reference tables
console.log('📋 Creating reference tables...');
db.exec(`
  CREATE TABLE IF NOT EXISTS ofac_legal_basis (
    id TEXT PRIMARY KEY,
    short_ref TEXT,
    full_name TEXT,
    type_id TEXT,
    program_id TEXT
  );

  CREATE TABLE IF NOT EXISTS ofac_entry_event_types (
    id TEXT PRIMARY KEY,
    name TEXT
  );

  CREATE TABLE IF NOT EXISTS ofac_sanctions_types (
    id TEXT PRIMARY KEY,
    name TEXT
  );
`);
console.log('✅ Tables created\n');

// Parse XML
console.log('📖 Reading XML file...');
const xmlData = fs.readFileSync(xmlPath, 'utf8');
console.log(`✅ File read (${(xmlData.length / (1024 * 1024)).toFixed(2)} MB)\n`);

console.log('🔍 Parsing XML...');
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});
const jsonObj = parser.parse(xmlData);
console.log('✅ XML parsed\n');

const refData = jsonObj.Sanctions.ReferenceValueSets || {};

// Extract Legal Basis
console.log('⚖️  Extracting Legal Basis...');
const legalBasisStmt = db.prepare(`
  INSERT OR REPLACE INTO ofac_legal_basis (id, short_ref, full_name, type_id, program_id)
  VALUES (?, ?, ?, ?, ?)
`);

if (refData.LegalBasisValues && refData.LegalBasisValues.LegalBasis) {
  const legalBases = Array.isArray(refData.LegalBasisValues.LegalBasis)
    ? refData.LegalBasisValues.LegalBasis
    : [refData.LegalBasisValues.LegalBasis];

  db.transaction(() => {
    legalBases.forEach(lb => {
      const id = lb['@_ID'];
      const shortRef = lb['@_LegalBasisShortRef'];
      const fullName = lb['#text'] || lb;
      const typeId = lb['@_LegalBasisTypeID'];
      const programId = lb['@_SanctionsProgramID'];
      
      legalBasisStmt.run(id, shortRef, fullName, typeId, programId);
    });
  })();
  
  console.log(`   ✓ Inserted ${legalBases.length} legal basis records\n`);
}

// Extract Entry Event Types
console.log('📅 Extracting Entry Event Types...');
const eventTypeStmt = db.prepare(`
  INSERT OR REPLACE INTO ofac_entry_event_types (id, name)
  VALUES (?, ?)
`);

if (refData.EntryEventTypeValues && refData.EntryEventTypeValues.EntryEventType) {
  const eventTypes = Array.isArray(refData.EntryEventTypeValues.EntryEventType)
    ? refData.EntryEventTypeValues.EntryEventType
    : [refData.EntryEventTypeValues.EntryEventType];

  db.transaction(() => {
    eventTypes.forEach(et => {
      const id = et['@_ID'];
      const name = et['#text'] || et;
      
      eventTypeStmt.run(id, name);
    });
  })();
  
  console.log(`   ✓ Inserted ${eventTypes.length} entry event type records\n`);
}

// Extract Sanctions Types
console.log('🚫 Extracting Sanctions Types...');
const sanctionsTypeStmt = db.prepare(`
  INSERT OR REPLACE INTO ofac_sanctions_types (id, name)
  VALUES (?, ?)
`);

if (refData.SanctionsTypeValues && refData.SanctionsTypeValues.SanctionsType) {
  const sanctionsTypes = Array.isArray(refData.SanctionsTypeValues.SanctionsType)
    ? refData.SanctionsTypeValues.SanctionsType
    : [refData.SanctionsTypeValues.SanctionsType];

  db.transaction(() => {
    sanctionsTypes.forEach(st => {
      const id = st['@_ID'];
      const name = st['#text'] || st;
      
      sanctionsTypeStmt.run(id, name);
    });
  })();
  
  console.log(`   ✓ Inserted ${sanctionsTypes.length} sanctions type records\n`);
}

// Verification
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 Verification:\n');

const legalBasisCount = db.prepare('SELECT COUNT(*) as count FROM ofac_legal_basis').get().count;
const eventTypeCount = db.prepare('SELECT COUNT(*) as count FROM ofac_entry_event_types').get().count;
const sanctionsTypeCount = db.prepare('SELECT COUNT(*) as count FROM ofac_sanctions_types').get().count;

console.log(`   ✓ Legal Basis records: ${legalBasisCount}`);
console.log(`   ✓ Entry Event Types: ${eventTypeCount}`);
console.log(`   ✓ Sanctions Types: ${sanctionsTypeCount}\n`);

// Sample queries
console.log('📋 Sample Legal Basis (ID=1828):\n');
const sample1828 = db.prepare('SELECT * FROM ofac_legal_basis WHERE id = ?').get('1828');
if (sample1828) {
  console.log(`   ID: ${sample1828.id}`);
  console.log(`   Short Ref: ${sample1828.short_ref}`);
  console.log(`   Full Name: ${sample1828.full_name}\n`);
}

console.log('📋 Sample Entry Event Type (ID=1):\n');
const sampleEvent = db.prepare('SELECT * FROM ofac_entry_event_types WHERE id = ?').get('1');
if (sampleEvent) {
  console.log(`   ID: ${sampleEvent.id}`);
  console.log(`   Name: ${sampleEvent.name}\n`);
}

console.log('📋 Sample Sanctions Types:\n');
const sampleTypes = db.prepare('SELECT * FROM ofac_sanctions_types LIMIT 5').all();
sampleTypes.forEach(st => {
  console.log(`   ${st.id}: ${st.name}`);
});

db.close();
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Reference data extraction complete!\n');

