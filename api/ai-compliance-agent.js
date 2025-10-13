/**
 * ========================================================================
 * AI COMPLIANCE AGENT - True Intelligence with OpenAI GPT-4
 * ========================================================================
 * 
 * Problem with current system:
 * ❌ Just embeddings matching - no real intelligence
 * ❌ No conversation context - doesn't understand user intent
 * ❌ No smart explanations - dry technical results
 * ❌ No learning - doesn't improve over time
 * 
 * Solution:
 * ✅ Use OpenAI GPT-4 for intelligent analysis
 * ✅ Context-aware conversations
 * ✅ Human-readable explanations in Arabic
 * ✅ Smart recommendations with reasoning
 */

const axios = require('axios');

// ========================================================================
// OPENAI GPT-4 - INTELLIGENT COMPLIANCE ANALYSIS
// ========================================================================

/**
 * Analyze compliance results with true AI intelligence
 */
async function analyzeComplianceWithAI(searchQuery, searchResults, context = {}) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    console.warn('⚠️  No OpenAI API key - returning basic results');
    return {
      hasMatch: searchResults.length > 0,
      riskLevel: searchResults.length > 0 ? 'medium' : 'low',
      explanation: 'تحليل أساسي بدون AI',
      recommendation: searchResults.length > 0 ? 'review' : 'approve',
      confidence: 70,
      results: searchResults
    };
  }
  
  console.log(`🤖 [AI AGENT] Analyzing ${searchResults.length} results with GPT-4...`);
  
  try {
    // Prepare context for AI
    const userContext = {
      companyName: searchQuery,
      country: context.country || 'غير محدد',
      sector: context.sector || 'غير محدد',
      requestType: context.requestType || 'New Company',
      resultsCount: searchResults.length
    };
    
    // Prepare results summary (top 5 only to save tokens)
    const topResults = searchResults.slice(0, 5).map(r => ({
      name: r.name || r.first_name,
      source: r.source,
      matchScore: r.matchScore,
      matchReason: r.matchReason,
      countries: r.countries,
      listType: r.un_list_type || 'OFAC',
      comments: r.comments ? r.comments.substring(0, 200) : null
    }));
    
    const prompt = `أنت compliance agent ذكي متخصص في فحص العقوبات الدولية. مهمتك تحليل نتائج البحث وتقديم توصية واضحة في صيغة JSON.

**معلومات الشركة المطلوب فحصها:**
- الاسم: ${userContext.companyName}
- الدولة: ${userContext.country}
- القطاع: ${userContext.sector}
- نوع الطلب: ${userContext.requestType}

**نتائج البحث:**
عدد النتائج: ${userContext.resultsCount}

${topResults.map((r, i) => `
${i + 1}. **${r.name}**
   - المصدر: ${r.source === 'UN' ? '🇺🇳 الأمم المتحدة' : '🇺🇸 OFAC'}
   - نسبة التطابق: ${r.matchScore}%
   - سبب التطابق: ${r.matchReason}
   - الدول: ${r.countries || 'غير محدد'}
   - نوع القائمة: ${r.listType}
   ${r.comments ? `- السبب: ${r.comments}` : ''}
`).join('\n')}

**المطلوب منك:**

قم بتحليل شامل للنتائج وأجب على الأسئلة التالية:

1. **هل يوجد تطابق حقيقي؟**
   - هل الاسم متطابق فعلاً أم مجرد تشابه؟
   - هل الدولة متطابقة؟
   - هل السياق منطقي؟

2. **ما مستوى الخطورة؟**
   - **منخفض (low)**: تشابه بسيط، غالباً false positive
   - **متوسط (medium)**: تشابه معتدل، يحتاج مراجعة
   - **عالي (high)**: تطابق قوي، احتمال كبير
   - **حرج (critical)**: تطابق شبه مؤكد

3. **الشرح الواضح:**
   - اشرح السبب بلغة بسيطة مفهومة
   - استخدم العربية الفصحى
   - كن محدداً وواضحاً

4. **التوصية:**
   - **approve**: لا يوجد خطر، يمكن الموافقة
   - **review**: يحتاج مراجعة يدوية من compliance officer
   - **block**: يجب الرفض فوراً

5. **مستوى الثقة (0-100%):**
   - ما مدى تأكدك من التحليل؟

**مثال على الإجابة المطلوبة:**

\`\`\`json
{
  "hasMatch": true,
  "riskLevel": "high",
  "explanation": "تم العثور على تطابق قوي (98%) مع شركة مكتب حنيفة للصرافة المدرجة على قائمة الأمم المتحدة بتهمة تسهيل تمويل داعش في سوريا. الاسم متطابق تماماً والدولة متطابقة. هذا تطابق حقيقي وليس مجرد تشابه.",
  "recommendation": "block",
  "confidence": 98,
  "reasoning": {
    "nameMatch": "تطابق دقيق مع الاسم الإنجليزي والعربي",
    "countryMatch": "الدولة متطابقة (سوريا)",
    "contextMatch": "نفس المجال (صرافة)",
    "sanctionSeverity": "عقوبات أممية بسبب تمويل الإرهاب"
  },
  "suggestedActions": [
    "رفض الطلب فوراً",
    "إبلاغ الجهات الرقابية",
    "توثيق القرار في السجلات"
  ],
  "relatedEntities": [
    {
      "name": "HANIFA MONEY EXCHANGE OFFICE",
      "source": "UN",
      "matchScore": 98
    }
  ]
}
\`\`\`

**مهم جداً:**
- أرجع **فقط** JSON صحيح
- لا تضيف أي نص قبل أو بعد الـ JSON
- كن دقيقاً في التحليل
- لا تتساهل في حالات الخطورة العالية`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',  // gpt-4o supports JSON mode
        max_tokens: 2000,
        messages: [
          {
            role: 'system',
            content: 'أنت compliance agent ذكي متخصص في فحص العقوبات الدولية (OFAC و UN). مهمتك تحليل نتائج البحث بدقة وتقديم توصيات واضحة بالعربية في صيغة JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,  // Low for consistency
        response_format: { type: "json_object" }
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    const aiContent = response.data.choices[0].message.content.trim();
    console.log(`🤖 [AI AGENT] GPT-4 response: ${aiContent.substring(0, 200)}...`);
    
    // Parse JSON (clean markdown if present)
    const jsonStr = aiContent
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    
    const analysis = JSON.parse(jsonStr);
    
    // Add original results
    analysis.results = searchResults;
    analysis.totalResults = searchResults.length;
    
    console.log(`✅ [AI AGENT] Analysis complete: ${analysis.recommendation} (${analysis.confidence}% confidence)`);
    
    return analysis;
    
  } catch (error) {
    console.error(`❌ [AI AGENT] Error:`, error.message);
    if (error.response) {
      console.error(`❌ [AI AGENT] Response error:`, error.response.data);
    }
    
    // Fallback to basic analysis
    return {
      hasMatch: searchResults.length > 0,
      riskLevel: searchResults.length > 0 && searchResults[0].matchScore >= 85 ? 'high' : 'medium',
      explanation: `تم العثور على ${searchResults.length} نتيجة محتملة. يُنصح بالمراجعة اليدوية.`,
      recommendation: 'review',
      confidence: 60,
      results: searchResults,
      error: 'AI analysis failed, using fallback'
    };
  }
}

// ========================================================================
// CONVERSATION CONTEXT MANAGEMENT
// ========================================================================

/**
 * Manage conversation history for context-aware responses
 */
class ConversationContext {
  constructor() {
    this.history = [];
    this.maxHistory = 10;
  }
  
  addMessage(role, content, metadata = {}) {
    this.history.push({
      role,
      content,
      metadata,
      timestamp: new Date()
    });
    
    // Keep only last N messages
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
  }
  
  getContext() {
    return this.history;
  }
  
  getSummary() {
    return this.history.map(h => ({
      role: h.role,
      content: h.content.substring(0, 100),
      timestamp: h.timestamp
    }));
  }
  
  clear() {
    this.history = [];
  }
}

// ========================================================================
// SMART FOLLOW-UP QUESTIONS
// ========================================================================

/**
 * Generate smart follow-up questions based on analysis
 */
function generateFollowUpQuestions(analysis, context) {
  const questions = [];
  
  if (analysis.riskLevel === 'medium') {
    questions.push({
      question: 'هل لديك معلومات إضافية عن هذه الشركة؟',
      reason: 'للمساعدة في التأكد من التطابق'
    });
    
    questions.push({
      question: 'هل الشركة مسجلة رسمياً في دولتها؟',
      reason: 'للتحقق من الشرعية'
    });
  }
  
  if (analysis.hasMatch && analysis.confidence < 90) {
    questions.push({
      question: 'هل اسم الشركة هو الاسم الرسمي الكامل؟',
      reason: 'قد يكون هناك اختصار أو اسم تجاري'
    });
  }
  
  if (!context.country) {
    questions.push({
      question: 'ما هي دولة تأسيس الشركة؟',
      reason: 'لتحسين دقة البحث'
    });
  }
  
  return questions;
}

// ========================================================================
// LEARNING & FEEDBACK
// ========================================================================

/**
 * Store feedback for future learning
 */
async function storeFeedback(db, analysisId, feedback) {
  try {
    db.prepare(`
      INSERT INTO ai_feedback (
        analysis_id,
        user_decision,
        was_correct,
        user_comment,
        created_at
      ) VALUES (?, ?, ?, ?, datetime('now'))
    `).run(
      analysisId,
      feedback.decision,
      feedback.wasCorrect ? 1 : 0,
      feedback.comment
    );
    
    console.log(`📝 [AI FEEDBACK] Stored feedback for analysis ${analysisId}`);
  } catch (error) {
    console.error(`❌ [AI FEEDBACK] Error:`, error.message);
  }
}

/**
 * Get feedback statistics for improvement
 */
function getFeedbackStats(db) {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN was_correct = 1 THEN 1 ELSE 0 END) as correct,
        AVG(CASE WHEN was_correct = 1 THEN 1.0 ELSE 0.0 END) * 100 as accuracy
      FROM ai_feedback
      WHERE created_at > datetime('now', '-30 days')
    `).get();
    
    return stats;
  } catch (error) {
    return { total: 0, correct: 0, accuracy: 0 };
  }
}

// ========================================================================
// COST TRACKING
// ========================================================================

/**
 * Track API costs
 */
function trackCost(tokens, model = 'gpt-4') {
  const pricing = {
    'gpt-4': {
      input: 30.00,   // $30 per million input tokens
      output: 60.00   // $60 per million output tokens
    },
    'gpt-4-turbo': {
      input: 10.00,   // $10 per million input tokens
      output: 30.00   // $30 per million output tokens
    }
  };
  
  const costs = pricing[model] || pricing['gpt-4'];
  const inputCost = (tokens.input / 1_000_000) * costs.input;
  const outputCost = (tokens.output / 1_000_000) * costs.output;
  const totalCost = inputCost + outputCost;
  
  console.log(`💰 [COST] Input: $${inputCost.toFixed(6)}, Output: $${outputCost.toFixed(6)}, Total: $${totalCost.toFixed(6)}`);
  
  return totalCost;
}

// ========================================================================
// EXPORTS
// ========================================================================

module.exports = {
  analyzeComplianceWithAI,
  ConversationContext,
  generateFollowUpQuestions,
  storeFeedback,
  getFeedbackStats,
  trackCost
};

