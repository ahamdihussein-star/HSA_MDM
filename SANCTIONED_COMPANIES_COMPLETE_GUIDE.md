# 🚨 Sanctioned Companies - Complete Implementation Guide
## Master Data Management System - October 2025

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Data Structure](#data-structure)
3. [Backend API](#backend-api)
4. [Frontend Implementation](#frontend-implementation)
5. [Usage Guide](#usage-guide)
6. [Testing](#testing)

---

## 🎯 Overview

تم إضافة **18 شركة معاقبة (Sanctioned Companies)** من قوائم OFAC الرسمية للنظام. هذه الشركات تُستخدم لأغراض الاختبار والتدريب على compliance workflows.

### ✨ Key Features

- ✅ **18 شركة معاقبة حقيقية** من OFAC
- ✅ **معلومات كاملة** (Name, Owner, Tax, Address, 4 Contacts)
- ✅ **Tax numbers فريدة** لكل شركة
- ✅ **API منفصل** للوصول للبيانات
- ✅ **Keyboard shortcuts** (Enter key) في New Request Page
- ✅ **Bulk PDF Generator** مع folder منفصل
- ✅ **Documents عادية** بدون أي إشارة للعقوبات

---

## 📊 Data Structure

### File Location
```
api/sanctioned-demo-companies.js
```

### Company Fields

```javascript
{
  // Basic Information
  id: "sanctioned_1",
  name: "SINOPER SHIPPING CO",
  nameAr: "شركة سينوبر للشحن",
  customerType: "Corporate",
  ownerName: "Saeed Al Mansoori",
  
  // Tax & Registration
  taxNumber: "400900000000001",  // Unique for each company
  
  // Address
  buildingNumber: "Office 2207, Prime Tower",
  street: "Business Bay",
  country: "United Arab Emirates",
  city: "Dubai",
  
  // Business Details
  industry: "Shipping and marine logistics",
  sector: "Shipping",
  salesOrg: "uae_dubai_office",
  distributionChannel: "direct_sales",
  division: "energy_products",
  source: "OFAC Sanctions List",
  
  // Sanction Information
  sanctionProgram: "Violating sanctions on Iranian oil trade",
  sanctionReason: "Helped Iran transport oil using front companies",
  sanctionStartDate: "2025-10-09",
  riskLevel: "High",  // or "Very High"
  sourceList: "OFAC",
  datasetVersion: "October 2025 Update",
  lastVerified: "2025-10-14",
  openSanctionsLink: "https://www.opensanctions.org/entities/ofac-55672/",
  
  // Contacts (4 per company)
  contacts: [
    {
      name: "Rashid Al-Maktoum",
      jobTitle: "Chief Executive Officer",
      email: "rashid@sinopershipping.com",
      mobile: "+971 50 1000000",
      landline: "+971 4 3000000",
      preferredLanguage: "English"
    },
    // ... 3 more contacts
  ]
}
```

### Countries Distribution

| Country | Companies | Risk Level |
|---------|-----------|------------|
| **United Arab Emirates** | 5 | High/Very High |
| **Yemen** | 8 | Very High |
| **Saudi Arabia** | 1 | Very High |
| **Oman** | 1 | Very High |
| **Qatar** | 1 | Very High |
| **Kuwait** | 1 | Very High |
| **Bahrain** | 1 | High |
| **Egypt** | 1 | High |
| **Total** | **18** | - |

### Sectors

- 🚢 **Shipping & Maritime**: 3 companies
- ⚡ **Energy & Oil Trading**: 8 companies
- 🌾 **General Trading**: 4 companies
- 🏦 **Banking**: 1 company
- 🏗️ **Construction**: 1 company
- 🏠 **Real Estate**: 1 company

---

## 🔌 Backend API

### 1. Get All Sanctioned Companies

```http
GET http://localhost:3000/api/sanctioned-companies
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "sanctioned_1",
      "name": "SINOPER SHIPPING CO",
      "nameAr": "شركة سينوبر للشحن",
      "taxNumber": "400900000000001",
      "country": "United Arab Emirates",
      "riskLevel": "High",
      "contacts": [...]
    }
    // ... 17 more companies
  ],
  "total": 18
}
```

---

### 2. Get Sanctioned Companies by Country

```http
GET http://localhost:3000/api/sanctioned-companies/country/:country
```

**Example:**
```http
GET http://localhost:3000/api/sanctioned-companies/country/United%20Arab%20Emirates
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "total": 5,
  "country": "United Arab Emirates"
}
```

---

### 3. Get Sanctioned Companies by Risk Level

```http
GET http://localhost:3000/api/sanctioned-companies/risk/:riskLevel
```

**Example:**
```http
GET http://localhost:3000/api/sanctioned-companies/risk/Very%20High
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "total": 13,
  "riskLevel": "Very High"
}
```

---

### 4. Get Statistics

```http
GET http://localhost:3000/api/sanctioned-companies/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 18,
    "byCountry": {
      "Yemen": 8,
      "United Arab Emirates": 5,
      "Saudi Arabia": 1,
      "Oman": 1,
      "Qatar": 1,
      "Kuwait": 1,
      "Bahrain": 1,
      "Egypt": 1
    },
    "byRiskLevel": {
      "Very High": 13,
      "High": 5
    },
    "bySector": {
      "Energy / Oil Trading": 8,
      "Shipping": 3,
      "General Trading": 4,
      "Banking / Financial Services": 1,
      "Construction / Investment": 1,
      "Real Estate": 1
    }
  }
}
```

---

## 💻 Frontend Implementation

### 1. New Request Page - Keyboard Shortcuts

#### File Location
```
src/app/new-request/new-request.component.ts
```

#### Keyboard Shortcuts

| Key | Action | Description |
|-----|--------|-------------|
| **Double Space** | Normal Company | جلب شركة عادية من الـ unified demo pool |
| **Shift + Enter** | Sanctioned Company | جلب شركة معاقبة من OFAC list |

#### Implementation

```typescript
// Variables
private sanctionedCompanies: any[] = [];
private currentSanctionedIndex: number = 0;

// Load sanctioned companies on init
setupKeyboardAutoFill(): void {
  this.loadSanctionedCompanies();
  
  this.keyboardListener = (event: KeyboardEvent) => {
    // Shift + Enter key - Sanctioned Company
    if (event.shiftKey && event.key === 'Enter' && target.tagName === 'INPUT') {
      event.preventDefault();
      this.fillWithSanctionedCompany();
      return;
    }
    
    // Double Space - Normal Company
    if (event.key === ' ' && doubleSpaceDetected) {
      event.preventDefault();
      this.handleAutoFillKeypress();
    }
  };
}

// Fill with sanctioned company
fillWithSanctionedCompany(): void {
  const company = this.sanctionedCompanies[this.currentSanctionedIndex];
  
  // Rotate to next company
  this.currentSanctionedIndex = (this.currentSanctionedIndex + 1) % this.sanctionedCompanies.length;
  
  // Fill form
  this.requestForm.patchValue({
    firstName: company.name,
    firstNameAr: company.nameAr,
    customerType: company.customerType,
    CompanyOwnerFullName: company.ownerName,
    tax: company.taxNumber,
    // ... all fields
  });
  
  // Fill contacts (4 contacts)
  company.contacts.forEach(contact => {
    this.addContact();
    // ... fill contact data
  });
}
```

#### User Messages

- ⚠️ **Warning**: "⚠️ Loading SANCTIONED company data..."
- 📋 **Info**: "📋 Loaded: SINOPER SHIPPING CO (UAE) - 17 sanctioned companies remaining"
- Console log includes Risk Level and Sanction Reason

---

### 2. PDF Bulk Generator

#### File Location
```
src/app/pdf-bulk-generator/pdf-bulk-generator.component.ts
src/app/pdf-bulk-generator/pdf-bulk-generator.component.html
src/app/pdf-bulk-generator/pdf-bulk-generator.component.scss
```

#### New Option: Company Type

**HTML:**
```html
<nz-radio-group [(ngModel)]="selectedCompanyType">
  <label nz-radio nzValue="normal">
    <i nz-icon nzType="check-circle"></i>
    Normal Companies
  </label>
  <label nz-radio nzValue="sanctioned">
    <i nz-icon nzType="warning" nzTheme="fill"></i>
    Sanctioned Companies
  </label>
</nz-radio-group>

<nz-alert 
  *ngIf="selectedCompanyType === 'sanctioned'"
  nzType="warning"
  nzMessage="⚠️ Sanctioned Companies"
  nzDescription="These are companies under international sanctions. Use for compliance testing only.">
</nz-alert>
```

**TypeScript:**
```typescript
selectedCompanyType: string = 'normal'; // 'normal' or 'sanctioned'

async startBulkGeneration(): Promise<void> {
  let allCompanies: any[] = [];
  
  if (this.selectedCompanyType === 'sanctioned') {
    // Fetch from API
    const response = await this.http.get<any>(
      'http://localhost:3000/api/sanctioned-companies'
    ).toPromise();
    allCompanies = response.data || [];
  } else {
    // Get normal companies
    allCompanies = this.demoDataGenerator.getAllCompanies();
  }
  
  // Create root folder
  const rootFolder = this.selectedCompanyType === 'sanctioned'
    ? zip.folder('sanctioned')!
    : zip;
  
  // Generate documents...
}
```

#### Folder Structure

**Normal Companies:**
```
MDM_Documents_2025-10-14.zip
├── Egypt/
│   ├── Juhayna/
│   │   ├── PDF/
│   │   │   ├── Commercial_Registration.pdf
│   │   │   └── Tax_Certificate.pdf
│   │   └── Images/
│   │       ├── Commercial_Registration.png
│   │       └── Tax_Certificate.png
```

**Sanctioned Companies:**
```
MDM_Documents_2025-10-14.zip
├── sanctioned/           ← ⭐ Root folder
│   ├── United Arab Emirates/
│   │   ├── SINOPER_SHIPPING_CO/
│   │   │   ├── PDF/
│   │   │   │   ├── Commercial_Registration.pdf
│   │   │   │   └── Tax_Certificate.pdf
│   │   │   └── Images/
│   │   │       ├── Commercial_Registration.png
│   │   │       └── Tax_Certificate.png
│   │   ├── SLOGAL_ENERGY_DMCC/
│   │   │   ├── PDF/
│   │   │   └── Images/
│   ├── Yemen/
│   │   ├── ABBOT_TRADING_CO_LTD/
│   │   │   ├── PDF/
│   │   │   └── Images/
```

---

## 📚 Usage Guide

### For Testing Compliance Workflows

#### Scenario 1: Data Entry User Tests Sanctioned Company

1. Navigate to **New Request** page
2. Focus on any input field
3. Press **Enter** key
4. ⚠️ Warning message appears
5. Form auto-fills with sanctioned company
6. User submits the request
7. Compliance team reviews and detects sanction

#### Scenario 2: Bulk Document Generation

1. Navigate to **PDF Bulk Generator** page
2. Select **Sanctioned Companies** radio button
3. ⚠️ Warning alert appears
4. Select countries (e.g., UAE, Yemen)
5. Select document types
6. Click **Generate Documents**
7. Download ZIP with `sanctioned/` folder

#### Scenario 3: Compliance Agent Search

1. Open Compliance Chat Widget
2. Search for: "SINOPER SHIPPING"
3. System finds company in OFAC database
4. Shows sanction details and risk level

---

## ✅ Important Notes

### 1. Documents Are Normal ⚠️

**الـ PDF و Images المولدة لا تحتوي على أي إشارة للعقوبات!**

- ✅ Commercial Registration عادي
- ✅ Tax Certificate عادي
- ✅ VAT Certificate عادي
- ❌ **لا يوجد watermark** أو ختم يقول "Sanctioned"
- ❌ **لا يوجد warning** في الـ documents

**السبب:**
- الهدف هو اختبار قدرة الـ compliance team على اكتشاف الشركات المعاقبة
- الـ documents الحقيقية لا تحتوي على تحذيرات
- التنظيم يكون فقط في الـ folder structure

### 2. Data Separation

| Feature | Normal Companies | Sanctioned Companies |
|---------|------------------|---------------------|
| **Source** | `demo-data-generator.service.ts` | `api/sanctioned-demo-companies.js` |
| **Count** | 70 companies | 18 companies |
| **API** | No API (in-memory) | `GET /api/sanctioned-companies` |
| **Keyboard** | Double Space | Enter |
| **Folder** | `Country/Company/` | `sanctioned/Country/Company/` |
| **Purpose** | Normal testing | Compliance testing |

### 3. Tax Numbers

**Format:** `{CountryCode}9{11 digits}`

The `9` prefix identifies sanctioned companies:
- Normal: `300000000000001` (Saudi)
- Sanctioned: `300900000000001` (Saudi, sanctioned)

### 4. Contacts

**كل شركة معاقبة لديها 4 contacts:**
- CEO
- CFO
- Operations Manager
- Compliance Officer

---

## 🧪 Testing

### Manual Testing

#### Test 1: Shift + Enter Key in New Request
```
1. Go to: /dashboard/new-request
2. Click on Company Name field
3. Press Shift + Enter
4. ✅ Expected: Form fills with sanctioned company
5. ✅ Expected: Warning message appears
6. ✅ Expected: 4 contacts added
```

#### Test 2: API Endpoint
```bash
curl http://localhost:3000/api/sanctioned-companies
```

**Expected Response:**
```json
{
  "success": true,
  "data": [...],
  "total": 18
}
```

#### Test 3: Bulk PDF Generator
```
1. Go to: /dashboard/pdf-bulk-generator
2. Select "Sanctioned Companies"
3. Select UAE and Yemen
4. Select all document types
5. Click Generate
6. ✅ Expected: ZIP has sanctioned/ folder
7. ✅ Expected: Documents are normal (no warnings)
```

#### Test 4: Statistics API
```bash
curl http://localhost:3000/api/sanctioned-companies/statistics
```

**Expected:**
```json
{
  "total": 18,
  "byCountry": { "Yemen": 8, "UAE": 5, ... },
  "byRiskLevel": { "Very High": 13, "High": 5 }
}
```

---

## 📝 Code Locations

### Backend Files

| File | Lines | Description |
|------|-------|-------------|
| `api/sanctioned-demo-companies.js` | 1-626 | Complete data structure |
| `api/better-sqlite-server.js` | 5592-5665 | API endpoints |

### Frontend Files

| File | Lines | Description |
|------|-------|-------------|
| `src/app/new-request/new-request.component.ts` | 3131-3187 | Keyboard listener setup |
| `src/app/new-request/new-request.component.ts` | 2460-2545 | Load & fill methods |
| `src/app/pdf-bulk-generator/pdf-bulk-generator.component.ts` | 49, 67-70 | Company type option |
| `src/app/pdf-bulk-generator/pdf-bulk-generator.component.ts` | 163-195 | Bulk generation logic |
| `src/app/pdf-bulk-generator/pdf-bulk-generator.component.html` | 55-92 | UI for company type |
| `src/app/pdf-bulk-generator/pdf-bulk-generator.component.scss` | 173-250 | Styling |

---

## 🎯 Summary

### ✅ What Was Implemented

1. ✅ **18 sanctioned companies** with complete data
2. ✅ **4 API endpoints** for data access
3. ✅ **Enter key** in New Request page
4. ✅ **Bulk PDF Generator** with sanctioned option
5. ✅ **Separate folder** structure (sanctioned/)
6. ✅ **Normal documents** (no sanction warnings)
7. ✅ **4 contacts** per company
8. ✅ **Unique tax numbers** with 9 prefix
9. ✅ **Complete documentation**

### 📊 Statistics

- **Total Companies**: 18
- **Countries**: 8
- **Risk Levels**: Very High (13), High (5)
- **Sectors**: 6 different sectors
- **Contacts per Company**: 4
- **Total Contacts**: 72
- **API Endpoints**: 4
- **Frontend Implementations**: 2

---

## 🚀 Next Steps (Optional)

### Future Enhancements

1. **Admin Page:**
   - Add "Generate Sanctioned Requests" button
   - Create 40 test requests from sanctioned companies

2. **Compliance Dashboard:**
   - Show sanctioned companies statistics
   - Highlight high-risk pending requests

3. **Duplicate Detection:**
   - Check against OFAC database
   - Auto-flag potential matches

4. **Audit Trail:**
   - Log all sanctioned company interactions
   - Compliance review history

---

## 📞 Support

For questions or issues:
- Check console logs for detailed error messages
- Verify API is running: `http://localhost:3000/api/sanctioned-companies`
- Check network tab in browser DevTools

---

**Implementation Date:** October 14, 2025  
**Version:** 1.0.0  
**Status:** ✅ Complete and Production Ready


