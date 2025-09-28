// src/app/shared/lookup-data.ts
export const SOURCE_SYSTEM_OPTIONS = [
  { value: 'oracle_forms', label: 'Oracle Forms' },
  { value: 'sap_4hana', label: 'SAP S/4HANA' },
  { value: 'sap_bydesign', label: 'SAP ByDesign' }
];

export const COUNTRY_OPTIONS = [
  { value: 'Egypt', label: 'Egypt' },
  { value: 'Saudi Arabia', label: 'Saudi Arabia' },
  { value: 'United Arab Emirates', label: 'United Arab Emirates' },
  { value: 'Yemen', label: 'Yemen' }
];

export const CUSTOMER_TYPE_OPTIONS = [
  { value: 'Corporate', label: 'Corporate' },
  { value: 'SME', label: 'SME' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'limited_liability', label: 'Limited Liability' },
  { value: 'joint_stock', label: 'Joint Stock' },
  { value: 'Retail Chain', label: 'Retail Chain' }
];

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

// Additional options for other components
export const SALES_ORG_OPTIONS = [
  { value: '1000', label: 'Sales Org 1000' },
  { value: '2000', label: 'Sales Org 2000' }
];

export const DISTRIBUTION_CHANNEL_OPTIONS = [
  { value: '10', label: 'Channel 10' },
  { value: '20', label: 'Channel 20' }
];

export const DIVISION_OPTIONS = [
  { value: '00', label: 'Division 00' },
  { value: '01', label: 'Division 01' }
];

export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'OR', label: 'Order' },
  { value: 'IN', label: 'Invoice' }
];

export const PREFERRED_LANGUAGE_OPTIONS = [
  { value: 'EN', label: 'English' },
  { value: 'AR', label: 'Arabic' }
];

// Helper function to get cities by country
export function getCitiesByCountry(country: string): any[] {
  return CITY_OPTIONS[country] || [];
}