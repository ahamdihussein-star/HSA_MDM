# 🎯 Compliance Agent Redesign Plan
## Modal-Based AI-Powered Workflow (Like Data Entry Agent)

**Date:** October 12, 2025  
**Goal:** Transform Compliance Agent to modal-based chat workflow with OpenAI intelligence

---

## ═══════════════════════════════════════════════════════════════
## 🎯 Requirements Summary
## ═══════════════════════════════════════════════════════════════

### Core Features:
1. ✅ **Modal-based** - Like Data Entry AI Agent (no long forms)
2. ✅ **OpenAI-powered** - Intelligent matching and suggestions
3. ✅ **3 Main Options:**
   - 📋 Manual Review (استعلام فقط، بدون actions)
   - ✉️ Review New Requests (من task list)
   - ⭐ Review Golden Records (شركات معتمدة)
4. ✅ **Actions Available:**
   - 🚫 Block company (if matches OFAC)
   - ✅ Approve company
   - 💾 Save sanctions info with company
5. ✅ **Localization:** Full Arabic OR English (no mix)

---

## ═══════════════════════════════════════════════════════════════
## 🏗️ Architecture Design
## ═══════════════════════════════════════════════════════════════

### Component Structure (Based on Data Entry Agent):

```
compliance-chat-widget/
├── compliance-chat-widget.component.ts
├── compliance-chat-widget.component.html
├── compliance-chat-widget.component.scss
└── services/
    ├── compliance-chat.service.ts (New)
    └── compliance.service.ts (Existing - reuse)
```

### Comparison with Data Entry Agent:

| Feature | Data Entry Agent | Compliance Agent (New) |
|---------|------------------|------------------------|
| **Purpose** | Create new customer | Review sanctions |
| **User** | data_entry | compliance |
| **Modal Type** | Document upload | Options + Review |
| **OpenAI Use** | Document OCR | Smart matching |
| **Actions** | Submit request | Approve/Block |
| **Data Source** | User upload | Database + OFAC |

---

## ═══════════════════════════════════════════════════════════════
## 🎨 UI/UX Flow
## ═══════════════════════════════════════════════════════════════

### Initial State:
```
┌─────────────────────────────────────┐
│  💬 Compliance Agent                │
│  ○ Minimized (floating button)      │
└─────────────────────────────────────┘
```

### After Click:
```
┌─────────────────────────────────────────────────────┐
│ 👤 Compliance Agent                         ✖ Close │
├─────────────────────────────────────────────────────┤
│ 🤖 مرحباً بك في وكيل الامتثال!                     │
│                                                     │
│ كيف يمكنني مساعدتك اليوم؟                          │
│                                                     │
│ ○ 📋 مراجعة يدوية                                  │
│   (استعلام عن شركة بدون إجراءات)                   │
│                                                     │
│ ○ ✉️ مراجعة الطلبات الجديدة                        │
│   (الطلبات المخصصة لي - 5 طلبات)                   │
│                                                     │
│ ○ ⭐ مراجعة السجلات المعتمدة                       │
│   (الشركات المعتمدة - 23 شركة)                     │
│                                                     │
│ [اختر أحد الخيارات أعلاه]                          │
└─────────────────────────────────────────────────────┘
```

---

## ═══════════════════════════════════════════════════════════════
## 🔄 Workflow Details
## ═══════════════════════════════════════════════════════════════

### Option 1: 📋 Manual Review (No Actions)

```
User selects: "مراجعة يدوية"
    ↓
Modal Opens:
┌─────────────────────────────────────┐
│ 🔍 مراجعة يدوية                    │
├─────────────────────────────────────┤
│ 🤖 الرجاء إدخال اسم الشركة:        │
│ [___________________________]       │
│                                     │
│ 🌍 الدولة (اختياري):               │
│ [-- اختر دولة --]                  │
│                                     │
│ [🔍 بحث]  [❌ إلغاء]               │
└─────────────────────────────────────┘
    ↓
After Search:
┌─────────────────────────────────────┐
│ 📊 نتائج البحث (3)                 │
├─────────────────────────────────────┤
│ ✅ لا توجد عقوبات                  │
│ أو                                  │
│ ⚠️ تم العثور على 2 تطابق           │
│                                     │
│ [عرض التفاصيل]  [بحث جديد]        │
└─────────────────────────────────────┘
```

**No Actions** - فقط عرض النتائج

---

### Option 2: ✉️ Review New Requests

```
User selects: "مراجعة الطلبات الجديدة"
    ↓
Fetch: GET /api/requests?assignedTo=compliance&status=Pending
    ↓
Modal Shows List:
┌──────────────────────────────────────────┐
│ ✉️ الطلبات الجديدة (5)                  │
├──────────────────────────────────────────┤
│ 📄 1. شركة الأغذية المصرية              │
│    مصر • Food & Agriculture            │
│    [مراجعة]                             │
│                                          │
│ 📄 2. Dubai Trading Company              │
│    UAE • Construction                   │
│    [مراجعة]                             │
│                                          │
│ 📄 3. Saudi Building Materials           │
│    السعودية • Construction             │
│    [مراجعة]                             │
└──────────────────────────────────────────┘
    ↓
User clicks "مراجعة" on request #1:
    ↓
Modal Changes to Review Mode:
┌──────────────────────────────────────────┐
│ 📋 مراجعة: شركة الأغذية المصرية         │
├──────────────────────────────────────────┤
│ معلومات الشركة:                         │
│ • الاسم: شركة الأغذية المصرية          │
│ • الدولة: مصر                           │
│ • النوع: شركة ذات مسؤولية محدودة        │
│ • الرقم الضريبي: 123456789              │
│                                          │
│ 🤖 جاري البحث في قوائم العقوبات...      │
│     [Progress indicator]                 │
└──────────────────────────────────────────┘
    ↓
After OFAC Search:
┌──────────────────────────────────────────┐
│ 📋 نتائج البحث                          │
├──────────────────────────────────────────┤
│ ✅ لا توجد عقوبات - الشركة آمنة          │
│                                          │
│ [✅ اعتماد]  [❌ إلغاء]                 │
│                                          │
│ OR (if match found):                     │
│                                          │
│ ⚠️ تطابق محتمل (2):                     │
│ 1. Egyptian Food Industries              │
│    OFAC • مصر • مدرجة 2023-01-15         │
│    تطابق: 85%                            │
│    [عرض التفاصيل]                        │
│                                          │
│ 🤖 التوصية: حظر الشركة                  │
│                                          │
│ [🚫 حظر]  [✅ اعتماد]  [❌ إلغاء]        │
└──────────────────────────────────────────┘
```

**Actions Available:**
- ✅ Approve (if no sanctions)
- 🚫 Block (if sanctions match)

---

### Option 3: ⭐ Review Golden Records

```
User selects: "مراجعة السجلات المعتمدة"
    ↓
Fetch: GET /api/requests?isGolden=true
    ↓
Modal Shows List:
┌──────────────────────────────────────────┐
│ ⭐ السجلات المعتمدة (23)                 │
├──────────────────────────────────────────┤
│ 🏢 1. شركة البناء السعودية              │
│    السعودية • Approved                 │
│    آخر مراجعة: 2025-10-01               │
│    [إعادة فحص]                           │
│                                          │
│ 🏢 2. Dubai International Trading        │
│    UAE • Approved                       │
│    آخر مراجعة: 2025-09-28               │
│    [إعادة فحص]                           │
└──────────────────────────────────────────┘
    ↓
User clicks "إعادة فحص":
    ↓
Re-run OFAC search for that company
Show results (same as Option 2)
```

**Actions Available:**
- 🔄 Re-check against OFAC
- 🚫 Block if new sanctions found
- ✅ Confirm still safe

---

## ═══════════════════════════════════════════════════════════════
## 🤖 OpenAI Intelligence Points
## ═══════════════════════════════════════════════════════════════

### 1. Smart Name Matching
```
User Request: "شركة الأغذية المصرية"
OFAC Database: "Egyptian Food Industries LLC"

OpenAI Task:
- Compare names semantically
- Consider transliteration
- Calculate match confidence (0-100%)
- Provide explanation
```

### 2. Intelligent Suggestions
```
🤖 OpenAI suggests:
"تم العثور على تطابق محتمل بنسبة 85%:
الاسم في الطلب: 'شركة الأغذية المصرية'
الاسم في قائمة العقوبات: 'Egyptian Food Industries LLC'

السبب: ترجمة دقيقة للاسم العربي
التوصية: مراجعة إضافية مطلوبة"
```

### 3. Block Reason Generation
```
When user clicks "Block":
OpenAI generates Arabic explanation:

"تم حظر الشركة للأسباب التالية:
• تطابق الاسم مع قائمة OFAC (85%)
• نفس الدولة: مصر
• نفس القطاع: الأغذية والزراعة
• رقم العقوبة: OFAC-18553
• تاريخ الإدراج: 2023-01-15

الإجراء الموصى به: رفض الطلب"
```

---

## ═══════════════════════════════════════════════════════════════
## 🗄️ Backend API Requirements
## ═══════════════════════════════════════════════════════════════

### Existing APIs (✅ Available):

1. **Get Compliance Tasks**
   ```
   GET /api/requests?assignedTo=compliance&status=Pending
   ```

2. **Get Golden Records**
   ```
   GET /api/requests?isGolden=true
   ```

3. **Search OFAC**
   ```
   POST /api/ofac/search
   Body: {companyName, country, useAI}
   ```

4. **Block Request**
   ```
   POST /api/requests/:id/compliance/block
   Body: {blockReason, sanctionsInfo}
   ```

5. **Approve Request**
   ```
   POST /api/requests/:id/compliance/approve
   ```

### New APIs Needed (❓ To Verify):

6. **Smart Match with OpenAI**
   ```
   POST /api/compliance/smart-match
   Body: {
     requestData: {name, country, sector},
     ofacResults: [...]
   }
   Response: {
     matches: [{entity, confidence, explanation}],
     recommendation: "approve" | "block" | "review",
     reasoning: "..."
   }
   ```

7. **Save Sanctions Info**
   ```
   POST /api/compliance/save-sanctions
   Body: {
     requestId: "123",
     sanctionsInfo: {
       source: "OFAC",
       entityId: "OFAC-18553",
       matchConfidence: 85,
       blockReason: "..."
     }
   }
   ```

---

## ═══════════════════════════════════════════════════════════════
## 📁 File Structure
## ═══════════════════════════════════════════════════════════════

### New Files to Create:

```
src/app/compliance-agent/
├── compliance-chat-widget/
│   ├── compliance-chat-widget.component.ts    (New - main modal component)
│   ├── compliance-chat-widget.component.html  (New)
│   ├── compliance-chat-widget.component.scss  (New)
│   └── services/
│       └── compliance-chat.service.ts         (New - chat logic)
├── compliance-agent.component.ts              (Keep for backward compatibility)
├── compliance-agent.component.html            (Keep)
├── compliance-agent.component.scss            (Keep)
└── services/
    └── compliance.service.ts                  (Keep & enhance)
```

### Files to Modify:

```
api/better-sqlite-server.js
  - Add smart-match endpoint
  - Add save-sanctions endpoint
  - Enhance block endpoint
```

---

## ═══════════════════════════════════════════════════════════════
## 🎯 Implementation Steps
## ═══════════════════════════════════════════════════════════════

### Phase 1: Backend API (1-2 hours)
- [ ] Verify existing endpoints
- [ ] Create smart-match endpoint with OpenAI
- [ ] Create save-sanctions endpoint
- [ ] Update block endpoint to save sanctions info

### Phase 2: Service Layer (1 hour)
- [ ] Create `ComplianceChatService`
- [ ] Add conversation flow logic
- [ ] Add OpenAI integration
- [ ] Update `ComplianceService` for new features

### Phase 3: Component (2-3 hours)
- [ ] Create `ComplianceChatWidgetComponent`
- [ ] Implement modal-based UI
- [ ] Add welcome message with radio buttons
- [ ] Implement 3 workflows (Manual/Requests/Golden)

### Phase 4: Localization (30 mins)
- [ ] Add Arabic translations
- [ ] Ensure no EN-AR mix
- [ ] Test language switching

### Phase 5: Testing (30 mins)
- [ ] Test manual review
- [ ] Test request review + block
- [ ] Test golden record re-check
- [ ] Verify OpenAI working

**Total Estimated Time: 5-7 hours**

---

## ═══════════════════════════════════════════════════════════════
## 💬 Sample Conversation Flow
## ═══════════════════════════════════════════════════════════════

### Scenario: Review New Request

```
🤖: مرحباً! لديك 5 طلبات جديدة للمراجعة.

🤖: [Radio Buttons]
    ○ مراجعة يدوية
    ● مراجعة الطلبات الجديدة
    ○ مراجعة السجلات المعتمدة

👤: [Selects "مراجعة الطلبات الجديدة"]

🤖: ممتاز! إليك قائمة طلباتك:
    
    1️⃣ شركة الأغذية المصرية (مصر)
    2️⃣ Dubai Trading Co (الإمارات)
    3️⃣ Yemen Construction (اليمن)
    
    [Buttons: 1 | 2 | 3]

👤: [Clicks button "1"]

🤖: جاري تحميل معلومات الطلب...
    
    📋 الطلب: شركة الأغذية المصرية
    الدولة: مصر
    القطاع: الأغذية والزراعة
    الرقم الضريبي: 123456789
    
    🔍 جاري البحث في قوائم العقوبات الدولية...

🤖: ⚠️ تنبيه! تم العثور على تطابق محتمل:
    
    📌 الشركة: Eko Development and Investment Company
    المصدر: OFAC
    الدولة: مصر
    نسبة التطابق: 75%
    
    🤖 التحليل:
    - الاسم مشابه بعد الترجمة
    - نفس الدولة (مصر)
    - نفس القطاع (أغذية)
    
    💡 التوصية: مراجعة إضافية مطلوبة
    
    [🚫 حظر الشركة]  [✅ اعتماد رغم التطابق]  [ℹ️ تفاصيل أكثر]

👤: [Clicks "حظر الشركة"]

🤖: تم حظر الشركة بنجاح ✅
    
    السبب: تطابق مع قائمة OFAC
    الكيان المطابق: OFAC-18553
    نسبة التطابق: 75%
    
    [✅ تم]
```

---

## ═══════════════════════════════════════════════════════════════
## 🎨 UI Components
## ═══════════════════════════════════════════════════════════════

### Chat Message Types:

1. **Welcome Message**
   ```typescript
   {
     type: 'welcome',
     content: 'مرحباً بك في وكيل الامتثال!',
     buttons: [
       {label: '📋 مراجعة يدوية', value: 'manual'},
       {label: '✉️ مراجعة الطلبات', value: 'requests'},
       {label: '⭐ السجلات المعتمدة', value: 'golden'}
     ]
   }
   ```

2. **Request List Message**
   ```typescript
   {
     type: 'request_list',
     content: 'لديك 5 طلبات للمراجعة:',
     items: [
       {id: '123', name: 'شركة...', country: 'مصر'},
       ...
     ],
     buttons: items.map((item, i) => ({label: `${i+1}`, value: item.id}))
   }
   ```

3. **Search Results Message**
   ```typescript
   {
     type: 'search_results',
     content: 'نتائج البحث:',
     results: [...],
     recommendation: 'block',
     buttons: [
       {label: '🚫 حظر', action: 'block'},
       {label: '✅ اعتماد', action: 'approve'}
     ]
   }
   ```

---

## ═══════════════════════════════════════════════════════════════
## 🗄️ Database Schema Updates
## ═══════════════════════════════════════════════════════════════

### New Table: `compliance_history`

```sql
CREATE TABLE IF NOT EXISTS compliance_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL,
  compliance_user TEXT NOT NULL,
  
  -- Search results
  search_query TEXT,
  ofac_results_count INTEGER DEFAULT 0,
  
  -- Matching
  matched_entity_uid TEXT,           -- OFAC-xxxxx
  match_confidence REAL,             -- 0-100
  match_explanation TEXT,            -- AI explanation
  
  -- Decision
  decision TEXT,                     -- 'approve' | 'block' | 'review'
  decision_reason TEXT,
  
  -- Sanctions info (if blocked)
  sanctions_source TEXT,             -- 'OFAC' | 'EU' | 'UK'
  sanctions_entity_name TEXT,
  sanctions_listed_date TEXT,
  sanctions_programs TEXT,
  
  -- Timestamps
  checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (request_id) REFERENCES requests(id),
  FOREIGN KEY (matched_entity_uid) REFERENCES ofac_entities(uid)
);
```

### Update `requests` table:
```sql
-- Add columns if not exist
ALTER TABLE requests ADD COLUMN ComplianceCheckedAt DATETIME;
ALTER TABLE requests ADD COLUMN ComplianceMatchedEntity TEXT;
ALTER TABLE requests ADD COLUMN ComplianceMatchConfidence REAL;
```

---

## ═══════════════════════════════════════════════════════════════
## 🌍 Localization Strategy
## ═══════════════════════════════════════════════════════════════

### Rule: **No Mix!**

❌ **Bad (Mixed):**
```
"شركة الأغذية - Food & Agriculture"
"مراجعة Review"
```

✅ **Good (Pure Arabic):**
```
"شركة الأغذية - الأغذية والزراعة"
"مراجعة الطلب"
```

✅ **Good (Pure English):**
```
"Food Company - Food & Agriculture"
"Review Request"
```

### Implementation:

```typescript
// Translation service
t(ar: string, en: string): string {
  return this.currentLang === 'ar' ? ar : en;
}

// All sectors translated
SECTOR_AR = {
  'Food & Agriculture': 'الأغذية والزراعة',
  'Construction': 'البناء والإنشاءات'
};

// All labels translated
LABELS_AR = {
  'Approve': 'اعتماد',
  'Block': 'حظر',
  'Review': 'مراجعة',
  'Manual Review': 'مراجعة يدوية'
};
```

---

## ═══════════════════════════════════════════════════════════════
## ✅ Success Criteria
## ═══════════════════════════════════════════════════════════════

### Must Have:
- ✅ Modal-based (not form-based)
- ✅ 3 options (Manual/Requests/Golden)
- ✅ OpenAI smart matching
- ✅ Block action saves sanctions info
- ✅ Full Arabic localization (no mix)
- ✅ Works with 917 real OFAC entities

### Nice to Have:
- ✅ Match explanation from OpenAI
- ✅ Confidence score display
- ✅ History tracking
- ✅ Re-check capability for golden records

---

## 🚀 Next Action:

**Option A:** Start implementation (5-7 hours)  
**Option B:** Review plan first, adjust if needed  

**Your call!** 🎯

