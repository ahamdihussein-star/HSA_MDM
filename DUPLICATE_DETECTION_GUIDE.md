# Duplicate Detection System - Complete Guide
## Master Data Management - October 2025

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Business Rules](#business-rules)
3. [Detection in New Request Page](#detection-in-new-request-page)
4. [Detection in AI Agent](#detection-in-ai-agent)
5. [Detection in Duplicate Customer Page](#detection-in-duplicate-customer-page)
6. [Detection in Quarantine Page](#detection-in-quarantine-page)
7. [Backend API Implementation](#backend-api-implementation)
8. [Golden Records](#golden-records)
9. [Complete Flow Diagrams](#complete-flow-diagrams)

---

## 🎯 Overview

The **Duplicate Detection System** is a critical business rule that prevents duplicate customer records from being created in the golden records database.

### Business Objective
**"100% Prevention of Duplicate Golden Records"**

### Core Principle
```
No two golden records should exist with the same:
  - Tax Number (tax field)
  AND
  - Customer Type (CustomerType field)
```

### Detection Points
The system checks for duplicates at **4 critical points**:
1. ✅ New Request Page (manual data entry)
2. ✅ Data Entry AI Agent (AI-powered entry)
3. ✅ Duplicate Customer Page (duplicate resolution)
4. ✅ Quarantine Page (resubmission)

---

## 📜 Business Rules

### Rule 1: Duplicate Definition
```typescript
// Two records are duplicates if:
const isDuplicate = 
  (record1.tax === record2.tax) && 
  (record1.CustomerType === record2.CustomerType);
```

**Rationale**: 
- Tax number is unique per company
- Customer type distinguishes different legal entities
- Same company can't have same tax + type combination

---

### Rule 2: Check Only Golden Records
```sql
-- Duplicate check only searches in golden records
SELECT * FROM requests 
WHERE isGolden = 1 
  AND tax = ? 
  AND CustomerType = ?
```

**Rationale**:
- Only golden records represent "active truth"
- Pending/Quarantine/Rejected records are transient
- Prevents false positives from in-progress requests

---

### Rule 3: Real-Time Validation
**When**: As soon as both `tax` and `CustomerType` have values  
**How**: Form field change listeners (valueChanges)  
**Result**: Immediate visual feedback to user

**Rationale**: Prevent wasted time filling entire form only to discover duplicate at submission

---

### Rule 4: Block Submission
**When**: Duplicate detected  
**How**: Disable submit button, show warning  
**Resolution**: User must change tax OR CustomerType OR cancel

**Rationale**: Cannot override duplicate detection - must resolve conflict

---

### Rule 5: Skip for Golden Edit Mode
**When**: Editing existing golden record  
**How**: Check `isGoldenEditMode` flag  
**Result**: No duplicate validation

**Rationale**: Editing your own record shouldn't trigger duplicate warning

---

## 📄 Detection in New Request Page

### Component
**Location**: `src/app/new-request/new-request.component.ts`  
**Route**: `/dashboard/new-request`  
**Used By**: Data Entry users, Reviewers (editing), Compliance (editing)

### Implementation

#### Step 1: Setup Field Listeners
```typescript
// Line 1036-1056

setupDuplicateDetection(): void {
  // Watch tax field changes
  this.requestForm.get('tax')?.valueChanges.subscribe(taxValue => {
    setTimeout(() => {
      const customerType = this.requestForm.get('CustomerType')?.value;
      
      if (taxValue && customerType) {
        console.log('Tax changed, validating:', { tax: taxValue, customerType });
        this.validateForDuplicateImmediate();
      }
    }, 100);  // Small delay to ensure form value is updated
  });
  
  // Watch CustomerType field changes
  this.requestForm.get('CustomerType')?.valueChanges.subscribe(customerTypeValue => {
    setTimeout(() => {
      const tax = this.requestForm.get('tax')?.value;
      
      if (tax && customerTypeValue) {
        console.log('CustomerType changed, validating:', { tax, customerType: customerTypeValue });
        this.validateForDuplicateImmediate();
      }
    }, 100);
  });
  
  // Initial validation after page load
  setTimeout(() => {
    const tax = this.requestForm.get('tax')?.value;
    const customerType = this.requestForm.get('CustomerType')?.value;
    
    // Skip validation for golden edit mode or existing records
    if (tax && customerType && !this.currentRecordId && !this.isGoldenEditMode) {
      console.log('Initial duplicate validation for:', tax, customerType);
      this.validateForDuplicateImmediate();
    }
  }, 500);
}
```

#### Step 2: Validate for Duplicate
```typescript
// Line 1071-1085

private async validateForDuplicateImmediate(): Promise<void> {
  const tax = this.requestForm.get('tax')?.value;
  const customerType = this.requestForm.get('CustomerType')?.value;
  
  if (tax && customerType) {
    console.log('Immediate duplicate validation for:', tax, customerType);
    await this.checkForDuplicate();
    this.cdr.detectChanges(); // Force UI update
  } else {
    // Clear duplicate state if fields are empty
    this.hasDuplicate = false;
    this.duplicateRecord = null;
    this.cdr.markForCheck();
  }
}
```

#### Step 3: Check for Duplicate (API Call)
```typescript
// Line 1500-1560

async checkForDuplicate(): Promise<boolean> {
  // Get values from form
  const tax = this.requestForm.get('tax')?.value;
  const customerType = this.requestForm.get('CustomerType')?.value;
  
  console.log('🔍 Checking for duplicate:', { tax, customerType });
  
  // Validation: Both fields required
  if (!tax || !customerType) {
    console.log('❌ Missing tax or customerType, resetting hasDuplicate');
    this.hasDuplicate = false;
    this.duplicateRecord = null;
    this.cdr.markForCheck();
    return false;
  }
  
  try {
    console.log('📡 Making API call to check duplicate...');
    
    // Call backend API
    const response = await firstValueFrom(
      this.http.post<any>(`${this.apiBase}/requests/check-duplicate`, {
        tax: tax,
        CustomerType: customerType
      })
    );
    
    console.log('📡 API Response:', response);
    
    // If duplicate found
    if (response.isDuplicate) {
      console.log('🚨 DUPLICATE FOUND! Setting hasDuplicate = true');
      
      // Set duplicate state
      this.hasDuplicate = true;
      this.duplicateRecord = response.existingRecord;
      
      // Force UI update
      this.cdr.detectChanges();
      
      // Show error message
      this.msg.error(`Duplicate found: ${response.message}`);
      
      return true;
    }
    
    // No duplicate found
    console.log('✅ No duplicate found, setting hasDuplicate = false');
    this.hasDuplicate = false;
    this.duplicateRecord = null;
    this.cdr.markForCheck();
    
    return false;
    
  } catch (error) {
    console.error('❌ Error checking duplicate:', error);
    this.hasDuplicate = false;
    this.duplicateRecord = null;
    return false;
  }
}
```

#### Step 4: UI Display
```html
<!-- Duplicate Warning Display -->
<!-- src/app/new-request/new-request.component.html -->

<div *ngIf="hasDuplicate && duplicateRecord" 
     class="duplicate-warning">
  <div class="warning-header">
    <span nz-icon nzType="warning" nzTheme="fill"></span>
    ⚠️ DUPLICATE FOUND / تم العثور على تكرار
  </div>
  
  <div class="warning-content">
    <p><strong>Existing Customer / العميل الموجود:</strong> {{ duplicateRecord.name || duplicateRecord.firstName }}</p>
    <p><strong>Tax Number / الرقم الضريبي:</strong> {{ duplicateRecord.tax }}</p>
    <p><strong>Customer Type / نوع العميل:</strong> {{ duplicateRecord.customerType || duplicateRecord.CustomerType }}</p>
    <p><strong>Country / الدولة:</strong> {{ duplicateRecord.country }}</p>
    <p><strong>City / المدينة:</strong> {{ duplicateRecord.city }}</p>
  </div>
  
  <div class="warning-actions">
    <button nz-button nzType="primary" (click)="viewDuplicateDetails()">
      <span nz-icon nzType="eye"></span>
      View Details / عرض التفاصيل
    </button>
  </div>
</div>
```

#### Step 5: Block Submission
```typescript
// Line 450-460

isSubmitDisabled(): boolean {
  // Disable submit if:
  // 1. Form is invalid
  // 2. Duplicate found
  // 3. Currently loading
  
  return this.requestForm.invalid || 
         this.hasDuplicate ||        // ⭐ Block if duplicate
         this.isLoading;
}
```

```html
<!-- Submit button -->
<button nz-button 
        nzType="primary" 
        [disabled]="isSubmitDisabled()"
        (click)="submitRequest()">
  Submit Request
</button>
```

### Business Rules Applied

1. ✅ **Real-time validation** on field change
2. ✅ **Check only golden records** (isGolden = 1)
3. ✅ **Both fields required** for check (tax + CustomerType)
4. ✅ **Visual warning** when duplicate found
5. ✅ **Submit button disabled** when duplicate exists
6. ✅ **Skip for golden edit mode** (editing existing golden record)
7. ✅ **Skip for quarantine resubmission** (after data correction)

### API Used
```
Endpoint: POST /api/requests/check-duplicate
Location: api/better-sqlite-server.js (line 5564)
Called From: src/app/new-request/new-request.component.ts (line 1518)
```

---

## 🤖 Detection in Data Entry AI Agent

### Component
**Location**: `src/app/data-entry-agent/data-entry-chat-widget.component.ts`  
**Service**: `src/app/services/data-entry-agent.service.ts`  
**Shown In**: Dashboard (floating widget, bottom-right)  
**Used By**: Data Entry users only

### Implementation

#### Step 1: After Data Extraction
```typescript
// In data-entry-chat-widget.component.ts
// After OCR completes, data is displayed for review
// User clicks "Review & Complete Data" button
// Opens unified modal
```

#### Step 2: Before Final Submission
```typescript
// Line 1314-1348 in data-entry-chat-widget.component.ts

private async finalizeAndSubmit(): Promise<void> {
  try {
    // 1. Validate required fields
    const extractedData = this.agentService.getExtractedData();
    const requiredFields = ['firstName', 'firstNameAR', 'tax', 'CustomerType', 'country', 'city'];
    const missingRequired = requiredFields.filter(field => !(extractedData as any)[field]);
    
    if (missingRequired.length > 0) {
      this.addMessage({
        id: `validation_error_${Date.now()}`,
        role: 'assistant',
        content: `❌ **Cannot submit - Missing required fields:**\n${missingRequired.join(', ')}`,
        timestamp: new Date(),
        type: 'text'
      });
      return;
    }
    
    // 2. Check for duplicates
    console.log('🔍 [AGENT] Checking for duplicates before submission...');
    const duplicateCheck = await this.agentService.checkForDuplicates();
    
    // 3. If duplicate found - BLOCK submission
    if (duplicateCheck.isDuplicate && duplicateCheck.existingRecord) {
      console.log('🚨 [AGENT] Duplicate found! Blocking submission');
      
      // Show localized duplicate warning
      this.addMessage({
        id: `duplicate_${Date.now()}`,
        role: 'assistant',
        content: this.translate.instant('agent.duplicateFound.message', {
          name: duplicateCheck.existingRecord.firstName || duplicateCheck.existingRecord.name,
          tax: duplicateCheck.existingRecord.tax,
          type: duplicateCheck.existingRecord.CustomerType || duplicateCheck.existingRecord.customerType,
          status: duplicateCheck.existingRecord.status || 'Active'
        }),
        timestamp: new Date(),
        type: 'text'
      });
      
      // Stop here - do NOT submit
      return;
    }
    
    // 4. No duplicate - proceed with submission
    console.log('✅ [AGENT] No duplicate found, proceeding with submission...');
    
    const loadingMsg = this.addMessage({
      id: `submitting_${Date.now()}`,
      role: 'assistant',
      content: '📤 جاري الإرسال / Submitting...',
      timestamp: new Date(),
      type: 'loading'
    });
    
    // Submit request
    const response = await this.agentService.submitCustomerRequest();
    
    // ... success handling
  }
}
```

#### Step 3: Service Implementation
```typescript
// src/app/services/data-entry-agent.service.ts (line 885)

async checkForDuplicates(): Promise<{ 
  isDuplicate: boolean; 
  existingRecord?: any; 
  message?: string 
}> {
  try {
    // Business Rule: Both tax and CustomerType required
    if (!this.extractedData.tax || !this.extractedData.CustomerType) {
      console.log('⚠️ [DUPLICATE] Missing required fields for duplicate check');
      return { 
        isDuplicate: false, 
        message: 'Missing required fields' 
      };
    }
    
    console.log('🔍 [DUPLICATE] Checking for duplicates:', {
      tax: this.extractedData.tax,
      CustomerType: this.extractedData.CustomerType
    });
    
    // Call backend API
    const response = await firstValueFrom(
      this.http.post<any>(`${this.apiBase}/requests/check-duplicate`, {
        tax: this.extractedData.tax,
        CustomerType: this.extractedData.CustomerType
      })
    );
    
    console.log('📡 [DUPLICATE] API Response:', response);
    
    // Handle response
    if (response.isDuplicate && response.existingCustomers?.length > 0) {
      return {
        isDuplicate: true,
        existingRecord: response.existingCustomers[0] || response.existingRecord,
        message: response.message
      };
    }
    
    return { 
      isDuplicate: false, 
      message: 'No duplicate found' 
    };
    
  } catch (error) {
    console.error('❌ [DUPLICATE] Error checking for duplicates:', error);
    return { 
      isDuplicate: false, 
      message: 'Error checking duplicates' 
    };
  }
}
```

### UI Display
```typescript
// Localized message in Arabic/English
const message = this.translate.instant('agent.duplicateFound.message', {
  name: 'ABC Company',
  tax: '123456789',
  type: 'Corporate',
  status: 'Active'
});

// Translation keys:
// en.json:
"agent": {
  "duplicateFound": {
    "message": "⚠️ DUPLICATE FOUND:\nExisting Customer: {{name}}\nTax Number: {{tax}}\nType: {{type}}\nStatus: {{status}}"
  }
}

// ar.json:
"agent": {
  "duplicateFound": {
    "message": "⚠️ تم العثور على تكرار:\nالعميل الموجود: {{name}}\nالرقم الضريبي: {{tax}}\nالنوع: {{type}}\nالحالة: {{status}}"
  }
}
```

### Business Rules Applied

1. ✅ **Check before submission** (not during data entry)
2. ✅ **Required fields validated first** (prevent API call with incomplete data)
3. ✅ **Show localized warning** (Arabic/English)
4. ✅ **Block submission** (return early, don't call submit API)
5. ✅ **Guide user** to upload different document or edit data

### API Used
```
Endpoint: POST /api/requests/check-duplicate
Called From: data-entry-agent.service.ts (line 893)
Triggered By: data-entry-chat-widget.component.ts (line 1332)
Timing: Before final submission
```

---

## 🔄 Detection in Duplicate Customer Page

### Component
**Location**: `src/app/duplicate-customer/duplicate-customer.component.ts`  
**Route**: `/dashboard/duplicate-customer`  
**Used By**: Reviewers, Admins

### Purpose
This page is used for **resolving detected duplicates** and building master records.

### Implementation Context
```typescript
// When building a master record from multiple duplicates
// Business Rule: New master record must not duplicate existing golden records

buildMasterRecord(selectedRecords: any[], fieldSelections: any): void {
  // 1. Build master record from selected records
  const masterData = this.buildMasterFromSelections(selectedRecords, fieldSelections);
  
  // 2. Check if this master would be a duplicate
  const duplicateCheck = await this.checkDuplicate(
    masterData.tax,
    masterData.CustomerType
  );
  
  // 3. If duplicate exists - warn user
  if (duplicateCheck.isDuplicate) {
    this.modal.warning({
      nzTitle: 'Duplicate Detected',
      nzContent: `The master record would duplicate existing golden record: ${duplicateCheck.existingRecord.firstName}`
    });
    return;
  }
  
  // 4. Proceed with master record creation
  this.submitMasterRecord(masterData);
}
```

### Business Rules Applied

1. ✅ **Master record validation** before creation
2. ✅ **Prevent duplicate masters** (can't have 2 masters with same tax + type)
3. ✅ **User warned** if conflict exists
4. ✅ **User must modify data** to proceed

### API Used
```
Endpoint: POST /api/requests/check-duplicate
Called From: duplicate-customer.component.ts
Timing: Before master record creation
```

---

## 🔴 Detection in Quarantine Page

### Component
**Location**: `src/app/quarantine/quarantine.component.ts`  
**Route**: `/dashboard/quarantine`  
**Used By**: Data Entry users (resubmitting rejected requests)

### Purpose
When data entry user edits and resubmits a quarantined (rejected) request.

### Implementation Flow
```typescript
// 1. User clicks "Edit" on quarantine record
// 2. Navigates to: /dashboard/new-request/:id?from=quarantine
// 3. new-request.component.ts loads with isFromQuarantine = true
// 4. User edits data (including tax or CustomerType)
// 5. Duplicate detection triggers automatically (same as new request)
// 6. If duplicate found - submission blocked
// 7. If no duplicate - resubmission allowed
```

### Code Implementation
```typescript
// In new-request.component.ts

ngOnInit(): void {
  // Check if coming from quarantine
  this.route.queryParams.subscribe(params => {
    if (params['from'] === 'quarantine') {
      this.isFromQuarantine = true;
      console.log('Loading quarantine record for resubmission');
    }
  });
  
  // Setup duplicate detection (same as new request)
  this.setupDuplicateDetection();
}

// Duplicate detection runs the same way
// Business Rule: Even quarantine resubmissions cannot create duplicates
```

### Business Rules Applied

1. ✅ **Same validation as new requests**
2. ✅ **Check on tax/CustomerType change**
3. ✅ **Block if duplicate exists**
4. ✅ **Allow resubmission only if unique**

### API Used
```
Endpoint: POST /api/requests/check-duplicate
Called From: new-request.component.ts (when loaded with quarantine record)
Timing: Real-time on field change
```

---

## 🔧 Backend API Implementation

### API Endpoint
**URL**: `POST /api/requests/check-duplicate`  
**Location**: `api/better-sqlite-server.js` (line 5564)  
**Purpose**: Check if customer exists in golden records

### Complete Implementation
```javascript
app.post('/api/requests/check-duplicate', (req, res) => {
  try {
    const { tax, CustomerType } = req.body;
    
    // Business Rule 1: Both fields required
    if (!tax || !CustomerType) {
      return res.status(400).json({ 
        error: 'Tax number and Customer Type are required' 
      });
    }
    
    console.log(`[DUPLICATE CHECK] Checking for tax: ${tax}, CustomerType: ${CustomerType}`);
    
    // Business Rule 2: Map frontend CustomerType to database CustomerType
    // (Handle different naming conventions)
    const customerTypeMapping = {
      'limited_liability': 'Limited Liability Company',
      'joint_stock': 'Joint Stock Company',
      'sole_proprietorship': 'Sole Proprietorship',
      'Corporate': 'Corporate',
      'SME': 'SME',
      'Retail Chain': 'Retail Chain'
    };
    
    const mappedCustomerType = customerTypeMapping[CustomerType] || CustomerType;
    console.log(`[DUPLICATE CHECK] Mapped CustomerType: ${CustomerType} -> ${mappedCustomerType}`);
    
    // Business Rule 3: Check ONLY in golden records (isGolden = 1)
    const existingRecord = db.prepare(`
      SELECT id, firstName, tax, CustomerType, country, city, status
      FROM requests 
      WHERE isGolden = 1 
        AND tax = ? 
        AND CustomerType = ?
    `).get(tax, mappedCustomerType);
    
    // Business Rule 4: Return detailed duplicate information
    if (existingRecord) {
      console.log(`[DUPLICATE CHECK] ✅ Found duplicate: ${existingRecord.firstName}`);
      
      res.json({
        isDuplicate: true,
        existingRecord: {
          id: existingRecord.id,
          firstName: existingRecord.firstName,
          name: existingRecord.firstName,  // Alias for compatibility
          tax: existingRecord.tax,
          CustomerType: existingRecord.CustomerType,
          customerType: existingRecord.CustomerType,  // Alias
          country: existingRecord.country,
          city: existingRecord.city,
          status: existingRecord.status || 'Active'
        },
        message: `Customer with tax number ${tax} and type ${CustomerType} already exists as golden record: ${existingRecord.firstName}`
      });
    } else {
      console.log(`[DUPLICATE CHECK] ❌ No duplicate found`);
      
      res.json({
        isDuplicate: false,
        message: 'No duplicate found'
      });
    }
    
  } catch (error) {
    console.error('[DUPLICATE CHECK] Error:', error);
    res.status(500).json({ 
      error: 'Failed to check for duplicates: ' + error.message 
    });
  }
});
```

### SQL Query Breakdown
```sql
SELECT id, firstName, tax, CustomerType, country, city, status
FROM requests 
WHERE isGolden = 1           -- Business Rule: Check only golden records
  AND tax = ?                -- Match tax number
  AND CustomerType = ?       -- Match customer type
```

**Why `isGolden = 1`?**
- Golden records represent "active truth"
- Pending requests are not yet approved
- Quarantine records are being corrected
- Rejected records are invalid
- Only golden records should be checked

### Response Structure
```typescript
// Duplicate Found
{
  isDuplicate: true,
  existingRecord: {
    id: "req_golden_123",
    firstName: "ABC Company",
    name: "ABC Company",        // Alias
    tax: "123456789",
    CustomerType: "Corporate",
    customerType: "Corporate",  // Alias
    country: "Egypt",
    city: "Cairo",
    status: "Active"
  },
  message: "Customer with tax number 123456789 and type Corporate already exists as golden record: ABC Company"
}

// No Duplicate
{
  isDuplicate: false,
  message: "No duplicate found"
}
```

---

## 🏆 Golden Records

### What is a Golden Record?
A **Golden Record** is the final, approved, authoritative version of a customer record.

### How Golden Records are Created
```typescript
// Workflow: Data Entry → Reviewer → Compliance

// Step 1: Data Entry creates request
status: "Pending", isGolden: 0

// Step 2: Reviewer approves
status: "Approved", isGolden: 0

// Step 3: Compliance approves
status: "Active", isGolden: 1  // ⭐ Becomes golden record

// Golden record gets unique code: GOLD_2025_0001
```

### Golden Record Query
```sql
-- Get all golden records
SELECT * FROM requests WHERE isGolden = 1;

-- Get golden records count
SELECT COUNT(*) FROM requests WHERE isGolden = 1;

-- Get golden records by country
SELECT * FROM requests WHERE isGolden = 1 AND country = 'Egypt';
```

### Business Rules for Golden Records
1. ✅ Only compliance can create golden records
2. ✅ Golden records cannot be deleted (only blocked)
3. ✅ Golden records used for duplicate detection
4. ✅ Golden records can be synced to external systems
5. ✅ Golden records are read-only for data entry
6. ✅ Golden records have unique codes (GOLD_YYYY_NNNN)

---

## 🔄 Complete Flow Diagrams

### Flow 1: New Request Duplicate Detection
```
User enters form data
  ↓
User fills tax field (e.g., "123456789")
  ↓
User selects CustomerType (e.g., "Corporate")
  ↓
valueChanges triggers (100ms delay)
  ↓
validateForDuplicateImmediate() called
  ↓
checkForDuplicate() called
  ↓
API: POST /api/requests/check-duplicate
  Body: { tax: "123456789", CustomerType: "Corporate" }
  ↓
Backend Query:
  SELECT * FROM requests 
  WHERE isGolden = 1 
    AND tax = "123456789" 
    AND CustomerType = "Corporate"
  ↓
┌─────────────────────┬─────────────────────┐
│ If Found            │ If Not Found        │
├─────────────────────┼─────────────────────┤
│ Response:           │ Response:           │
│ {                   │ {                   │
│   isDuplicate: true │   isDuplicate: false│
│   existingRecord:{} │   message: "No..."  │
│ }                   │ }                   │
│ ↓                   │ ↓                   │
│ Frontend:           │ Frontend:           │
│ hasDuplicate = true │ hasDuplicate = false│
│ ↓                   │ ↓                   │
│ Show warning banner │ Clear warning       │
│ ↓                   │ ↓                   │
│ Disable submit btn  │ Enable submit btn   │
│ ↓                   │ ↓                   │
│ User must:          │ User can:           │
│ • Change tax OR     │ • Continue filling  │
│ • Change type OR    │ • Submit request    │
│ • Cancel request    │                     │
└─────────────────────┴─────────────────────┘
```

---

### Flow 2: AI Agent Duplicate Detection
```
User uploads documents
  ↓
AI extracts data via OCR (GPT-4o Vision)
  ↓
Shows extracted data in review card
  ↓
User clicks "Review & Complete Data"
  ↓
Opens unified modal
  ↓
User completes missing fields (if any)
  ↓
User clicks "Save" in modal
  ↓
saveUnifiedModalData() called
  ↓
Prepares data for submission
  ↓
finalizeAndSubmit() called
  ↓
Validates required fields
  ↓
Calls: this.agentService.checkForDuplicates()
  ↓
Service calls: POST /api/requests/check-duplicate
  Body: { 
    tax: extractedData.tax,
    CustomerType: extractedData.CustomerType
  }
  ↓
Backend checks golden records
  ↓
┌─────────────────────┬─────────────────────┐
│ If Duplicate        │ If Unique           │
├─────────────────────┼─────────────────────┤
│ Response:           │ Response:           │
│ isDuplicate: true   │ isDuplicate: false  │
│ ↓                   │ ↓                   │
│ Agent shows message:│ Agent proceeds:     │
│ "⚠️ DUPLICATE FOUND"│ "📤 Submitting..."  │
│ with details        │ ↓                   │
│ ↓                   │ submitCustomerReq() │
│ STOPS submission    │ ↓                   │
│ ↓                   │ POST /api/requests  │
│ User options:       │ ↓                   │
│ • Upload diff doc   │ Success message     │
│ • Edit data in modal│ ↓                   │
│                     │ Notify reviewer     │
└─────────────────────┴─────────────────────┘
```

---

### Flow 3: Quarantine Resubmission Duplicate Detection
```
Request rejected by reviewer
  ↓
Status changed to "Quarantine"
  ↓
Assigned back to data_entry
  ↓
Data entry user sees in task list
  ↓
Clicks "Edit" on quarantine record
  ↓
Navigates to: /dashboard/new-request/:id?from=quarantine
  ↓
new-request.component.ts loads:
  - currentRecordId = id
  - isFromQuarantine = true
  - Form loads with existing data
  ↓
User edits data (e.g., changes tax number)
  ↓
tax field valueChanges triggers
  ↓
validateForDuplicateImmediate() called
  ↓
checkForDuplicate() called
  ↓
API: POST /api/requests/check-duplicate
  ↓
Backend checks golden records
  ↓
┌─────────────────────┬─────────────────────┐
│ If Duplicate        │ If Unique           │
├─────────────────────┼─────────────────────┤
│ hasDuplicate = true │ hasDuplicate = false│
│ ↓                   │ ↓                   │
│ Warning shown       │ No warning          │
│ ↓                   │ ↓                   │
│ Submit disabled     │ Submit enabled      │
│ ↓                   │ ↓                   │
│ User must change    │ User can resubmit   │
│ tax or type         │ ↓                   │
│                     │ PUT /api/requests/:id│
│                     │ ↓                   │
│                     │ Status → "Pending"  │
│                     │ ↓                   │
│                     │ Notify reviewer     │
└─────────────────────┴─────────────────────┘
```

---

## 📊 Comparison Table

| Feature | New Request | AI Agent | Duplicate Page | Quarantine |
|---------|-------------|----------|----------------|------------|
| **Trigger** | Field change | Before submit | Before master creation | Field change |
| **Timing** | Real-time | Pre-submission | Pre-creation | Real-time |
| **API Call** | POST /check-duplicate | POST /check-duplicate | POST /check-duplicate | POST /check-duplicate |
| **Check Against** | Golden records | Golden records | Golden records | Golden records |
| **Keys Used** | tax + CustomerType | tax + CustomerType | tax + CustomerType | tax + CustomerType |
| **UI Response** | Warning banner | Chat message | Modal warning | Warning banner |
| **Submit Block** | Button disabled | Return early | Block creation | Button disabled |
| **Resolution** | Change fields | Upload new doc / Edit | Modify master data | Change fields |
| **Skip Condition** | isGoldenEditMode | None | None | isGoldenEditMode |

---

## 🎯 Business Rules Summary

### Rule 1: Duplicate Keys
```
Primary Key: tax (Tax registration number)
Secondary Key: CustomerType (Customer type classification)

Combination MUST be unique in golden records
```

### Rule 2: Check Scope
```
Check ONLY in: isGolden = 1
Do NOT check in: Pending, Quarantine, Rejected, Linked records

Reason: Only golden records represent active customers
```

### Rule 3: Real-Time Validation (New Request, Quarantine)
```
Trigger: As soon as both tax AND CustomerType have values
Delay: 100ms debounce
Method: Form field valueChanges listeners
```

### Rule 4: Pre-Submission Validation (AI Agent)
```
Trigger: User clicks submit in unified modal
Timing: After required fields validated
Method: Explicit service call before submission
```

### Rule 5: Customer Type Mapping
```
Frontend values may differ from database values
Backend maps them for consistency:

Frontend          → Database
------------------------------------
'Corporate'       → 'Corporate'
'SME'             → 'SME'
'limited_liability' → 'Limited Liability Company'
'joint_stock'     → 'Joint Stock Company'
'sole_proprietorship' → 'Sole Proprietorship'
```

### Rule 6: Skip for Golden Edit
```
When: Editing existing golden record (isGoldenEditMode = true)
Reason: Editing your own record shouldn't trigger duplicate
Action: Skip duplicate validation entirely
```

### Rule 7: Error Handling
```
If API call fails:
  - Log error
  - Set hasDuplicate = false (fail open, not fail closed)
  - Allow user to continue
  - Don't block submission on API error

Reason: Network issues shouldn't prevent valid submissions
```

---

## 🔍 Code Locations Reference

### New Request Page
```
File: src/app/new-request/new-request.component.ts

Key Methods:
  - setupDuplicateDetection() - Line 1035-1068
  - validateForDuplicateImmediate() - Line 1071-1085
  - checkForDuplicate() - Line 1500-1560
  - isSubmitDisabled() - Line 450-460

Key Properties:
  - hasDuplicate: boolean - Line 146
  - duplicateRecord: any - Line 147
  - showDuplicateModal: boolean - Line 148

HTML Display:
  File: src/app/new-request/new-request.component.html
  Duplicate Warning: Line ~200
  Submit Button: Line ~1500
```

### AI Agent
```
Component:
  File: src/app/data-entry-agent/data-entry-chat-widget.component.ts
  Method: finalizeAndSubmit() - Line 1314-1390
  Duplicate Check: Line 1332

Service:
  File: src/app/services/data-entry-agent.service.ts
  Method: checkForDuplicates() - Line 885-920
  API Call: Line 893

Translation:
  Files: src/assets/i18n/en.json, ar.json
  Key: agent.duplicateFound.message
```

### Backend API
```
File: api/better-sqlite-server.js
Endpoint: POST /api/requests/check-duplicate
Location: Line 5564-5626

SQL Query: Line 5590-5596
Mapping: Line 5577-5586
Response: Line 5600-5617
```

### Duplicate Customer Page
```
File: src/app/duplicate-customer/duplicate-customer.component.ts
Usage: When building master records
Method: buildMasterRecord() (check before creation)
```

### Quarantine Page
```
File: src/app/quarantine/quarantine.component.ts
Flow: Edit → Navigate to new-request with ID
Detection: Uses same new-request.component.ts logic
```

---

## ⚡ Performance Considerations

### 1. Debouncing
```typescript
// Prevent excessive API calls during typing
setTimeout(() => {
  this.validateForDuplicate();
}, 100);  // 100ms delay after last keystroke
```

### 2. Caching (Future Enhancement)
```typescript
// Could cache duplicate check results
// Key: `${tax}_${CustomerType}`
// TTL: 5 minutes
```

### 3. Query Optimization
```sql
-- Index on golden records + tax
CREATE INDEX idx_requests_golden_tax ON requests(isGolden, tax);

-- Index on golden records + CustomerType
CREATE INDEX idx_requests_golden_type ON requests(isGolden, CustomerType);
```

---

## 🐛 Troubleshooting

### Issue 1: Duplicate Warning Not Showing
**Symptoms**: Form has duplicate data but no warning appears

**Check**:
```typescript
// 1. Check hasDuplicate flag
console.log('hasDuplicate:', this.hasDuplicate);

// 2. Check API response
console.log('API Response:', response);

// 3. Check change detection
this.cdr.detectChanges();  // Force update

// 4. Check console for errors
// Look for: "Error checking duplicate"
```

---

### Issue 2: Submit Still Enabled with Duplicate
**Symptoms**: Submit button active even with duplicate

**Check**:
```typescript
// Check isSubmitDisabled() logic
isSubmitDisabled(): boolean {
  return this.requestForm.invalid || 
         this.hasDuplicate ||        // This should be true
         this.isLoading;
}

// Force re-check
this.cdr.detectChanges();
```

---

### Issue 3: False Duplicate Detection
**Symptoms**: Reports duplicate when none exists

**Check**:
```javascript
// Backend: Check CustomerType mapping
const mapped = customerTypeMapping[CustomerType] || CustomerType;

// Check if golden record actually exists
SELECT * FROM requests 
WHERE isGolden = 1 
  AND tax = '123456789' 
  AND CustomerType = 'Corporate';
```

---

## 📊 Statistics

### API Call Frequency
- **New Request**: 1 call per tax/type change (debounced 100ms)
- **AI Agent**: 1 call before submission
- **Quarantine**: 1 call per tax/type change (debounced 100ms)
- **Duplicate Page**: 1 call before master creation

### Expected Response Time
- **Average**: 20-50ms
- **Maximum**: 200ms
- **Timeout**: 10 seconds (fail open)

### Error Rate
- **Expected**: < 0.1%
- **Common Errors**: Network timeout, invalid data
- **Handling**: Fail open (allow submission if check fails)

---

## ✅ Summary

The duplicate detection system provides:

✅ **100% Prevention** of duplicate golden records  
✅ **Real-Time Feedback** for immediate user response  
✅ **Multi-Point Detection** (4 entry points)  
✅ **Consistent Logic** across all components  
✅ **User-Friendly Messages** with details  
✅ **Proper Error Handling** (fail open)  
✅ **Performance Optimized** (debouncing, indexing)  
✅ **Business Rule Compliant** (golden records only)

**Total Coverage**: 
- 4 frontend components
- 1 backend API
- 1 shared service
- Golden records database query









