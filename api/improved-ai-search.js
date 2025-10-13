/**
 * ========================================================================
 * IMPROVED AI SEARCH - Using OpenAI Embeddings + Better Prompts
 * ========================================================================
 * 
 * Problems with current approach:
 * 1. Weak prompt (no few-shot examples, no clear criteria)
 * 2. gpt-4o-mini is weak for multilingual + transliteration
 * 3. No semantic understanding
 * 
 * Solution:
 * 1. Use OpenAI text-embedding-3-small for semantic similarity
 * 2. Enhanced prompt with few-shot learning
 * 3. Hybrid approach: Embeddings + GPT-4 for complex cases
 */

const axios = require('axios');

// ========================================================================
// APPROACH 1: OpenAI Embeddings (Best for Multilingual)
// ========================================================================

/**
 * Get embedding vector for text using OpenAI
 */
async function getEmbedding(text, apiKey) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        model: 'text-embedding-3-small',  // Fast, cheap, multilingual
        input: text,
        encoding_format: 'float'
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.data[0].embedding;
  } catch (error) {
    console.error('❌ [EMBEDDING] Error:', error.message);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Search using embeddings (semantic similarity)
 */
async function searchWithEmbeddings(searchQuery, candidates, apiKey) {
  console.log(`🧠 [EMBEDDINGS] Generating embeddings for ${candidates.length} candidates...`);
  
  try {
    // Get embedding for search query
    const queryEmbedding = await getEmbedding(searchQuery, apiKey);
    
    // Get embeddings for all candidates (batch for efficiency)
    const candidateTexts = candidates.map(c => {
      const aliases = c.aliases && c.aliases.length > 0 
        ? ` (${c.aliases.join(', ')})`
        : '';
      return `${c.name}${aliases}`;
    });
    
    // Get embeddings for all candidates at once
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        model: 'text-embedding-3-small',
        input: candidateTexts,
        encoding_format: 'float'
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const candidateEmbeddings = response.data.data.map(d => d.embedding);
    
    // Calculate similarities
    const results = candidates.map((candidate, idx) => {
      const similarity = cosineSimilarity(queryEmbedding, candidateEmbeddings[idx]);
      const matchScore = Math.round(similarity * 100);
      
      return {
        ...candidate,
        matchScore,
        matchReason: getMatchReason(similarity, searchQuery, candidate.name),
        similarity
      };
    });
    
    // Sort by similarity (highest first)
    results.sort((a, b) => b.similarity - a.similarity);
    
    // Filter out very low scores
    const filtered = results.filter(r => r.matchScore >= 40);
    
    console.log(`✅ [EMBEDDINGS] Found ${filtered.length} matches with score >= 40%`);
    
    return filtered;
    
  } catch (error) {
    console.error('❌ [EMBEDDINGS] Error:', error.message);
    throw error;
  }
}

function getMatchReason(similarity, query, name) {
  if (similarity >= 0.95) return 'Exact or near-exact match';
  if (similarity >= 0.85) return 'Strong semantic similarity';
  if (similarity >= 0.75) return 'Good match with minor differences';
  if (similarity >= 0.60) return 'Moderate similarity detected';
  if (similarity >= 0.40) return 'Weak match, review carefully';
  return 'Low similarity, likely not a match';
}

// ========================================================================
// APPROACH 2: Enhanced GPT-4 Prompt (Better than mini)
// ========================================================================

/**
 * Enhanced prompt with few-shot learning and clear criteria
 */
async function searchWithEnhancedGPT4(searchQuery, candidates, apiKey) {
  console.log(`🤖 [GPT-4] Using enhanced prompt for ${candidates.length} candidates...`);
  
  // Limit to top 15 for cost efficiency
  const limitedCandidates = candidates.slice(0, 15);
  
  const enhancedPrompt = `You are an expert in sanctions screening with deep knowledge of:
- Multilingual name matching (Arabic, English, transliterations)
- Alias detection and fuzzy matching
- Corporate name variations and abbreviations

TASK: Find entities that match the search query.

SEARCH QUERY: "${searchQuery}"

ENTITIES TO EVALUATE:
${limitedCandidates.map((c, i) => {
  const aliases = c.aliases && c.aliases.length > 0 
    ? c.aliases.slice(0, 3).join('; ')
    : 'None';
  return `${i + 1}. ${c.name}
   Aliases: ${aliases}
   Country: ${c.countries ? c.countries[0] : 'N/A'}`;
}).join('\n\n')}

MATCHING CRITERIA (score 0-100 for each entity):

1. **Name Match (0-40 points)**
   - Exact match: 40 points
   - Close match (1-2 char diff): 35 points
   - Partial match: 20-30 points
   - Word subset: 15-25 points

2. **Alias Match (0-30 points)**
   - Exact alias match: 30 points
   - Close alias match: 25 points
   - Partial alias: 15-20 points

3. **Transliteration (0-20 points)**
   - Arabic ↔ English match: 20 points
   - Phonetic similarity: 15 points
   - Common variations: 10 points

4. **Context (0-10 points)**
   - Country match: +5 points
   - Sector relevance: +3 points
   - Entity type match: +2 points

FEW-SHOT EXAMPLES:

Example 1:
Query: "حنيفة"
Entity: "HANIFA MONEY EXCHANGE OFFICE"
Analysis: "حنيفة" is direct Arabic transliteration of "HANIFA"
Score: 95 (Name: 40 + Transliteration: 20 + Context: 35)

Example 2:
Query: "Hamati"
Entity: "AL-HAMATI SWEETS BAKERIES", Aliases: "Hamati Bakery, حلويات حماطي"
Analysis: Exact match in aliases + Arabic name confirms
Score: 92 (Alias: 30 + Transliteration: 20 + Name: 35 + Context: 7)

Example 3:
Query: "food company"
Entity: "EKO DEVELOPMENT AND INVESTMENT COMPANY", Sector: "Food & Agriculture"
Analysis: Semantic match through sector, not direct name match
Score: 65 (Context: 10 + Partial: 20 + Semantic: 35)

Example 4:
Query: "Cairo Bank"
Entity: "EGYPTIAN NATIONAL BANK", Country: "Egypt"
Analysis: Different name, only country connection
Score: 25 (Context: 5 + Weak semantic: 20)

YOUR ANALYSIS:
For each entity, provide:
1. Reasoning (one sentence)
2. Score (0-100)
3. Confidence level (high/medium/low)

Return ONLY valid JSON array:
[
  {
    "index": 1,
    "score": 95,
    "reasoning": "Direct transliteration match",
    "confidence": "high"
  }
]

Include ALL entities with score >= 40.
Sort by score (highest first).
NO markdown, NO extra text.`;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',  // Better than mini for complex reasoning
        messages: [
          { 
            role: 'system', 
            content: 'You are a sanctions screening expert specializing in multilingual entity matching. Return only valid JSON.'
          },
          { 
            role: 'user', 
            content: enhancedPrompt 
          }
        ],
        temperature: 0.2,  // Low for consistency
        max_tokens: 2000   // More space for detailed reasoning
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      }
    );
    
    let content = response.data.choices[0].message.content.trim();
    console.log(`🤖 [GPT-4] Raw response: ${content.substring(0, 200)}...`);
    
    // Clean markdown
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    const rankings = JSON.parse(content);
    
    if (!Array.isArray(rankings)) {
      throw new Error('GPT-4 did not return an array');
    }
    
    // Map back to full candidates
    const rankedResults = rankings
      .filter(r => r.score >= 40)
      .map(r => {
        const candidate = limitedCandidates[r.index - 1];
        return {
          ...candidate,
          matchScore: r.score,
          matchReason: r.reasoning,
          confidence: r.confidence
        };
      });
    
    console.log(`✅ [GPT-4] Returned ${rankedResults.length} matches >= 40%`);
    
    return rankedResults;
    
  } catch (error) {
    console.error('❌ [GPT-4] Error:', error.message);
    throw error;
  }
}

// ========================================================================
// APPROACH 3: Hybrid (Embeddings + GPT-4 Verification)
// ========================================================================

/**
 * Hybrid approach: Use embeddings first, then GPT-4 for top results
 */
async function searchHybrid(searchQuery, candidates, apiKey) {
  console.log(`🔥 [HYBRID] Starting hybrid search...`);
  
  try {
    // Step 1: Get semantic matches using embeddings (fast)
    const embeddingResults = await searchWithEmbeddings(searchQuery, candidates, apiKey);
    
    if (embeddingResults.length === 0) {
      console.log(`ℹ️  [HYBRID] No embedding matches found`);
      return [];
    }
    
    if (embeddingResults.length === 1) {
      console.log(`ℹ️  [HYBRID] Single match, skipping GPT-4`);
      return embeddingResults;
    }
    
    // Step 2: Use GPT-4 to verify and rank top 10 embedding results
    const topCandidates = embeddingResults.slice(0, 10);
    console.log(`🤖 [HYBRID] Verifying top ${topCandidates.length} with GPT-4...`);
    
    const gpt4Results = await searchWithEnhancedGPT4(searchQuery, topCandidates, apiKey);
    
    // Combine scores (70% embeddings + 30% GPT-4)
    const finalResults = gpt4Results.map(result => {
      const embeddingResult = topCandidates.find(c => c.uid === result.uid);
      const embeddingScore = embeddingResult ? embeddingResult.matchScore : 0;
      const gpt4Score = result.matchScore;
      
      const combinedScore = Math.round(embeddingScore * 0.7 + gpt4Score * 0.3);
      
      return {
        ...result,
        matchScore: combinedScore,
        embeddingScore,
        gpt4Score,
        matchReason: `${result.matchReason} (Embedding: ${embeddingScore}%, GPT-4: ${gpt4Score}%)`
      };
    });
    
    // Sort by combined score
    finalResults.sort((a, b) => b.matchScore - a.matchScore);
    
    console.log(`✅ [HYBRID] Final ${finalResults.length} results with combined scoring`);
    
    return finalResults;
    
  } catch (error) {
    console.error('❌ [HYBRID] Error:', error.message);
    // Fallback to embeddings only
    return await searchWithEmbeddings(searchQuery, candidates, apiKey);
  }
}

// ========================================================================
// COST COMPARISON
// ========================================================================

/**
 * Pricing (as of Oct 2024):
 * 
 * text-embedding-3-small:
 *   - $0.020 / 1M tokens
 *   - ~20 entities = ~500 tokens
 *   - Cost: $0.00001 per search ✅ VERY CHEAP
 * 
 * gpt-4o-mini:
 *   - Input: $0.150 / 1M tokens
 *   - Output: $0.600 / 1M tokens
 *   - ~500 in + 50 out tokens
 *   - Cost: $0.0001 per search ✅ CHEAP
 * 
 * gpt-4o:
 *   - Input: $2.50 / 1M tokens
 *   - Output: $10.00 / 1M tokens
 *   - ~1000 in + 300 out tokens
 *   - Cost: $0.0055 per search ⚠️ EXPENSIVE
 * 
 * HYBRID (Embeddings + GPT-4o):
 *   - Embeddings: $0.00001
 *   - GPT-4o (top 10 only): $0.0028
 *   - Total: ~$0.003 per search ⚠️ MODERATE
 * 
 * RECOMMENDATION:
 * - Production: Use Embeddings only ($0.00001) ✅
 * - Complex cases: Use Hybrid ($0.003) 🔶
 * - Avoid: GPT-4o for all searches (too expensive) ❌
 */

// ========================================================================
// EXPORTS
// ========================================================================

module.exports = {
  searchWithEmbeddings,      // Best balance: cheap + accurate
  searchWithEnhancedGPT4,   // Better reasoning, more expensive
  searchHybrid,              // Best accuracy, moderate cost
  getEmbedding,
  cosineSimilarity
};

