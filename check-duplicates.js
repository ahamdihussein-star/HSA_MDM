const Database = require('better-sqlite3');
const db = new Database('./api/mdm_database.db');

console.log('\n=== UNPROCESSED DUPLICATES - ANALYSIS ===\n');

// Current query - counts ALL individual records
const currentQuery = `
  SELECT COUNT(*) as count 
  FROM requests 
  WHERE requestType = 'duplicate' 
  AND status = 'Duplicate'
  AND assignedTo = 'data_entry'
  AND sourceSystem IS NOT NULL
  AND sourceSystem != ''
  AND sourceSystem != 'Master Builder'
`;

const currentCount = db.prepare(currentQuery).get().count;
console.log('1. CURRENT QUERY (Individual Records):');
console.log('   Count:', currentCount);

// Count duplicate GROUPS (by tax number)
const groupCount = db.prepare(`
  SELECT COUNT(DISTINCT tax) as count
  FROM requests 
  WHERE requestType = 'duplicate' 
  AND status = 'Duplicate'
  AND assignedTo = 'data_entry'
  AND sourceSystem IS NOT NULL
  AND sourceSystem != ''
  AND sourceSystem != 'Master Builder'
  AND tax IS NOT NULL
  AND tax != ''
`).get().count;

console.log('\n2. DUPLICATE GROUPS (by tax number):');
console.log('   Count:', groupCount);

// Show breakdown
console.log('\n3. SAMPLE DUPLICATE GROUPS:');
const sampleGroups = db.prepare(`
  SELECT tax, COUNT(*) as recordCount, GROUP_CONCAT(firstName, ' | ') as companies
  FROM requests 
  WHERE requestType = 'duplicate' 
  AND status = 'Duplicate'
  AND assignedTo = 'data_entry'
  AND sourceSystem IS NOT NULL
  AND sourceSystem != ''
  AND sourceSystem != 'Master Builder'
  GROUP BY tax
  LIMIT 5
`).all();

sampleGroups.forEach(g => {
  console.log(`   Tax: ${g.tax} => ${g.recordCount} records`);
  console.log(`      Companies: ${g.companies.substring(0, 100)}...`);
});

console.log('\n4. INTERPRETATION:');
console.log('   - Individual Records:', currentCount, '(what we currently show)');
console.log('   - Duplicate Groups:', groupCount, '(number of unique companies with duplicates)');
console.log('\n   Question: Should we count individual records or groups?');
console.log('   - Individual records = total duplicate records to process');
console.log('   - Groups = number of unique companies that have duplicates');

db.close();
