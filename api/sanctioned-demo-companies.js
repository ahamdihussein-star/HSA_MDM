// ============================================================================
// SANCTIONED COMPANIES DATA - 18 Companies from OFAC Lists
// Used for generating demo data for companies under sanctions
// ============================================================================

const SANCTIONED_COMPANIES = [
  {
    "CompanyName": "SINOPER SHIPPING CO",
    "CompanyNameAr": "شركة سينوبر للشحن",
    "CustomerType": "Corporate",
    "Country": "United Arab Emirates",
    "City": "Dubai",
    "Building": "Office 2207, Prime Tower",
    "Street": "Business Bay",
    "OwnerName": "Saeed Al Mansoori",
    "MainActivity": "Shipping and marine logistics",
    "SanctionProgram": "Violating sanctions on Iranian oil trade",
    "SanctionReason": "Helped Iran transport oil using front companies",
    "SanctionStartDate": "2025-10-09",
    "RiskLevel": "High",
    "SourceList": "OFAC",
    "DatasetVersion": "October 2025 Update",
    "LastVerified": "2025-10-14",
    "Sector": "Shipping",
    "OpenSanctionsLink": "https://www.opensanctions.org/entities/ofac-55672/"
  },
  {
    "CompanyName": "SLOGAL ENERGY DMCC",
    "CompanyNameAr": "شركة سلوقال للطاقة",
    "CustomerType": "limited_liability",
    "Country": "United Arab Emirates",
    "City": "Dubai",
    "Building": "Jumeirah Bay X3 Tower",
    "Street": "JLT",
    "OwnerName": "Fatima Al Suwaidi",
    "MainActivity": "Energy and petrochemical trading",
    "SanctionProgram": "Involved in Iranian oil trade",
    "SanctionReason": "Assisted Iranian companies to sell petrochemicals secretly",
    "SanctionStartDate": "2025-10-09",
    "RiskLevel": "High",
    "SourceList": "OFAC",
    "DatasetVersion": "October 2025 Update",
    "LastVerified": "2025-10-14",
    "Sector": "Energy Trading",
    "OpenSanctionsLink": "https://www.opensanctions.org/entities/ofac-55721/"
  },
  {
    "CompanyName": "S E A SHIP MANAGEMENT LLC",
    "CompanyNameAr": "شركة سي إي إيه لإدارة السفن",
    "CustomerType": "limited_liability",
    "Country": "United Arab Emirates",
    "City": "Dubai",
    "Building": "Oxford Tower",
    "Street": "Business Bay",
    "OwnerName": "Hamad Al Nuaimi",
    "MainActivity": "Ship management",
    "SanctionProgram": "Supported Iranian shipping operations",
    "SanctionReason": "Managed vessels involved in Iranian oil transport",
    "SanctionStartDate": "2025-10-09",
    "RiskLevel": "High",
    "SourceList": "OFAC",
    "DatasetVersion": "October 2025 Update",
    "LastVerified": "2025-10-14",
    "Sector": "Maritime / Shipping",
    "OpenSanctionsLink": "https://www.opensanctions.org/entities/ofac-55633/"
  },
  {
    "CompanyName": "Arkan Mars Petroleum DMCC",
    "CompanyNameAr": "شركة أركان مارس للبترول",
    "CustomerType": "limited_liability",
    "Country": "United Arab Emirates",
    "City": "Dubai",
    "Building": "Dome Tower, Cluster N",
    "Street": "Jumeirah Lake Towers",
    "OwnerName": "Khalid Al Marri",
    "MainActivity": "Oil trading",
    "SanctionProgram": "Terrorism financing / Supporting Houthi rebels",
    "SanctionReason": "Helped transfer $12 million worth of Iranian oil to the Houthi group",
    "SanctionStartDate": "2025-06-20",
    "RiskLevel": "Very High",
    "SourceList": "OFAC",
    "DatasetVersion": "October 2025 Update",
    "LastVerified": "2025-10-14",
    "Sector": "Energy / Oil Trading",
    "OpenSanctionsLink": "https://www.opensanctions.org/entities/NK-bZhtJPyKJEYY7BmN2mqKmD/"
  },
  {
    "CompanyName": "GRAINS MIDDLE EAST TRADING DWC-LLC",
    "CompanyNameAr": "شركة الحبوب للتجارة الشرق الأوسط",
    "CustomerType": "limited_liability",
    "Country": "United Arab Emirates",
    "City": "Dubai",
    "Building": "BUILDING A3 OFFICE 213",
    "Street": "Dubai World Central Business Park",
    "OwnerName": "Abdulla Al Falasi",
    "MainActivity": "Food and grain trading",
    "SanctionProgram": "Linked to sanctioned Syrian business network",
    "SanctionReason": "Connected to companies that support the Syrian regime financially",
    "SanctionStartDate": "2025-06-30",
    "RiskLevel": "High",
    "SourceList": "OFAC",
    "DatasetVersion": "October 2025 Update",
    "LastVerified": "2025-10-14",
    "Sector": "Agriculture / Commodity Trading",
    "OpenSanctionsLink": "https://www.opensanctions.org/entities/NK-o8VasJ9pUxsVdhwQeB2b9P/"
  },
  {
    "CompanyName": "ABBOT TRADING CO., LTD.",
    "CompanyNameAr": "شركة أبوت للتجارة المحدودة",
    "CustomerType": "limited_liability",
    "Country": "Yemen",
    "City": "Sanaa",
    "Building": "RAND-1001",
    "Street": "ZAYID STREET, SHAUB DIRECTORATE",
    "OwnerName": "Yahya Al-Aghbari",
    "MainActivity": "General trading",
    "SanctionProgram": "Terrorism financing / Supporting Houthi rebels",
    "SanctionReason": "Provided financial and logistical support to the Houthi militia",
    "SanctionStartDate": "2025-06-20",
    "RiskLevel": "Very High",
    "SourceList": "OFAC",
    "DatasetVersion": "October 2025 Update",
    "LastVerified": "2025-10-14",
    "Sector": "General Trading",
    "OpenSanctionsLink": "https://www.opensanctions.org/entities/NK-gEYNHxptrEZnh8Wu3MA2Fu/"
  },
  {
    "CompanyName": "GASOLINE AMAN COMPANY FOR OIL DERIVATIVES IMPORTS",
    "CompanyNameAr": "شركة جاسولين أمان لاستيراد المشتقات النفطية",
    "CustomerType": "limited_liability",
    "Country": "Yemen",
    "City": "Sanaa",
    "Building": "RAND-1002",
    "Street": "Industrial zone, north Sanaa",
    "OwnerName": "Nabil Al-Qadhi",
    "MainActivity": "Fuel and oil imports",
    "SanctionProgram": "Terrorism financing / Supporting Houthi rebels",
    "SanctionReason": "Involved in fuel trade that funds the Houthi group",
    "SanctionStartDate": "2025-06-20",
    "RiskLevel": "Very High",
    "SourceList": "OFAC",
    "DatasetVersion": "October 2025 Update",
    "LastVerified": "2025-10-14",
    "Sector": "Energy / Fuel Trading",
    "OpenSanctionsLink": "https://www.opensanctions.org/entities/NK-gd6siGSUtsLSEUuFF6apnp/"
  },
  {
    "CompanyName": "BLACK DIAMOND PETROLEUM DERIVATIVES",
    "CompanyNameAr": "شركة بلاك دايموند للمشتقات النفطية",
    "CustomerType": "sole_proprietorship",
    "Country": "Yemen",
    "City": "Sanaa",
    "Building": "RAND-1003",
    "Street": "Al-Thawra District",
    "OwnerName": "Hussein Al-Mutawakel",
    "MainActivity": "Petroleum trading",
    "SanctionProgram": "Terrorism financing / Supporting Houthi rebels",
    "SanctionReason": "Used to channel oil sales revenue to the Houthi militia",
    "SanctionStartDate": "2025-06-20",
    "RiskLevel": "Very High",
    "SourceList": "OFAC",
    "DatasetVersion": "October 2025 Update",
    "LastVerified": "2025-10-14",
    "Sector": "Energy / Petroleum Trading",
    "OpenSanctionsLink": "https://www.opensanctions.org/entities/NK-htPhaUZ6zJWzDdvzUnaX8s/"
  },
  {
    "CompanyName": "STAR PLUS YEMEN TRADING LIMITED",
    "CompanyNameAr": "شركة ستار بلس اليمن للتجارة المحدودة",
    "CustomerType": "limited_liability",
    "Country": "Yemen",
    "City": "Sanaa",
    "Building": "7 Yulyu",
    "Street": "Al-Hudaydah, Al-Hudaydah Governorate",
    "OwnerName": "Samir Al-Hakimi",
    "MainActivity": "Import and export",
    "SanctionProgram": "Terrorism financing / Supporting Houthi rebels",
    "SanctionReason": "Engaged in trade operations generating money for the Houthi group",
    "SanctionStartDate": "2025-06-20",
    "RiskLevel": "Very High",
    "SourceList": "OFAC",
    "DatasetVersion": "October 2025 Update",
    "LastVerified": "2025-10-14",
    "Sector": "General Trading",
    "OpenSanctionsLink": "https://www.opensanctions.org/entities/NK-TKoWB7EdbHekxkkKZQdZWy/"
  },
  {
    "CompanyName": "TAMCO ESTABLISHMENT FOR OIL DERIVATIVES (TAMCO PETROLEUM)",
    "CompanyNameAr": "مؤسسة تامكو للمشتقات النفطية",
    "CustomerType": "sole_proprietorship",
    "Country": "Yemen",
    "City": "Sanaa",
    "Building": "RAND-1004",
    "Street": "Houthi-controlled areas",
    "OwnerName": "Fouad Al-Mashreqi",
    "MainActivity": "Oil trading",
    "SanctionProgram": "Terrorism financing / Supporting Houthi rebels",
    "SanctionReason": "Operates oil networks funding the Houthi group",
    "SanctionStartDate": "2025-06-20",
    "RiskLevel": "Very High",
    "SourceList": "OFAC",
    "DatasetVersion": "October 2025 Update",
    "LastVerified": "2025-10-14",
    "Sector": "Energy / Oil Trading",
    "OpenSanctionsLink": "https://www.opensanctions.org/entities/NK-TTmPT2bWFgoQY7oVRJSFKN/"
  },
  {
    "CompanyName": "YEMEN ELAPH PETROLEUM DERIVATIVES IMPORT",
    "CompanyNameAr": "شركة اليمن إيلاف لاستيراد المشتقات النفطية",
    "CustomerType": "sole_proprietorship",
    "Country": "Yemen",
    "City": "Sanaa",
    "Building": "RAND-1005",
    "Street": "Main business area, south Sanaa",
    "OwnerName": "Ammar Al-Saqqaf",
    "MainActivity": "Oil imports",
    "SanctionProgram": "Terrorism financing / Supporting Houthi rebels",
    "SanctionReason": "Facilitated oil imports from Iran to Yemen for the Houthi group",
    "SanctionStartDate": "2025-06-20",
    "RiskLevel": "Very High",
    "SourceList": "OFAC",
    "DatasetVersion": "October 2025 Update",
    "LastVerified": "2025-10-14",
    "Sector": "Energy / Oil Imports",
    "OpenSanctionsLink": "https://www.opensanctions.org/entities/NK-iYZxkFaPtTB2zoedzqF3Kg/"
  },
  {
    "CompanyName": "YAHYA AL-USAILI COMPANY FOR IMPORT LIMITED",
    "CompanyNameAr": "شركة يحيى العصيلي للاستيراد المحدودة",
    "CustomerType": "limited_liability",
    "Country": "Yemen",
    "City": "Hudaydah",
    "Building": "RAND-1006",
    "Street": "Coastal road area",
    "OwnerName": "Yahya Al-Usaili",
    "MainActivity": "General imports",
    "SanctionProgram": "Terrorism financing / Supporting Houthi rebels",
    "SanctionReason": "Operated import routes controlled by the Houthi militia",
    "SanctionStartDate": "2025-06-20",
    "RiskLevel": "Very High",
    "SourceList": "OFAC",
    "DatasetVersion": "October 2025 Update",
    "LastVerified": "2025-10-14",
    "Sector": "General Trading / Imports",
    "OpenSanctionsLink": "https://www.opensanctions.org/entities/NK-XhQXLNUrpBuVtvD6DwNvfe/"
  },
  {
    "CompanyName": "ROYAL PLUS SHIPPING SERVICES & COMMERCIAL AGENCIES",
    "CompanyNameAr": "رويال بلس للخدمات الشحن والوكالات التجارية",
    "CustomerType": "Corporate",
    "Country": "Yemen",
    "City": "Sanaa",
    "Building": "RAND-1007",
    "Street": "Airport Road",
    "OwnerName": "Adnan Al-Daraji",
    "MainActivity": "Shipping and logistics",
    "SanctionProgram": "Terrorism financing / Supporting Houthi rebels",
    "SanctionReason": "Handled logistics for Houthi-linked shipments",
    "SanctionStartDate": "2025-06-20",
    "RiskLevel": "Very High",
    "SourceList": "OFAC",
    "DatasetVersion": "October 2025 Update",
    "LastVerified": "2025-10-14",
    "Sector": "Shipping / Logistics",
    "OpenSanctionsLink": "https://www.opensanctions.org/entities/NK-Fny6q3WBZkBeAB6mBJVnyx/"
  },
  {
    "CompanyName": "ANDA COMPANY",
    "CompanyNameAr": "شركة عندا",
    "CustomerType": "Corporate",
    "Country": "Saudi Arabia",
    "City": "Riyadh",
    "Building": "RAND-1008",
    "Street": "King Fahd District",
    "OwnerName": "Abdulrahman Al-Qahtani",
    "MainActivity": "Construction and investments",
    "SanctionProgram": "Terrorism financing / Supporting Hamas",
    "SanctionReason": "Linked to Hamas financing operations",
    "SanctionStartDate": "2022-05-24",
    "RiskLevel": "Very High",
    "SourceList": "OFAC",
    "DatasetVersion": "October 2025 Update",
    "LastVerified": "2025-10-14",
    "Sector": "Construction / Investment",
    "OpenSanctionsLink": "https://www.opensanctions.org/entities/NK-d7MKUmNQEGmGpVxL6eqHAM/"
  },
  {
    "CompanyName": "AL-JABRI GENERAL TRADING & INVESTMENT CO",
    "CompanyNameAr": "شركة الجابري للتجارة العامة والاستثمار",
    "CustomerType": "sole_proprietorship",
    "Country": "Oman",
    "City": "Salalah",
    "Building": "RAND-1009",
    "Street": "Industrial area, Dhofar",
    "OwnerName": "Salim Al-Harthy",
    "MainActivity": "General trading",
    "SanctionProgram": "Terrorism financing / Supporting Houthi rebels",
    "SanctionReason": "Assisted in smuggling and procurement for Houthi operations",
    "SanctionStartDate": "2025-03-05",
    "RiskLevel": "Very High",
    "SourceList": "OFAC",
    "DatasetVersion": "October 2025 Update",
    "LastVerified": "2025-10-14",
    "Sector": "General Trading / Procurement",
    "OpenSanctionsLink": "https://www.opensanctions.org/entities/NK-cz2Rycc3RnYchJpgMAMtvX/"
  },
  {
    "CompanyName": "ALDAR PROPERTIES (Qatar entry)",
    "CompanyNameAr": "شركة الدار العقارية",
    "CustomerType": "Corporate",
    "Country": "Qatar",
    "City": "Doha",
    "Building": "RAND-1010",
    "Street": "Al-Jazira Street, Bin Mahmoud",
    "OwnerName": "Mohammed Al-Kaabi",
    "MainActivity": "Real estate",
    "SanctionProgram": "Linked to person under terrorism sanctions",
    "SanctionReason": "Connected to Sulaiman Al-Banai (listed for terrorism financing)",
    "SanctionStartDate": "2025-03-28",
    "RiskLevel": "Very High",
    "SourceList": "OFAC",
    "DatasetVersion": "October 2025 Update",
    "LastVerified": "2025-10-14",
    "Sector": "Real Estate",
    "OpenSanctionsLink": "https://www.opensanctions.org/entities/NK-i5qreCz3GJJNZpH2T33utp/"
  },
  {
    "CompanyName": "MASS COM GROUP GEN. TRADING & CONTRACTING CO. WLL",
    "CompanyNameAr": "مجموعة ماس كوم للتجارة العامة والمقاولات",
    "CustomerType": "limited_liability",
    "Country": "Kuwait",
    "City": "Kuwait City",
    "Building": "RAND-1011",
    "Street": "Fahd Al-Salim Street, Hawally",
    "OwnerName": "Faisal Al-Mutairi",
    "MainActivity": "General trading and contracting",
    "SanctionProgram": "Terrorism financing / Secondary sanctions risk",
    "SanctionReason": "Connected to suspicious cross-border money transfers",
    "SanctionStartDate": "2025-10-09",
    "RiskLevel": "Very High",
    "SourceList": "OFAC",
    "DatasetVersion": "October 2025 Update",
    "LastVerified": "2025-10-14",
    "Sector": "Trading / Contracting",
    "OpenSanctionsLink": "https://www.opensanctions.org/entities/NK-LoaK6ue5Wfw5AiPZdvakdX/"
  },
  {
    "CompanyName": "FUTURE BANK B.S.C.",
    "CompanyNameAr": "بنك المستقبل",
    "CustomerType": "joint_stock",
    "Country": "Bahrain",
    "City": "Manama",
    "Building": "RAND-1012",
    "Street": "Al-Seef District",
    "OwnerName": "Hassan Al-Mahmood",
    "MainActivity": "Banking and finance",
    "SanctionProgram": "Linked to Iranian government banks",
    "SanctionReason": "Bank controlled by Iran's Bank Melli and Bank Saderat",
    "SanctionStartDate": "Ongoing",
    "RiskLevel": "High",
    "SourceList": "OFAC",
    "DatasetVersion": "October 2025 Update",
    "LastVerified": "2025-10-14",
    "Sector": "Banking / Financial Services",
    "OpenSanctionsLink": "https://www.opensanctions.org/entities/NK-ZJD8wdqYXbBKzS42rsyapL/"
  },
  {
    "CompanyName": "GOOD LAND COMPANY (Ard Al-Khair)",
    "CompanyNameAr": "شركة أرض الخير",
    "CustomerType": "limited_liability",
    "Country": "Egypt",
    "City": "Cairo",
    "Building": "RAND-1013",
    "Street": "Nasr City business area",
    "OwnerName": "Hossam El-Masry",
    "MainActivity": "Food and beverage trading",
    "SanctionProgram": "Linked to Syrian business network under sanctions",
    "SanctionReason": "Operates within a network that launders money for the Syrian regime",
    "SanctionStartDate": "2025-06-30",
    "RiskLevel": "High",
    "SourceList": "OFAC",
    "DatasetVersion": "October 2025 Update",
    "LastVerified": "2025-10-14",
    "Sector": "Food & Beverage / Wholesale",
    "OpenSanctionsLink": "https://www.opensanctions.org/entities/NK-WLWjRJsGZKWavUcLTdGYhb/"
  }
];

// Tax number prefixes for each country
const TAX_PREFIXES = {
  'Egypt': '200',
  'Saudi Arabia': '300',
  'United Arab Emirates': '400',
  'Yemen': '500',
  'Kuwait': '600',
  'Qatar': '700',
  'Bahrain': '800',
  'Oman': '900'
};

// Sales org mapping for each country
const SALES_ORG_MAPPING = {
  'Egypt': ['egypt_cairo_office', 'egypt_alexandria_branch', 'egypt_giza_branch'],
  'Saudi Arabia': ['ksa_riyadh_office', 'ksa_jeddah_branch', 'ksa_dammam_branch'],
  'United Arab Emirates': ['uae_dubai_office', 'uae_abu_dhabi_branch', 'uae_sharjah_branch'],
  'Yemen': ['yemen_main_office', 'yemen_aden_branch', 'yemen_taiz_branch'],
  'Kuwait': ['kuwait_main_office', 'kuwait_hawalli_branch'],
  'Qatar': ['qatar_doha_office', 'qatar_industrial_area_branch'],
  'Bahrain': ['bahrain_manama_office', 'bahrain_muharraq_branch'],
  'Oman': ['oman_muscat_office', 'oman_salalah_branch']
};

const DISTRIBUTION_CHANNELS = [
  'direct_sales',
  'authorized_distributors',
  'retail_chains',
  'wholesale_partners',
  'ecommerce_platform',
  'business_to_business'
];

const DIVISIONS = [
  'energy_products',
  'shipping_logistics',
  'general_trading',
  'financial_services',
  'real_estate',
  'construction',
  'food_beverage'
];

// Contact names by country
const CONTACT_NAMES = {
  'Egypt': ['Ahmed Hassan', 'Fatma Ali', 'Omar Mahmoud', 'Layla Ibrahim', 'Khaled Saeed', 'Heba Nasser'],
  'Saudi Arabia': ['Mohammed Al-Rashid', 'Noura Al-Qahtani', 'Fahad Al-Mutairi', 'Sara Al-Saud'],
  'United Arab Emirates': ['Rashid Al-Maktoum', 'Maryam Al-Falasi', 'Sultan Al-Qasimi', 'Latifa Al-Sharqi', 'Ahmed Al-Marri', 'Hind Al-Nuaimi'],
  'Yemen': ['Abdullah Al-Ahmar', 'Samira Al-Houthi', 'Saleh Al-Sammad', 'Nadia Al-Yemeni', 'Hayel Anam', 'Fatima Al-Awlaki'],
  'Kuwait': ['Jaber Al-Ahmad', 'Hessa Al-Salem', 'Nasser Al-Mohammed', 'Sheikha Al-Kabeer'],
  'Qatar': ['Hamad Al-Thani', 'Moza Al-Attiyah', 'Tamim Al-Mahmoud', 'Jawaher Al-Kuwari'],
  'Bahrain': ['Hamad Al-Khalifa', 'Noora Al-Zayani', 'Khalifa Al-Moayyed', 'Haya Jawad'],
  'Oman': ['Haitham Al-Said', 'Thuraya Al-Barwani', 'Fahd Al-Zawawi', 'Nawal Bahwan']
};

const JOB_TITLES = [
  'Chief Executive Officer',
  'Chief Financial Officer',
  'Operations Manager',
  'Compliance Officer',
  'Business Development Manager',
  'Legal Counsel'
];

// Generate email from name
function generateEmail(name, companyName) {
  const firstName = name.split(' ')[0].toLowerCase();
  const domain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15);
  return `${firstName}@${domain}.com`;
}

// Generate phone number by country
function generatePhone(country, index) {
  const phonePrefixes = {
    'Egypt': '+20 10',
    'Saudi Arabia': '+966 50',
    'United Arab Emirates': '+971 50',
    'Yemen': '+967 77',
    'Kuwait': '+965 9',
    'Qatar': '+974 3',
    'Bahrain': '+973 3',
    'Oman': '+968 9'
  };
  
  const prefix = phonePrefixes[country] || '+971 50';
  const number = String(1000000 + index * 123456).substring(0, 7);
  return `${prefix} ${number}`;
}

// Generate landline by country
function generateLandline(country, index) {
  const landlinePrefixes = {
    'Egypt': '+20 2',
    'Saudi Arabia': '+966 11',
    'United Arab Emirates': '+971 4',
    'Yemen': '+967 1',
    'Kuwait': '+965 2',
    'Qatar': '+974 4',
    'Bahrain': '+973 17',
    'Oman': '+968 24'
  };
  
  const prefix = landlinePrefixes[country] || '+971 4';
  const number = String(3000000 + index * 234567).substring(0, 7);
  return `${prefix} ${number}`;
}

// Generate 4 contacts for a company
function generateContacts(country, companyName, startIndex) {
  const contacts = [];
  const names = CONTACT_NAMES[country] || CONTACT_NAMES['United Arab Emirates'];
  
  for (let i = 0; i < 4; i++) {
    const name = names[(startIndex + i) % names.length];
    const jobTitle = JOB_TITLES[i % JOB_TITLES.length];
    const email = generateEmail(name, companyName);
    const mobile = generatePhone(country, startIndex * 10 + i);
    const landline = generateLandline(country, startIndex * 10 + i);
    const preferredLanguage = (country === 'Egypt' || country === 'Saudi Arabia' || country === 'Yemen') ? 'Arabic' : 'English';
    
    contacts.push({
      name,
      jobTitle,
      email,
      mobile,
      landline,
      preferredLanguage
    });
  }
  
  return contacts;
}

// Generate tax number
function generateTaxNumber(country, index) {
  const prefix = TAX_PREFIXES[country] || '100';
  // Use 900 series for sanctioned companies to differentiate
  const sanctionPrefix = '9';
  return `${prefix}${sanctionPrefix}${String(index + 1).padStart(11, '0')}`;
}

/**
 * Get all sanctioned companies with full details
 */
function getAllSanctionedCompanies() {
  return SANCTIONED_COMPANIES.map((company, index) => {
    const country = company.Country;
    const salesOrgs = SALES_ORG_MAPPING[country] || SALES_ORG_MAPPING['United Arab Emirates'];
    
    return {
      id: `sanctioned_${index + 1}`,
      name: company.CompanyName,
      nameAr: company.CompanyNameAr,
      customerType: company.CustomerType,
      ownerName: company.OwnerName,
      taxNumber: generateTaxNumber(country, index),
      buildingNumber: company.Building,
      street: company.Street,
      country: country,
      city: company.City,
      industry: company.MainActivity,
      sector: company.Sector,
      salesOrg: salesOrgs[index % salesOrgs.length],
      distributionChannel: DISTRIBUTION_CHANNELS[index % DISTRIBUTION_CHANNELS.length],
      division: DIVISIONS[index % DIVISIONS.length],
      source: 'OFAC Sanctions List',
      
      // Sanction-specific fields
      sanctionProgram: company.SanctionProgram,
      sanctionReason: company.SanctionReason,
      sanctionStartDate: company.SanctionStartDate,
      riskLevel: company.RiskLevel,
      sourceList: company.SourceList,
      datasetVersion: company.DatasetVersion,
      lastVerified: company.LastVerified,
      openSanctionsLink: company.OpenSanctionsLink,
      
      // Generate 4 contacts
      contacts: generateContacts(country, company.CompanyName, index)
    };
  });
}

/**
 * Get sanctioned companies by country
 */
function getSanctionedCompaniesByCountry(country) {
  const allCompanies = getAllSanctionedCompanies();
  return allCompanies.filter(c => c.country === country);
}

/**
 * Get sanctioned companies by risk level
 */
function getSanctionedCompaniesByRiskLevel(riskLevel) {
  const allCompanies = getAllSanctionedCompanies();
  return allCompanies.filter(c => c.riskLevel === riskLevel);
}

/**
 * Get statistics about sanctioned companies
 */
function getSanctionedCompaniesStatistics() {
  const allCompanies = getAllSanctionedCompanies();
  
  const countByCountry = {};
  const countByRiskLevel = {};
  const countBySector = {};
  
  allCompanies.forEach(company => {
    // By country
    countByCountry[company.country] = (countByCountry[company.country] || 0) + 1;
    
    // By risk level
    countByRiskLevel[company.riskLevel] = (countByRiskLevel[company.riskLevel] || 0) + 1;
    
    // By sector
    countBySector[company.sector] = (countBySector[company.sector] || 0) + 1;
  });
  
  return {
    total: allCompanies.length,
    byCountry: countByCountry,
    byRiskLevel: countByRiskLevel,
    bySector: countBySector
  };
}

// Export functions
module.exports = {
  SANCTIONED_COMPANIES,
  getAllSanctionedCompanies,
  getSanctionedCompaniesByCountry,
  getSanctionedCompaniesByRiskLevel,
  getSanctionedCompaniesStatistics
};

