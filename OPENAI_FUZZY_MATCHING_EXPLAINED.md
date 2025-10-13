# 🤖 OpenAI Fuzzy Matching - شرح كامل

**النموذج المستخدم**: `gpt-4o-mini`  
**الاستخدام**: OFAC + UN Search

---

## ✅ **نعم! النظام يستخدم OpenAI في الـ Fuzzy Matching**

---

## 🔍 **كيف يعمل النظام؟**

### **المرحلة 1️⃣: SQL LIKE (البحث الأولي)**

```sql
-- البحث بـ SQL LIKE أولاً
SELECT * FROM ofac_entities 
WHERE name LIKE '%search_query%' 
OR alias LIKE '%search_query%'
```

**النتيجة**: نحصل على **مرشحين (candidates)** من قاعدة البيانات

---

### **المرحلة 2️⃣: OpenAI Ranking (الترتيب الذكي)**

إذا كان عدد المرشحين > 1، يتم استدعاء OpenAI للترتيب:

```javascript
// OFAC Search
async function searchLocalOFACWithAI(db, searchQuery, country) {
  // Step 1: Get candidates from SQL
  const candidates = searchLocalOFAC(db, searchQuery, country);
  
  // Step 2: Use OpenAI to rank
  const prompt = `
  You are a sanctions screening expert.
  
  Search Query: "${searchQuery}"
  
  Entities to check:
  1. Company ABC | Aliases: ABC Ltd, ABC Corp
  2. Company XYZ | Aliases: XYZ Inc
  
  TASK: Find entities matching "${searchQuery}" (any language)
  
  Rules:
  - Match name OR alias (fuzzy, case-insensitive)
  - Semantic match: "food"="أغذية"="غذائية"
  - Transliteration: "Cairo"="القاهرة"
  - Typos OK: "fod"="food"
  - Word order OK
  
  Return: JSON array of matching indices ranked by relevance
  `;
  
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a sanctions screening expert.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.1,
    max_tokens: 500
  });
  
  // Step 3: Parse results and assign scores
  return rankedResults;
}
```

---

## 📊 **الفرق بين OFAC و UN AI Search**

| المعيار | OFAC | UN |
|---------|------|-----|
| **النموذج** | gpt-4o-mini | gpt-4o-mini |
| **Temperature** | 0.1 (دقيق جداً) | 0.3 (مرن قليلاً) |
| **Max Tokens** | 500 | 1000 |
| **الـ Prompt** | مختصر (فقط اسم + aliases) | مفصل (اسم + دولة + سبب + تاريخ) |
| **النتيجة** | أرقام المرشحين [1, 3, 5] | JSON objects مع score + reason |

---

## 🎯 **ماذا يفعل OpenAI بالضبط؟**

### **1. OFAC AI Search** (`ofac-sync.js`)

```javascript
// الـ Prompt المرسل لـ OpenAI:
`
Entities to check:
1. AL-HAMATI SWEETS BAKERIES | Aliases: Hamati Bakery, حلويات حماطي
2. BENEVOLENCE INTERNATIONAL FOUNDATION | Aliases: BIF

TASK: Find entities matching "Hamati" (any language)

Rules:
- Match name OR alias (fuzzy)
- Semantic match: "food"="أغذية"
- Transliteration: "Hamati"="حماطي"
- Typos OK
- Word order OK

Return: JSON array of matching indices
`

// رد OpenAI:
[1, 3, 5]  // المرشحين المطابقين مرتبين حسب الأهمية
```

### **2. UN AI Search** (`better-sqlite-server.js`)

```javascript
// الـ Prompt المرسل لـ OpenAI:
`
Search Query: "Hanifa" (Country: Syria)

UN Entities to compare:
1. HANIFA MONEY EXCHANGE OFFICE (QDe.153)
   - List Type: Al-Qaida
   - Countries: Syrian Arab Republic
   - Listed: 2017-07-20
   - Reason: Money exchange business facilitating ISIL...

2. OTHER COMPANY (QDe.XXX)
   - List Type: Yemen
   - Countries: Yemen
   - ...

Return a JSON array with each entity's match score (0-100) and reason.

Format: [
  {"index": 1, "score": 95, "reason": "Exact name match"},
  {"index": 2, "score": 40, "reason": "Different country"}
]
`

// رد OpenAI:
[
  {"index": 1, "score": 95, "reason": "Exact name match in Syria"},
  {"index": 2, "score": 30, "reason": "No match"}
]
```

---

## 🚀 **مميزات OpenAI Fuzzy Matching**

### ✅ **1. Multi-Language Support**
```
Search: "حماطي"
Matches: "AL-HAMATI", "Hamati", "حلويات حماطي"
```

### ✅ **2. Transliteration**
```
Search: "Cairo"
Matches: "القاهرة", "Kairo", "Al-Qahira"
```

### ✅ **3. Semantic Matching**
```
Search: "food"
Matches: "أغذية", "Food & Agriculture", "غذائية"
```

### ✅ **4. Typo Tolerance**
```
Search: "Hanfia" (خطأ)
Matches: "Hanifa" ✓
```

### ✅ **5. Word Order**
```
Search: "Exchange Hanifa"
Matches: "HANIFA MONEY EXCHANGE OFFICE" ✓
```

### ✅ **6. Abbreviation**
```
Search: "BIF"
Matches: "BENEVOLENCE INTERNATIONAL FOUNDATION" ✓
```

### ✅ **7. Alias Matching**
```
Search: "حنيفة"
Matches: "HANIFA" (via alias: مكتب حنيفة للصرافة) ✓
```

---

## 💰 **التكلفة**

### **gpt-4o-mini Pricing** (October 2024):
- **Input**: $0.150 / 1M tokens
- **Output**: $0.600 / 1M tokens

### **تكلفة البحث الواحد**:

| Type | Tokens In | Tokens Out | Cost |
|------|-----------|------------|------|
| **OFAC Search** | ~300 | ~50 | ~$0.00006 |
| **UN Search** | ~500 | ~200 | ~$0.00020 |
| **كلاهما** | ~800 | ~250 | ~$0.00026 |

**مثال**: 
- 1000 عملية بحث = **$0.26** (ربع دولار فقط!)
- 10,000 عملية بحث = **$2.60**

---

## ⚙️ **متى يتم استخدام OpenAI؟**

```javascript
// في الـ Frontend:
chatService.searchOFAC('Hanifa', 'Syria')

// يرسل:
POST /api/ofac/search
{
  "companyName": "Hanifa",
  "country": "Syria",
  "useAI": true  // ← هنا!
}

POST /api/un/search
{
  "companyName": "Hanifa",
  "country": "Syria",
  "useAI": true  // ← هنا!
}
```

### **الحالات:**

| الحالة | استخدام OpenAI | السبب |
|--------|----------------|-------|
| **0 نتائج** | ❌ لا | لا يوجد مرشحين |
| **1 نتيجة** | ❌ لا | نتيجة واحدة فقط (95% match) |
| **2+ نتائج** | ✅ نعم | يحتاج ترتيب |
| **useAI = false** | ❌ لا | معطل من المستخدم |
| **No API Key** | ❌ لا | يستخدم SQL LIKE فقط |

---

## 📝 **كود الـ Frontend**

```typescript
// في compliance-chat.service.ts
async searchOFAC(companyName: string, country?: string): Promise<any[]> {
  // Search OFAC and UN in parallel
  const [ofacResults, unResults] = await Promise.all([
    this.http.post(`${this.apiUrl}/ofac/search`, {
      companyName,
      country,
      useAI: true  // ← تفعيل OpenAI
    }).toPromise(),
    
    this.http.post(`${this.apiUrl}/un/search`, {
      companyName,
      country,
      useAI: true  // ← تفعيل OpenAI
    }).toPromise()
  ]);
  
  // Combine and sort by match score
  const combined = [...ofacResults, ...unResults]
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  
  return combined;
}
```

---

## 🔐 **إعداد OpenAI API Key**

يجب إضافة API Key في `.env` file:

```bash
# .env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
```

```javascript
// في better-sqlite-server.js
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  console.warn('⚠️  OpenAI API key not found, using basic search');
  // يستخدم SQL LIKE فقط بدون OpenAI
}
```

---

## 🧪 **مثال عملي**

### **Input:**
```
Search: "حنيفة" (عربي)
Country: Syria
```

### **SQL LIKE Results** (3 candidates):
```
1. HANIFA MONEY EXCHANGE OFFICE
2. HUMANITARIAN FOUNDATION
3. HANIFA EXCHANGE
```

### **OpenAI Prompt:**
```
Compare "حنيفة" with:
1. HANIFA MONEY EXCHANGE OFFICE (Syria, Al-Qaida)
2. HUMANITARIAN FOUNDATION (Yemen, Al-Qaida)
3. HANIFA EXCHANGE (Iraq, ISIS)

Return scores and reasons.
```

### **OpenAI Response:**
```json
[
  {
    "index": 1,
    "score": 98,
    "reason": "Exact transliteration match 'حنيفة'='Hanifa' + correct country (Syria)"
  },
  {
    "index": 3,
    "score": 75,
    "reason": "Name match 'Hanifa' but different country (Iraq)"
  },
  {
    "index": 2,
    "score": 20,
    "reason": "Different name and entity type"
  }
]
```

### **Final Output** (sorted by score):
```json
[
  {
    "name": "HANIFA MONEY EXCHANGE OFFICE",
    "source": "UN",
    "matchScore": 98,
    "matchReason": "Exact transliteration match..."
  },
  {
    "name": "HANIFA EXCHANGE",
    "source": "UN",
    "matchScore": 75,
    "matchReason": "Name match but different country"
  }
]
```

---

## 🎨 **عرض النتائج في UI**

```html
<!-- Result Card -->
<div class="result-card">
  <div class="result-header">
    <strong>HANIFA MONEY EXCHANGE OFFICE</strong>
    <span class="badge" style="background: #1890ff">🇺🇳 UN</span>
  </div>
  
  <div class="result-details">
    <div class="detail-row">
      <span class="label">نسبة التطابق:</span>
      <span style="color: #52c41a">98%</span>
    </div>
    <div class="detail-row">
      <span class="label">السبب:</span>
      <span>Exact transliteration match 'حنيفة'='Hanifa'</span>
    </div>
  </div>
</div>
```

---

## ⚡ **الأداء**

| المرحلة | الوقت |
|---------|-------|
| SQL LIKE | ~10ms |
| OpenAI API Call | ~500-1500ms |
| **الإجمالي** | **~1-2 seconds** |

---

## 🎯 **الخلاصة**

✅ **نعم، النظام يستخدم OpenAI!**

**المميزات:**
1. ✅ بحث ذكي بالعربي والإنجليزي
2. ✅ يتحمل الأخطاء الإملائية
3. ✅ يفهم الـ transliteration
4. ✅ ترتيب دقيق بـ match scores
5. ✅ تكلفة منخفضة جداً (~$0.0003 للبحث)
6. ✅ يعمل مع OFAC + UN معاً
7. ✅ Fallback للـ SQL LIKE إذا لم يتوفر API key

**الاستخدام:**
- تلقائياً في كل بحث (إذا كان API key موجود)
- يمكن تعطيله بـ `useAI: false`

---

**النظام الآن يوفر أفضل تجربة بحث ممكنة بفضل OpenAI!** 🚀🤖

