/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OFAC Sanctions Data Sync Module
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Purpose: Download, parse, and sync OFAC sanctions data to local SQLite database
 * Source: https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/ADVANCED_XML
 */

const axios = require('axios');
const xml2js = require('xml2js');
const { searchOFACWithEmbeddings } = require('./ofac-embeddings');

// ═══════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════

const OFAC_CONFIG = {
  URL: 'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/ADVANCED_XML',
  TIMEOUT: 120000, // 2 minutes for large file
  
  // Target countries (Middle East + Egypt)
  TARGET_COUNTRIES: [
    'Egypt', 'Yemen', 'United Arab Emirates', 'Saudi Arabia',
    'Oman', 'Qatar', 'Bahrain', 'Kuwait', 'UAE', 'KSA'
  ],
  
  // Food & Agriculture keywords
  FOOD_KEYWORDS: [
    'food', 'agriculture', 'farming', 'dairy', 'meat', 
    'poultry', 'grain', 'flour', 'bakery', 'beverage',
    'restaurant', 'catering', 'grocery', 'supermarket',
    'produce', 'livestock', 'fishery', 'mill'
  ],
  
  // Construction keywords
  CONSTRUCTION_KEYWORDS: [
    'construction', 'building', 'cement', 'concrete',
    'contractor', 'infrastructure', 'engineering',
    'real estate', 'developer', 'architecture',
    'steel', 'iron', 'materials', 'excavation'
  ]
};

// ═══════════════════════════════════════════════════════════════════
// Main Sync Function
// ═══════════════════════════════════════════════════════════════════

async function syncOFACData(db) {
  console.log('🔄 [OFAC SYNC] Starting OFAC data synchronization...');
  const startTime = Date.now();
  
  try {
    // Step 1: Download XML data
    console.log('📥 [OFAC SYNC] Downloading OFAC XML data...');
    const xmlData = await downloadOFACData();
    console.log(`✓ [OFAC SYNC] Downloaded ${(xmlData.length / 1024 / 1024).toFixed(2)} MB`);
    
    // Step 2: Parse XML
    console.log('🔍 [OFAC SYNC] Parsing XML data...');
    const entities = await parseOFACXML(xmlData);
    console.log(`✓ [OFAC SYNC] Parsed ${entities.length} total entities`);
    
    // Step 3: Filter entities
    console.log('🎯 [OFAC SYNC] Applying filters...');
    const filteredEntities = filterEntities(entities);
    console.log(`✓ [OFAC SYNC] Filtered to ${filteredEntities.length} matching entities`);
    
    // Step 4: Clear old data
    console.log('🗑️ [OFAC SYNC] Clearing old data...');
    clearOFACData(db);
    
    // Step 5: Insert new data
    console.log('💾 [OFAC SYNC] Inserting new data...');
    await insertOFACData(db, filteredEntities);
    
    // Step 6: Update metadata
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    updateSyncMetadata(db, {
      total_entities: entities.length,
      filtered_entities: filteredEntities.length,
      sync_status: 'success',
      error_message: null
    });
    
    console.log(`✅ [OFAC SYNC] Sync completed successfully in ${duration}s`);
    console.log(`📊 [OFAC SYNC] Stats: ${filteredEntities.length}/${entities.length} entities stored`);
    
    return {
      success: true,
      totalEntities: entities.length,
      filteredEntities: filteredEntities.length,
      duration: duration
    };
    
  } catch (error) {
    console.error('❌ [OFAC SYNC] Sync failed:', error.message);
    updateSyncMetadata(db, {
      sync_status: 'failed',
      error_message: error.message
    });
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Download OFAC Data
// ═══════════════════════════════════════════════════════════════════

async function downloadOFACData() {
  const https = require('https');
  const response = await axios.get(OFAC_CONFIG.URL, {
    timeout: OFAC_CONFIG.TIMEOUT,
    responseType: 'text',
    httpsAgent: new https.Agent({  
      rejectUnauthorized: false  // For development only
    })
  });
  return response.data;
}

// ═══════════════════════════════════════════════════════════════════
// Parse XML Data
// ═══════════════════════════════════════════════════════════════════

async function parseOFACXML(xmlData) {
  const parser = new xml2js.Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(xmlData);
  
  // Navigate XML structure (adjust based on actual OFAC XML format)
  const sdnList = result?.sdnList?.sdnEntry || [];
  
  const entities = (Array.isArray(sdnList) ? sdnList : [sdnList])
    .filter(entry => entry)
    .map(entry => ({
      uid: entry.uid || entry.$.uid || `OFAC-${Date.now()}-${Math.random()}`,
      name: entry.firstName && entry.lastName 
        ? `${entry.firstName} ${entry.lastName}`.trim()
        : entry.name || 'Unknown',
      type: determineEntityType(entry),
      aliases: extractAliases(entry),
      addresses: extractAddresses(entry),
      countries: extractCountries(entry),
      programs: extractPrograms(entry),
      legalBasis: extractLegalBasis(entry),
      sanctionsReasons: extractSanctionsReasons(entry),
      listedDate: entry.dateOfBirth || entry.listedDate || null,
      idNumbers: extractIDNumbers(entry),
      remarks: extractRemarks(entry)
    }));
  
  return entities;
}

function determineEntityType(entry) {
  const sdnType = (entry.sdnType || '').toLowerCase();
  if (sdnType.includes('individual')) return 'Individual';
  if (sdnType.includes('vessel')) return 'Vessel';
  if (sdnType.includes('aircraft')) return 'Aircraft';
  return 'Entity';
}

function extractAliases(entry) {
  const akaList = entry.akaList?.aka || [];
  const aliases = Array.isArray(akaList) ? akaList : [akaList];
  return aliases
    .filter(aka => aka)
    .map(aka => {
      if (typeof aka === 'string') return aka;
      if (aka.firstName && aka.lastName) return `${aka.firstName} ${aka.lastName}`.trim();
      if (aka.name) return aka.name;
      return null;
    })
    .filter(Boolean);
}

function extractAddresses(entry) {
  const addressList = entry.addressList?.address || [];
  const addresses = Array.isArray(addressList) ? addressList : [addressList];
  return addresses
    .filter(addr => addr)
    .map(addr => {
      if (typeof addr === 'string') return addr;
      const parts = [];
      if (addr.address1) parts.push(addr.address1);
      if (addr.address2) parts.push(addr.address2);
      if (addr.address3) parts.push(addr.address3);
      if (addr.city) parts.push(addr.city);
      if (addr.stateOrProvince) parts.push(addr.stateOrProvince);
      if (addr.postalCode) parts.push(addr.postalCode);
      if (addr.country) parts.push(addr.country);
      return parts.join(', ');
    })
    .filter(Boolean);
}

function extractCountries(entry) {
  const countries = new Set();
  
  // From addresses
  const addressList = entry.addressList?.address || [];
  const addresses = Array.isArray(addressList) ? addressList : [addressList];
  addresses.forEach(addr => {
    if (addr && addr.country) {
      countries.add(addr.country);
    }
  });
  
  // From citizenship/nationality
  if (entry.citizenship) countries.add(entry.citizenship);
  if (entry.nationality) countries.add(entry.nationality);
  
  return Array.from(countries);
}

function extractPrograms(entry) {
  const programList = entry.programList?.program || [];
  const programs = Array.isArray(programList) ? programList : [programList];
  return programs.filter(Boolean).map(p => typeof p === 'string' ? p : p._);
}

function extractLegalBasis(entry) {
  // This depends on XML structure - adjust as needed
  return [];
}

function extractSanctionsReasons(entry) {
  const remarks = entry.remarks || '';
  return [remarks].filter(Boolean);
}

function extractIDNumbers(entry) {
  const idList = entry.idList?.id || [];
  const ids = Array.isArray(idList) ? idList : [idList];
  return ids
    .filter(id => id)
    .map(id => ({
      type: id.idType || 'Unknown',
      number: id.idNumber || id._ || 'N/A',
      issuingAuthority: id.idCountry || null,
      issuedDate: null
    }));
}

function extractRemarks(entry) {
  const remarks = entry.remarks || entry.comment || '';
  return remarks ? [remarks] : [];
}

// ═══════════════════════════════════════════════════════════════════
// Filter Entities
// ═══════════════════════════════════════════════════════════════════

function filterEntities(entities) {
  return entities.filter(entity => {
    // Filter 1: Only Entities (companies)
    if (entity.type !== 'Entity') {
      return false;
    }
    
    // Filter 2: Must be in target countries
    const hasTargetCountry = entity.countries.some(country =>
      OFAC_CONFIG.TARGET_COUNTRIES.some(target =>
        country.toLowerCase().includes(target.toLowerCase()) ||
        target.toLowerCase().includes(country.toLowerCase())
      )
    );
    
    if (!hasTargetCountry) {
      return false;
    }
    
    // Filter 3: Must be in food or construction sector
    const allText = [
      entity.name,
      ...entity.aliases,
      ...entity.remarks,
      ...entity.addresses
    ].join(' ').toLowerCase();
    
    const isFood = OFAC_CONFIG.FOOD_KEYWORDS.some(keyword => allText.includes(keyword));
    const isConstruction = OFAC_CONFIG.CONSTRUCTION_KEYWORDS.some(keyword => allText.includes(keyword));
    
    if (isFood) {
      entity.sector = 'Food & Agriculture';
      return true;
    } else if (isConstruction) {
      entity.sector = 'Construction';
      return true;
    }
    
    return false;
  });
}

// ═══════════════════════════════════════════════════════════════════
// Database Operations
// ═══════════════════════════════════════════════════════════════════

function clearOFACData(db) {
  db.prepare('DELETE FROM entity_remarks').run();
  db.prepare('DELETE FROM entity_id_numbers').run();
  db.prepare('DELETE FROM entity_addresses').run();
  db.prepare('DELETE FROM entity_aliases').run();
  db.prepare('DELETE FROM entity_legal_basis').run();
  db.prepare('DELETE FROM entity_programs').run();
  db.prepare('DELETE FROM entity_countries').run();
  db.prepare('DELETE FROM ofac_entities').run();
}

async function insertOFACData(db, entities) {
  const insertEntity = db.prepare(`
    INSERT INTO ofac_entities (uid, name, type, sector, listed_date)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const insertCountry = db.prepare(`
    INSERT INTO entity_countries (entity_uid, country) VALUES (?, ?)
  `);
  
  const insertProgram = db.prepare(`
    INSERT INTO entity_programs (entity_uid, program) VALUES (?, ?)
  `);
  
  const insertAlias = db.prepare(`
    INSERT INTO entity_aliases (entity_uid, alias) VALUES (?, ?)
  `);
  
  const insertAddress = db.prepare(`
    INSERT INTO entity_addresses (entity_uid, address) VALUES (?, ?)
  `);
  
  const insertIDNumber = db.prepare(`
    INSERT INTO entity_id_numbers (entity_uid, id_type, id_number) VALUES (?, ?, ?)
  `);
  
  const insertRemark = db.prepare(`
    INSERT INTO entity_remarks (entity_uid, remark) VALUES (?, ?)
  `);
  
  // Use transaction for performance
  const insertAll = db.transaction((entities) => {
    for (const entity of entities) {
      // Insert main entity
      insertEntity.run(entity.uid, entity.name, entity.type, entity.sector, entity.listedDate);
      
      // Insert related data
      entity.countries.forEach(c => insertCountry.run(entity.uid, c));
      entity.programs.forEach(p => insertProgram.run(entity.uid, p));
      entity.aliases.forEach(a => insertAlias.run(entity.uid, a));
      entity.addresses.forEach(a => insertAddress.run(entity.uid, a));
      entity.idNumbers.forEach(id => insertIDNumber.run(entity.uid, id.type, id.number));
      entity.remarks.forEach(r => insertRemark.run(entity.uid, r));
    }
  });
  
  insertAll(entities);
}

function updateSyncMetadata(db, data) {
  db.prepare(`
    INSERT INTO ofac_sync_metadata (
      last_sync_date, total_entities, filtered_entities, 
      sync_status, error_message
    ) VALUES (datetime('now'), ?, ?, ?, ?)
  `).run(
    data.total_entities || 0,
    data.filtered_entities || 0,
    data.sync_status,
    data.error_message
  );
}

// ═══════════════════════════════════════════════════════════════════
// Search Local OFAC Database with OpenAI Fuzzy Matching
// ═══════════════════════════════════════════════════════════════════

async function searchLocalOFACWithAI(db, companyName, country = null) {
  console.log(`🔍 [OFAC SEARCH] Searching for: "${companyName}"${country ? ` in ${country}` : ''}`);
  
  // Step 1: SQL LIKE search for quick exact/partial matches
  let sqlQuery = `
    SELECT DISTINCT e.*, 
      GROUP_CONCAT(DISTINCT c.country) as countries,
      GROUP_CONCAT(DISTINCT a.alias) as aliases
    FROM ofac_entities e
    LEFT JOIN entity_countries c ON e.uid = c.entity_uid
    LEFT JOIN entity_aliases a ON e.uid = a.entity_uid
    WHERE (
      e.name LIKE ? OR 
      a.alias LIKE ?
    )
  `;
  
  const params = [`%${companyName}%`, `%${companyName}%`];
  
  if (country) {
    sqlQuery += ` AND c.country LIKE ?`;
    params.push(`%${country}%`);
  }
  
  sqlQuery += ` GROUP BY e.uid LIMIT 20`; // Top 20 SQL matches
  
  let results = db.prepare(sqlQuery).all(...params);
  console.log(`📊 [OFAC SEARCH] SQL found ${results.length} matches`);
  
  // If no SQL matches, get broader set for AI matching
  if (results.length === 0) {
    console.log(`🤖 [OFAC SEARCH] No SQL matches - using AI for broader search`);
    
    let broadQuery = `
      SELECT DISTINCT e.*, 
        GROUP_CONCAT(DISTINCT c.country) as countries,
        GROUP_CONCAT(DISTINCT a.alias) as aliases
      FROM ofac_entities e
      LEFT JOIN entity_countries c ON e.uid = c.entity_uid
      LEFT JOIN entity_aliases a ON e.uid = a.entity_uid
    `;
    
    if (country) {
      broadQuery += ` WHERE c.country LIKE ?`;
      results = db.prepare(broadQuery + ` GROUP BY e.uid LIMIT 100`).all(`%${country}%`);
    } else {
      results = db.prepare(broadQuery + ` WHERE 1=1 GROUP BY e.uid LIMIT 100`).all();
    }
    
    console.log(`📊 [OFAC SEARCH] Fetched ${results.length} entities for AI matching`);
  }
  
  // Parse concatenated fields
  const parsedResults = results.map(row => ({
    ...row,
    countries: row.countries ? row.countries.split(',') : [],
    aliases: row.aliases ? row.aliases.split(',').filter(Boolean) : []
  }));
  
  // Step 2: Embeddings-based Semantic Search (MUCH better than GPT!)
  if (parsedResults.length > 0) {
    try {
      const API_KEY = process.env.OPENAI_API_KEY;
      const aiResults = await searchOFACWithEmbeddings(companyName, parsedResults, API_KEY);
      console.log(`✅ [OFAC SEARCH] Embeddings returned ${aiResults.length} ranked matches`);
      return aiResults;
    } catch (error) {
      console.warn(`⚠️ [OFAC SEARCH] Embeddings matching failed: ${error.message}`);
      console.log(`📊 [OFAC SEARCH] Returning SQL results only`);
      return parsedResults.map(r => ({
        ...r,
        matchScore: 70,
        matchReason: 'Basic SQL match (AI unavailable)'
      }));
    }
  }
  
  return parsedResults;
}

// OpenAI Fuzzy Matching
async function fuzzyMatchWithOpenAI(searchQuery, candidates) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    console.warn('⚠️ [OFAC AI] No OpenAI API key - skipping fuzzy matching');
    return candidates;
  }
  
  console.log(`🤖 [OFAC AI] Using OpenAI to rank ${candidates.length} candidates`);
  
  // Limit candidates for better performance
  const limitedCandidates = candidates.slice(0, 20);
  
  const prompt = `You are a multilingual sanctions screening AI. Search query: "${searchQuery}"

Entities to check:
${limitedCandidates.map((c, i) => {
    const aliasesText = c.aliases && c.aliases.length > 0 
      ? c.aliases.slice(0, 3).join('; ')
      : 'None';
    return `${i + 1}. ${c.name} | Aliases: ${aliasesText}`;
  }).join('\n')}

TASK: Find entities matching "${searchQuery}" (any language: English/Arabic/etc).

Rules:
- Match name OR alias (fuzzy, case-insensitive)
- Semantic match: "food"="أغذية"="غذائية"
- Transliteration: "Cairo"="القاهرة"
- Typos OK: "fod"="food"
- Word order OK

Return: JSON array of ALL matching indices (1-based), ranked by relevance (best first).
- Include ALL good matches (even if just 1)
- Maximum 10 results
- Empty array [] ONLY if truly NO matches
NO markdown, NO text, ONLY JSON array.

JSON:`;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a sanctions screening expert. Return only valid JSON arrays of numbers. NO markdown.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 100
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    let content = response.data.choices[0].message.content.trim();
    console.log(`🤖 [OFAC AI] OpenAI response: ${content}`);
    
    // Clean up markdown code blocks if present
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    console.log(`🧹 [OFAC AI] Cleaned response: ${content}`);
    
    // Parse JSON array
    const rankedIndices = JSON.parse(content);
    
    if (!Array.isArray(rankedIndices)) {
      throw new Error('OpenAI did not return an array');
    }
    
    // Reorder candidates based on AI ranking
    const rankedResults = rankedIndices
      .map(idx => candidates[idx - 1]) // Convert 1-based to 0-based
      .filter(Boolean);
    
    console.log(`✅ [OFAC AI] Ranked ${rankedResults.length} matches`);
    return rankedResults;
    
  } catch (error) {
    console.error('❌ [OFAC AI] Error:', error.message);
    throw error;
  }
}

// Legacy sync function (for backward compatibility)
function searchLocalOFAC(db, companyName, country = null) {
  console.log(`⚠️ [OFAC SEARCH] Using legacy search (no AI)`);
  
  let query = `
    SELECT DISTINCT e.*, 
      GROUP_CONCAT(DISTINCT c.country) as countries,
      GROUP_CONCAT(DISTINCT a.alias) as aliases
    FROM ofac_entities e
    LEFT JOIN entity_countries c ON e.uid = c.entity_uid
    LEFT JOIN entity_aliases a ON e.uid = a.entity_uid
    WHERE (e.name LIKE ? OR a.alias LIKE ?)
  `;
  
  const params = [`%${companyName}%`, `%${companyName}%`];
  
  if (country) {
    query += ` AND c.country LIKE ?`;
    params.push(`%${country}%`);
  }
  
  query += ` GROUP BY e.uid LIMIT 10`;
  
  const results = db.prepare(query).all(...params);
  
  return results.map(row => ({
    ...row,
    countries: row.countries ? row.countries.split(',') : [],
    aliases: row.aliases ? row.aliases.split(',').filter(Boolean) : []
  }));
}

// ═══════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════

module.exports = {
  syncOFACData,
  searchLocalOFAC,           // Legacy (no AI)
  searchLocalOFACWithAI,     // New AI-powered search
  fuzzyMatchWithOpenAI,
  OFAC_CONFIG
};

