#!/usr/bin/env node

/**
 * OFAC XML Parser - ENHANCED VERSION
 * Extracts ALL available data including:
 * - Programs, Legal Basis, ID Numbers, Listed Dates, Remarks
 * - Websites, Emails, Phone Numbers
 * - Organization Type, Established Date
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { XMLParser } = require('fast-xml-parser');

console.log('═══════════════════════════════════════════════════════════════');
console.log('🚀 OFAC XML Parser - ENHANCED VERSION');
console.log('═══════════════════════════════════════════════════════════════\n');

// Configuration
const XML_FILE = path.join(__dirname, 'sanctions', 'sdn_advanced.xml');
const DB_FILE = path.join(__dirname, 'mdm_database.db');

// Arab Countries
const ARAB_COUNTRIES = {
  '11082': 'Egypt',
  '11179': 'Saudi Arabia',
  '11210': 'United Arab Emirates',
  '11169': 'Qatar',
  '11122': 'Kuwait',
  '11041': 'Bahrain',
  '11159': 'Oman',
  '11218': 'Yemen',
  '11116': 'Jordan',
  '11126': 'Lebanon',
  '11197': 'Syria',
  '11110': 'Iraq',
  '91021': 'Palestine',
  '11129': 'Libya',
  '11192': 'Sudan',
  '91501': 'South Sudan',
  '11204': 'Tunisia',
  '11148': 'Morocco',
  '11031': 'Algeria',
  '11141': 'Mauritania',
  '11067': 'Comoros',
  '11077': 'Djibouti',
  '11188': 'Somalia'
};

// Feature Type IDs (from XML documentation)
const FEATURE_TYPES = {
  WEBSITE: 14,
  EMAIL: 21,
  LOCATION: 25,
  IFCA_DETERMINATION: 104,
  ADDITIONAL_SANCTIONS: 125,
  EXECUTIVE_ORDER_13662: 204,
  PHONE_NUMBER: 524,
  SECONDARY_SANCTIONS: 504,
  EXECUTIVE_ORDER_13846: 586,
  ORGANIZATION_ESTABLISHED_DATE: 646,
  ORGANIZATION_TYPE: 647,
  LISTING_DATE_EO_14024_DIR_2: 951,
  LISTING_DATE_EO_14024_DIR_3: 953
};

// Sector keywords
const SECTOR_KEYWORDS = {
  'Food & Agriculture': [
    'food', 'agricultural', 'agriculture', 'farming', 'dairy', 'meat',
    'vegetables', 'fruits', 'fruit', 'grain', 'livestock', 'poultry',
    'fish', 'seafood', 'beverage', 'restaurant', 'cafe', 'catering',
    'grocery', 'supermarket', 'bakery', 'sweet', 'مواد غذائية', 'زراعة', 
    'أغذية', 'مطعم', 'حلويات'
  ],
  'Construction': [
    'construction', 'building', 'contractor', 'infrastructure',
    'engineering', 'engineer', 'cement', 'concrete', 'steel', 'real estate',
    'property', 'developer', 'architecture', 'إنشاءات', 'بناء', 'مقاولات', 
    'عقارات', 'هندسة'
  ]
};

// Helper functions
function toArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function detectSector(name, aliases = [], remarks = []) {
  const searchText = [name, ...aliases, ...remarks].join(' ').toLowerCase();
  
  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return sector;
      }
    }
  }
  return null;
}

function extractTextValue(val) {
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val['#text']) return val['#text'];
  if (typeof val === 'object' && val) return String(val);
  return null;
}

function extractName(nameParts) {
  return toArray(nameParts)
    .map(part => extractTextValue(part.NamePartValue))
    .filter(Boolean)
    .join(' ');
}

// Main parser
async function parseOFACXML() {
  const startTime = Date.now();

  console.log('📁 Reading XML file...');
  const xmlContent = fs.readFileSync(XML_FILE, 'utf8');
  const fileSizeMB = (fs.statSync(XML_FILE).size / 1024 / 1024).toFixed(2);
  console.log(`   Size: ${fileSizeMB} MB\n`);

  console.log('⚙️  Parsing XML structure...\n');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: true,
    trimValues: true
  });

  const result = parser.parse(xmlContent);
  const sanctions = result.Sanctions || {};
  const referenceValueSets = sanctions.ReferenceValueSets || {};

  // Build lookup maps
  const areaCodeMap = {};
  toArray(referenceValueSets.AreaCodeValues?.AreaCode).forEach(area => {
    if (area && area['@_ID']) {
      areaCodeMap[area['@_ID']] = {
        description: area['@_Description'],
        code: area['#text']
      };
    }
  });

  const partyTypeMap = {};
  toArray(referenceValueSets.PartyTypeValues?.PartyType).forEach(type => {
    if (type && type['@_ID']) {
      partyTypeMap[type['@_ID']] = type['#text'];
    }
  });

  const partySubTypeMap = {};
  toArray(referenceValueSets.PartySubTypeValues?.PartySubType).forEach(subtype => {
    if (subtype && subtype['@_ID']) {
      partySubTypeMap[subtype['@_ID']] = {
        partyTypeId: subtype['@_PartyTypeID'],
        name: subtype['#text']
      };
    }
  });

  const aliasTypeMap = {};
  toArray(referenceValueSets.AliasTypeValues?.AliasType).forEach(type => {
    if (type && type['@_ID']) {
      aliasTypeMap[type['@_ID']] = type['#text'];
    }
  });

  console.log('✓ Reference data extracted');
  console.log(`   - ${Object.keys(areaCodeMap).length} countries`);
  console.log(`   - ${Object.keys(partyTypeMap).length} party types\n`);

  // Extract locations
  const locationMap = {};
  toArray(sanctions.Locations?.Location).forEach(loc => {
    if (!loc || !loc['@_ID']) return;
    
    const locationId = loc['@_ID'];
    const countryId = loc.LocationCountry?.['@_CountryID'];
    
    const parts = {};
    toArray(loc.LocationPart).forEach(part => {
      const typeId = part['@_LocPartTypeID'];
      const value = part.LocationPartValue?.Value;
      if (typeId && value) {
        parts[typeId] = value;
      }
    });

    locationMap[locationId] = {
      countryId,
      countryName: countryId && areaCodeMap[countryId] ? areaCodeMap[countryId].description : null,
      street: parts['1451'],
      district: parts['1452'],
      city: parts['1454'],
      province: parts['1455'],
      postalCode: parts['1456']
    };
  });

  console.log('✓ Locations extracted');
  console.log(`   - ${Object.keys(locationMap).length} locations\n`);

  // Extract ID Documents
  console.log('📝 Extracting ID Documents...');
  const idDocuments = {};
  toArray(sanctions.IDRegDocuments?.IDRegDocument).forEach(doc => {
    if (!doc || !doc['@_ID']) return;
    
    const docId = doc['@_ID'];
    const identityId = doc['@_IdentityID'];
    const docTypeId = doc['@_IDRegDocTypeID'];
    const issuedByCountryId = doc['@_IssuedBy-CountryID'];
    
    idDocuments[identityId] = idDocuments[identityId] || [];
    idDocuments[identityId].push({
      type: `Type-${docTypeId}`,
      number: doc.IDRegistrationNo || '',
      issuingAuthority: doc.IssuingAuthority || '',
      issuingCountry: issuedByCountryId && areaCodeMap[issuedByCountryId] 
        ? areaCodeMap[issuedByCountryId].description 
        : null
    });
  });

  console.log(`✓ ID Documents extracted: ${Object.keys(idDocuments).length} identities\n`);

  // Parse DistinctParties
  console.log('🔍 Parsing entities...');
  const distinctParties = toArray(sanctions.DistinctParties?.DistinctParty);
  console.log(`   Total parties: ${distinctParties.length}\n`);

  const entities = [];
  let entityCount = 0;
  let individualCount = 0;
  let arabEntityCount = 0;

  for (const party of distinctParties) {
    if (!party || !party['@_FixedRef']) continue;

    const fixedRef = party['@_FixedRef'];
    const profile = party.Profile;
    if (!profile) continue;

    const partySubTypeId = profile['@_PartySubTypeID'];
    
    // Skip individuals
    if (partySubTypeId === 4) {
      individualCount++;
      continue;
    }

    entityCount++;

    // Extract identity
    const identity = profile.Identity;
    if (!identity) continue;

    const identityId = identity['@_ID'];
    const primaryAlias = toArray(identity.Alias).find(a => a['@_Primary'] === true);
    if (!primaryAlias) continue;

    const documentedName = toArray(primaryAlias.DocumentedName)[0];
    if (!documentedName) continue;

    const name = extractName(documentedName.DocumentedNamePart);
    if (!name) continue;

    // Extract features
    const features = toArray(profile.Feature);
    
    // Get addresses (FeatureTypeID = 25)
    const addressFeatures = features.filter(f => f['@_FeatureTypeID'] === FEATURE_TYPES.LOCATION);
    const countries = new Set();
    const addresses = [];

    for (const addrFeature of addressFeatures) {
      const featureVersion = addrFeature.FeatureVersion;
      if (!featureVersion) continue;

      const locationId = featureVersion.VersionLocation?.['@_LocationID'];
      if (locationId && locationMap[locationId]) {
        const loc = locationMap[locationId];
        const countryName = loc.countryName;
        
        if (countryName) {
          countries.add(countryName);
          addresses.push({
            country: countryName,
            city: loc.city,
            street: loc.street,
            province: loc.province,
            postalCode: loc.postalCode,
            full: [loc.street, loc.district, loc.city, loc.province, loc.postalCode, countryName]
              .filter(Boolean)
              .join(', ')
          });
        }
      }
    }

    // Filter: Keep only entities with Arab countries
    const hasArabCountry = Array.from(countries).some(country => 
      Object.values(ARAB_COUNTRIES).includes(country)
    );

    if (!hasArabCountry) continue;

    arabEntityCount++;

    // Extract aliases
    const aliases = [];
    toArray(identity.Alias).forEach(alias => {
      const aliasTypeId = alias['@_AliasTypeID'];
      const aliasType = aliasTypeMap[aliasTypeId];
      
      toArray(alias.DocumentedName).forEach(docName => {
        const aliasName = extractName(docName.DocumentedNamePart);
        
        if (aliasName && aliasName !== name) {
          aliases.push({
            name: aliasName,
            type: aliasType
          });
        }
      });
    });

    // 🔥 NEW: Extract programs and sanctions info
    const programs = [];
    const legalBasis = [];
    
    features.forEach(f => {
      const featureTypeId = f['@_FeatureTypeID'];
      const featureVersion = f.FeatureVersion;
      if (!featureVersion) return;

      const detail = featureVersion.VersionDetail;
      if (!detail) return;

      const detailText = typeof detail === 'string' ? detail : detail['#text'];
      
      if (featureTypeId === FEATURE_TYPES.ADDITIONAL_SANCTIONS && detailText) {
        programs.push(detailText);
      }
      if (featureTypeId === FEATURE_TYPES.SECONDARY_SANCTIONS && detailText) {
        programs.push(detailText);
      }
      if (featureTypeId === FEATURE_TYPES.EXECUTIVE_ORDER_13662 && detailText) {
        legalBasis.push(detailText);
      }
      if (featureTypeId === FEATURE_TYPES.EXECUTIVE_ORDER_13846 && detailText) {
        legalBasis.push(detailText);
      }
    });

    // 🔥 NEW: Extract listed date
    let listedDate = null;
    features.forEach(f => {
      const featureTypeId = f['@_FeatureTypeID'];
      if (featureTypeId === FEATURE_TYPES.ORGANIZATION_ESTABLISHED_DATE ||
          featureTypeId === FEATURE_TYPES.LISTING_DATE_EO_14024_DIR_2 ||
          featureTypeId === FEATURE_TYPES.LISTING_DATE_EO_14024_DIR_3) {
        
        const featureVersion = f.FeatureVersion;
        if (featureVersion) {
          const datePeriod = featureVersion.DatePeriod;
          if (datePeriod && datePeriod.Start && datePeriod.Start.From) {
            const from = datePeriod.Start.From;
            if (from.Year) {
              const year = from.Year;
              const month = from.Month || '01';
              const day = from.Day || '01';
              listedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
          }
        }
      }
    });

    // 🔥 NEW: Extract remarks (Comments)
    const remarks = [];
    const comment = party.Comment;
    if (comment && typeof comment === 'string' && comment.trim()) {
      remarks.push(comment.trim());
    }

    // 🔥 NEW: Extract additional info from features
    features.forEach(f => {
      const featureTypeId = f['@_FeatureTypeID'];
      const featureVersion = f.FeatureVersion;
      if (!featureVersion) return;

      const detail = featureVersion.VersionDetail;
      if (!detail) return;

      const detailText = detail['@_DetailTypeID'] === 1432 
        ? (typeof detail === 'string' ? detail : detail['#text'])
        : null;
      
      if (detailText && typeof detailText === 'string' && detailText.trim()) {
        // Website, Email, Phone
        if (featureTypeId === FEATURE_TYPES.WEBSITE ||
            featureTypeId === FEATURE_TYPES.EMAIL ||
            featureTypeId === FEATURE_TYPES.PHONE_NUMBER) {
          remarks.push(detailText.trim());
        }
      }
    });

    // 🔥 NEW: Extract ID numbers from identity
    const idNumbers = idDocuments[identityId] || [];

    // Get entity type
    const partySubTypeInfo = partySubTypeMap[partySubTypeId];
    const partyTypeId = partySubTypeInfo?.partyTypeId;
    const entityType = partyTypeMap[partyTypeId] || 'Entity';

    // Detect sector
    const sector = detectSector(name, aliases.map(a => a.name), remarks);

    // Store entity
    entities.push({
      fixedRef,
      name,
      type: entityType,
      sector,
      aliases,
      countries: Array.from(countries),
      addresses,
      programs,
      legalBasis,
      idNumbers,
      remarks,
      listedDate
    });
  }

  console.log('✓ Parsing complete!');
  console.log(`   Total parties: ${distinctParties.length}`);
  console.log(`   Individuals: ${individualCount}`);
  console.log(`   Entities: ${entityCount}`);
  console.log(`   🎯 Arab entities: ${arabEntityCount}\n`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`⏱️  Time elapsed: ${elapsed}s\n`);

  return entities;
}

// Database insertion
function insertIntoDatabase(entities) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('💾 Inserting into database...');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const db = new Database(DB_FILE);

  console.log('🗑️  Clearing old data...');
  db.prepare('DELETE FROM entity_remarks WHERE entity_uid LIKE ?').run('OFAC-%');
  db.prepare('DELETE FROM entity_id_numbers WHERE entity_uid LIKE ?').run('OFAC-%');
  db.prepare('DELETE FROM entity_legal_basis WHERE entity_uid LIKE ?').run('OFAC-%');
  db.prepare('DELETE FROM entity_programs WHERE entity_uid LIKE ?').run('OFAC-%');
  db.prepare('DELETE FROM entity_addresses WHERE entity_uid LIKE ?').run('OFAC-%');
  db.prepare('DELETE FROM entity_aliases WHERE entity_uid LIKE ?').run('OFAC-%');
  db.prepare('DELETE FROM entity_countries WHERE entity_uid LIKE ?').run('OFAC-%');
  db.prepare('DELETE FROM ofac_entities WHERE uid LIKE ?').run('OFAC-%');
  console.log('✓ Old data cleared\n');

  // Prepare statements
  const insertEntity = db.prepare(`
    INSERT OR REPLACE INTO ofac_entities (uid, name, type, sector, listed_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const insertCountry = db.prepare(`
    INSERT INTO entity_countries (entity_uid, country)
    VALUES (?, ?)
  `);

  const insertAlias = db.prepare(`
    INSERT INTO entity_aliases (entity_uid, alias, alias_type)
    VALUES (?, ?, ?)
  `);

  const insertAddress = db.prepare(`
    INSERT INTO entity_addresses (entity_uid, address, country, city, street, province, postal_code)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertProgram = db.prepare(`
    INSERT INTO entity_programs (entity_uid, program)
    VALUES (?, ?)
  `);

  const insertLegalBasis = db.prepare(`
    INSERT INTO entity_legal_basis (entity_uid, legal_basis)
    VALUES (?, ?)
  `);

  const insertIDNumber = db.prepare(`
    INSERT INTO entity_id_numbers (entity_uid, id_type, id_number, issuing_authority, issuing_country)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertRemark = db.prepare(`
    INSERT INTO entity_remarks (entity_uid, remark)
    VALUES (?, ?)
  `);

  console.log('📥 Inserting entities...');
  
  const transaction = db.transaction((entities) => {
    let inserted = 0;
    let stats = {
      programs: 0,
      legalBasis: 0,
      idNumbers: 0,
      remarks: 0,
      listedDates: 0,
      sectors: 0
    };
    
    for (const entity of entities) {
      const uid = `OFAC-${entity.fixedRef}`;
      
      // Insert main entity
      insertEntity.run(uid, entity.name, entity.type, entity.sector, entity.listedDate);
      
      if (entity.sector) stats.sectors++;
      if (entity.listedDate) stats.listedDates++;
      
      // Insert countries
      for (const country of entity.countries) {
        insertCountry.run(uid, country);
      }
      
      // Insert aliases
      for (const alias of entity.aliases) {
        insertAlias.run(uid, alias.name, alias.type);
      }
      
      // Insert addresses
      for (const address of entity.addresses) {
        insertAddress.run(
          uid,
          address.full,
          address.country,
          address.city,
          address.street,
          address.province,
          address.postalCode
        );
      }
      
      // Insert programs
      for (const program of entity.programs) {
        insertProgram.run(uid, program);
        stats.programs++;
      }
      
      // Insert legal basis
      for (const legal of entity.legalBasis) {
        insertLegalBasis.run(uid, legal);
        stats.legalBasis++;
      }
      
      // Insert ID numbers
      for (const idNum of entity.idNumbers) {
        insertIDNumber.run(uid, idNum.type, idNum.number, idNum.issuingAuthority, idNum.issuingCountry);
        stats.idNumbers++;
      }
      
      // Insert remarks
      for (const remark of entity.remarks) {
        insertRemark.run(uid, remark);
        stats.remarks++;
      }
      
      inserted++;
      if (inserted % 50 === 0) {
        process.stdout.write(`\r   Progress: ${inserted}/${entities.length}`);
      }
    }
    
    console.log(`\r   Progress: ${inserted}/${entities.length}`);
    return { inserted, stats };
  });

  const result = transaction(entities);

  // Update sync metadata
  db.prepare(`
    INSERT INTO ofac_sync_metadata (last_sync_date, total_entities, filtered_entities, sync_status)
    VALUES (datetime('now'), ?, ?, 'success')
  `).run(entities.length, result.inserted);

  db.close();

  console.log('\n✓ Database insert complete!');
  console.log(`   Total inserted: ${result.inserted} entities`);
  console.log(`\n📊 Extracted Data Statistics:`);
  console.log(`   Programs: ${result.stats.programs}`);
  console.log(`   Legal Basis: ${result.stats.legalBasis}`);
  console.log(`   ID Numbers: ${result.stats.idNumbers}`);
  console.log(`   Remarks: ${result.stats.remarks}`);
  console.log(`   Listed Dates: ${result.stats.listedDates}`);
  console.log(`   Sectors: ${result.stats.sectors}\n`);

  return result;
}

// Statistics
function printStatistics(entities) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 Statistics');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // By sector
  const bySector = {};
  entities.forEach(e => {
    const sector = e.sector || 'Unknown';
    bySector[sector] = (bySector[sector] || 0) + 1;
  });

  console.log('🏢 By Sector:');
  Object.entries(bySector)
    .sort((a, b) => b[1] - a[1])
    .forEach(([sector, count]) => {
      console.log(`   ${sector}: ${count}`);
    });

  // By country
  const byCountry = {};
  entities.forEach(e => {
    e.countries.forEach(country => {
      byCountry[country] = (byCountry[country] || 0) + 1;
    });
  });

  console.log('\n🌍 By Country (Top 10):');
  Object.entries(byCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([country, count]) => {
      console.log(`   ${country}: ${count}`);
    });

  console.log('\n');
}

// Main
async function main() {
  try {
    const entities = await parseOFACXML();
    
    if (entities.length === 0) {
      console.log('⚠️  No entities found!');
      return;
    }

    printStatistics(entities);
    insertIntoDatabase(entities);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ OFAC XML Parsing Complete (ENHANCED)!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

