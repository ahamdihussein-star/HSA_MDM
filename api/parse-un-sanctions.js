const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { XMLParser } = require('fast-xml-parser');

console.log('\n🇺🇳 UN Sanctions Parser');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const startTime = Date.now();
const dbPath = path.join(__dirname, 'mdm_database.db');
const xmlPath = path.join(__dirname, 'sanctions', 'UN', 'consolidatedLegacyByPRN.xml');

console.log(`📂 Database: ${dbPath}`);
console.log(`📄 XML File: ${xmlPath}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Arab countries list
const arabCountries = [
  "Algeria", "Bahrain", "Comoros", "Djibouti", "Egypt", "Iraq", "Jordan", "Kuwait",
  "Lebanon", "Libya", "Mauritania", "Morocco", "Oman", "Palestine", "State of Palestine",
  "Qatar", "Saudi Arabia", "Somalia", "Sudan", "South Sudan", "Syria", "Syrian Arab Republic",
  "Tunisia", "United Arab Emirates", "Yemen"
];

// Initialize database
const db = new Database(dbPath);

// Create UN-specific tables
console.log('📋 Creating UN tables...');
db.exec(`
  -- UN Entities main table
  CREATE TABLE IF NOT EXISTS un_entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataid TEXT UNIQUE NOT NULL,
    reference_number TEXT,
    first_name TEXT NOT NULL,
    un_list_type TEXT,
    listed_on TEXT,
    comments TEXT,
    name_original_script TEXT,
    last_updated TEXT,
    source TEXT NOT NULL DEFAULT 'UN',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- UN Entity Aliases
  CREATE TABLE IF NOT EXISTS un_entity_aliases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_dataid TEXT NOT NULL,
    quality TEXT,
    alias_name TEXT,
    source TEXT NOT NULL DEFAULT 'UN',
    FOREIGN KEY (entity_dataid) REFERENCES un_entities(dataid) ON DELETE CASCADE
  );

  -- UN Entity Addresses
  CREATE TABLE IF NOT EXISTS un_entity_addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_dataid TEXT NOT NULL,
    street TEXT,
    city TEXT,
    state_province TEXT,
    zip_code TEXT,
    country TEXT,
    note TEXT,
    source TEXT NOT NULL DEFAULT 'UN',
    FOREIGN KEY (entity_dataid) REFERENCES un_entities(dataid) ON DELETE CASCADE
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_un_entities_dataid ON un_entities(dataid);
  CREATE INDEX IF NOT EXISTS idx_un_entities_list_type ON un_entities(un_list_type);
  CREATE INDEX IF NOT EXISTS idx_un_entities_name ON un_entities(first_name);
  CREATE INDEX IF NOT EXISTS idx_un_aliases_dataid ON un_entity_aliases(entity_dataid);
  CREATE INDEX IF NOT EXISTS idx_un_addresses_dataid ON un_entity_addresses(entity_dataid);
  CREATE INDEX IF NOT EXISTS idx_un_addresses_country ON un_entity_addresses(country);
`);
console.log('✅ UN tables created\n');

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
    return ['ENTITY', 'INDIVIDUAL', 'ENTITY_ALIAS', 'ENTITY_ADDRESS', 
            'LAST_DAY_UPDATED', 'LIST_TYPE'].includes(name);
  }
});

const jsonObj = parser.parse(xmlData);
console.log('✅ XML parsed successfully\n');

// Extract entities
const entities = jsonObj.CONSOLIDATED_LIST.ENTITIES?.ENTITY || [];
console.log(`📊 Total entities found: ${entities.length}\n`);

// Prepare statements
const insertEntity = db.prepare(`
  INSERT OR IGNORE INTO un_entities (
    dataid, reference_number, first_name, un_list_type, listed_on, 
    comments, name_original_script, last_updated
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertAlias = db.prepare(`
  INSERT OR IGNORE INTO un_entity_aliases (entity_dataid, quality, alias_name)
  VALUES (?, ?, ?)
`);

const insertAddress = db.prepare(`
  INSERT OR IGNORE INTO un_entity_addresses (
    entity_dataid, street, city, state_province, zip_code, country, note
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// Process entities
console.log('⚙️  Processing entities...\n');
let totalProcessed = 0;
let arabEntities = 0;
let aliasesInserted = 0;
let addressesInserted = 0;

db.transaction(() => {
  entities.forEach((entity, index) => {
    totalProcessed++;
    
    const dataid = entity.DATAID;
    const refNumber = entity.REFERENCE_NUMBER;
    const firstName = entity.FIRST_NAME;
    const listType = entity.UN_LIST_TYPE;
    const listedOn = entity.LISTED_ON;
    const comments = entity.COMMENTS1 || null;
    const nameOriginalScript = entity.NAME_ORIGINAL_SCRIPT || null;
    
    // Get last updated date (can be multiple)
    let lastUpdated = null;
    if (entity.LAST_DAY_UPDATED && entity.LAST_DAY_UPDATED.length > 0) {
      const updates = Array.isArray(entity.LAST_DAY_UPDATED) 
        ? entity.LAST_DAY_UPDATED 
        : [entity.LAST_DAY_UPDATED];
      lastUpdated = updates.map(u => u.VALUE || u).join(', ');
    }
    
    // Check if entity has Arab country connection
    let hasArabConnection = false;
    const addresses = Array.isArray(entity.ENTITY_ADDRESS) 
      ? entity.ENTITY_ADDRESS 
      : entity.ENTITY_ADDRESS ? [entity.ENTITY_ADDRESS] : [];
    
    for (const addr of addresses) {
      const country = addr.COUNTRY || '';
      if (arabCountries.some(ac => country.includes(ac) || ac.includes(country))) {
        hasArabConnection = true;
        break;
      }
    }
    
    // Only insert if has Arab connection
    if (!hasArabConnection) {
      return;
    }
    
    arabEntities++;
    
    // Insert entity
    insertEntity.run(
      dataid,
      refNumber,
      firstName,
      listType,
      listedOn,
      comments,
      nameOriginalScript,
      lastUpdated
    );
    
    // Insert aliases
    const aliases = Array.isArray(entity.ENTITY_ALIAS) 
      ? entity.ENTITY_ALIAS 
      : entity.ENTITY_ALIAS ? [entity.ENTITY_ALIAS] : [];
    
    aliases.forEach(alias => {
      const quality = alias.QUALITY || null;
      const aliasName = alias.ALIAS_NAME || null;
      
      if (aliasName && aliasName.trim() !== '') {
        insertAlias.run(dataid, quality, aliasName);
        aliasesInserted++;
      }
    });
    
    // Insert addresses
    addresses.forEach(addr => {
      const street = addr.STREET || null;
      const city = addr.CITY || null;
      const stateProvince = addr.STATE_PROVINCE || null;
      const zipCode = addr.ZIP_CODE || null;
      const country = addr.COUNTRY || null;
      const note = addr.NOTE || null;
      
      insertAddress.run(dataid, street, city, stateProvince, zipCode, country, note);
      addressesInserted++;
    });
    
    // Progress indicator
    if (totalProcessed % 50 === 0) {
      const progress = ((totalProcessed / entities.length) * 100).toFixed(1);
      console.log(`   📊 Progress: ${totalProcessed}/${entities.length} (${progress}%) - Arab entities: ${arabEntities}`);
    }
  });
})();

const duration = ((Date.now() - startTime) / 1000).toFixed(2);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🎉 Processing Complete!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📊 Total entities processed: ${totalProcessed}`);
console.log(`✅ Arab-related entities inserted: ${arabEntities}`);
console.log(`📋 Aliases inserted: ${aliasesInserted}`);
console.log(`📍 Addresses inserted: ${addressesInserted}`);
console.log(`⏱️  Duration: ${duration}s`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Verification
console.log('🔍 Verification:\n');
const entitiesCount = db.prepare('SELECT COUNT(*) as count FROM un_entities').get().count;
const aliasesCount = db.prepare('SELECT COUNT(*) as count FROM un_entity_aliases').get().count;
const addressesCount = db.prepare('SELECT COUNT(*) as count FROM un_entity_addresses').get().count;

console.log(`   ✓ UN Entities in DB: ${entitiesCount}`);
console.log(`   ✓ UN Aliases in DB: ${aliasesCount}`);
console.log(`   ✓ UN Addresses in DB: ${addressesCount}\n`);

// Country breakdown
console.log('🌍 Country Breakdown:\n');
const countryBreakdown = db.prepare(`
  SELECT country, COUNT(*) as count 
  FROM un_entity_addresses 
  WHERE country IS NOT NULL AND country != ''
  GROUP BY country 
  ORDER BY count DESC
  LIMIT 15
`).all();

countryBreakdown.forEach(c => {
  console.log(`   ${c.country.padEnd(30)} : ${c.count}`);
});

// Sample entity
console.log('\n📋 Sample Entity:\n');
const sample = db.prepare(`
  SELECT * FROM un_entities LIMIT 1
`).get();

if (sample) {
  console.log(`   DATAID: ${sample.dataid}`);
  console.log(`   Name: ${sample.first_name}`);
  console.log(`   Reference: ${sample.reference_number}`);
  console.log(`   List Type: ${sample.un_list_type}`);
  console.log(`   Listed On: ${sample.listed_on}`);
  console.log(`   Comments: ${sample.comments ? sample.comments.substring(0, 100) + '...' : 'N/A'}\n`);
}

db.close();
console.log('✅ Database closed');
console.log('\n🚀 UN sanctions data ready to use!\n');

