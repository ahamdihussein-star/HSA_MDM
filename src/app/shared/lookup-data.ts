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
 // Yemen Operations
 { value: 'yemen_main_office', label: 'Yemen - Main Office Sanaa' },
 { value: 'yemen_aden_branch', label: 'Yemen - Aden Branch' },
 { value: 'yemen_taiz_branch', label: 'Yemen - Taiz Branch' },
 { value: 'yemen_hodeidah_branch', label: 'Yemen - Hodeidah Branch' },
 { value: 'yemen_hadramout_branch', label: 'Yemen - Hadramout Branch' },
 
 // Egypt Operations
 { value: 'egypt_cairo_office', label: 'Egypt - Cairo Head Office' },
 { value: 'egypt_alexandria_branch', label: 'Egypt - Alexandria Branch' },
 { value: 'egypt_giza_branch', label: 'Egypt - Giza Branch' },
 { value: 'egypt_upper_egypt_branch', label: 'Egypt - Upper Egypt Branch' },
 { value: 'egypt_delta_region_branch', label: 'Egypt - Delta Region Branch' },
 
 // Saudi Arabia Operations
 { value: 'ksa_riyadh_office', label: 'Saudi Arabia - Riyadh Office' },
 { value: 'ksa_jeddah_branch', label: 'Saudi Arabia - Jeddah Branch' },
 { value: 'ksa_dammam_branch', label: 'Saudi Arabia - Dammam Branch' },
 { value: 'ksa_makkah_branch', label: 'Saudi Arabia - Makkah Branch' },
 { value: 'ksa_madinah_branch', label: 'Saudi Arabia - Madinah Branch' },
 
 // UAE Operations
 { value: 'uae_dubai_office', label: 'UAE - Dubai Office' },
 { value: 'uae_abu_dhabi_branch', label: 'UAE - Abu Dhabi Branch' },
 { value: 'uae_sharjah_branch', label: 'UAE - Sharjah Branch' },
 { value: 'uae_ajman_branch', label: 'UAE - Ajman Branch' },
 
 // Kuwait Operations
 { value: 'kuwait_main_office', label: 'Kuwait - Main Office' },
 { value: 'kuwait_hawalli_branch', label: 'Kuwait - Hawalli Branch' },
 { value: 'kuwait_farwaniya_branch', label: 'Kuwait - Farwaniya Branch' },
 
 // Qatar Operations
 { value: 'qatar_doha_office', label: 'Qatar - Doha Office' },
 { value: 'qatar_industrial_area_branch', label: 'Qatar - Industrial Area Branch' },
 
 // Bahrain Operations
 { value: 'bahrain_manama_office', label: 'Bahrain - Manama Office' },
 { value: 'bahrain_muharraq_branch', label: 'Bahrain - Muharraq Branch' },
 
 // Oman Operations
 { value: 'oman_muscat_office', label: 'Oman - Muscat Office' },
 { value: 'oman_salalah_branch', label: 'Oman - Salalah Branch' },
 { value: 'oman_sohar_branch', label: 'Oman - Sohar Branch' }
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

export const DOCUMENT_TYPE_OPTIONS = [
  // Yemen Documents
  { value: 'yemen_commercial_register', label: 'Yemen - Commercial Registration Certificate' },
  { value: 'yemen_tax_card', label: 'Yemen - Tax Registration Card' },
  { value: 'yemen_chamber_commerce', label: 'Yemen - Chamber of Commerce Certificate' },
  { value: 'yemen_import_export_license', label: 'Yemen - Import Export License' },
  { value: 'yemen_industrial_license', label: 'Yemen - Industrial License' },
  { value: 'yemen_municipality_license', label: 'Yemen - Municipality License' },
  
  // Egypt Documents
  { value: 'egypt_commercial_register', label: 'Egypt - Commercial Registration' },
  { value: 'egypt_tax_card', label: 'Egypt - Tax Registration Card' },
  { value: 'egypt_vat_certificate', label: 'Egypt - VAT Registration Certificate' },
  { value: 'egypt_import_register', label: 'Egypt - Importers Register' },
  { value: 'egypt_export_register', label: 'Egypt - Exporters Register' },
  { value: 'egypt_industrial_register', label: 'Egypt - Industrial Register' },
  { value: 'egypt_chamber_commerce', label: 'Egypt - Chamber of Commerce Certificate' },
  { value: 'egypt_gafi_license', label: 'Egypt - GAFI Investment License' },
  
  // Saudi Arabia Documents
  { value: 'ksa_commercial_register', label: 'KSA - Commercial Registration (Sijil Tijari)' },
  { value: 'ksa_vat_certificate', label: 'KSA - VAT Registration Certificate' },
  { value: 'ksa_zakat_certificate', label: 'KSA - Zakat and Tax Certificate' },
  { value: 'ksa_chamber_commerce', label: 'KSA - Chamber of Commerce Certificate' },
  { value: 'ksa_municipality_license', label: 'KSA - Municipality License (Baladia)' },
  { value: 'ksa_industrial_license', label: 'KSA - Industrial License' },
  { value: 'ksa_saso_certificate', label: 'KSA - SASO Quality Certificate' },
  { value: 'ksa_nitaqat_certificate', label: 'KSA - Nitaqat Certificate' },
  
  // UAE Documents
  { value: 'uae_trade_license', label: 'UAE - Trade License' },
  { value: 'uae_establishment_card', label: 'UAE - Establishment Card' },
  { value: 'uae_chamber_commerce', label: 'UAE - Chamber of Commerce Certificate' },
  { value: 'uae_vat_registration', label: 'UAE - VAT Registration Certificate' },
  { value: 'uae_customs_code', label: 'UAE - Customs Code Certificate' },
  { value: 'uae_economic_license', label: 'UAE - Economic Department License' },
  { value: 'uae_municipality_permit', label: 'UAE - Municipality Permit' },
  
  // Kuwait Documents
  { value: 'kuwait_commercial_license', label: 'Kuwait - Commercial License' },
  { value: 'kuwait_chamber_commerce', label: 'Kuwait - Chamber of Commerce Certificate' },
  { value: 'kuwait_municipality_license', label: 'Kuwait - Municipality License' },
  { value: 'kuwait_civil_id_company', label: 'Kuwait - Company Civil ID' },
  { value: 'kuwait_import_license', label: 'Kuwait - Import License' },
  { value: 'kuwait_industrial_license', label: 'Kuwait - Industrial License' },
  
  // Qatar Documents
  { value: 'qatar_commercial_register', label: 'Qatar - Commercial Registration' },
  { value: 'qatar_chamber_commerce', label: 'Qatar - Chamber of Commerce Certificate' },
  { value: 'qatar_municipality_license', label: 'Qatar - Municipality License' },
  { value: 'qatar_tax_card', label: 'Qatar - Tax Registration Card' },
  { value: 'qatar_computer_card', label: 'Qatar - Computer Card Number' },
  { value: 'qatar_establishment_card', label: 'Qatar - Establishment Card' },
  
  // Bahrain Documents
  { value: 'bahrain_commercial_register', label: 'Bahrain - Commercial Registration (CR)' },
  { value: 'bahrain_vat_certificate', label: 'Bahrain - VAT Registration Certificate' },
  { value: 'bahrain_chamber_commerce', label: 'Bahrain - Chamber of Commerce Certificate' },
  { value: 'bahrain_municipality_license', label: 'Bahrain - Municipality License' },
  { value: 'bahrain_industrial_license', label: 'Bahrain - Industrial License' },
  
  // Oman Documents
  { value: 'oman_commercial_register', label: 'Oman - Commercial Registration' },
  { value: 'oman_tax_card', label: 'Oman - Tax Registration Card' },
  { value: 'oman_chamber_commerce', label: 'Oman - Chamber of Commerce Certificate' },
  { value: 'oman_municipality_license', label: 'Oman - Municipality License' },
  { value: 'oman_vat_certificate', label: 'Oman - VAT Registration Certificate' },
  
  // General Documents (All Countries)
  { value: 'bank_account_letter', label: 'Bank Account Verification Letter' },
  { value: 'authorized_signature_list', label: 'Authorized Signatures List' },
  { value: 'power_of_attorney', label: 'Power of Attorney' },
  { value: 'articles_of_association', label: 'Articles of Association' },
  { value: 'board_resolution', label: 'Board Resolution' },
  { value: 'financial_statements', label: 'Audited Financial Statements' },
  { value: 'iso_certificate', label: 'ISO Certification' },
  { value: 'halal_certificate', label: 'Halal Certificate' }
];

export const PREFERRED_LANGUAGE_OPTIONS = [
  { value: 'EN', label: 'English' },
  { value: 'AR', label: 'Arabic' },
  { value: 'AR', label: 'Both' }
];

// Helper function to get cities by country
export function getCitiesByCountry(country: string): any[] {
  return CITY_OPTIONS[country] || [];
}