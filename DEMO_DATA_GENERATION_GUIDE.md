# Demo Data Generation - Complete Guide
## Master Data Management System - October 2025

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [User Demo Data (Forms)](#user-demo-data-forms)
3. [Admin Quarantine Data Generation](#admin-quarantine-data-generation)
4. [Admin Duplicate Data Generation](#admin-duplicate-data-generation)
5. [Document & Image Generation](#document--image-generation)
6. [Demo Data Service](#demo-data-service)
7. [Business Rules](#business-rules)

---

## 🎯 Overview

The system includes **4 different demo data generation mechanisms**:

1. **User Form Demo Fill** - For testing data entry forms (Keyboard shortcut)
2. **Quarantine Data Generation** - For testing quarantine workflow (Admin only)
3. **Duplicate Data Generation** - For testing duplicate detection (Admin only)
4. **Document Generation** - For generating realistic PDFs and images (Bulk generator)

---

## 📝 User Demo Data (Forms)

### Purpose
Allow users to quickly fill forms with realistic data for testing and demonstrations.

### Locations Where Available

#### 1. **New Request Page** (`/dashboard/new-request`)
**Component**: `src/app/new-request/new-request.component.ts`

**Trigger Method 1: Double Space Keyboard Shortcut**
```typescript
// Implementation: setupKeyboardAutoFill() method (line 3119)

setupKeyboardAutoFill(): void {
  console.log('Setting up keyboard auto-fill for data entry user');
  
  // Generate demo company data once
  this.currentDemoCompany = this.demoDataGenerator.generateDemoData();
  
  // Create keyboard listener - Double Space for auto-fill
  this.keyboardListener = (event: KeyboardEvent) => {
    // Check for Space key
    if (event.key === ' ' || event.code === 'Space') {
      const now = Date.now();
      
      // Check if this is the second space within 500ms
      if (now - this.lastSpaceTime < 500) {
        this.spaceClickCount++;
        
        // If user pressed space twice
        if (this.spaceClickCount >= 2) {
          event.preventDefault();
          event.stopPropagation();
          
          console.log('Double space detected - triggering auto-fill');
          this.handleAutoFillKeypress();
          this.spaceClickCount = 0;
        }
      } else {
        this.spaceClickCount = 1;
      }
      
      this.lastSpaceTime = now;
    }
  };
  
  // Attach listener with capture=true
  document.addEventListener('keydown', this.keyboardListener, true);
}

handleAutoFillKeypress(): void {
  const activeElement = document.activeElement as HTMLElement;
  
  if (!activeElement || !this.currentDemoCompany) {
    return;
  }
  
  // Get field name from element
  const fieldName = this.getFieldNameFromElement(activeElement);
  
  if (!fieldName) {
    return;
  }
  
  // Get demo value for this field
  const demoValue = this.getDemoValueForField(fieldName);
  
  if (demoValue) {
    // Fill the field with demo value
    this.fillFieldWithValue(fieldName, demoValue);
    
    // Visual feedback
    this.showAutoFillAnimation(activeElement);
  }
}
```

**How It Works**:
1. User focuses on any input field
2. Presses Space key twice quickly (within 500ms)
3. System auto-fills that specific field with demo data
4. Shows green flash animation as feedback
5. User can continue to next field

**Demo Data Source**: `DemoDataGeneratorService.generateDemoData()`

**Supported Fields**:
- Company Name (English/Arabic)
- Tax Number
- Customer Type
- Company Owner
- Building Number
- Street
- Country
- City
- Sales Organization
- Distribution Channel
- Division
- All contact fields (name, email, mobile, etc.)

---

#### 2. **AI Agent Unified Modal**
**Component**: `src/app/data-entry-agent/data-entry-chat-widget.component.ts`

**Trigger Method: Double Space in Modal**
```typescript
// Implementation: attachModalKeyboardListener() method (line 1558)

private attachModalKeyboardListener(): void {
  // Wait for modal to render
  setTimeout(() => {
    const modalContent = document.querySelector('.ant-modal-content');
    
    if (modalContent) {
      this.modalKeyboardListener = (event: KeyboardEvent) => {
        if (event.key === ' ' || event.code === 'Space') {
          const now = Date.now();
          
          if (now - this.lastSpaceTime < 500) {
            this.spaceClickCount++;
            
            if (this.spaceClickCount >= 2) {
              event.preventDefault();
              event.stopPropagation();
              console.log('Double space detected in modal - triggering auto-fill');
              this.handleAutoFillKeypress();
              this.spaceClickCount = 0;
            }
          } else {
            this.spaceClickCount = 1;
          }
          
          this.lastSpaceTime = now;
        }
      };
      
      modalContent.addEventListener('keydown', this.modalKeyboardListener as any);
      console.log('✅ Modal keyboard listener attached');
    }
  }, 100);
}
```

**How It Works**:
1. User opens unified modal (Review & Complete Data)
2. Focuses on any field
3. Presses Space twice quickly
4. Field auto-fills with demo data
5. Works for all form fields in the modal

**Demo Data Source**: Same `DemoDataGeneratorService`

---

#### 3. **AI Agent Contact Modal**
**Component**: `src/app/data-entry-agent/data-entry-chat-widget.component.ts`

**Trigger Method: Double Space in Contact Modal**
```typescript
// Implementation: setupModalDemoDataListener() method (line 3269)

private setupModalDemoDataListener(): void {
  // Remove any existing listener
  if (this.modalKeyboardListener) {
    try {
      const modalContent = document.querySelector('.contact-modal .ant-modal-content');
      if (modalContent) {
        modalContent.removeEventListener('keydown', this.modalKeyboardListener as any);
      }
    } catch {}
  }
  
  // Add new listener
  setTimeout(() => {
    const modalContent = document.querySelector('.contact-modal .ant-modal-content');
    
    if (modalContent) {
      this.modalKeyboardListener = (event: KeyboardEvent) => {
        if (event.code === 'Space') {
          const now = Date.now();
          
          if (now - this.lastSpaceTime < 500) {
            this.spaceClickCount++;
            
            if (this.spaceClickCount >= 2) {
              console.log('🎯 Double space detected in contact modal - generating demo contact');
              this.generateDemoContactData();
              this.spaceClickCount = 0;
            }
          } else {
            this.spaceClickCount = 1;
          }
          
          this.lastSpaceTime = now;
        }
      };
      
      modalContent.addEventListener('keydown', this.modalKeyboardListener as any);
      console.log('✅ Demo data listener attached to contact modal');
    }
  }, 300);
}

private generateDemoContactData(): void {
  const demoCompany = this.demoDataGenerator.generateDemoData();
  const demoContact = demoCompany.contacts[0];
  
  this.contactModalForm.patchValue({
    name: demoContact.name || 'Ahmed Mohamed',
    jobTitle: demoContact.jobTitle || 'Sales Manager',
    email: demoContact.email || 'ahmed@company.com',
    mobile: demoContact.mobile || '+201234567890',
    landline: demoContact.landline || '',
    preferredLanguage: demoContact.preferredLanguage || 'Arabic'
  });
  
  this.cdr.detectChanges();
  console.log('✅ Demo contact data generated:', this.contactModalForm.value);
}
```

**How It Works**:
1. User opens "Add Contact" or "Edit Contact" modal
2. Focuses on any field
3. Presses Space twice quickly
4. Entire contact form fills with demo data
5. User can edit as needed

**Demo Data Source**: First contact from `DemoDataGeneratorService.generateDemoData().contacts[0]`

---

### Demo Data Generator Service

**Service**: `src/app/services/demo-data-generator.service.ts`

**Purpose**: Central service providing realistic demo company data

**Key Features**:
- ✅ Pool of 14 realistic companies
- ✅ Sequential loading (no repetition)
- ✅ Comprehensive data (all fields)
- ✅ Multiple contacts per company
- ✅ Country-specific cities
- ✅ Realistic tax numbers

**Company Pool (14 Companies)**:

**Saudi Arabia (3 companies)**:
1. Almarai (المراعي) - Dairy and food
2. Saudia Dairy & Foodstuff Company - Dairy
3. Al Safi Danone (الصافي دانون) - Dairy

**Egypt (4 companies)**:
4. Juhayna Food Industries (جهينة) - Beverages and dairy
5. Edita Food Industries (إيديتا) - Baked goods
6. Domty (دومتي) - Dairy products
7. Cairo Poultry (القاهرة للدواجن) - Poultry

**UAE (4 companies)**:
8. Al Ain Farms (مزارع العين) - Fresh produce
9. National Food Products Company (NFPC) - Food manufacturing
10. Al Islami Foods (الإسلامي للأغذية) - Halal food
11. Emirates Snack Foods (الإمارات للوجبات) - Snacks

**Yemen (3 companies)**:
12. Yemen Soft Drinks (اليمن للمشروبات) - Beverages
13. Hayel Saeed Anam (حايل سعيد أنعم) - Trading and food
14. Yemen Sugar Company (اليمن للسكر) - Sugar production

**Service Implementation**:
```typescript
@Injectable({ providedIn: 'root' })
export class DemoDataGeneratorService {
  private companies: DemoCompany[] = [ /* 14 companies */ ];
  private currentIndex = 0;
  private lastUsedCompany: DemoCompany | null = null;
  
  // Generate next demo company (sequential)
  generateDemoData(): DemoCompany {
    const company = this.companies[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.companies.length;
    this.lastUsedCompany = company;
    return company;
  }
  
  // Get last generated company
  getLastUsedCompany(): DemoCompany | null {
    return this.lastUsedCompany;
  }
  
  // Get remaining companies count
  getRemainingCompaniesCount(): number {
    return this.companies.length - this.currentIndex;
  }
  
  // Reset to first company
  resetGenerator(): void {
    this.currentIndex = 0;
  }
}
```

**Demo Company Structure**:
```typescript
interface DemoCompany {
  name: string;              // "Almarai"
  nameAr: string;           // "المراعي"
  customerType: string;     // "Public Company"
  ownerName: string;        // "Majed Al-Qasabi"
  taxNumber: string;        // "300000000000001"
  buildingNumber: string;   // "1234"
  street: string;           // "King Abdulaziz Road"
  country: string;          // "Saudi Arabia"
  city: string;             // "Riyadh"
  salesOrg: string;         // "1000"
  distributionChannel: string; // "10"
  division: string;         // "00"
  contacts: DemoContact[];  // Array of 1-2 contacts
}

interface DemoContact {
  name: string;             // "Noura Al-Dosari"
  jobTitle: string;         // "Procurement Manager"
  email: string;            // "noura.dosari@almarai.com"
  mobile: string;           // "+966501234571"
  landline: string;         // "+966112345681"
  preferredLanguage: string; // "Arabic" or "English"
}
```

---

## 🔴 Admin Quarantine Data Generation

### Purpose
Generate realistic quarantine data for testing the quarantine workflow and resolution process.

### Business Objective
Test the quarantine workflow where reviewers reject requests back to data entry for correction.

### Access
**Page**: Admin Data Management (`/dashboard/admin-data-management`)  
**Role Required**: Admin only  
**Component**: `src/app/admin-data-management/admin-data-management.component.ts`

### How to Use
```typescript
// 1. Login as admin
Username: admin
Password: admin123

// 2. Navigate to Admin Data Management
Route: /dashboard/admin-data-management

// 3. Click "Generate Quarantine Data" button
Component method: generateQuarantineData() (line 175)

// 4. System generates 40 quarantine records
API: POST /api/requests/admin/generate-quarantine

// 5. Success message shows count
Message: "Generated 40 quarantine records for food companies"
```

### Frontend Implementation
```typescript
// src/app/admin-data-management/admin-data-management.component.ts (line 175)

async generateQuarantineData(): Promise<void> {
  this.loading = true;
  
  try {
    const response = await firstValueFrom(
      this.http.post<any>(`${this.apiBase}/requests/admin/generate-quarantine`, {})
    );
    
    if (response.success) {
      this.modal.success({
        nzTitle: 'Success',
        nzContent: `Generated ${response.recordIds?.length || 0} quarantine records successfully!`
      });
      
      // Reload data to show new records
      this.loadData();
    }
  } catch (error) {
    console.error('Error generating quarantine data:', error);
    this.modal.error({
      nzTitle: 'Error',
      nzContent: 'Failed to generate quarantine data'
    });
  } finally {
    this.loading = false;
  }
}
```

### Backend Implementation
**API**: `POST /api/requests/admin/generate-quarantine`  
**Location**: `api/better-sqlite-server.js` (line 3985)

**Demo Data Source**: Hardcoded realistic food companies

**Companies Generated** (40 records from 10 base companies):
```javascript
const realFoodCompanies = [
  // Saudi Arabia - Retail Chains
  { 
    name: 'Panda Retail Company', 
    nameAr: 'شركة بندة للتجزئة', 
    tax: 'SA1010998877',
    country: 'Saudi Arabia',
    city: 'Riyadh',
    owner: 'Savola Group',
    type: 'Corporate'
  },
  { 
    name: 'Tamimi Markets', 
    nameAr: 'أسواق التميمي', 
    tax: 'SA2020887766',
    country: 'Saudi Arabia',
    city: 'Riyadh',
    owner: 'Tamimi Group',
    type: 'Corporate'
  },
  
  // Saudi Arabia - Food Manufacturing
  { 
    name: 'Almarai Company', 
    nameAr: 'شركة المراعي', 
    tax: 'SA3030776655',
    country: 'Saudi Arabia',
    city: 'Riyadh',
    owner: 'Sultan Al Qahtani',
    type: 'SME'
  },
  { 
    name: 'Nadec Food Products', 
    nameAr: 'نادك للمنتجات الغذائية', 
    tax: 'SA4040665544',
    country: 'Saudi Arabia',
    city: 'Riyadh',
    owner: 'NADEC Board',
    type: 'Corporate'
  },
  
  // UAE - Food Companies
  { 
    name: 'Al Maya Supermarkets', 
    nameAr: 'أسواق المايا', 
    tax: 'AE5050554433',
    country: 'United Arab Emirates',
    city: 'Dubai',
    owner: 'Al Maya Group',
    type: 'Retail Chain'
  },
  { 
    name: 'Spinneys Dubai', 
    nameAr: 'سبينس دبي', 
    tax: 'AE6060443322',
    country: 'United Arab Emirates',
    city: 'Dubai',
    owner: 'Albwardy Investment',
    type: 'Retail Chain'
  },
  
  // UAE - Restaurants & Catering
  { 
    name: 'Emirates Flight Catering', 
    nameAr: 'طيران الإمارات للتموين', 
    tax: 'AE7070332211',
    country: 'United Arab Emirates',
    city: 'Dubai',
    owner: 'Emirates Group',
    type: 'Corporate'
  },
  
  // Egypt - Food Retail
  { 
    name: 'Metro Markets Egypt', 
    nameAr: 'مترو ماركت مصر', 
    tax: '100200300',
    country: 'Egypt',
    city: 'Cairo',
    owner: 'Mansour Group',
    type: 'Retail Chain'
  },
  { 
    name: 'Kheir Zaman Supermarket', 
    nameAr: 'سوبر ماركت خير زمان', 
    tax: '400500600',
    country: 'Egypt',
    city: 'Cairo',
    owner: 'Kheir Zaman Holdings',
    type: 'Retail Chain'
  },
  
  // Yemen - Food Distributors
  { 
    name: 'Yemen General Trading', 
    nameAr: 'اليمن للتجارة العامة', 
    tax: 'YE8080221100',
    country: 'Yemen',
    city: 'Sanaa',
    owner: 'Ahmed Al-Sanani',
    type: 'SME'
  }
];
```

**Generation Logic**:
```javascript
app.post('/api/requests/admin/generate-quarantine', (req, res) => {
  try {
    console.log('[ADMIN] POST /api/requests/admin/generate-quarantine');
    
    const createdIds = [];
    
    // Generate 4 variations per company (10 * 4 = 40 records)
    realFoodCompanies.forEach((company, index) => {
      for (let variant = 0; variant < 4; variant++) {
        const id = nanoid();
        
        // Create request with status="Quarantine"
        const stmt = db.prepare(`
          INSERT INTO requests (
            id, firstName, firstNameAr, tax, CustomerType,
            CompanyOwner, buildingNumber, street, country, city,
            SalesOrgOption, DistributionChannelOption, DivisionOption,
            status, assignedTo, createdBy, origin, sourceSystem,
            rejectReason, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
          id,
          company.name,
          company.nameAr,
          company.tax + variant,  // Make tax unique per variant
          company.type,
          company.owner,
          '12' + (index + 1),
          company.name + ' Street',
          company.country,
          company.city,
          getSalesOrgByCountry(company.country),
          getDistributionChannel(),
          getDivision(),
          'Quarantine',          // Status
          'data_entry',          // Assigned to
          'data_entry',          // Created by
          'dataEntry',
          'Data Steward',
          `Missing information - variant ${variant + 1}`,  // Reject reason
          new Date().toISOString()
        );
        
        createdIds.push(id);
      }
    });
    
    res.json({
      success: true,
      message: `Generated ${createdIds.length} quarantine records`,
      recordIds: createdIds
    });
    
  } catch (error) {
    console.error('[ADMIN] Error generating quarantine data:', error);
    res.status(500).json({ error: 'Failed to generate quarantine data' });
  }
});
```

**Business Rules Applied**:
- ✅ Status must be "Quarantine"
- ✅ Assigned to "data_entry" (for resubmission)
- ✅ Includes realistic reject reason
- ✅ Uses valid lookup values (sales org, distribution, division)
- ✅ Tax numbers are unique (appends variant number)
- ✅ All required fields populated

**Where Generated Data Appears**:
- Component: `src/app/quarantine/quarantine.component.ts`
- Route: `/dashboard/quarantine`
- API: `GET /api/duplicates/quarantine`

---

## 🔄 Admin Duplicate Data Generation

### Purpose
Generate realistic duplicate data for testing duplicate detection and master record building.

### Business Objective
Test the duplicate detection workflow, master record builder, and duplicate resolution process.

### Access
**Page**: Admin Data Management (`/dashboard/admin-data-management`)  
**Role Required**: Admin only  
**Component**: `src/app/admin-data-management/admin-data-management.component.ts`

### How to Use
```typescript
// 1. Login as admin
Username: admin
Password: admin123

// 2. Navigate to Admin Data Management
Route: /dashboard/admin-data-management

// 3. Click "Generate Duplicate Data" button
Component method: generateDuplicateData() (line 201)

// 4. System generates 60 duplicate records
API: POST /api/requests/admin/generate-duplicates

// 5. Success message shows count
Message: "Generated 60 duplicate records in 20 groups successfully!"
```

### Frontend Implementation
```typescript
// src/app/admin-data-management/admin-data-management.component.ts (line 201)

async generateDuplicateData(): Promise<void> {
  this.loading = true;
  
  try {
    const response = await firstValueFrom(
      this.http.post<any>(`${this.apiBase}/requests/admin/generate-duplicates`, {})
    );
    
    if (response.success) {
      this.modal.success({
        nzTitle: 'Success',
        nzContent: `Generated ${response.generated || 0} duplicate records successfully!`
      });
      
      this.loadData();
    }
  } catch (error) {
    console.error('Error generating duplicate data:', error);
    this.modal.error({
      nzTitle: 'Error',
      nzContent: 'Failed to generate duplicate data'
    });
  } finally {
    this.loading = false;
  }
}
```

### Backend Implementation
**API**: `POST /api/requests/admin/generate-duplicates`  
**Location**: `api/better-sqlite-server.js` (line 4195)

**Demo Data Source**: Hardcoded realistic company groups

**Generation Strategy**:
```javascript
app.post('/api/requests/admin/generate-duplicates', (req, res) => {
  try {
    console.log('[ADMIN] POST /api/requests/admin/generate-duplicates');
    
    // Lookup values from shared data
    const sourceSystems = ['Oracle Forms', 'SAP S/4HANA', 'SAP ByD'];
    const customerTypes = ['Limited Liability Company', 'Joint Stock Company', 'Partnership', 'Wholesale Distributor'];
    const salesOrgs = ['HSA Saudi Arabia 2000', 'HSA UAE 3000', 'HSA Yemen 4000'];
    const distributionChannels = ['Modern Trade', 'Traditional Trade', 'HoReCa', 'Key Accounts', 'B2B'];
    const divisions = ['Food Products', 'Beverages', 'Dairy and Cheese', 'Frozen Products', 'Snacks and Confectionery'];
    
    // Base companies (20 realistic companies)
    const baseCompanies = [
      { name: 'AlMarai Dairy Products', nameAr: 'منتجات المراعي للألبان', tax: '310001234567890', country: 'Saudi Arabia', city: 'Riyadh' },
      { name: 'Nadec Fresh Foods', nameAr: 'نادك للأغذية الطازجة', tax: '310002345678901', country: 'Saudi Arabia', city: 'Riyadh' },
      { name: 'Saudia Dairy Corporation', nameAr: 'المراعي السعودية', tax: '310003456789012', country: 'Saudi Arabia', city: 'Jeddah' },
      // ... 17 more companies
    ];
    
    const createdIds = [];
    
    // Generate 3 variations per company (20 * 3 = 60 records)
    baseCompanies.forEach((baseCompany, companyIndex) => {
      const sharedTax = baseCompany.tax;
      const sharedType = customerTypes[companyIndex % customerTypes.length];
      const masterId = `master_${Date.now()}_${companyIndex}`;
      
      // Create 3 duplicate records for each company
      for (let variant = 0; variant < 3; variant++) {
        const id = nanoid();
        
        // Slightly vary the name to simulate real duplicates
        const nameVariations = [
          baseCompany.name,
          baseCompany.name.replace('Company', 'Co.'),
          baseCompany.name + ' LLC'
        ];
        
        const stmt = db.prepare(`
          INSERT INTO requests (
            id, firstName, firstNameAr, tax, CustomerType,
            CompanyOwner, buildingNumber, street, country, city,
            SalesOrgOption, DistributionChannelOption, DivisionOption,
            status, assignedTo, origin, sourceSystem,
            masterId, isMaster, confidence,
            createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
          id,
          nameVariations[variant],  // Varied name
          baseCompany.nameAr,
          sharedTax,                // SAME tax for all 3 (this makes them duplicates)
          sharedType,               // SAME type for all 3
          `Owner ${companyIndex}`,
          `${100 + variant}`,
          `${baseCompany.name} Street`,
          baseCompany.country,
          baseCompany.city,
          salesOrgs[companyIndex % salesOrgs.length],
          distributionChannels[variant % distributionChannels.length],
          divisions[companyIndex % divisions.length],
          variant === 0 ? 'Duplicate' : 'Linked',  // First is master, others linked
          'reviewer',
          sourceSystems[variant % sourceSystems.length],
          sourceSystems[variant % sourceSystems.length],
          masterId,                 // SAME masterId for all 3
          variant === 0 ? 1 : 0,    // First variant is master
          0.85 + (Math.random() * 0.10),  // Confidence: 85-95%
          new Date().toISOString()
        );
        
        createdIds.push(id);
      }
    });
    
    res.json({
      success: true,
      message: `Generated ${createdIds.length} duplicate records in ${baseCompanies.length} groups`,
      generated: createdIds.length,
      groups: baseCompanies.length
    });
    
  } catch (error) {
    console.error('[ADMIN] Error generating duplicate data:', error);
    res.status(500).json({ error: error.message });
  }
});
```

**Business Rules Applied**:
- ✅ Each group has 3 duplicate records
- ✅ All 3 share same `tax` number (duplicate key)
- ✅ All 3 share same `CustomerType` (duplicate key)
- ✅ All 3 share same `masterId` (for grouping)
- ✅ First record is marked as `isMaster = 1`
- ✅ Other records have `status = 'Linked'`
- ✅ Confidence score between 85-95%
- ✅ Names slightly varied (realistic duplicates)
- ✅ Different source systems (simulate multi-source data)
- ✅ Uses valid lookup values

**Where Generated Data Appears**:
- Component: `src/app/duplicate-records/duplicate-records.component.ts`
- Route: `/dashboard/duplicate-records`
- API: `GET /api/duplicates`

**Duplicate Groups Structure**:
```
Group 1: AlMarai Dairy Products
  ├── Record 1: "AlMarai Dairy Products" (Master, isMaster=1)
  ├── Record 2: "AlMarai Dairy Co." (Linked)
  └── Record 3: "AlMarai Dairy Products LLC" (Linked)
  All share: tax="310001234567890", CustomerType="Limited Liability Company"

Group 2: Nadec Fresh Foods
  ├── Record 1: "Nadec Fresh Foods" (Master)
  ├── Record 2: "Nadec Fresh Co." (Linked)
  └── Record 3: "Nadec Fresh Foods LLC" (Linked)
  All share: tax="310002345678901", CustomerType="Joint Stock Company"

... (18 more groups)
```

---

## 📄 Document & Image Generation

### Purpose
Generate realistic business documents (PDFs and images) for testing and demonstrations.

### Business Objective
Provide realistic commercial registrations, tax cards, and other business documents for:
- Testing document upload
- Testing OCR processing
- Demonstrating AI Agent
- Training purposes

### Access
**Page**: PDF Bulk Generator (`/dashboard/pdf-bulk-generator`)  
**Role Required**: Any user  
**Component**: `src/app/pdf-bulk-generator/pdf-bulk-generator.component.ts`

### How to Use
```typescript
// 1. Login (any role)

// 2. Navigate to PDF Bulk Generator
Route: /dashboard/pdf-bulk-generator

// 3. Select options:
//    - Countries (Egypt, Saudi Arabia, UAE, Yemen)
//    - Document Types (Commercial Registration, Tax Card, etc.)
//    - Companies (from demo data pool - 14 companies)
//    - Output Format (PDF, Images, or Both)
//    - Image Format (PNG or JPEG)

// 4. Click "Generate Documents"

// 5. System generates documents and creates ZIP file

// 6. Download ZIP with folder structure:
//    Country/
//    └── Company/
//        ├── PDF/
//        │   ├── Commercial_Registration.pdf
//        │   └── Tax_Card.pdf
//        └── Images/
//            ├── Commercial_Registration.png
//            └── Tax_Card.png
```

### Services Used

#### 1. **DemoDataGeneratorService**
**Location**: `src/app/services/demo-data-generator.service.ts`  
**Purpose**: Provides company data for documents

**Usage in PDF Generator**:
```typescript
// Get companies for selected countries
getCompaniesForCountries(countries: string[]): DemoCompany[] {
  return this.companies.filter(company => 
    countries.includes(company.country)
  );
}
```

---

#### 2. **RealisticDocumentGeneratorService**
**Location**: `src/app/services/realistic-document-generator.service.ts`  
**Purpose**: Generate realistic PDF documents

**Key Method**:
```typescript
generateDocument(
  type: DocumentType,
  companyName: string,
  country: string,
  companyData: any
): RealisticDocument {
  
  // Generate PDF based on document type
  switch(type) {
    case 'commercialRegistration':
      return this.generateCommercialRegistration(companyName, country, companyData);
      
    case 'taxCard':
      return this.generateTaxCard(companyName, country, companyData);
      
    case 'vatCertificate':
      return this.generateVATCertificate(companyName, country, companyData);
      
    // ... more document types
  }
}

// Example: Commercial Registration
private generateCommercialRegistration(
  companyName: string, 
  country: string, 
  data: any
): RealisticDocument {
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Add header
  doc.setFontSize(20);
  doc.text('Commercial Registration Certificate', 105, 30, { align: 'center' });
  
  // Add country seal/logo
  if (country === 'Egypt') {
    doc.text('جمهورية مصر العربية', 105, 40, { align: 'center' });
    doc.text('وزارة التجارة والصناعة', 105, 50, { align: 'center' });
  } else if (country === 'Saudi Arabia') {
    doc.text('المملكة العربية السعودية', 105, 40, { align: 'center' });
    doc.text('وزارة التجارة', 105, 50, { align: 'center' });
  }
  
  // Add company information
  doc.setFontSize(12);
  doc.text(`Company Name: ${companyName}`, 20, 80);
  doc.text(`Company Name (AR): ${data.nameAr}`, 20, 90);
  doc.text(`Registration Number: ${this.generateRegistrationNumber(country)}`, 20, 100);
  doc.text(`Tax Number: ${data.taxNumber}`, 20, 110);
  doc.text(`Company Owner: ${data.ownerName}`, 20, 120);
  doc.text(`Address: ${data.buildingNumber} ${data.street}, ${data.city}`, 20, 130);
  doc.text(`Customer Type: ${data.customerType}`, 20, 140);
  
  // Add dates
  const issueDate = new Date();
  doc.text(`Issue Date: ${issueDate.toLocaleDateString()}`, 20, 160);
  doc.text(`Expiry Date: ${new Date(issueDate.getFullYear() + 1, issueDate.getMonth(), issueDate.getDate()).toLocaleDateString()}`, 20, 170);
  
  // Add official stamp/seal area
  doc.rect(140, 200, 50, 30);
  doc.text('Official Seal', 165, 215, { align: 'center' });
  
  // Convert to base64
  const pdfBase64 = doc.output('datauristring').split(',')[1];
  
  return {
    name: `${companyName}_Commercial_Registration.pdf`,
    type: 'application/pdf',
    contentBase64: pdfBase64,
    metadata: {
      documentType: 'commercialRegistration',
      country: country,
      companyName: companyName
    }
  };
}
```

**Document Types Generated**:
- ✅ Commercial Registration
- ✅ Tax Card
- ✅ VAT Certificate

---

#### 3. **DocumentImageGeneratorService**
**Location**: `src/app/services/document-image-generator.service.ts`  
**Purpose**: Convert PDFs to images (PNG/JPEG)

**Key Method**:
```typescript
async generateDocumentImage(
  type: string,
  companyName: string,
  country: string,
  companyData: any,
  format: ImageFormat
): Promise<DocumentImage | null> {
  
  // 1. Generate PDF first
  const pdfDoc = this.realisticDocGenerator.generateDocument(
    type as DocumentType,
    companyName,
    country,
    companyData
  );
  
  // 2. Create canvas to render PDF
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = 794;   // A4 width in pixels at 96 DPI
  canvas.height = 1123; // A4 height in pixels at 96 DPI
  
  // 3. Draw PDF content on canvas
  // (Simplified - actual implementation uses html2canvas)
  
  // 4. Convert canvas to image
  const imageDataUrl = canvas.toDataURL(
    format === 'png' ? 'image/png' : 'image/jpeg',
    0.95  // Quality for JPEG
  );
  
  // 5. Extract base64
  const imageBase64 = imageDataUrl.split(',')[1];
  
  return {
    name: `${companyName}_${type}.${format}`,
    type: format === 'png' ? 'image/png' : 'image/jpeg',
    contentBase64: imageBase64,
    width: canvas.width,
    height: canvas.height,
    format: format
  };
}
```

**Conversion Process**:
```
PDF Document
  ↓
jsPDF generation
  ↓
Render to HTML
  ↓
html2canvas (capture)
  ↓
Canvas to Image
  ↓
PNG or JPEG output
  ↓
Base64 encoding
```

### Component Implementation
**Component**: `src/app/pdf-bulk-generator/pdf-bulk-generator.component.ts`

**Generation Flow**:
```typescript
async generateDocuments(): Promise<void> {
  // 1. Get companies from DemoDataGenerator
  const companies = this.demoDataGenerator.companies.filter(c =>
    this.selectedCountries.includes(c.country)
  );
  
  // 2. Create ZIP structure
  const zip = new JSZip();
  
  // 3. For each company
  for (const company of companies) {
    // Create folder structure: Country/Company/
    const countryFolder = zip.folder(company.country)!;
    const companyFolder = countryFolder.folder(company.name)!;
    
    // Create PDF and Images subfolders
    const pdfFolder = companyFolder.folder('PDF');
    const imagesFolder = companyFolder.folder('Images');
    
    // 4. For each selected document type
    for (const docType of this.selectedDocumentTypes) {
      
      // Generate PDF if needed
      if (this.outputFormat === 'pdf' || this.outputFormat === 'both') {
        const pdfDoc = this.docGeneratorService.generateDocument(
          docType,
          company.name,
          company.country,
          company
        );
        
        const pdfBlob = this.base64ToBlob(pdfDoc.contentBase64, 'application/pdf');
        pdfFolder!.file(`${docType}.pdf`, pdfBlob);
      }
      
      // Generate Image if needed
      if (this.outputFormat === 'images' || this.outputFormat === 'both') {
        const imageDoc = await this.imageGeneratorService.generateDocumentImage(
          docType,
          company.name,
          company.country,
          company,
          this.imageFormat  // 'png' or 'jpeg'
        );
        
        const imageMime = this.imageFormat === 'png' ? 'image/png' : 'image/jpeg';
        const imageBlob = this.base64ToBlob(imageDoc.contentBase64, imageMime);
        imagesFolder!.file(`${docType}.${this.imageFormat}`, imageBlob);
      }
    }
  }
  
  // 5. Generate ZIP file
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  
  // 6. Download
  saveAs(zipBlob, 'MDM_Documents.zip');
}
```

**Folder Structure Generated**:
```
MDM_Documents.zip
├── Saudi Arabia/
│   ├── Almarai/
│   │   ├── PDF/
│   │   │   ├── Commercial_Registration.pdf
│   │   │   ├── Tax_Card.pdf
│   │   │   └── VAT_Certificate.pdf
│   │   └── Images/
│   │       ├── Commercial_Registration.png
│   │       ├── Tax_Card.png
│   │       └── VAT_Certificate.png
│   ├── Saudia Dairy/
│   │   ├── PDF/
│   │   └── Images/
│   └── Al Safi Danone/
│       ├── PDF/
│       └── Images/
│
├── Egypt/
│   ├── Juhayna/
│   │   ├── PDF/
│   │   └── Images/
│   └── Edita/
│       ├── PDF/
│       └── Images/
│
├── UAE/
│   └── ... (similar structure)
│
└── Yemen/
    └── ... (similar structure)
```

**Demo Data Used**:
```typescript
// From DemoDataGeneratorService (14 companies)
// Each company provides:
{
  name: "Almarai",
  nameAr: "المراعي",
  taxNumber: "300000000000001",
  ownerName: "Majed Al-Qasabi",
  country: "Saudi Arabia",
  city: "Riyadh",
  buildingNumber: "1234",
  street: "King Abdulaziz Road",
  customerType: "Public Company",
  // ... all other fields
}
```

---

## 📊 Business Rules for Demo Data

### Rule 1: Sequential Loading
**Applied In**: DemoDataGeneratorService  
**Logic**: Companies loaded sequentially (index 0 → 13 → repeat)  
**Benefit**: No repetition in same session

### Rule 2: Realistic Data
**Applied In**: All demo data sources  
**Logic**: Use real company names, valid tax formats, correct city-country mapping  
**Benefit**: Realistic testing scenarios

### Rule 3: Unique Tax Numbers
**Applied In**: Quarantine and Form demo data  
**Logic**: Each record has unique tax (append variant number)  
**Benefit**: Avoid unwanted duplicate detection

### Rule 4: Shared Tax for Duplicates
**Applied In**: Duplicate data generation  
**Logic**: 3 records in a group share same tax + CustomerType  
**Benefit**: Proper duplicate detection testing

### Rule 5: Valid Lookup Values
**Applied In**: All demo data generation  
**Logic**: Use only values from `shared/lookup-data.ts`  
**Benefit**: Data passes validation

### Rule 6: Country-City Matching
**Applied In**: All demo data  
**Logic**: City must exist in country's city list  
**Benefit**: Realistic geographic data

### Rule 7: Multiple Contacts
**Applied In**: DemoDataGeneratorService  
**Logic**: Each company has 1-2 pre-defined contacts  
**Benefit**: Test contact management

### Rule 8: Source System Variation
**Applied In**: Duplicate data generation  
**Logic**: Vary source systems (Oracle, SAP, etc.)  
**Benefit**: Simulate multi-source imports

---

## 🔧 Summary Table

| Feature | Location | Trigger | Data Source | Count | Rules |
|---------|----------|---------|-------------|-------|-------|
| **Form Demo Fill** | new-request.component.ts | Double Space | DemoDataGeneratorService | 14 companies | Sequential, Realistic |
| **AI Agent Demo** | data-entry-chat-widget.component.ts | Double Space | DemoDataGeneratorService | 14 companies | Sequential, Field-specific |
| **Contact Demo** | data-entry-chat-widget.component.ts | Double Space | DemoDataGeneratorService.contacts[0] | 1 contact | First contact |
| **Quarantine Data** | admin-data-management.component.ts | Button Click | Hardcoded food companies | 40 records | Unique tax, Valid values |
| **Duplicate Data** | admin-data-management.component.ts | Button Click | Hardcoded base companies | 60 records | Shared tax, 3 per group |
| **PDF Generation** | pdf-bulk-generator.component.ts | Button Click | DemoDataGeneratorService | 14 companies | Realistic documents |
| **Image Generation** | pdf-bulk-generator.component.ts | Button Click | RealisticDocumentGenerator → Canvas | 14 companies | PDF → Image conversion |

---

## 📍 Code Locations Reference

### Demo Data Generator Service
```
File: src/app/services/demo-data-generator.service.ts
Lines: 1-795
Companies: 14 (Saudi Arabia: 3, Egypt: 4, UAE: 4, Yemen: 3)
Methods:
  - generateDemoData() (line 770)
  - getLastUsedCompany() (line 780)
  - getRemainingCompaniesCount() (line 784)
  - resetGenerator() (line 788)
```

### New Request Demo Fill
```
File: src/app/new-request/new-request.component.ts
Methods:
  - setupKeyboardAutoFill() (line 3119)
  - handleAutoFillKeypress() (line 3151)
  - fillFieldWithValue() (line 3190)
  - fillWithDemoData() (line 2383) [Full form fill]
Keyboard: Double Space on any field
```

### AI Agent Demo Fill
```
File: src/app/data-entry-agent/data-entry-chat-widget.component.ts
Methods:
  - attachModalKeyboardListener() (line 1558)
  - handleAutoFillKeypress() (line 1597)
  - fillWithDemoData() (line 1726) [Full modal fill]
  - setupModalDemoDataListener() (line 3269) [Contact modal]
  - generateDemoContactData() (line 3309)
Keyboard: Double Space in modal or contact modal
```

### Quarantine Data Generation
```
Frontend:
  File: src/app/admin-data-management/admin-data-management.component.ts
  Method: generateQuarantineData() (line 175)
  
Backend:
  File: api/better-sqlite-server.js
  API: POST /api/requests/admin/generate-quarantine (line 3985)
  Companies: 10 food companies (hardcoded)
  Records: 40 (10 companies * 4 variants)
```

### Duplicate Data Generation
```
Frontend:
  File: src/app/admin-data-management/admin-data-management.component.ts
  Method: generateDuplicateData() (line 201)
  
Backend:
  File: api/better-sqlite-server.js
  API: POST /api/requests/admin/generate-duplicates (line 4195)
  Companies: 20 base companies (hardcoded)
  Records: 60 (20 companies * 3 variants per group)
  Structure: Each group has 1 master + 2 linked records
```

### Document Generation
```
Component:
  File: src/app/pdf-bulk-generator/pdf-bulk-generator.component.ts
  Method: generateDocuments() (line 160)
  
PDF Service:
  File: src/app/services/realistic-document-generator.service.ts
  Method: generateDocument() (line 50)
  Types: 3 document types (Commercial Registration, Tax Card, VAT)
  
Image Service:
  File: src/app/services/document-image-generator.service.ts
  Method: generateDocumentImage() (line 40)
  Formats: PNG or JPEG
  Technology: html2canvas + Canvas API
```

---

## 🎯 Demo Data Flow Diagrams

### Form Demo Fill Flow
```
User focuses on field
  ↓
Presses Space twice (< 500ms)
  ↓
handleAutoFillKeypress() triggered
  ↓
getFieldNameFromElement(activeElement)
  ↓
getDemoValueForField(fieldName)
  ↓
Lookup in currentDemoCompany object
  ↓
fillFieldWithValue(fieldName, demoValue)
  ↓
Show green flash animation
  ✅ Field filled!
```

### Quarantine Generation Flow
```
Admin clicks "Generate Quarantine Data"
  ↓
Frontend: generateQuarantineData()
  ↓
API: POST /api/requests/admin/generate-quarantine
  ↓
Loop through 10 food companies
  ↓
For each company: Create 4 variants
  ↓
INSERT INTO requests with status="Quarantine"
  ↓
Return success with count (40 records)
  ↓
Frontend shows success message
  ↓
Reload data to display new quarantine records
  ✅ 40 quarantine records created!
```

### Duplicate Generation Flow
```
Admin clicks "Generate Duplicate Data"
  ↓
Frontend: generateDuplicateData()
  ↓
API: POST /api/requests/admin/generate-duplicates
  ↓
Loop through 20 base companies
  ↓
For each company: Create 3 duplicates
  ├── Variant 1: Master (isMaster=1, status="Duplicate")
  ├── Variant 2: Linked (status="Linked")
  └── Variant 3: Linked (status="Linked")
  All 3 share: same tax + same CustomerType + same masterId
  ↓
INSERT INTO requests for all 60 records
  ↓
Return success with count and groups
  ↓
Frontend shows success message
  ✅ 60 duplicate records in 20 groups created!
```

### Document Generation Flow
```
User selects options (countries, doc types, format)
  ↓
Click "Generate Documents"
  ↓
Get companies from DemoDataGeneratorService
  ↓
For each company:
  ↓
  Create ZIP folder: Country/Company/
  ↓
  For each document type:
    ↓
    If PDF selected:
      ↓
      RealisticDocumentGeneratorService.generateDocument()
      ↓
      Create PDF with jsPDF
      ↓
      Add to Country/Company/PDF/ folder
    ↓
    If Images selected:
      ↓
      DocumentImageGeneratorService.generateDocumentImage()
      ↓
      Generate PDF → Render to Canvas → Export as PNG/JPEG
      ↓
      Add to Country/Company/Images/ folder
  ↓
Generate ZIP file with all documents
  ↓
Download: MDM_Documents.zip
  ✅ Documents generated and downloaded!
```

---

## 💡 Best Practices

### For Testing with Demo Data

1. **Use Double Space for Quick Testing**
   - Faster than manual entry
   - Ensures realistic data
   - No validation errors

2. **Use Full Form Fill for Complete Testing**
   - Tests all fields at once
   - Tests contact arrays
   - Tests country-city relationship

3. **Use Quarantine Generation for Workflow Testing**
   - Tests quarantine list
   - Tests resubmission flow
   - Tests reviewer rejection workflow

4. **Use Duplicate Generation for Detection Testing**
   - Tests duplicate detection algorithm
   - Tests master record builder
   - Tests duplicate resolution

5. **Use Document Generation for OCR Testing**
   - Tests AI Agent OCR
   - Realistic document formats
   - Multiple countries and types

---

## 🔒 Security & Access Control

### Demo Data Access Rules

| Feature | Role Required | Reason |
|---------|--------------|--------|
| Form Demo Fill | Any user | Testing personal forms |
| AI Agent Demo | data_entry | Testing AI Agent |
| Contact Demo | data_entry | Testing contact forms |
| Quarantine Generation | **admin** only | Creates test data system-wide |
| Duplicate Generation | **admin** only | Creates test data system-wide |
| Document Generation | Any user | Personal document creation |

**Business Rule**: Only admins can generate system-wide test data to prevent database pollution.

---

## 📊 Demo Data Statistics

### User Demo Data (DemoDataGeneratorService)
- **Total Companies**: 14
- **Countries**: 4 (Saudi Arabia, Egypt, UAE, Yemen)
- **Customer Types**: 5 types
- **Contacts per Company**: 1-2
- **Fields per Company**: 12 core fields
- **Storage**: In-memory (not saved to database)

### Quarantine Data (Admin Generation)
- **Total Records**: 40
- **Base Companies**: 10 food companies
- **Variants per Company**: 4
- **Status**: "Quarantine"
- **Assigned To**: "data_entry"
- **Storage**: Saved to database

### Duplicate Data (Admin Generation)
- **Total Records**: 60
- **Base Companies**: 20
- **Duplicates per Group**: 3
- **Total Groups**: 20
- **Master Records**: 20 (isMaster=1)
- **Linked Records**: 40 (status="Linked")
- **Storage**: Saved to database

### Document Generation
- **Source Companies**: 14 (from DemoDataGeneratorService)
- **Document Types**: 3 (Commercial Reg, Tax Card, VAT)
- **Output Formats**: PDF, PNG, JPEG
- **Folder Structure**: Country/Company/PDF or Images/
- **Storage**: Downloaded as ZIP (not saved to database)

---

## 🎯 Conclusion

The demo data generation system provides comprehensive testing capabilities:

✅ **Quick Form Testing** (Double Space)  
✅ **Workflow Testing** (Quarantine/Duplicate generation)  
✅ **Document Testing** (PDF/Image generation)  
✅ **Realistic Data** (Real company names)  
✅ **Proper Validation** (Uses valid lookup values)  
✅ **Role-Based Access** (Admin-only for system-wide data)

**Total Demo Capabilities**: 
- 14 form demo companies
- 40 quarantine test records
- 60 duplicate test records  
- 100+ generated documents (PDF + Images)


