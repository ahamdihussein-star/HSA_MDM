/**
 * ========================================================================
 * SEARCH WITH PRE-COMPUTED EMBEDDINGS
 * ========================================================================
 * 
 * This module uses the pre-computed embeddings stored in the database
 * to perform fast semantic search without calling OpenAI API on every search.
 */

const axios = require('axios');

// ========================================================================
// COSINE SIMILARITY
// ========================================================================

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  
  return dotProduct / (magnitudeA * magnitudeB);
}

// ========================================================================
// GET QUERY EMBEDDING
// ========================================================================

async function getQueryEmbedding(text, apiKey) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        model: 'text-embedding-3-large',
        input: text.replace(/\n/g, ' ')
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );
    return response.data.data[0].embedding;
  } catch (error) {
    console.error('❌ [EMBEDDING] Error:', error.message);
    throw error;
  }
}

// ========================================================================
// SEARCH OFAC WITH PRE-COMPUTED EMBEDDINGS
// ========================================================================

async function searchOFACWithPrecomputedEmbeddings(db, searchQuery, apiKey, country = null) {
  console.log(`🔍 [OFAC PRECOMPUTED] Searching for: "${searchQuery}"`);
  
  try {
    // 1. Get query embedding
    console.log(`🤖 [OFAC PRECOMPUTED] Getting query embedding...`);
    const queryEmbedding = await getQueryEmbedding(searchQuery, apiKey);
    
    // 2. Get ALL entities with embeddings
    let sql = `
      SELECT 
        o.uid,
        o.name,
        o.embedding,
        o.source
      FROM ofac_entities o
      WHERE o.embedding IS NOT NULL
    `;
    
    // Add country filter if provided
    if (country) {
      sql += ` AND o.uid IN (
        SELECT DISTINCT entity_uid 
        FROM entity_addresses 
        WHERE country LIKE '%${country}%'
      )`;
    }
    
    const entities = db.prepare(sql).all();
    console.log(`📊 [OFAC PRECOMPUTED] Found ${entities.length} entities with embeddings`);
    
    if (entities.length === 0) {
      return [];
    }
    
    // 3. Calculate similarity for each entity
    const results = [];
    
    for (const entity of entities) {
      try {
        const entityEmbedding = JSON.parse(entity.embedding);
        const similarity = cosineSimilarity(queryEmbedding, entityEmbedding);
        
        // Convert to 0-100 score
        const matchScore = Math.round(similarity * 100);
        
        // Only include if similarity > 40%
        if (matchScore >= 40) {
          results.push({
            ...entity,
            matchScore,
            matchReason: getMatchReason(matchScore)
          });
        }
      } catch (error) {
        console.warn(`⚠️ [OFAC PRECOMPUTED] Error processing ${entity.name}:`, error.message);
      }
    }
    
    // 4. Sort by score
    results.sort((a, b) => b.matchScore - a.matchScore);
    
    // 5. Get additional details for top results
    const topResults = results.slice(0, 10);
    const enrichedResults = [];
    
    for (const result of topResults) {
      // Get aliases
      const aliases = db.prepare(`
        SELECT alias
        FROM entity_aliases
        WHERE entity_uid = ?
      `).all(result.uid);
      
      // Get addresses
      const addresses = db.prepare(`
        SELECT country, city, address, street
        FROM entity_addresses
        WHERE entity_uid = ?
      `).all(result.uid);
      
      // Get countries list
      const countries = [...new Set(addresses.map(a => a.country))].join(', ');
      
      enrichedResults.push({
        uid: result.uid,
        name: result.name,
        matchScore: result.matchScore,
        matchReason: result.matchReason,
        source: 'OFAC',
        aliases: aliases.map(a => a.alias),
        addresses: addresses,
        countries: countries || 'Unknown'
      });
    }
    
    console.log(`✅ [OFAC PRECOMPUTED] Returning ${enrichedResults.length} matches`);
    return enrichedResults;
    
  } catch (error) {
    console.error(`❌ [OFAC PRECOMPUTED] Error:`, error.message);
    throw error;
  }
}

// ========================================================================
// SEARCH UN WITH PRE-COMPUTED EMBEDDINGS
// ========================================================================

async function searchUNWithPrecomputedEmbeddings(db, searchQuery, apiKey, country = null) {
  console.log(`🔍 [UN PRECOMPUTED] Searching for: "${searchQuery}"`);
  
  try {
    // 1. Get query embedding
    console.log(`🤖 [UN PRECOMPUTED] Getting query embedding...`);
    const queryEmbedding = await getQueryEmbedding(searchQuery, apiKey);
    
    // 2. Get ALL entities with embeddings
    let sql = `
      SELECT 
        u.id,
        u.dataid,
        u.first_name,
        u.reference_number,
        u.un_list_type,
        u.listed_on,
        u.comments,
        u.name_original_script,
        u.embedding
      FROM un_entities u
      WHERE u.embedding IS NOT NULL
    `;
    
    const entities = db.prepare(sql).all();
    console.log(`📊 [UN PRECOMPUTED] Found ${entities.length} entities with embeddings`);
    
    if (entities.length === 0) {
      return [];
    }
    
    // 3. Calculate similarity for each entity
    const results = [];
    
    for (const entity of entities) {
      try {
        const entityEmbedding = JSON.parse(entity.embedding);
        const similarity = cosineSimilarity(queryEmbedding, entityEmbedding);
        
        // Convert to 0-100 score
        const matchScore = Math.round(similarity * 100);
        
        // Only include if similarity > 40%
        if (matchScore >= 40) {
          results.push({
            ...entity,
            matchScore,
            matchReason: getMatchReason(matchScore)
          });
        }
      } catch (error) {
        console.warn(`⚠️ [UN PRECOMPUTED] Error processing ${entity.first_name}:`, error.message);
      }
    }
    
    // 4. Sort by score
    results.sort((a, b) => b.matchScore - a.matchScore);
    
    // 5. Get additional details for top results
    const topResults = results.slice(0, 10);
    const enrichedResults = [];
    
    for (const result of topResults) {
      // Get aliases
      const aliases = db.prepare(`
        SELECT alias_name
        FROM un_entity_aliases
        WHERE entity_dataid = ?
      `).all(result.dataid);
      
      // Get addresses
      const addresses = db.prepare(`
        SELECT country, city, street, note
        FROM un_entity_addresses
        WHERE entity_dataid = ?
      `).all(result.dataid);
      
      // Get countries list
      const countries = [...new Set(addresses.map(a => a.country).filter(c => c))].join(', ');
      
      enrichedResults.push({
        id: result.id,
        dataid: result.dataid,
        name: result.first_name,
        reference_number: result.reference_number,
        un_list_type: result.un_list_type,
        listed_on: result.listed_on,
        comments: result.comments,
        name_original_script: result.name_original_script,
        matchScore: result.matchScore,
        matchReason: result.matchReason,
        source: 'UN',
        aliases: aliases.map(a => a.alias_name),
        addresses: addresses,
        countries: countries || 'Unknown'
      });
    }
    
    console.log(`✅ [UN PRECOMPUTED] Returning ${enrichedResults.length} matches`);
    return enrichedResults;
    
  } catch (error) {
    console.error(`❌ [UN PRECOMPUTED] Error:`, error.message);
    throw error;
  }
}

// ========================================================================
// HELPER FUNCTIONS
// ========================================================================

function getMatchReason(score) {
  if (score >= 95) return 'Strong semantic match';
  if (score >= 85) return 'Good semantic match';
  if (score >= 70) return 'Moderate semantic match';
  if (score >= 50) return 'Weak semantic match';
  return 'Low confidence match';
}

// ========================================================================
// EXPORTS
// ========================================================================

module.exports = {
  searchOFACWithPrecomputedEmbeddings,
  searchUNWithPrecomputedEmbeddings
};

