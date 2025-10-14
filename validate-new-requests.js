const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'api', 'mdm_database.db');
const db = new Database(dbPath);

console.log('='.repeat(80));
console.log('VALIDATING "NEW REQUESTS CREATED" COUNT');
console.log('='.repeat(80));

// Current query in backend
console.log('\n1. CURRENT QUERY IN BACKEND:');
console.log('-'.repeat(80));
const currentQuery = `
  SELECT COUNT(*) as count 
  FROM requests 
  WHERE requestType NOT IN ('quarantine', 'duplicate')
  AND (requestType = 'new' OR requestType IS NULL)
  AND createdBy IN ('data_entry', 'Data Entry')
`;
console.log(currentQuery);
const currentCount = db.prepare(currentQuery).get().count;
console.log(`Result: ${currentCount}`);

// Show the actual records
const currentRecords = db.prepare(`
  SELECT id, firstName, requestType, status, createdBy, sourceSystem, origin
  FROM requests 
  WHERE requestType NOT IN ('quarantine', 'duplicate')
  AND (requestType = 'new' OR requestType IS NULL)
  AND createdBy IN ('data_entry', 'Data Entry')
`).all();

console.log(`\nRecords found (${currentRecords.length}):`);
currentRecords.forEach(r => {
  console.log(`  - ${r.firstName} | Type: ${r.requestType} | Status: ${r.status} | Source: ${r.sourceSystem} | Origin: ${r.origin}`);
});

// Check all request types
console.log('\n\n2. ALL REQUEST TYPES IN DATABASE:');
console.log('-'.repeat(80));
const allTypes = db.prepare(`
  SELECT requestType, COUNT(*) as count
  FROM requests
  GROUP BY requestType
  ORDER BY count DESC
`).all();

allTypes.forEach(r => {
  console.log(`  "${r.requestType}": ${r.count}`);
});

// Check records by createdBy
console.log('\n\n3. RECORDS BY createdBy:');
console.log('-'.repeat(80));
const byCreatedBy = db.prepare(`
  SELECT createdBy, requestType, COUNT(*) as count
  FROM requests
  WHERE createdBy IN ('data_entry', 'Data Entry')
  GROUP BY createdBy, requestType
  ORDER BY createdBy, count DESC
`).all();

byCreatedBy.forEach(r => {
  console.log(`  createdBy="${r.createdBy}" | requestType="${r.requestType}": ${r.count}`);
});

// Check what "new requests" should logically be
console.log('\n\n4. ALTERNATIVE INTERPRETATIONS:');
console.log('-'.repeat(80));

// Option A: Records with requestType = 'new' OR 'New'
const optionA = db.prepare(`
  SELECT COUNT(*) as count
  FROM requests
  WHERE LOWER(requestType) = 'new'
`).get().count;
console.log(`A. Records with requestType = 'new' (case-insensitive): ${optionA}`);

// Option B: Records created manually (origin = 'manual' or 'data_entry')
const optionB = db.prepare(`
  SELECT COUNT(*) as count
  FROM requests
  WHERE origin IN ('manual', 'data_entry')
  AND requestType NOT IN ('quarantine', 'duplicate')
`).get().count;
console.log(`B. Records with origin='manual'/'data_entry' (excluding quarantine/duplicate): ${optionB}`);

// Option C: Records NOT from source systems
const optionC = db.prepare(`
  SELECT COUNT(*) as count
  FROM requests
  WHERE (sourceSystem IS NULL OR sourceSystem = '' OR sourceSystem = 'Data Steward')
  AND requestType NOT IN ('quarantine', 'duplicate')
  AND createdBy IN ('data_entry', 'Data Entry')
`).get().count;
console.log(`C. Records created by data_entry without source system: ${optionC}`);

// Option D: All records with requestType = 'new' or 'New' created by data entry
const optionD = db.prepare(`
  SELECT COUNT(*) as count
  FROM requests
  WHERE LOWER(requestType) = 'new'
  AND createdBy IN ('data_entry', 'Data Entry')
`).get().count;
console.log(`D. requestType='new' AND createdBy='data_entry': ${optionD}`);

console.log('\n\n5. RECOMMENDATION:');
console.log('-'.repeat(80));
console.log('The query should likely count records where:');
console.log('  - requestType is actually "new" or "New" (not NULL)');
console.log('  - OR origin = "manual" or "data_entry"');
console.log('  - AND exclude quarantine/duplicate types');

const recommended = db.prepare(`
  SELECT COUNT(*) as count
  FROM requests
  WHERE (LOWER(requestType) = 'new' OR origin IN ('manual', 'data_entry'))
  AND requestType NOT IN ('quarantine', 'duplicate')
`).get().count;
console.log(`\nRecommended count: ${recommended}`);

db.close();

