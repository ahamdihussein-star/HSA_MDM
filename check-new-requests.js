const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'api', 'mdm_database.db');
const db = new Database(dbPath);

console.log('Checking "New Requests Created" count...\n');

// Current query in backend
const currentCount = db.prepare(`
  SELECT COUNT(*) as count 
  FROM requests 
  WHERE requestType NOT IN ('quarantine', 'duplicate')
  AND (requestType = 'new' OR requestType IS NULL)
  AND createdBy IN ('data_entry', 'Data Entry')
`).get().count;

console.log(`Current query result: ${currentCount}\n`);

// Let's see what records match this
const currentRecords = db.prepare(`
  SELECT id, firstName, requestType, status, createdBy, sourceSystem, origin
  FROM requests 
  WHERE requestType NOT IN ('quarantine', 'duplicate')
  AND (requestType = 'new' OR requestType IS NULL)
  AND createdBy IN ('data_entry', 'Data Entry')
`).all();

console.log('Records matching current query:');
currentRecords.forEach(r => {
  console.log(`  - ID: ${r.id}, Name: ${r.firstName}, Type: ${r.requestType}, Status: ${r.status}, CreatedBy: ${r.createdBy}, Source: ${r.sourceSystem}, Origin: ${r.origin}`);
});

// Let's check all records created by data_entry
console.log('\n\nAll records created by data_entry:');
const allDataEntry = db.prepare(`
  SELECT requestType, COUNT(*) as count
  FROM requests 
  WHERE createdBy IN ('data_entry', 'Data Entry')
  GROUP BY requestType
  ORDER BY count DESC
`).all();

allDataEntry.forEach(r => {
  console.log(`  - requestType: "${r.requestType}" => ${r.count} records`);
});

// Check what should be "new requests" - typically those created manually, not from systems
console.log('\n\nRecords created by data_entry that are NOT from source systems:');
const manuallyCreated = db.prepare(`
  SELECT COUNT(*) as count
  FROM requests 
  WHERE createdBy IN ('data_entry', 'Data Entry')
  AND (sourceSystem IS NULL OR sourceSystem = '' OR sourceSystem = 'Data Steward')
  AND requestType NOT IN ('quarantine', 'duplicate')
`).get().count;
console.log(`Count: ${manuallyCreated}`);

const manualRecords = db.prepare(`
  SELECT id, firstName, requestType, status, createdBy, sourceSystem, origin
  FROM requests 
  WHERE createdBy IN ('data_entry', 'Data Entry')
  AND (sourceSystem IS NULL OR sourceSystem = '' OR sourceSystem = 'Data Steward')
  AND requestType NOT IN ('quarantine', 'duplicate')
  LIMIT 10
`).all();

console.log('Sample records:');
manualRecords.forEach(r => {
  console.log(`  - ID: ${r.id}, Name: ${r.firstName}, Type: ${r.requestType}, Status: ${r.status}, Source: ${r.sourceSystem}, Origin: ${r.origin}`);
});

// Check origin field
console.log('\n\nBreakdown by origin field:');
const byOrigin = db.prepare(`
  SELECT origin, COUNT(*) as count
  FROM requests 
  WHERE createdBy IN ('data_entry', 'Data Entry')
  GROUP BY origin
  ORDER BY count DESC
`).all();

byOrigin.forEach(r => {
  console.log(`  - origin: "${r.origin}" => ${r.count} records`);
});

// Better query: New requests should be those created manually (origin = 'manual' or 'data_entry')
console.log('\n\nSuggested better query - records with origin = manual or data_entry:');
const betterCount = db.prepare(`
  SELECT COUNT(*) as count
  FROM requests 
  WHERE origin IN ('manual', 'data_entry')
  AND requestType NOT IN ('quarantine', 'duplicate')
`).get().count;
console.log(`Count: ${betterCount}`);

const betterRecords = db.prepare(`
  SELECT id, firstName, requestType, status, createdBy, sourceSystem, origin
  FROM requests 
  WHERE origin IN ('manual', 'data_entry')
  AND requestType NOT IN ('quarantine', 'duplicate')
  LIMIT 10
`).all();

console.log('Sample records:');
betterRecords.forEach(r => {
  console.log(`  - ID: ${r.id}, Name: ${r.firstName}, Type: ${r.requestType}, Status: ${r.status}, CreatedBy: ${r.createdBy}, Source: ${r.sourceSystem}, Origin: ${r.origin}`);
});

db.close();

