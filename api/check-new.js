const Database = require('better-sqlite3');
const db = new Database('./api/mdm_database.db');

console.log('\n=== NEW REQUESTS CREATED - VALIDATION ===\n');

// Current query
const current = db.prepare(`
  SELECT COUNT(*) as count 
  FROM requests 
  WHERE requestType NOT IN ('quarantine', 'duplicate')
  AND (requestType = 'new' OR requestType IS NULL)
  AND createdBy IN ('data_entry', 'Data Entry')
`).get().count;
console.log('Current query result:', current);

// Show all requestType values
console.log('\nAll requestType values:');
const types = db.prepare(`
  SELECT requestType, COUNT(*) as count
  FROM requests
  GROUP BY requestType
`).all();
types.forEach(r => console.log(`  "${r.requestType}": ${r.count}`));

// Check case-insensitive 'new'
const newCount = db.prepare(`
  SELECT COUNT(*) as count
  FROM requests
  WHERE LOWER(requestType) = 'new'
`).get().count;
console.log('\nRecords with requestType="new" (case-insensitive):', newCount);

// Correct count should be
const correct = db.prepare(`
  SELECT COUNT(*) as count
  FROM requests
  WHERE LOWER(requestType) = 'new'
  AND createdBy IN ('data_entry', 'Data Entry')
`).get().count;
console.log('\nCORRECT COUNT (requestType=new + createdBy=data_entry):', correct);

db.close();
