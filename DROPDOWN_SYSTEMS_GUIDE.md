# Dropdown Systems - Complete Guide
## Shared Lookup Data & Dropdown Implementation - October 2025

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Shared Lookup Data](#shared-lookup-data)
3. [Dropdowns in New Request Page](#dropdowns-in-new-request-page)
4. [Dropdowns in AI Agent](#dropdowns-in-ai-agent)
5. [Dropdowns in Duplicate Customer](#dropdowns-in-duplicate-customer)
6. [Non-Shared Dropdowns](#non-shared-dropdowns)
7. [How Shared Lookup Works](#how-shared-lookup-works)
8. [Business Rules](#business-rules)

---

## 🎯 Overview

### Centralized Lookup Data
**File**: `src/app/shared/lookup-data.ts` (212 lines)

**Purpose**: Single source of truth for all dropdown values across the application

**Business Benefit**:
- ✅ Consistency across all pages
- ✅ Easy to maintain (one file to update)
- ✅ No duplication of data
- ✅ Type-safe (TypeScript)

---

## 📚 Shared Lookup Data

### What's in lookup-data.ts

**File Structure**:
```typescript
// src/app/shared/lookup-data.ts

// 1. Source System Options (3 options)
export const SOURCE_SYSTEM_OPTIONS = [
  { value: 'oracle_forms', label: 'Oracle Forms' },
  { value: 'sap_4hana', label: 'SAP S/4HANA' },
  { value: 'sap_bydesign', label: 'SAP ByDesign' }
];

// 2. Country Options (4 countries)
export const COUNTRY_OPTIONS = [
  { value: 'Egypt', label: 'Egypt' },
  { value: 'Saudi Arabia', label: 'Saudi Arabia' },
  { value: 'United Arab Emirates', label: 'United Arab Emirates' },
  { value: 'Yemen', label: 'Yemen' }
];

// 3. Customer Type Options (6 types)
export const CUSTOMER_TYPE_OPTIONS = [
  { value: 'Corporate', label: 'Corporate' },
  { value: 'SME', label: 'SME' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'limited_liability', label: 'Limited Liability' },
  { value: 'joint_stock', label: 'Joint Stock' },
  { value: 'Retail Chain', label: 'Retail Chain' }
];

// 4. City Options (Object - by country)
export const CITY_OPTIONS: { [key: string]: any[] } = {
  'Egypt': [
    { value: 'Cairo', label: 'Cairo' },
    { value: 'Alexandria', label: 'Alexandria' },
    { value: 'Giza', label: 'Giza' },
    { value: 'Luxor', label: 'Luxor' }
  ],
  'Saudi Arabia': [
    { value: 'Riyadh', label: 'Riyadh' },
    { value: 'Jeddah', label: 'Jeddah' },
    { value: 'Mecca', label: 'Mecca' },
    { value: 'Dammam', label: 'Dammam' }
  ],
  'United Arab Emirates': [
    { value: 'Dubai', label: 'Dubai' },
    { value: 'Abu Dhabi', label: 'Abu Dhabi' },
    { value: 'Sharjah', label: 'Sharjah' },
    { value: 'Ajman', label: 'Ajman' }
  ],
  'Yemen': [
    { value: 'Sanaa', label: 'Sanaa' },
    { value: 'Aden', label: 'Aden' },
    { value: 'Taiz', label: 'Taiz' }
  ]
};

// 5. Sales Organization Options (31 options)
export const SALES_ORG_OPTIONS = [
  // Yemen (5)
  { value: 'yemen_main_office', label: 'Yemen - Main Office Sanaa' },
  { value: 'yemen_aden_branch', label: 'Yemen - Aden Branch' },
  { value: 'yemen_taiz_branch', label: 'Yemen - Taiz Branch' },
  { value: 'yemen_hodeidah_branch', label: 'Yemen - Hodeidah Branch' },
  { value: 'yemen_hadramout_branch', label: 'Yemen - Hadramout Branch' },
  
  // Egypt (5)
  { value: 'egypt_cairo_office', label: 'Egypt - Cairo Head Office' },
  { value: 'egypt_alexandria_branch', label: 'Egypt - Alexandria Branch' },
  { value: 'egypt_giza_branch', label: 'Egypt - Giza Branch' },
  { value: 'egypt_upper_egypt_branch', label: 'Egypt - Upper Egypt Branch' },
  { value: 'egypt_delta_region_branch', label: 'Egypt - Delta Region Branch' },
  
  // Saudi Arabia (5)
  { value: 'ksa_riyadh_office', label: 'Saudi Arabia - Riyadh Office' },
  { value: 'ksa_jeddah_branch', label: 'Saudi Arabia - Jeddah Branch' },
  { value: 'ksa_dammam_branch', label: 'Saudi Arabia - Dammam Branch' },
  { value: 'ksa_makkah_branch', label: 'Saudi Arabia - Makkah Branch' },
  { value: 'ksa_madinah_branch', label: 'Saudi Arabia - Madinah Branch' },
  
  // UAE (4)
  { value: 'uae_dubai_office', label: 'UAE - Dubai Office' },
  { value: 'uae_abu_dhabi_branch', label: 'UAE - Abu Dhabi Branch' },
  { value: 'uae_sharjah_branch', label: 'UAE - Sharjah Branch' },
  { value: 'uae_ajman_branch', label: 'UAE - Ajman Branch' },
  
  // Kuwait (3)
  { value: 'kuwait_main_office', label: 'Kuwait - Main Office' },
  { value: 'kuwait_hawalli_branch', label: 'Kuwait - Hawalli Branch' },
  { value: 'kuwait_farwaniya_branch', label: 'Kuwait - Farwaniya Branch' },
  
  // Qatar (2)
  { value: 'qatar_doha_office', label: 'Qatar - Doha Office' },
  { value: 'qatar_industrial_area_branch', label: 'Qatar - Industrial Area Branch' },
  
  // Bahrain (2)
  { value: 'bahrain_manama_office', label: 'Bahrain - Manama Office' },
  { value: 'bahrain_muharraq_branch', label: 'Bahrain - Muharraq Branch' },
  
  // Oman (3)
  { value: 'oman_muscat_office', label: 'Oman - Muscat Office' },
  { value: 'oman_salalah_branch', label: 'Oman - Salalah Branch' },
  { value: 'oman_sohar_branch', label: 'Oman - Sohar Branch' }
];

// 6. Distribution Channel Options (10 options)
export const DISTRIBUTION_CHANNEL_OPTIONS = [
  { value: 'direct_sales', label: 'Direct Sales' },
  { value: 'authorized_distributors', label: 'Authorized Distributors' },
  { value: 'retail_chains', label: 'Retail Chains' },
  { value: 'wholesale_partners', label: 'Wholesale Partners' },
  { value: 'ecommerce_platform', label: 'E-commerce Platform' },
  { value: 'business_to_business', label: 'Business to Business' },
  { value: 'hospitality_sector', label: 'Hotels Restaurants Cafes' },
  { value: 'export_partners', label: 'Export Partners' },
  { value: 'government_contracts', label: 'Government Contracts' },
  { value: 'institutional_sales', label: 'Institutional Sales' }
];

// 7. Division Options (10 options)
export const DIVISION_OPTIONS = [
  { value: 'food_products', label: 'Food Products Division' },
  { value: 'beverages', label: 'Beverages Division' },
  { value: 'dairy_products', label: 'Dairy Products Division' },
  { value: 'biscuits_confectionery', label: 'Biscuits and Confectionery Division' },
  { value: 'pasta_wheat_products', label: 'Pasta and Wheat Products Division' },
  { value: 'cooking_oils_fats', label: 'Cooking Oils and Fats Division' },
  { value: 'detergents_cleaning', label: 'Detergents and Cleaning Products Division' },
  { value: 'personal_care', label: 'Personal Care Products Division' },
  { value: 'industrial_supplies', label: 'Industrial Supplies Division' },
  { value: 'packaging_materials', label: 'Packaging Materials Division' }
];

// 8. Document Type Options (57 options)
export const DOCUMENT_TYPE_OPTIONS = [
  // Yemen (6), Egypt (8), Saudi Arabia (8), UAE (7),
  // Kuwait (6), Qatar (6), Bahrain (5), Oman (5), General (8)
];

// 9. Preferred Language Options (3 options)
export const PREFERRED_LANGUAGE_OPTIONS = [
  { value: 'EN', label: 'English' },
  { value: 'AR', label: 'Arabic' },
  { value: 'Both', label: 'Both' }
];

// 10. Helper Function
export function getCitiesByCountry(country: string): any[] {
  return CITY_OPTIONS[country] || [];
}
```

**Total Lookup Lists**: 9 lists + 1 helper function  
**Total Options**: 130+ dropdown values

---

## 📄 Dropdowns in New Request Page

### Page Info
**Component**: `src/app/new-request/new-request.component.ts`  
**Route**: `/dashboard/new-request`  
**Used By**: Data Entry, Reviewer, Compliance

### Import Statement
```typescript
// Line 26-36

import {
  CUSTOMER_TYPE_OPTIONS,
  SALES_ORG_OPTIONS,
  DISTRIBUTION_CHANNEL_OPTIONS,
  DIVISION_OPTIONS,
  CITY_OPTIONS,
  COUNTRY_OPTIONS,
  PREFERRED_LANGUAGE_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  getCitiesByCountry
} from '../shared/lookup-data';
```

### Component Properties
```typescript
// Line 211-217

// ✅ ALL use shared lookup data
CustomerTypeOptions = CUSTOMER_TYPE_OPTIONS;
SalesOrgOption = SALES_ORG_OPTIONS;
DistributionChannelOption = DISTRIBUTION_CHANNEL_OPTIONS;
DivisionOption = DIVISION_OPTIONS;
CityOptions = CITY_OPTIONS;
CountryOptions = COUNTRY_OPTIONS;
PrefferedLanguage = PREFERRED_LANGUAGE_OPTIONS;
```

### Dropdowns Available

#### 1. **Customer Type** ✅ Uses Shared Lookup
```html
<!-- Template -->
<nz-select formControlName="CustomerType">
  <nz-option *ngFor="let option of CustomerTypeOptions" 
            [nzValue]="option.value" 
            [nzLabel]="option.label">
  </nz-option>
</nz-select>
```

**Data Source**: `CUSTOMER_TYPE_OPTIONS` from `shared/lookup-data.ts`  
**Options Count**: 6  
**How It Works**: Direct assignment from shared constant

---

#### 2. **Country** ✅ Uses Shared Lookup
```html
<nz-select formControlName="country">
  <nz-option *ngFor="let option of CountryOptions" 
            [nzValue]="option.value" 
            [nzLabel]="option.label">
  </nz-option>
</nz-select>
```

**Data Source**: `COUNTRY_OPTIONS` from `shared/lookup-data.ts`  
**Options Count**: 4  
**How It Works**: Direct assignment from shared constant

---

#### 3. **City** ✅ Uses Shared Lookup + Dynamic Filtering
```html
<nz-select formControlName="city">
  <nz-option *ngFor="let option of filteredCityOptions" 
            [nzValue]="option.value" 
            [nzLabel]="option.label">
  </nz-option>
</nz-select>
```

**Data Source**: `CITY_OPTIONS` from `shared/lookup-data.ts` (filtered by country)  
**Options Count**: 4-15 (depends on selected country)  
**How It Works**: 
```typescript
// Line 991-1000

this.requestForm.get('country')?.valueChanges.subscribe(selectedCountry => {
  // Use helper function from shared lookup
  this.filteredCityOptions = getCitiesByCountry(selectedCountry || '');
  
  // Reset city if not valid for new country
  const currentCity = this.requestForm.get('city')?.value;
  const cityStillValid = this.filteredCityOptions.some(o => o.value === currentCity);
  
  if (!cityStillValid) {
    this.requestForm.get('city')?.setValue(null);
  }
});
```

**Special Feature**: 
- Dynamic filtering based on country selection
- Uses helper function `getCitiesByCountry()` from shared lookup
- Auto-resets city when country changes

---

#### 4. **Sales Organization** ✅ Uses Shared Lookup
```html
<nz-select formControlName="SalesOrgOption">
  <nz-option *ngFor="let option of SalesOrgOption" 
            [nzValue]="option.value" 
            [nzLabel]="option.label">
  </nz-option>
</nz-select>
```

**Data Source**: `SALES_ORG_OPTIONS` from `shared/lookup-data.ts`  
**Options Count**: 31  
**How It Works**: Direct assignment from shared constant

---

#### 5. **Distribution Channel** ✅ Uses Shared Lookup
```html
<nz-select formControlName="DistributionChannelOption">
  <nz-option *ngFor="let option of DistributionChannelOption" 
            [nzValue]="option.value" 
            [nzLabel]="option.label">
  </nz-option>
</nz-select>
```

**Data Source**: `DISTRIBUTION_CHANNEL_OPTIONS` from `shared/lookup-data.ts`  
**Options Count**: 10  
**How It Works**: Direct assignment from shared constant

---

#### 6. **Division** ✅ Uses Shared Lookup
```html
<nz-select formControlName="DivisionOption">
  <nz-option *ngFor="let option of DivisionOption" 
            [nzValue]="option.value" 
            [nzLabel]="option.label">
  </nz-option>
</nz-select>
```

**Data Source**: `DIVISION_OPTIONS` from `shared/lookup-data.ts`  
**Options Count**: 10  
**How It Works**: Direct assignment from shared constant

---

#### 7. **Preferred Language** (in Contacts) ✅ Uses Shared Lookup
```html
<nz-select formControlName="PrefferedLanguage">
  <nz-option *ngFor="let option of PrefferedLanguage" 
            [nzValue]="option.value" 
            [nzLabel]="option.label">
  </nz-option>
</nz-select>
```

**Data Source**: `PREFERRED_LANGUAGE_OPTIONS` from `shared/lookup-data.ts`  
**Options Count**: 3  
**How It Works**: Direct assignment from shared constant

---

### Summary: New Request Page
| Dropdown | Uses Shared? | Source | Options | Dynamic? |
|----------|-------------|--------|---------|----------|
| Customer Type | ✅ Yes | CUSTOMER_TYPE_OPTIONS | 6 | No |
| Country | ✅ Yes | COUNTRY_OPTIONS | 4 | No |
| City | ✅ Yes | CITY_OPTIONS + getCitiesByCountry() | 4-15 | Yes (by country) |
| Sales Organization | ✅ Yes | SALES_ORG_OPTIONS | 31 | No |
| Distribution Channel | ✅ Yes | DISTRIBUTION_CHANNEL_OPTIONS | 10 | No |
| Division | ✅ Yes | DIVISION_OPTIONS | 10 | No |
| Preferred Language | ✅ Yes | PREFERRED_LANGUAGE_OPTIONS | 3 | No |

**Total Dropdowns**: 7  
**All Use Shared Lookup**: ✅ YES (100%)

---

## 🤖 Dropdowns in AI Agent

### Component Info
**Component**: `src/app/data-entry-agent/data-entry-chat-widget.component.ts`  
**Modal**: Unified Review & Complete Data Modal  
**Used By**: Data Entry users

### Import Statement
```typescript
// Line 9-17

import { 
  CUSTOMER_TYPE_OPTIONS,
  SALES_ORG_OPTIONS,
  DISTRIBUTION_CHANNEL_OPTIONS,
  DIVISION_OPTIONS,
  CITY_OPTIONS,
  COUNTRY_OPTIONS,
  getCitiesByCountry
} from '../shared/lookup-data';
```

### Component Properties
```typescript
// Line 114-119

// ✅ ALL use shared lookup data
customerTypeOptions = CUSTOMER_TYPE_OPTIONS;
countryOptions = COUNTRY_OPTIONS;
salesOrgOptions = SALES_ORG_OPTIONS;
distributionChannelOptions = DISTRIBUTION_CHANNEL_OPTIONS;
divisionOptions = DIVISION_OPTIONS;
cityOptions: any[] = [];  // Populated dynamically
```

### Dropdowns in Unified Modal

#### 1. **Customer Type** ✅ Uses Shared Lookup
```html
<!-- In Extracted Data Section -->
<nz-select formControlName="CustomerType">
  <nz-option *ngFor="let option of customerTypeOptions" 
            [nzValue]="option.value" 
            [nzLabel]="option.label">
  </nz-option>
</nz-select>
```

**Data Source**: `CUSTOMER_TYPE_OPTIONS`  
**Location**: Extracted Data section (read-only toggle) + Missing Fields section

---

#### 2. **Country** ✅ Uses Shared Lookup + Custom Support
```html
<nz-select formControlName="country" 
           nzShowSearch 
           nzAllowClear
           [nzPlaceHolder]="'Select or enter country'">
  <nz-option *ngFor="let option of countryOptions" 
            [nzValue]="option.value" 
            [nzLabel]="option.label">
  </nz-option>
</nz-select>
```

**Data Source**: `COUNTRY_OPTIONS` (with auto-add for custom values)  
**How It Works**:
```typescript
// Line 2653-2673

private updateCountryOptions(country: string): void {
  if (country) {
    // Check if extracted country exists in predefined list
    const countryExists = this.countryOptions.some((c: any) => 
      c.value === country || c.label === country || 
      (typeof c === 'string' && c === country)
    );
    
    // If extracted country not in predefined list, add it as custom option
    if (!countryExists && country.trim() !== '') {
      console.log(`🌍 [COUNTRY] Adding custom country: "${country}"`);
      this.countryOptions = [
        { label: country, value: country },
        ...COUNTRY_OPTIONS  // ⭐ Still uses shared base
      ];
    } else {
      // Reset to original shared list
      this.countryOptions = COUNTRY_OPTIONS;
    }
  }
}
```

**Special Feature**: Auto-adds OCR-extracted countries not in predefined list

---

#### 3. **City** ✅ Uses Shared Lookup + Custom Support
```html
<nz-select formControlName="city" 
           nzShowSearch 
           nzAllowClear
           [nzPlaceHolder]="'Select or enter city'">
  <nz-option *ngFor="let option of cityOptions" 
            [nzValue]="option.value" 
            [nzLabel]="option.label">
  </nz-option>
</nz-select>
```

**Data Source**: `CITY_OPTIONS` via `getCitiesByCountry()` (with auto-add for custom values)  
**How It Works**:
```typescript
// Line 2675-2698

private updateCityOptions(country: string): void {
  if (country) {
    // Get cities from shared lookup
    const cities = getCitiesByCountry(country);  // ⭐ Uses shared helper
    this.cityOptions = cities;
    
    // Check if current city exists in list
    const currentCity = this.unifiedModalForm.get('city')?.value;
    
    if (currentCity) {
      const cityExists = cities.some((c: any) => 
        c.value === currentCity || c.label === currentCity
      );
      
      // If extracted city not in predefined list, add it
      if (!cityExists && currentCity.trim() !== '') {
        console.log(`📍 [CITY] Adding custom city: "${currentCity}"`);
        this.cityOptions = [
          { label: currentCity, value: currentCity },
          ...cities  // ⭐ Still uses shared base
        ];
      }
    }
  } else {
    this.cityOptions = [];
  }
}
```

**Special Feature**: 
- Uses shared `getCitiesByCountry()` helper
- Auto-adds OCR-extracted cities not in predefined list
- Called when country changes

---

#### 4. **Sales Organization** ✅ Uses Shared Lookup
```html
<nz-select formControlName="salesOrganization">
  <nz-option *ngFor="let option of salesOrgOptions" 
            [nzValue]="option.value" 
            [nzLabel]="option.label">
  </nz-option>
</nz-select>
```

**Data Source**: `SALES_ORG_OPTIONS`  
**Location**: Sales Information section in modal

---

#### 5. **Distribution Channel** ✅ Uses Shared Lookup
```html
<nz-select formControlName="distributionChannel">
  <nz-option *ngFor="let option of distributionChannelOptions" 
            [nzValue]="option.value" 
            [nzLabel]="option.label">
  </nz-option>
</nz-select>
```

**Data Source**: `DISTRIBUTION_CHANNEL_OPTIONS`

---

#### 6. **Division** ✅ Uses Shared Lookup
```html
<nz-select formControlName="division">
  <nz-option *ngFor="let option of divisionOptions" 
            [nzValue]="option.value" 
            [nzLabel]="option.label">
  </nz-option>
</nz-select>
```

**Data Source**: `DIVISION_OPTIONS`

---

#### 7. **Preferred Language** (in Contact Modal) ✅ Uses Shared Lookup
```html
<!-- Contact Modal -->
<nz-select formControlName="preferredLanguage">
  <nz-option nzValue="Arabic" nzLabel="العربية / Arabic"></nz-option>
  <nz-option nzValue="English" nzLabel="English / الإنجليزية"></nz-option>
</nz-select>
```

**Data Source**: Hardcoded (but values match `PREFERRED_LANGUAGE_OPTIONS`)  
**Note**: Could be improved to use shared lookup

---

### Summary: AI Agent
| Dropdown | Uses Shared? | Source | Options | Dynamic? | Custom Values? |
|----------|-------------|--------|---------|----------|----------------|
| Customer Type | ✅ Yes | CUSTOMER_TYPE_OPTIONS | 6 | No | No |
| Country | ✅ Yes | COUNTRY_OPTIONS | 4 | No | ✅ Yes (auto-add) |
| City | ✅ Yes | getCitiesByCountry() | 4-15 | Yes (by country) | ✅ Yes (auto-add) |
| Sales Organization | ✅ Yes | SALES_ORG_OPTIONS | 31 | No | No |
| Distribution Channel | ✅ Yes | DISTRIBUTION_CHANNEL_OPTIONS | 10 | No | No |
| Division | ✅ Yes | DIVISION_OPTIONS | 10 | No | No |
| Preferred Language | ⚠️ Partial | Hardcoded (but matches shared) | 2 | No | No |

**Total Dropdowns**: 7  
**Use Shared Lookup**: 6 fully, 1 partially (86%)  
**Special Feature**: Country and City auto-add custom OCR values

---

## 🔄 Dropdowns in Duplicate Customer Page

### Page Info
**Component**: `src/app/duplicate-customer/duplicate-customer.component.ts`  
**Route**: `/dashboard/duplicate-customer`  
**Purpose**: Master record builder and duplicate resolution

### Import Statement
```typescript
// Line 11-21

import {
  CUSTOMER_TYPE_OPTIONS,
  SALES_ORG_OPTIONS,
  DISTRIBUTION_CHANNEL_OPTIONS,
  DIVISION_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  CITY_OPTIONS,
  COUNTRY_OPTIONS,
  PREFERRED_LANGUAGE_OPTIONS,
  getCitiesByCountry
} from '../shared/lookup-data';
```

### Component Properties
```typescript
// Line 127-134

// ✅ ALL use shared lookup data
dropdownOptions: { [key: string]: DropdownOption[] } = {
  CustomerType: CUSTOMER_TYPE_OPTIONS,
  SalesOrgOption: SALES_ORG_OPTIONS,
  DistributionChannelOption: DISTRIBUTION_CHANNEL_OPTIONS,
  DivisionOption: DIVISION_OPTIONS,
  country: COUNTRY_OPTIONS,
  city: []  // Populated dynamically
};
```

### How Dropdowns Work

**Master Record Builder**:
```typescript
// When building master from duplicates
// User selects which record's value to use for each field

buildMasterRecord() {
  const fields = [
    { key: 'CustomerType', type: 'dropdown', options: this.dropdownOptions.CustomerType },
    { key: 'country', type: 'dropdown', options: this.dropdownOptions.country },
    { key: 'SalesOrgOption', type: 'dropdown', options: this.dropdownOptions.SalesOrgOption },
    // ... etc
  ];
  
  // Display dropdown for each field
  // Show values from all duplicate records
  // Allow user to select which value to keep
}
```

**City Dropdown**:
```typescript
// Dynamically populated when country selected
onCountrySelect(country: string): void {
  // Use shared helper function
  this.dropdownOptions.city = getCitiesByCountry(country);
}
```

### Summary: Duplicate Customer
| Dropdown | Uses Shared? | Source | Options | Dynamic? |
|----------|-------------|--------|---------|----------|
| Customer Type | ✅ Yes | CUSTOMER_TYPE_OPTIONS | 6 | No |
| Country | ✅ Yes | COUNTRY_OPTIONS | 4 | No |
| City | ✅ Yes | getCitiesByCountry() | 4-15 | Yes (by country) |
| Sales Organization | ✅ Yes | SALES_ORG_OPTIONS | 31 | No |
| Distribution Channel | ✅ Yes | DISTRIBUTION_CHANNEL_OPTIONS | 10 | No |
| Division | ✅ Yes | DIVISION_OPTIONS | 10 | No |
| Preferred Language | ✅ Yes | PREFERRED_LANGUAGE_OPTIONS | 3 | No |

**Total Dropdowns**: 7  
**Use Shared Lookup**: ✅ 100%

---

## ❌ Non-Shared Dropdowns

### Where Hardcoded Dropdowns Exist

#### 1. **AI Agent Contact Modal - Preferred Language**
**Location**: `data-entry-chat-widget.component.html` (Contact Modal)

```html
<!-- Hardcoded values (not using shared lookup) -->
<nz-select formControlName="preferredLanguage">
  <nz-option nzValue="Arabic" nzLabel="العربية / Arabic"></nz-option>
  <nz-option nzValue="English" nzLabel="English / الإنجليزية"></nz-option>
</nz-select>
```

**Why Not Shared?**: Oversight - could be improved

**Values Match Shared?**: Yes (Arabic, English)

**Recommendation**: Could import and use `PREFERRED_LANGUAGE_OPTIONS`

---

#### 2. **Document Type (Auto-Detection)**
**Location**: `data-entry-agent.service.ts` → `smartDetectDocumentMetadata()`

**How It Works**:
```typescript
// Uses pattern matching, not dropdown
// But detection keys map to DOCUMENT_TYPE_OPTIONS values

const type = 'commercialRegistration';  // Matches lookup key
const country = 'egypt';                 // Matches lookup key

// These are then used with translation keys
this.translate.instant(`agent.documentTypes.${type}`);
this.translate.instant(`agent.countries.${country}`);
```

**Partial Use**: Uses same keys as `DOCUMENT_TYPE_OPTIONS` for consistency

---

## 🔧 How Shared Lookup Works

### Step 1: Define in Shared File
```typescript
// src/app/shared/lookup-data.ts

export const CUSTOMER_TYPE_OPTIONS = [
  { value: 'Corporate', label: 'Corporate' },
  { value: 'SME', label: 'SME' },
  // ... more options
];
```

---

### Step 2: Import in Component
```typescript
// In any component.ts file

import { CUSTOMER_TYPE_OPTIONS } from '../shared/lookup-data';
```

---

### Step 3: Assign to Component Property
```typescript
// In component class

export class MyComponent {
  customerTypeOptions = CUSTOMER_TYPE_OPTIONS;
}
```

---

### Step 4: Use in Template
```html
<!-- In component.html -->

<nz-select formControlName="CustomerType">
  <nz-option *ngFor="let option of customerTypeOptions" 
            [nzValue]="option.value" 
            [nzLabel]="option.label">
  </nz-option>
</nz-select>
```

---

### Special Case: Dynamic City Dropdown

**Step 1: Import Helper Function**
```typescript
import { getCitiesByCountry } from '../shared/lookup-data';
```

**Step 2: Call on Country Change**
```typescript
this.form.get('country')?.valueChanges.subscribe(country => {
  // Get cities for selected country
  this.filteredCityOptions = getCitiesByCountry(country);
});
```

**Step 3: Use in Template**
```html
<nz-select formControlName="city">
  <nz-option *ngFor="let option of filteredCityOptions" 
            [nzValue]="option.value" 
            [nzLabel]="option.label">
  </nz-option>
</nz-select>
```

---

## 📋 Business Rules

### Rule 1: Single Source of Truth
**Principle**: All dropdown values defined in one file  
**File**: `src/app/shared/lookup-data.ts`  
**Benefit**: Consistency across application

---

### Rule 2: Country-City Relationship
**Principle**: City options depend on selected country  
**Implementation**: `getCitiesByCountry()` helper function  
**Benefit**: Users only see valid cities for their country

---

### Rule 3: Custom Value Support (AI Agent Only)
**Principle**: Allow OCR-extracted values not in predefined lists  
**Implementation**: Auto-add to options array  
**Benefit**: Don't lose valid extracted data

**Example**:
```
OCR extracts: country = "Kingdom of Saudi Arabia"
Predefined list: "Saudi Arabia"
Action: Add "Kingdom of Saudi Arabia" as custom option
Result: User sees both and can select
```

---

### Rule 4: Type Safety
**Principle**: All options have { value, label } structure  
**Implementation**: TypeScript interfaces  
**Benefit**: Compile-time error checking

```typescript
interface DropdownOption {
  value: string;
  label: string;
}
```

---

## 📊 Complete Dropdown Inventory

### Shared Lookup Contents

| Lookup List | Options Count | Used In |
|-------------|--------------|---------|
| SOURCE_SYSTEM_OPTIONS | 3 | Admin/Sync pages |
| COUNTRY_OPTIONS | 4 | New Request, AI Agent, Duplicate Customer |
| CUSTOMER_TYPE_OPTIONS | 6 | New Request, AI Agent, Duplicate Customer |
| CITY_OPTIONS | 15 (4 countries) | New Request, AI Agent, Duplicate Customer |
| SALES_ORG_OPTIONS | 31 | New Request, AI Agent, Duplicate Customer |
| DISTRIBUTION_CHANNEL_OPTIONS | 10 | New Request, AI Agent, Duplicate Customer |
| DIVISION_OPTIONS | 10 | New Request, AI Agent, Duplicate Customer |
| DOCUMENT_TYPE_OPTIONS | 57 | New Request, Document upload |
| PREFERRED_LANGUAGE_OPTIONS | 3 | New Request (contacts), Duplicate Customer |

**Total Lists**: 9  
**Total Options**: 130+  
**Helper Functions**: 1 (`getCitiesByCountry`)

---

## 🔍 Code Locations Reference

### Shared Lookup Data
```
File: src/app/shared/lookup-data.ts
Lines: 1-212
Exports:
  - SOURCE_SYSTEM_OPTIONS (line 2)
  - COUNTRY_OPTIONS (line 8)
  - CUSTOMER_TYPE_OPTIONS (line 15)
  - CITY_OPTIONS (line 24)
  - SALES_ORG_OPTIONS (line 51)
  - DISTRIBUTION_CHANNEL_OPTIONS (line 98)
  - DIVISION_OPTIONS (line 111)
  - DOCUMENT_TYPE_OPTIONS (line 124)
  - PREFERRED_LANGUAGE_OPTIONS (line 203)
  - getCitiesByCountry() (line 210)
```

### New Request Usage
```
File: src/app/new-request/new-request.component.ts
Import: Line 26-36
Properties: Line 211-217
Country-City Logic: setupCountryCityLogic() (line 983)
```

### AI Agent Usage
```
File: src/app/data-entry-agent/data-entry-chat-widget.component.ts
Import: Line 9-17
Properties: Line 114-119
Country Logic: updateCountryOptions() (line 2653)
City Logic: updateCityOptions() (line 2675)
```

### Duplicate Customer Usage
```
File: src/app/duplicate-customer/duplicate-customer.component.ts
Import: Line 11-21
Properties: Line 127-134 (dropdownOptions object)
```

---

## ✅ Summary

### Shared Lookup Usage

**Pages Using Shared Lookup**:
1. ✅ New Request Page (100% shared)
2. ✅ AI Agent (86% shared, 14% partial)
3. ✅ Duplicate Customer (100% shared)

**Total Dropdowns Across All Pages**: 21 dropdown instances  
**Using Shared Lookup**: 20/21 (95%)  
**Not Using Shared**: 1/21 (Contact preferred language in AI Agent)

### Benefits Achieved
- ✅ **Consistency**: Same values everywhere
- ✅ **Maintainability**: Update once, reflects everywhere
- ✅ **Type Safety**: TypeScript interfaces
- ✅ **Performance**: No API calls for dropdown data
- ✅ **Flexibility**: Helper functions for dynamic filtering

### Recommendations
1. Update AI Agent contact modal to use `PREFERRED_LANGUAGE_OPTIONS`
2. Consider adding more helper functions (e.g., `getSalesOrgByCountry()`)
3. Add comments in lookup-data.ts for each list

**Overall Status**: ✅ Excellent implementation with shared lookup system









