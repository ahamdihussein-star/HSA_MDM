# 🧪 Test Companies from OFAC Database
## شركات للاختبار من قاعدة بيانات OFAC

**Date:** October 12, 2025  
**Source:** Real OFAC data (917 companies)

---

## 📋 Test Cases by Category

### 1️⃣ Food & Agriculture Companies

#### Test 1: Egyptian Food Company
```
Name: Eko Development and Investment Company
Country: Egypt
Sector: Food & Agriculture
Alias: EKO Import and Export Company

Test queries:
✅ "Eko"
✅ "Egyptian food"
✅ "food company egypt"
✅ "EKO Development"
```

#### Test 2: Yemen Sweets
```
Name: AL-HAMATI SWEETS BAKERIES
Country: Yemen
Sector: Food & Agriculture
Aliases: None

Test queries:
✅ "Hamati"
✅ "sweets"
✅ "bakery yemen"
✅ "حلويات" (Arabic)
```

#### Test 3: Iraqi Agriculture
```
Name: BALADNA FOR AGRICULTURAL INVESTMENTS...
Country: Iraq
Sector: Food & Agriculture
Alias: بلدنا للاستثمارات الزراعية (Arabic name!)

Test queries:
✅ "Baladna"
✅ "agricultural iraq"
✅ "بلدنا" (Arabic)
✅ "food production iraq"
```

#### Test 4: Lebanon Foods
```
Name: Lama Foods S.A.R.L.
Country: Lebanon
Sector: Food & Agriculture
Aliases: None

Test queries:
✅ "Lama"
✅ "foods lebanon"
✅ "لاما" (Arabic transliteration)
```

#### Test 5: UAE Food
```
Name: Asasi Food FZE
Country: United Arab Emirates
Sector: Food & Agriculture
Alias: ASASI FOODS FZC

Test queries:
✅ "Asasi"
✅ "food UAE"
✅ "food dubai"
```

---

### 2️⃣ Construction Companies

#### Test 6: Lebanon Construction
```
Name: JIHAD AL-BINA
Country: Lebanon
Sector: Construction
Aliases:
- CONSTRUCTION JIHAD
- JIHAD CONSTRUCTION
- HOLY CONSTRUCTION FOUNDATION

Test queries:
✅ "Jihad"
✅ "construction lebanon"
✅ "بناء" (Arabic for construction)
✅ "reconstruction"
```

#### Test 7: UAE Building Materials
```
Name: SIMA GENERAL TRADING CO FZE
Country: UAE
Sector: Construction
Alias: SIMA GENERAL TRADING & INDUSTRIALS FOR BUILDING MATERIAL CO FZE

Test queries:
✅ "SIMA"
✅ "building materials"
✅ "construction uae"
✅ "مواد بناء" (Arabic)
```

#### Test 8: Syria Engineering
```
Name: HANDASIEH
Country: Syria
Sector: Construction
Alias: ORGANIZATION FOR ENGINEERING INDUSTRIES

Test queries:
✅ "Handasieh"
✅ "engineering syria"
✅ "هندسية" (Arabic)
```

#### Test 9: Lebanon Engineering
```
Name: Al-Inmaa Engineering and Contracting
Country: Lebanon
Sector: Construction
Alias: Al-Inmaa Group for Engineering and Contracting

Test queries:
✅ "Inmaa"
✅ "contracting lebanon"
✅ "الإنماء" (Arabic)
```

#### Test 10: Iranian Reconstruction
```
Name: IRANIAN COMMITTEE FOR THE RECONSTRUCTION OF LEBANON
Country: Lebanon
Sector: Construction
Aliases:
- IRANIAN HEADQUARTERS FOR THE RECONSTRUCTION OF LEBANON
- IRANIAN ORGANIZATION FOR REBUILDING LEBANON

Test queries:
✅ "Iranian reconstruction"
✅ "rebuilding lebanon"
✅ "إعادة إعمار" (Arabic)
```

---

### 3️⃣ Trading Companies (Various Sectors)

#### Test 11: UAE Trading
```
Name: AL WASEL AND BABEL GENERAL TRADING LLC
Country: United Arab Emirates
Sector: Unknown

Test queries:
✅ "Wasel"
✅ "Babel trading"
✅ "general trading uae"
```

#### Test 12: Lebanon Trading
```
Name: Dubai Trading Company
Country: UAE
Sector: Unknown

Test queries:
✅ "Dubai trading"
✅ "trading company"
✅ "شركة دبي" (Arabic)
```

#### Test 13: Iraq Trading
```
Name: AL-BASHAIR TRADING COMPANY, LTD
Country: Iraq
Sector: Unknown

Test queries:
✅ "Bashair"
✅ "trading iraq"
✅ "البشائر" (Arabic)
```

---

### 4️⃣ Multi-Country Companies

#### Test 14: Multi-Country Bank
```
Name: BANK SADERAT IRAN
Countries: Iran, France, Germany, Lebanon, UAE, Oman, Qatar, UK
Sector: Unknown
Alias: IRAN EXPORT BANK

Test queries:
✅ "Saderat"
✅ "Iran bank"
✅ "bank iran"
```

#### Test 15: International Shipping
```
Name: Shark International Shipping L.L.C
Countries: UAE, Oman
Sector: Unknown
Website: https://www.shark-intl.com
ID Numbers: 7 registration numbers!

Test queries:
✅ "Shark"
✅ "international shipping"
✅ "shipping uae"
```

---

## 🧪 Test Scenarios

### Scenario A: Exact Match
```
Search: "Eko Development"
Expected: 1 result
Company: Eko Development and Investment Company (Egypt)
```

### Scenario B: Partial Match
```
Search: "food"
Expected: 4-5 results
Companies: Eko, Baladna, Lama Foods, Asasi Food, etc.
```

### Scenario C: Country Filter
```
Search: "company"
Country: "Egypt"
Expected: 13 results (all Egyptian companies)
```

### Scenario D: Sector Search
```
Search: "construction"
Expected: 43 companies
Top results: JIHAD AL-BINA, HANDASIEH, SIMA, etc.
```

### Scenario E: Arabic Search
```
Search: "بلدنا" (Baladna in Arabic)
Expected: 1 result
Company: BALADNA FOR AGRICULTURAL INVESTMENTS...
```

### Scenario F: Typo Tolerance
```
Search: "Jihaad" (typo of Jihad)
Expected: Should find JIHAD AL-BINA
Status: OpenAI should handle this
```

---

## 📊 Quick Reference

### By Sector:
```
Food & Agriculture (11):
- AL-HAMATI SWEETS BAKERIES (Yemen)
- Eko Development (Egypt)
- BALADNA (Iraq)
- Lama Foods (Lebanon)
- Asasi Food (UAE)

Construction (43):
- JIHAD AL-BINA (Lebanon)
- HANDASIEH (Syria)
- SIMA GENERAL TRADING (UAE)
- Al-Inmaa Engineering (Lebanon)
- IRANIAN RECONSTRUCTION (Lebanon)
```

### By Country:
```
🇦🇪 UAE (478):
- AL WASEL AND BABEL GENERAL TRADING
- Asasi Food FZE
- SIMA GENERAL TRADING
- Shark International Shipping
- (474 more...)

🇱🇧 Lebanon (173):
- JIHAD AL-BINA
- Lama Foods
- WAAD PROJECT
- Al-Inmaa Engineering
- (169 more...)

🇸🇾 Syria (111):
- HANDASIEH
- MECHANICAL CONSTRUCTION FACTORY
- HESCO Engineering
- (108 more...)

🇾🇪 Yemen (50):
- AL-HAMATI SWEETS BAKERIES
- (49 more...)

🇮🇶 Iraq (46):
- BALADNA FOR AGRICULTURAL...
- AL-BASHAIR TRADING
- (44 more...)

🇪🇬 Egypt (13):
- Eko Development and Investment
- (12 more...)
```

---

## 🎯 Recommended Test Flow

### Test 1: Manual Review (No Match)
```
1. Click chatbot button
2. Select "مراجعة يدوية"
3. Type: "XYZ Company Not Exists"
4. Expected: "✅ لا توجد عقوبات"
```

### Test 2: Manual Review (Match Found)
```
1. Select "مراجعة يدوية"
2. Type: "Eko Development"
3. Expected: Shows 1 match with details
4. No action buttons (read-only)
```

### Test 3: Review Request (Approve)
```
1. Select "مراجعة الطلبات الجديدة"
2. Select a request
3. Chatbot auto-searches OFAC
4. If no match: [✅ اعتماد الطلب]
5. Click approve → Success!
```

### Test 4: Review Request (Block)
```
1. Create test request with name "Eko Development"
2. Assign to compliance
3. Select "مراجعة الطلبات"
4. Select that request
5. Chatbot finds OFAC match
6. OpenAI shows 85% confidence
7. Click [🚫 حظر الشركة]
8. Success → Sanctions saved!
```

---

## 📝 Copy-Paste Test Queries

```
# Simple tests:
Eko
food
construction
Jihad
Sima

# Full names:
Eko Development and Investment Company
AL-HAMATI SWEETS BAKERIES
JIHAD AL-BINA
HANDASIEH

# Arabic tests:
بلدنا
حلويات
بناء
هندسية

# With country:
food + Egypt
construction + Lebanon
trading + UAE

# Typos (test AI):
Eko Developmnt
Jihaad
constructon
```

---

## 🎉 Quick Test Commands

### Test via API:
```bash
# Test 1: Food company
curl -X POST http://localhost:3000/api/ofac/search \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Eko"}'

# Test 2: Construction
curl -X POST http://localhost:3000/api/ofac/search \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Jihad"}'

# Test 3: With country
curl -X POST http://localhost:3000/api/ofac/search \
  -H "Content-Type: application/json" \
  -d '{"companyName":"food","country":"Egypt"}'
```

---

**Use any of these companies to test the chatbot!** 🧪

