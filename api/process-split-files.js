const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const SPLIT_DIR = path.join(__dirname, 'sanctions/split');
const DB_PATH = path.join(__dirname, 'mdm_database.db');

// Arab countries list
const ARAB_COUNTRIES = [
  'Egypt', 'Saudi Arabia', 'United Arab Emirates', 'Jordan', 'Lebanon',
  'Iraq', 'Syria', 'Yemen', 'Kuwait', 'Oman', 'Qatar', 'Bahrain',
  'Libya', 'Tunisia', 'Algeria', 'Morocco', 'Sudan', 'Somalia',
  'Mauritania', 'Djibouti', 'Comoros', 'Palestine'
];

// Sector keywords
const FOOD_KEYWORDS = ['food', 'agricultural', 'agriculture', 'farm', 'grain', 'dairy', 'meat', 'fish'];
const CONSTRUCTION_KEYWORDS = ['construction', 'building', 'engineering', 'contractor', 'infrastructure'];

console.log('🔄 Processing Split OFAC Files');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📂 Split directory: ${SPLIT_DIR}`);
console.log(`💾 Database: ${DB_PATH}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Read index
const indexFile = path.join(SPLIT_DIR, '_index.json');
if (!fs.existsSync(indexFile)) {
  console.error('❌ Index file not found! Run split-xml.js first.');
  process.exit(1);
}

const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
console.log(`📊 Total files: ${index.totalFiles}`);
console.log(`📊 Total entities: ${index.totalEntities}\n`);

// Open database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

let stats = {
  filesProcessed: 0,
  entitiesRead: 0,
  entitiesFiltered: 0,
  entitiesInserted: 0,
  aliasesInserted: 0,
  countriesInserted: 0,
  addressesInserted: 0,
  idNumbersInserted: 0,
  programsInserted: 0,
  remarksInserted: 0,
  errors: 0
};

// Helper functions
function detectSector(entity) {
  const searchText = [
    entity?.Profile?.Identity?.NameAlias?.DocumentedName?.[0]?.DocumentedNamePart?.NamePartValue || '',
    ...(entity?.Profile?.Identity?.NameAlias?.DocumentedName?.[0]?.DocumentedNamePart?.NamePartValue || []),
    ...(entity?.Profile?.Description || [])
  ].join(' ').toLowerCase();

  if (FOOD_KEYWORDS.some(kw => searchText.includes(kw))) return 'Food & Agriculture';
  if (CONSTRUCTION_KEYWORDS.some(kw => searchText.includes(kw))) return 'Construction';
  return null;
}

function isArabCountry(country) {
  return ARAB_COUNTRIES.some(ac => 
    country && country.toLowerCase().includes(ac.toLowerCase())
  );
}

function extractValue(obj) {
  if (!obj) return null;
  if (typeof obj === 'string') return obj;
  if (obj['#text']) return obj['#text'];
  if (Array.isArray(obj)) return obj[0] ? extractValue(obj[0]) : null;
  return null;
}

// Prepare statements
const insertEntity = db.prepare(`
  INSERT OR REPLACE INTO ofac_entities (
    uid, source, source_id, name, type, sector, listed_date
  ) VALUES (?, 'OFAC', ?, ?, ?, ?, ?)
`);

const insertAlias = db.prepare(`
  INSERT OR IGNORE INTO entity_aliases (entity_uid, alias, alias_type, source)
  VALUES (?, ?, ?, 'OFAC')
`);

const insertCountry = db.prepare(`
  INSERT OR IGNORE INTO entity_countries (entity_uid, country, source)
  VALUES (?, ?, 'OFAC')
`);

const insertAddress = db.prepare(`
  INSERT OR IGNORE INTO entity_addresses (
    entity_uid, address, city, country, postal_code, source
  ) VALUES (?, ?, ?, ?, ?, 'OFAC')
`);

const insertIdNumber = db.prepare(`
  INSERT OR IGNORE INTO entity_id_numbers (
    entity_uid, id_number, id_type, issuing_country, source
  ) VALUES (?, ?, ?, ?, 'OFAC')
`);

const insertProgram = db.prepare(`
  INSERT OR IGNORE INTO entity_programs (entity_uid, program, source)
  VALUES (?, ?, 'OFAC')
`);

const insertRemark = db.prepare(`
  INSERT OR IGNORE INTO entity_remarks (entity_uid, remark, source)
  VALUES (?, ?, 'OFAC')
`);

// Process each file
const startTime = Date.now();

for (let i = 0; i < index.files.length; i++) {
  const fileInfo = index.files[i];
  const filePath = path.join(SPLIT_DIR, fileInfo.file);
  
  console.log(`\n📄 Processing file ${i + 1}/${index.files.length}: ${fileInfo.file}`);
  console.log(`   Entities: ${fileInfo.start} - ${fileInfo.end - 1} (${fileInfo.count} total)`);
  
  try {
    const entities = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    stats.entitiesRead += entities.length;
    
    let fileStats = { filtered: 0, inserted: 0 };
    
    const transaction = db.transaction((entitiesToProcess) => {
      for (const entity of entitiesToProcess) {
        try {
          // Extract basic info
          const uid = entity.uid || `OFAC-${entity.FixedRef}`;
          const name = extractValue(entity?.Profile?.Identity?.NameAlias?.DocumentedName?.[0]?.DocumentedNamePart?.NamePartValue);
          
          if (!name) continue;
          
          // Extract type
          const partyType = entity?.Profile?.Identity?.['@_PartySubTypeID'] || 
                           entity?.Profile?.Identity?.['@_PartyTypeID'];
          const type = partyType === '4' ? 'Entity' : 'Individual';
          
          // Only process companies
          if (type !== 'Entity') continue;
          
          // Extract countries
          const countries = [];
          const locations = entity?.Profile?.Feature?.filter(f => f['@_FeatureTypeID'] === '25') || [];
          for (const loc of locations) {
            const country = extractValue(loc?.FeatureVersion?.VersionDetail?.DetailType === 'Country' ? 
              loc?.FeatureVersion?.VersionDetail?.DetailReference : null);
            if (country && isArabCountry(country)) {
              countries.push(country);
            }
          }
          
          // Skip if not from Arab country
          if (countries.length === 0) continue;
          
          // Detect sector
          const sector = detectSector(entity);
          
          // Skip if not in target sectors
          if (!sector) continue;
          
          fileStats.filtered++;
          
          // Extract listed date
          const listedDate = extractValue(
            entity?.Profile?.Feature?.find(f => f['@_FeatureTypeID'] === '1450')
              ?.FeatureVersion?.DatePeriod?.Start?.['@_Approximate']
          );
          
          // Insert entity
          insertEntity.run(uid, entity.FixedRef, name, type, sector, listedDate);
          fileStats.inserted++;
          
          // Insert countries
          for (const country of countries) {
            insertCountry.run(uid, country);
            stats.countriesInserted++;
          }
          
          // Insert aliases
          const aliases = entity?.Profile?.Identity?.NameAlias?.DocumentedName || [];
          for (const alias of aliases) {
            const aliasName = extractValue(alias?.DocumentedNamePart?.NamePartValue);
            if (aliasName && aliasName !== name) {
              insertAlias.run(uid, aliasName, 'aka');
              stats.aliasesInserted++;
            }
          }
          
          // Insert addresses
          const addresses = entity?.Profile?.Feature?.filter(f => f['@_FeatureTypeID'] === '25') || [];
          for (const addr of addresses) {
            const details = addr?.FeatureVersion?.VersionDetail || [];
            const addressLine = extractValue(details.find(d => d?.DetailType === 'Address Line')?.DetailReference);
            const city = extractValue(details.find(d => d?.DetailType === 'City')?.DetailReference);
            const country = extractValue(details.find(d => d?.DetailType === 'Country')?.DetailReference);
            const postalCode = extractValue(details.find(d => d?.DetailType === 'Postal Code')?.DetailReference);
            
            if (addressLine || city) {
              insertAddress.run(uid, addressLine, city, country, postalCode);
              stats.addressesInserted++;
            }
          }
          
          // Insert ID numbers
          const idFeatures = entity?.Profile?.Feature?.filter(f => f['@_FeatureTypeID'] === '8') || [];
          for (const idFeat of idFeatures) {
            const idNumber = extractValue(idFeat?.FeatureVersion?.VersionDetail?.DetailReference);
            const idType = extractValue(idFeat?.FeatureVersion?.Comment);
            const issuingCountry = extractValue(idFeat?.FeatureVersion?.VersionLocation?.LocationCountry);
            
            if (idNumber) {
              insertIdNumber.run(uid, idNumber, idType, issuingCountry);
              stats.idNumbersInserted++;
            }
          }
          
          // Insert programs
          const programs = entity?.Profile?.Feature?.filter(f => f['@_FeatureTypeID'] === '14') || [];
          for (const prog of programs) {
            const programName = extractValue(prog?.FeatureVersion?.VersionDetail?.DetailReference);
            if (programName) {
              insertProgram.run(uid, programName);
              stats.programsInserted++;
            }
          }
          
          // Insert remarks
          const remarks = entity?.Profile?.Feature?.filter(f => f['@_FeatureTypeID'] === '28') || [];
          for (const rem of remarks) {
            const remarkText = extractValue(rem?.FeatureVersion?.VersionDetail?.DetailReference);
            if (remarkText) {
              insertRemark.run(uid, remarkText);
              stats.remarksInserted++;
            }
          }
          
        } catch (error) {
          stats.errors++;
          console.error(`   ⚠️  Error processing entity:`, error.message);
        }
      }
    });
    
    transaction(entities);
    
    stats.entitiesFiltered += fileStats.filtered;
    stats.entitiesInserted += fileStats.inserted;
    stats.filesProcessed++;
    
    const progress = ((stats.filesProcessed / index.files.length) * 100).toFixed(1);
    console.log(`   ✅ Filtered: ${fileStats.filtered} | Inserted: ${fileStats.inserted} | Progress: ${progress}%`);
    
  } catch (error) {
    console.error(`   ❌ Error processing file:`, error.message);
    stats.errors++;
  }
}

db.close();

const duration = ((Date.now() - startTime) / 1000).toFixed(2);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🎉 Processing Complete!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📄 Files processed: ${stats.filesProcessed}/${index.totalFiles}`);
console.log(`📊 Entities read: ${stats.entitiesRead.toLocaleString()}`);
console.log(`🔍 Entities filtered (Arab + Food/Construction): ${stats.entitiesFiltered.toLocaleString()}`);
console.log(`✅ Entities inserted: ${stats.entitiesInserted.toLocaleString()}`);
console.log(`   ├─ Aliases: ${stats.aliasesInserted.toLocaleString()}`);
console.log(`   ├─ Countries: ${stats.countriesInserted.toLocaleString()}`);
console.log(`   ├─ Addresses: ${stats.addressesInserted.toLocaleString()}`);
console.log(`   ├─ ID Numbers: ${stats.idNumbersInserted.toLocaleString()}`);
console.log(`   ├─ Programs: ${stats.programsInserted.toLocaleString()}`);
console.log(`   └─ Remarks: ${stats.remarksInserted.toLocaleString()}`);
console.log(`⚠️  Errors: ${stats.errors}`);
console.log(`⏱️  Duration: ${duration}s`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

