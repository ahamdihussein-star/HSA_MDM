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
  { value: 'Yemen', label: 'Yemen' },
  { value: 'Qatar', label: 'Qatar' },
  { value: 'Oman', label: 'Oman' },
  { value: 'Bahrain', label: 'Bahrain' }
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
  ],
  'Qatar': [
    { value: 'Doha', label: 'Doha' },
    { value: 'Al Wakrah', label: 'Al Wakrah' }
  ],
  'Oman': [
    { value: 'Muscat', label: 'Muscat' },
    { value: 'Salalah', label: 'Salalah' },
    { value: 'Sohar', label: 'Sohar' }
  ],
  'Bahrain': [
    { value: 'Manama', label: 'Manama' },
    { value: 'Muharraq', label: 'Muharraq' }
  ]
};

export const SALES_ORG_OPTIONS = [
  { value: 'egypt_sales_org', label: 'Egypt - Main Sales Organization' },
  { value: 'ksa_sales_org', label: 'Saudi Arabia - Main Sales Organization' },
  { value: 'uae_sales_org', label: 'United Arab Emirates - Main Sales Organization' },
  { value: 'yemen_sales_org', label: 'Yemen - Main Sales Organization' },
  { value: 'qatar_sales_org', label: 'Qatar - Main Sales Organization' },
  { value: 'oman_sales_org', label: 'Oman - Main Sales Organization' },
  { value: 'bahrain_sales_org', label: 'Bahrain - Main Sales Organization' }
];

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

// Unified and simplified document list
export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'commercial_registration', label: 'Commercial Registration' },
  { value: 'tax_card', label: 'Tax Registration Card' },
  { value: 'vat_certificate', label: 'VAT Registration Certificate' },
  { value: 'business_license', label: 'Business License' },
  { value: 'chamber_of_commerce', label: 'Chamber of Commerce Certificate' }
];

export const PREFERRED_LANGUAGE_OPTIONS = [
  { value: 'EN', label: 'English' },
  { value: 'AR', label: 'Arabic' },
  { value: 'BOTH', label: 'Both' }
];

export function getCitiesByCountry(country: string): any[] {
  return CITY_OPTIONS[country] || [];
}