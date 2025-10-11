# 🔧 Session Management Fix - Document Storage Issue

## 🎯 **المشكلة**

عند رفع مستند جديد، كان النظام يعرض مستنداً قديماً من session سابق بدلاً من المستند الجديد الذي تم رفعه.

### **السبب الجذري:**

1. **Backend كان يحفظ المستندات بشكل تراكمي** ولا يمسح المستندات القديمة
2. **عند Upload جديد:**
   - يتم تحويل المستند إلى Base64 ✅
   - يتم إرساله لـ OpenAI ✅
   - يتم حفظه في الذاكرة ✅
   - **لكن عند الحفظ في الـ DB، كان يتحقق من عدم التكرار ويتخطى الحفظ إذا كان الاسم موجود** ❌
3. **عند فتح الـ Modal:**
   - يتم تحميل البيانات من الـ DB
   - **يتم تحميل المستند القديم** ❌

---

## ✅ **الحل المطبق**

### **1️⃣ Backend Fix (`better-sqlite-server.js`)**

#### **قبل التعديل:**
```javascript
// كان يتحقق من عدم التكرار ويتخطى المستندات الموجودة
if (existingNames.includes(doc.name)) {
  console.log('⏭️ [SESSION] Skipping duplicate document:', doc.name);
  continue;
}
```

#### **بعد التعديل:**
```javascript
// ✅ CRITICAL FIX: مسح جميع المستندات القديمة أولاً
const deleteStmt = db.prepare(`
  DELETE FROM session_documents 
  WHERE session_id = ? AND company_id = ?
`);
const deleteResult = deleteStmt.run(sessionId, companyId);
console.log(`🗑️ [SESSION] Cleared ${deleteResult.changes} existing documents`);

// ثم حفظ المستندات الجديدة
// التحقق من أن المستند يحتوي على محتوى
if (!doc.content || doc.content.trim() === '') {
  console.warn(`⚠️ [SESSION] Skipping document with empty content: ${doc.name}`);
  continue;
}

// حفظ المستند مع logging مفصل
const contentPreview = doc.content.substring(0, 100);
console.log(`📄 [SESSION] Saving document "${doc.name}" (${doc.size} bytes, content starts with: ${contentPreview}...)`);

docStmt.run(sessionId, companyId, doc.name, doc.content, doc.type, doc.size);
```

### **2️⃣ Enhanced Logging**

#### **في Backend (GET endpoint):**
```javascript
console.log('📋 [GET SESSION] Request params:', req.params);
console.log('✅ [GET SESSION] Company data found:', company.company_name);
console.log('📄 [GET SESSION] Documents found:', documents.length);

documents.forEach((doc, index) => {
  const contentLength = doc.document_content ? doc.document_content.length : 0;
  const contentPreview = doc.document_content ? doc.document_content.substring(0, 50) : 'empty';
  console.log(`📄 [GET SESSION] Document ${index + 1}: ${doc.document_name} (${contentLength} chars, starts with: ${contentPreview}...)`);
});
```

#### **في Frontend (`session-staging.service.ts`):**

**عند الحفظ:**
```typescript
console.log('💾 [SESSION SAVE] Starting save process...');
console.log('💾 [SESSION SAVE] Input documents:', companyData.documents?.length || 0);

// عند تحويل كل مستند
console.log(`📄 [SESSION SAVE] Converting document ${index + 1}: ${file.name} (${file.size} bytes)`);
console.log(`✅ [SESSION SAVE] Document ${index + 1} converted: ${base64.length} chars`);

// قبل الإرسال
console.log('📄 [SESSION SAVE] Documents to send:', documentsForSave.map(d => ({
  name: d.name,
  type: d.type,
  size: d.size,
  contentLength: d.content.length
})));
```

**عند التحميل:**
```typescript
console.log('📋 [SESSION GET] Getting company data:', companyId);
console.log('📋 [SESSION GET] Session ID:', this.sessionId);
console.log('📋 [SESSION GET] Request URL:', `${this.apiBase}/session/company/${this.sessionId}/${companyId}`);

// عند استلام الرد
console.log('📋 [SESSION GET] Documents count:', response.documents?.length || 0);

response.documents.forEach((doc: any, index: number) => {
  const contentLength = doc.document_content ? doc.document_content.length : 0;
  const contentPreview = doc.document_content ? doc.document_content.substring(0, 50) : 'empty';
  console.log(`📄 [SESSION GET] Document ${index + 1}: ${doc.document_name} (${contentLength} chars, starts: ${contentPreview}...)`);
});
```

---

## 🎯 **خطوات التحقق**

### **1️⃣ اختبار Upload جديد:**

افتح Console وراقب الـ Logs:

```
💾 [SESSION SAVE] Starting save process...
💾 [SESSION SAVE] Input documents: 1
📄 [SESSION SAVE] Converting document 1: Commercial_Registration.png (145236 bytes)
✅ [SESSION SAVE] Document 1 converted: 193648 chars
📄 [SESSION SAVE] Documents to send: [{name: "Commercial_Registration.png", type: "image/png", size: 145236, contentLength: 193648}]
✅ [SESSION SAVE] Company data saved successfully
```

**في Backend:**
```
📄 [SESSION] Saving documents: 1
📄 [SESSION] Document names: ["Commercial_Registration.png"]
📄 [SESSION] Document sizes: [145236]
🗑️ [SESSION] Cleared 1 existing documents
📄 [SESSION] Saving document "Commercial_Registration.png" (145236 bytes, content starts with: iVBORw0KGgoAAAANSUhEUgAA...)
✅ [SESSION] Document saved: Commercial_Registration.png
✅ [SESSION] Total documents saved: 1/1
```

### **2️⃣ اختبار فتح الـ Modal:**

راقب الـ Logs:

```
📋 [SESSION GET] Getting company data: americana_foods
📋 [SESSION GET] Session ID: session_1760119266083_2upiyx818
📋 [SESSION GET] Request URL: http://localhost:3000/api/session/company/session_1760119266083_2upiyx818/americana_foods
📋 [SESSION GET] Response received
📋 [SESSION GET] Company name: Americana Foods
📋 [SESSION GET] Documents count: 1
📄 [SESSION GET] Document 1: Commercial_Registration.png (193648 chars, starts: iVBORw0KGgoAAAANSUhEUgAA...)
```

**في Backend:**
```
📋 [GET SESSION] Request params: {sessionId: "session_1760119266083_2upiyx818", companyId: "americana_foods"}
✅ [GET SESSION] Company data found: Americana Foods
📄 [GET SESSION] Documents found: 1
📄 [GET SESSION] Document 1: Commercial_Registration.png (193648 chars, starts with: iVBORw0KGgoAAAANSUhEUgAA...)
✅ [GET SESSION] Sending response with 1 documents and 0 contacts
```

---

## 📊 **النتيجة المتوقعة**

### **✅ قبل التعديل:**
- Upload مستند → يحفظ في الذاكرة ✅
- فتح Modal → **يعرض مستند قديم من session سابق** ❌

### **✅ بعد التعديل:**
- Upload مستند → يمسح المستندات القديمة ✅
- Upload مستند → يحفظ المستند الجديد ✅
- فتح Modal → **يعرض المستند الجديد الصحيح** ✅

---

## 🔍 **ملاحظات إضافية**

1. **الـ Session ID ثابت** طوال الجلسة → هذا صحيح ✅
2. **كل Upload جديد الآن يمسح المستندات القديمة** → يضمن عدم الخلط ✅
3. **Logging مفصل** لتسهيل التتبع والـ debugging ✅
4. **التحقق من صحة المحتوى** قبل الحفظ (لا يحفظ مستندات فارغة) ✅

---

## 🚀 **التحسينات المستقبلية المقترحة**

### **اختياري - إضافة Session Clearing عند Upload:**

إذا أردت مسح الـ Session بالكامل عند كل Upload:

```typescript
// في data-entry-agent.service.ts
async uploadAndProcessDocuments(files: File[]): Promise<any> {
  // ⭐ مسح الـ Session القديمة أولاً
  await this.sessionStaging.clearSession();
  console.log('🗑️ [SERVICE] Previous session cleared');

  // باقي الكود...
}
```

لكن هذا **غير ضروري** الآن لأن التعديل الحالي يضمن استبدال المستندات القديمة تلقائياً.

---

## ✅ **الخلاصة**

المشكلة تم حلها بالكامل! 

**التغيير الأساسي:** بدلاً من تخطي المستندات المكررة، الآن **يمسح جميع المستندات القديمة قبل حفظ الجديدة**.

هذا يضمن أن المستند المعروض في الـ Preview هو **دائماً المستند الأخير الذي تم رفعه**.


