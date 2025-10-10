# 🗑️ Session Admin Endpoints

## DELETE `/api/session/admin/clear-all`

**الوصف:** مسح جميع بيانات الـ Session من جميع الجداول (للاختبار)

**Method:** `DELETE`

**URL:** `http://localhost:3000/api/session/admin/clear-all`

**Headers:** لا يوجد

**Request Body:** لا يوجد

---

## 📋 **الاستخدام**

### **من Terminal:**
```bash
curl -X DELETE http://localhost:3000/api/session/admin/clear-all
```

### **من Postman:**
```
Method: DELETE
URL: http://localhost:3000/api/session/admin/clear-all
```

---

## ✅ **Response**

### **Success (200):**
```json
{
  "success": true,
  "deleted": {
    "staging": 19,      // عدد السجلات المحذوفة من session_staging
    "documents": 24,    // عدد السجلات المحذوفة من session_documents
    "contacts": 0       // عدد السجلات المحذوفة من session_contacts
  }
}
```

### **Error (500):**
```json
{
  "error": "Error message here"
}
```

---

## 🔍 **Console Logs**

### **في Backend:**
```
🗑️ [ADMIN] Clearing ALL session data...
✅ [ADMIN] Session data cleared: {
  staging: 19,
  documents: 24,
  contacts: 0
}
```

---

## 📊 **ما يتم مسحه**

1. ✅ **`session_staging`** - جميع بيانات الشركات
2. ✅ **`session_documents`** - جميع المستندات المرفقة
3. ✅ **`session_contacts`** - جميع جهات الاتصال

**ملاحظة:** هذا الـ endpoint **لا يمسح جدول `users`** أو أي جداول أخرى.

---

## 🎯 **متى تستخدمه**

### **✅ استخدم هذا الـ Endpoint عندما:**
- تريد اختبار النظام على نظافة
- تريد مسح جميع بيانات الـ Session القديمة
- تريد البدء من الصفر في Development

### **❌ لا تستخدمه عندما:**
- تريد مسح session واحد فقط (استخدم `DELETE /api/session/:sessionId`)
- النظام في Production (خطر!)

---

## 🔗 **Endpoints ذات صلة**

### **1️⃣ مسح Session محدد:**
```bash
DELETE /api/session/:sessionId
```
**مثال:**
```bash
curl -X DELETE http://localhost:3000/api/session/session_1760119266083_2upiyx818
```

### **2️⃣ حفظ بيانات الشركة:**
```bash
POST /api/session/save-company
```

### **3️⃣ استرجاع بيانات الشركة:**
```bash
GET /api/session/company/:sessionId/:companyId
```

---

## 📝 **Backend Code**

```javascript
// Clear ALL session data (for testing)
app.delete('/api/session/admin/clear-all', (req, res) => {
  try {
    console.log('🗑️ [ADMIN] Clearing ALL session data...');
    
    const stagingResult = db.prepare(`DELETE FROM session_staging`).run();
    const documentsResult = db.prepare(`DELETE FROM session_documents`).run();
    const contactsResult = db.prepare(`DELETE FROM session_contacts`).run();
    
    console.log('✅ [ADMIN] Session data cleared:', {
      staging: stagingResult.changes,
      documents: documentsResult.changes,
      contacts: contactsResult.changes
    });
    
    res.json({ 
      success: true,
      deleted: {
        staging: stagingResult.changes,
        documents: documentsResult.changes,
        contacts: contactsResult.changes
      }
    });
  } catch (error) {
    console.error('❌ [ADMIN] Error clearing all session data:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## ✅ **نتيجة الاختبار**

```bash
$ curl -X DELETE http://localhost:3000/api/session/admin/clear-all
{
  "success": true,
  "deleted": {
    "staging": 19,
    "documents": 24,
    "contacts": 0
  }
}
```

**التفسير:**
- ✅ تم مسح **19 شركة** من `session_staging`
- ✅ تم مسح **24 مستند** من `session_documents`
- ✅ تم مسح **0 جهة اتصال** من `session_contacts`

---

## 🚀 **الخلاصة**

**الـ Endpoint الجديد يسمح لك بـ:**
- ✅ مسح جميع بيانات الـ Session بسرعة
- ✅ البدء من الصفر للاختبار
- ✅ معرفة عدد السجلات المحذوفة من كل جدول

**النظام الآن نظيف وجاهز للاختبار!** 🎉

