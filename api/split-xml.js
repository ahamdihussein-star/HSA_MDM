const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const INPUT_FILE = path.join(__dirname, 'sanctions/sdn_advanced.xml');
const OUTPUT_DIR = path.join(__dirname, 'sanctions/split');
const CHUNK_SIZE = 100; // entities per file

console.log('🔪 XML File Splitter');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📁 Input file: ${INPUT_FILE}`);
console.log(`📂 Output directory: ${OUTPUT_DIR}`);
console.log(`📊 Chunk size: ${CHUNK_SIZE} entities per file`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log('✅ Created output directory\n');
}

// Read and parse XML
console.log('📖 Reading XML file...');
const startTime = Date.now();

let xmlContent;
try {
  xmlContent = fs.readFileSync(INPUT_FILE, 'utf8');
  const fileSize = (fs.statSync(INPUT_FILE).size / 1024 / 1024).toFixed(2);
  console.log(`✅ File read successfully (${fileSize} MB)`);
  console.log(`📏 File length: ${xmlContent.length.toLocaleString()} characters\n`);
} catch (error) {
  console.error('❌ Error reading file:', error.message);
  process.exit(1);
}

console.log('🔍 Parsing XML...');
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '#text',
  parseAttributeValue: true,
  trimValues: true,
  ignoreDeclaration: true,
  preserveOrder: false
});

let data;
try {
  data = parser.parse(xmlContent);
  console.log('✅ XML parsed successfully\n');
} catch (error) {
  console.error('❌ Error parsing XML:', error.message);
  process.exit(1);
}

// Extract entities
const entities = data?.Sanctions?.SanctionsEntries?.SanctionsEntry || [];
console.log(`📊 Total entities found: ${entities.length}\n`);

if (entities.length === 0) {
  console.error('❌ No entities found in XML!');
  process.exit(1);
}

// Split into chunks
const totalChunks = Math.ceil(entities.length / CHUNK_SIZE);
console.log(`✂️  Splitting into ${totalChunks} files...\n`);

let filesCreated = 0;
let entitiesProcessed = 0;

for (let i = 0; i < totalChunks; i++) {
  const start = i * CHUNK_SIZE;
  const end = Math.min(start + CHUNK_SIZE, entities.length);
  const chunk = entities.slice(start, end);
  
  // Create mini XML structure
  const miniXml = {
    Sanctions: {
      SanctionsEntries: {
        SanctionsEntry: chunk
      }
    }
  };
  
  // Convert back to XML string (simple approach)
  const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<Sanctions>
  <SanctionsEntries>
${chunk.map(entity => {
  // Serialize entity back to XML (simplified)
  // For production, use a proper XML builder
  return JSON.stringify(entity, null, 2)
    .replace(/\\/g, '')
    .replace(/"/g, '&quot;');
}).join('\n')}
  </SanctionsEntries>
</Sanctions>`;
  
  // Better approach: Save as JSON for easier processing
  const outputFile = path.join(OUTPUT_DIR, `entities_${String(i + 1).padStart(4, '0')}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(chunk, null, 2));
  
  filesCreated++;
  entitiesProcessed += chunk.length;
  
  const progress = ((entitiesProcessed / entities.length) * 100).toFixed(1);
  console.log(`✅ File ${i + 1}/${totalChunks} created: ${chunk.length} entities (${progress}%)`);
}

const duration = ((Date.now() - startTime) / 1000).toFixed(2);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🎉 Splitting Complete!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✅ Files created: ${filesCreated}`);
console.log(`✅ Entities processed: ${entitiesProcessed}`);
console.log(`⏱️  Duration: ${duration}s`);
console.log(`📂 Output directory: ${OUTPUT_DIR}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Create index file
const indexFile = path.join(OUTPUT_DIR, '_index.json');
const index = {
  totalEntities: entities.length,
  totalFiles: filesCreated,
  entitiesPerFile: CHUNK_SIZE,
  createdAt: new Date().toISOString(),
  files: Array.from({ length: filesCreated }, (_, i) => ({
    file: `entities_${String(i + 1).padStart(4, '0')}.json`,
    start: i * CHUNK_SIZE,
    end: Math.min((i + 1) * CHUNK_SIZE, entities.length),
    count: Math.min(CHUNK_SIZE, entities.length - i * CHUNK_SIZE)
  }))
};

fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
console.log('📋 Index file created: _index.json\n');

console.log('🚀 Next steps:');
console.log('   1. Run: node api/process-split-files.js');
console.log('   2. This will process each file separately');
console.log('   3. Memory usage will be much lower!\n');

