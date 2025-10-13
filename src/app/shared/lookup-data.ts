// src/app/shared/lookup-data.ts

export const SOURCE_SYSTEM_OPTIONS = [
  { value: 'oracle_forms', label: 'Oracle Forms' },
  { value: 'sap_4hana', label: 'SAP S/4HANA' },
  { value: 'sap_bydesign', label: 'SAP ByDesign' }
];

export const COUNTRY_OPTIONS = [
  // GCC & Middle East (Original + Extended)
  { value: 'Bahrain', label: '🇧🇭 Bahrain' },
  { value: 'Egypt', label: '🇪🇬 Egypt' },
  { value: 'Iran', label: '🇮🇷 Iran' },
  { value: 'Iraq', label: '🇮🇶 Iraq' },
  { value: 'Jordan', label: '🇯🇴 Jordan' },
  { value: 'Kuwait', label: '🇰🇼 Kuwait' },
  { value: 'Lebanon', label: '🇱🇧 Lebanon' },
  { value: 'Oman', label: '🇴🇲 Oman' },
  { value: 'Qatar', label: '🇶🇦 Qatar' },
  { value: 'Saudi Arabia', label: '🇸🇦 Saudi Arabia' },
  { value: 'Syria', label: '🇸🇾 Syria' },
  { value: 'United Arab Emirates', label: '🇦🇪 United Arab Emirates' },
  { value: 'Yemen', label: '🇾🇪 Yemen' },
  
  // North Africa
  { value: 'Algeria', label: '🇩🇿 Algeria' },
  { value: 'Libya', label: '🇱🇾 Libya' },
  { value: 'Morocco', label: '🇲🇦 Morocco' },
  { value: 'Sudan', label: '🇸🇩 Sudan' },
  { value: 'Tunisia', label: '🇹🇳 Tunisia' },
  
  // Major Powers
  { value: 'Australia', label: '🇦🇺 Australia' },
  { value: 'Brazil', label: '🇧🇷 Brazil' },
  { value: 'Canada', label: '🇨🇦 Canada' },
  { value: 'China', label: '🇨🇳 China' },
  { value: 'France', label: '🇫🇷 France' },
  { value: 'Germany', label: '🇩🇪 Germany' },
  { value: 'India', label: '🇮🇳 India' },
  { value: 'Italy', label: '🇮🇹 Italy' },
  { value: 'Japan', label: '🇯🇵 Japan' },
  { value: 'Russia', label: '🇷🇺 Russia' },
  { value: 'South Korea', label: '🇰🇷 South Korea' },
  { value: 'Spain', label: '🇪🇸 Spain' },
  { value: 'United Kingdom', label: '🇬🇧 United Kingdom' },
  { value: 'United States', label: '🇺🇸 United States' },
  
  // High-Risk Countries
  { value: 'Afghanistan', label: '🇦🇫 Afghanistan' },
  { value: 'Belarus', label: '🇧🇾 Belarus' },
  { value: 'Cuba', label: '🇨🇺 Cuba' },
  { value: 'Myanmar', label: '🇲🇲 Myanmar' },
  { value: 'North Korea', label: '🇰🇵 North Korea' },
  { value: 'Somalia', label: '🇸🇴 Somalia' },
  { value: 'Venezuela', label: '🇻🇪 Venezuela' },
  { value: 'Zimbabwe', label: '🇿🇼 Zimbabwe' },
  
  // Europe
  { value: 'Austria', label: '🇦🇹 Austria' },
  { value: 'Belgium', label: '🇧🇪 Belgium' },
  { value: 'Netherlands', label: '🇳🇱 Netherlands' },
  { value: 'Norway', label: '🇳🇴 Norway' },
  { value: 'Poland', label: '🇵🇱 Poland' },
  { value: 'Sweden', label: '🇸🇪 Sweden' },
  { value: 'Switzerland', label: '🇨🇭 Switzerland' },
  { value: 'Turkey', label: '🇹🇷 Turkey' },
  { value: 'Ukraine', label: '🇺🇦 Ukraine' },
  
  // Asia-Pacific
  { value: 'Indonesia', label: '🇮🇩 Indonesia' },
  { value: 'Malaysia', label: '🇲🇾 Malaysia' },
  { value: 'Pakistan', label: '🇵🇰 Pakistan' },
  { value: 'Philippines', label: '🇵🇭 Philippines' },
  { value: 'Singapore', label: '🇸🇬 Singapore' },
  { value: 'Thailand', label: '🇹🇭 Thailand' },
  { value: 'Vietnam', label: '🇻🇳 Vietnam' },
  
  // Africa
  { value: 'Ethiopia', label: '🇪🇹 Ethiopia' },
  { value: 'Kenya', label: '🇰🇪 Kenya' },
  { value: 'Nigeria', label: '🇳🇬 Nigeria' },
  { value: 'South Africa', label: '🇿🇦 South Africa' },
  
  // Latin America
  { value: 'Argentina', label: '🇦🇷 Argentina' },
  { value: 'Chile', label: '🇨🇱 Chile' },
  { value: 'Colombia', label: '🇨🇴 Colombia' },
  { value: 'Mexico', label: '🇲🇽 Mexico' }
]; // Already sorted with flags at the beginning

export const CUSTOMER_TYPE_OPTIONS = [
  { value: 'Corporate', label: 'Corporate' },
  { value: 'SME', label: 'SME' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'limited_liability', label: 'Limited Liability' },
  { value: 'joint_stock', label: 'Joint Stock' },
  { value: 'Retail Chain', label: 'Retail Chain' }
];

// Legal Forms mapping for OpenSanctions API
export const LEGAL_FORM_MAPPING: { [key: string]: string } = {
  // Limited Liability Company variations
  'Limited Liability Company': 'limited_liability',
  'Limited Liability': 'limited_liability',
  'LLC': 'limited_liability',
  'Ltd.': 'limited_liability',
  'L.L.C.': 'limited_liability',
  'Limited': 'limited_liability',
  'Private Limited Company': 'limited_liability',
  'Private Limited': 'limited_liability',
  
  // Joint Stock Companies
  'PJSC': 'joint_stock',
  'SJSC': 'joint_stock',
  'Joint Stock Company': 'joint_stock',
  'Public Joint Stock Company': 'joint_stock',
  'Saudi Joint Stock Company': 'joint_stock',
  'JSC': 'joint_stock',
  'Public Company': 'joint_stock',
  'Closed Joint Stock Company': 'joint_stock',
  'CJSC': 'joint_stock',
  
  // Sole Proprietorship
  'Sole Proprietorship': 'sole_proprietorship',
  'Individual': 'sole_proprietorship',
  'Sole Trader': 'sole_proprietorship',
  'Individual Entrepreneur': 'sole_proprietorship',
  
  // Corporate (catch-all for other types)
  'Corporation': 'Corporate',
  'Corp.': 'Corporate',
  'Inc.': 'Corporate',
  'Incorporated': 'Corporate',
  'Partnership': 'Corporate',
  'General Partnership': 'Corporate',
  'Limited Partnership': 'Corporate',
  'Company': 'Corporate'
};

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