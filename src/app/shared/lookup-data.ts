// src/app/shared/constants/lookup-data.ts

export const CUSTOMER_TYPE_OPTIONS = [
  { value: 'Sole Proprietorship', label: 'Sole Proprietorship' },
  { value: 'Limited Liability Company', label: 'Limited Liability Company' },
  { value: 'Joint Stock Company', label: 'Joint Stock Company' },
  { value: 'Partnership', label: 'Partnership' },
  { value: 'Limited Partnership', label: 'Limited Partnership' },
  { value: 'Retail Chain', label: 'Retail Chain' },
  { value: 'Wholesale Distributor', label: 'Wholesale Distributor' },
  { value: 'Government Entity', label: 'Government Entity' },
  { value: 'Cooperative', label: 'Cooperative' }
];

export const SALES_ORG_OPTIONS = [
  { value: 'HSA Egypt 1000', label: 'HSA Egypt 1000' },
  { value: 'HSA Saudi Arabia 2000', label: 'HSA Saudi Arabia 2000' },
  { value: 'HSA UAE 3000', label: 'HSA UAE 3000' },
  { value: 'HSA Yemen 4000', label: 'HSA Yemen 4000' },
  { value: 'HSA Kuwait 5000', label: 'HSA Kuwait 5000' },
  { value: 'HSA Oman 6000', label: 'HSA Oman 6000' }
];

export const DISTRIBUTION_CHANNEL_OPTIONS = [
  { value: 'Modern Trade', label: 'Modern Trade' },
  { value: 'Traditional Trade', label: 'Traditional Trade' },
  { value: 'HoReCa', label: 'HoReCa' },
  { value: 'B2B', label: 'B2B' },
  { value: 'E-Commerce', label: 'E-Commerce' },
  { value: 'Export', label: 'Export' },
  { value: 'Key Accounts', label: 'Key Accounts' }
];

export const DIVISION_OPTIONS = [
  { value: 'Food Products', label: 'Food Products' },
  { value: 'Beverages', label: 'Beverages' },
  { value: 'Dairy and Cheese', label: 'Dairy and Cheese' },
  { value: 'Frozen Products', label: 'Frozen Products' },
  { value: 'Snacks and Confectionery', label: 'Snacks and Confectionery' },
  { value: 'Home and Personal Care', label: 'Home and Personal Care' },
  { value: 'Tobacco Products', label: 'Tobacco Products' }
];

export const CITY_OPTIONS: Record<string, { value: string; label: string }[]> = {
  Egypt: [
    { value: 'Cairo', label: 'Cairo' },
    { value: 'Alexandria', label: 'Alexandria' },
    { value: 'Giza', label: 'Giza' },
    { value: '10th of Ramadan', label: '10th of Ramadan' },
    { value: '6th of October', label: '6th of October' },
    { value: 'Port Said', label: 'Port Said' },
    { value: 'Suez', label: 'Suez' },
    { value: 'Mansoura', label: 'Mansoura' },
    { value: 'Tanta', label: 'Tanta' },
    { value: 'Assiut', label: 'Assiut' },
    { value: 'Luxor', label: 'Luxor' },
    { value: 'Aswan', label: 'Aswan' }
  ],
  'Saudi Arabia': [
    { value: 'Riyadh', label: 'Riyadh' },
    { value: 'Jeddah', label: 'Jeddah' },
    { value: 'Dammam', label: 'Dammam' },
    { value: 'Khobar', label: 'Khobar' },
    { value: 'Mecca', label: 'Mecca' },
    { value: 'Medina', label: 'Medina' },
    { value: 'Jubail', label: 'Jubail' },
    { value: 'Yanbu', label: 'Yanbu' },
    { value: 'Tabuk', label: 'Tabuk' },
    { value: 'Buraidah', label: 'Buraidah' },
    { value: 'Khamis Mushait', label: 'Khamis Mushait' },
    { value: 'Abha', label: 'Abha' }
  ],
  'United Arab Emirates': [
    { value: 'Dubai', label: 'Dubai' },
    { value: 'Abu Dhabi', label: 'Abu Dhabi' },
    { value: 'Sharjah', label: 'Sharjah' },
    { value: 'Ajman', label: 'Ajman' },
    { value: 'Ras Al Khaimah', label: 'Ras Al Khaimah' },
    { value: 'Fujairah', label: 'Fujairah' },
    { value: 'Umm Al Quwain', label: 'Umm Al Quwain' },
    { value: 'Al Ain', label: 'Al Ain' }
  ],
  Yemen: [
    { value: 'Sanaa', label: 'Sanaa' },
    { value: 'Aden', label: 'Aden' },
    { value: 'Taiz', label: 'Taiz' },
    { value: 'Al Hudaydah', label: 'Al Hudaydah' },
    { value: 'Ibb', label: 'Ibb' },
    { value: 'Mukalla', label: 'Mukalla' },
    { value: 'Dhamar', label: 'Dhamar' },
    { value: 'Saada', label: 'Saada' }
  ],
  Kuwait: [
    { value: 'Kuwait City', label: 'Kuwait City' },
    { value: 'Hawalli', label: 'Hawalli' },
    { value: 'Salmiya', label: 'Salmiya' },
    { value: 'Farwaniya', label: 'Farwaniya' },
    { value: 'Ahmadi', label: 'Ahmadi' }
  ],
  Oman: [
    { value: 'Muscat', label: 'Muscat' },
    { value: 'Salalah', label: 'Salalah' },
    { value: 'Sohar', label: 'Sohar' },
    { value: 'Nizwa', label: 'Nizwa' },
    { value: 'Sur', label: 'Sur' }
  ]
};

export const COUNTRY_OPTIONS = [
  { value: 'Egypt', label: 'Egypt' },
  { value: 'Saudi Arabia', label: 'Saudi Arabia' },
  { value: 'United Arab Emirates', label: 'United Arab Emirates' },
  { value: 'Yemen', label: 'Yemen' },
  { value: 'Kuwait', label: 'Kuwait' },
  { value: 'Oman', label: 'Oman' }
];

export const PREFERRED_LANGUAGE_OPTIONS = [
  { value: 'Arabic', label: 'Arabic' },
  { value: 'English', label: 'English' },
  { value: 'Both', label: 'Both' }
];

export const PAYMENT_TERMS_OPTIONS = [
  { value: 'Cash on Delivery', label: 'Cash on Delivery' },
  { value: 'Net 7 Days', label: 'Net 7 Days' },
  { value: 'Net 15 Days', label: 'Net 15 Days' },
  { value: 'Net 30 Days', label: 'Net 30 Days' },
  { value: 'Net 45 Days', label: 'Net 45 Days' },
  { value: 'Net 60 Days', label: 'Net 60 Days' },
  { value: 'Advance Payment', label: 'Advance Payment' }
];

export const CREDIT_LIMIT_OPTIONS = [
  { value: 'No Credit', label: 'No Credit' },
  { value: 'Up to 50000', label: 'Up to 50000' },
  { value: 'Up to 100000', label: 'Up to 100000' },
  { value: 'Up to 250000', label: 'Up to 250000' },
  { value: 'Up to 500000', label: 'Up to 500000' },
  { value: 'Up to 1000000', label: 'Up to 1000000' },
  { value: 'Unlimited', label: 'Unlimited' }
];

// Document Types
export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'Commercial Registration', label: 'Commercial Registration' },
  { value: 'Tax Certificate', label: 'Tax Certificate' },
  { value: 'License', label: 'License' },
  { value: 'Other', label: 'Other' }
];

// Source Systems  
export const SOURCE_SYSTEM_OPTIONS = [
  { value: 'SAP S/4HANA', label: 'SAP S/4HANA' },
  { value: 'SAP ByD', label: 'SAP ByD' },
  { value: 'Oracle Forms', label: 'Oracle Forms' },
  { value: 'Data Steward', label: 'Data Steward' }
];

// Status Options
export const STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Quarantine', label: 'Quarantine' },
  { value: 'Linked', label: 'Linked' },
  { value: 'Golden', label: 'Golden' },
  { value: 'Merged', label: 'Merged' }
];

// Company Status
export const COMPANY_STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Blocked', label: 'Blocked' },
  { value: 'Suspended', label: 'Suspended' },
  { value: 'Under Review', label: 'Under Review' }
];

// Helper functions
export function getCitiesByCountry(country: string) {
  return CITY_OPTIONS[country] || [];
}

export function getOptionLabel(options: {value: string, label: string}[], value: string): string {
  const option = options.find(opt => opt.value === value);
  return option ? option.label : value;
}