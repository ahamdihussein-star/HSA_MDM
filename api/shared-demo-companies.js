// ============================================================================
// SHARED DEMO COMPANIES DATA - 70 Companies (10 per country × 7 countries)
// Used by both Frontend and Backend for consistent demo data generation
// ============================================================================

const MASTER_COMPANY_DATA = {
  'Egypt': [
    { name: 'Juhayna Food Industries', nameAr: 'جهينة للصناعات الغذائية', industry: 'Food & Beverage', type: 'Corporate' },
    { name: 'Edita Food Industries', nameAr: 'إيديتا للصناعات الغذائية', industry: 'Food & Beverage', type: 'Corporate' },
    { name: 'Domty', nameAr: 'دومتي', industry: 'Dairy Products', type: 'Corporate' },
    { name: 'Cairo Poultry', nameAr: 'القاهرة للدواجن', industry: 'Poultry', type: 'SME' },
    { name: 'Wadi Food', nameAr: 'وادي فوود', industry: 'Food Processing', type: 'SME' },
    { name: 'Beyti', nameAr: 'بيتي', industry: 'Juice & Beverages', type: 'SME' },
    { name: 'Farm Frites Egypt', nameAr: 'فارم فرايتس مصر', industry: 'Frozen Food', type: 'limited_liability' },
    { name: 'Americana Foods', nameAr: 'أمريكانا للأغذية', industry: 'Food & Snacks', type: 'joint_stock' },
    { name: 'Carrefour Egypt', nameAr: 'كارفور مصر', industry: 'Retail', type: 'Retail Chain' },
    { name: 'Spinneys Egypt', nameAr: 'سبينيس مصر', industry: 'Retail', type: 'Retail Chain' }
  ],
  'Saudi Arabia': [
    { name: 'Almarai', nameAr: 'المراعي', industry: 'Dairy & Food', type: 'joint_stock' },
    { name: 'Saudia Dairy & Foodstuff', nameAr: 'سدافكو', industry: 'Dairy', type: 'joint_stock' },
    { name: 'Al Safi Danone', nameAr: 'الصافي دانون', industry: 'Dairy', type: 'limited_liability' },
    { name: 'Nadec', nameAr: 'نادك', industry: 'Agriculture & Food', type: 'joint_stock' },
    { name: 'Savola Group', nameAr: 'مجموعة صافولا', industry: 'Food & Retail', type: 'Corporate' },
    { name: 'Herfy Food Services', nameAr: 'هرفي للخدمات الغذائية', industry: 'Fast Food', type: 'joint_stock' },
    { name: 'Halwani Bros', nameAr: 'إخوان حلواني', industry: 'Food Processing', type: 'limited_liability' },
    { name: 'Al Kabeer', nameAr: 'الكبير', industry: 'Frozen Food', type: 'SME' },
    { name: 'Sunbulah Group', nameAr: 'مجموعة سنبلة', industry: 'Frozen Food', type: 'SME' },
    { name: 'Panda Retail', nameAr: 'بنده للتجزئة', industry: 'Retail', type: 'Retail Chain' }
  ],
  'United Arab Emirates': [
    { name: 'Al Ain Farms', nameAr: 'مزارع العين', industry: 'Fresh Produce', type: 'limited_liability' },
    { name: 'National Food Products', nameAr: 'الشركة الوطنية للمنتجات الغذائية', industry: 'Food Manufacturing', type: 'joint_stock' },
    { name: 'Al Islami Foods', nameAr: 'الإسلامي للأغذية', industry: 'Halal Food', type: 'limited_liability' },
    { name: 'Emirates Snack Foods', nameAr: 'الإمارات للوجبات الخفيفة', industry: 'Snacks', type: 'SME' },
    { name: 'Agthia Group', nameAr: 'مجموعة أغذية', industry: 'Food & Beverages', type: 'Corporate' },
    { name: 'IFFCO', nameAr: 'إيفكو', industry: 'Oils & Food', type: 'Corporate' },
    { name: 'Al Rawdah Dairy', nameAr: 'ألبان الروضة', industry: 'Dairy', type: 'SME' },
    { name: 'Barakah Dates', nameAr: 'تمور بركة', industry: 'Dates & Fruits', type: 'sole_proprietorship' },
    { name: 'Hunter Foods', nameAr: 'هنتر فودز', industry: 'Meat Processing', type: 'limited_liability' },
    { name: 'Al Khaleej Sugar', nameAr: 'سكر الخليج', industry: 'Sugar Refinery', type: 'joint_stock' }
  ],
  'Yemen': [
    { name: 'Yemen Soft Drinks', nameAr: 'اليمن للمشروبات الغازية', industry: 'Beverages', type: 'limited_liability' },
    { name: 'Hayel Saeed Anam Group', nameAr: 'مجموعة هائل سعيد أنعم', industry: 'Trading & Food', type: 'Corporate' },
    { name: 'Yemen Dairy Factory', nameAr: 'مصنع اليمن للألبان', industry: 'Dairy', type: 'SME' },
    { name: 'Sanaa Flour Mills', nameAr: 'مطاحن صنعاء', industry: 'Flour & Grains', type: 'joint_stock' },
    { name: 'Al-Saeed Trading', nameAr: 'السعيد للتجارة', industry: 'Food Trading', type: 'limited_liability' },
    { name: 'Yemen Food Industries', nameAr: 'اليمن للصناعات الغذائية', industry: 'Food Processing', type: 'SME' },
    { name: 'Taiz Food Company', nameAr: 'شركة تعز للأغذية', industry: 'Food Distribution', type: 'SME' },
    { name: 'Aden Refinery Company', nameAr: 'شركة مصافي عدن', industry: 'Oil & Food', type: 'joint_stock' },
    { name: 'Hodeidah Mills', nameAr: 'مطاحن الحديدة', industry: 'Flour Mills', type: 'limited_liability' },
    { name: 'Al-Rowad Food Co', nameAr: 'شركة الرواد للأغذية', industry: 'Food Import', type: 'SME' }
  ],
  'Kuwait': [
    { name: 'Kuwait Flour Mills', nameAr: 'مطاحن الكويت', industry: 'Flour & Bakery', type: 'joint_stock' },
    { name: 'Kuwait Food Company', nameAr: 'شركة الكويت للأغذية', industry: 'Food & Restaurant', type: 'Corporate' },
    { name: 'Al Yasra Foods', nameAr: 'أغذية اليسرة', industry: 'Food Trading', type: 'SME' },
    { name: 'Kout Food Group', nameAr: 'مجموعة كوت الغذائية', industry: 'Restaurants', type: 'Corporate' },
    { name: 'Kuwait Danish Dairy', nameAr: 'الألبان الدنماركية الكويتية', industry: 'Dairy', type: 'limited_liability' },
    { name: 'Al Wazzan Foods', nameAr: 'الوزان للأغذية', industry: 'Food Import', type: 'SME' },
    { name: 'Safat Dairy', nameAr: 'ألبان الصفاة', industry: 'Dairy Products', type: 'SME' },
    { name: 'Kuwait Protein Company', nameAr: 'الشركة الكويتية للبروتين', industry: 'Meat & Poultry', type: 'joint_stock' },
    { name: 'Al Durraq Food', nameAr: 'الدراق للأغذية', industry: 'Food Processing', type: 'SME' },
    { name: 'Mezzan Holding', nameAr: 'شركة مزن القابضة', industry: 'Food & Beverages', type: 'Corporate' }
  ],
  'Qatar': [
    { name: 'Qatar National Food Company', nameAr: 'الشركة القطرية الوطنية للأغذية', industry: 'Food Manufacturing', type: 'joint_stock' },
    { name: 'Baladna', nameAr: 'بلدنا', industry: 'Dairy', type: 'Corporate' },
    { name: 'Zulal Oasis', nameAr: 'واحة زلال', industry: 'Water & Beverages', type: 'limited_liability' },
    { name: 'Qatar Flour Mills', nameAr: 'مطاحن قطر', industry: 'Flour & Bakery', type: 'joint_stock' },
    { name: 'Al Meera Consumer Goods', nameAr: 'الميرة للسلع الاستهلاكية', industry: 'Retail & Food', type: 'Corporate' },
    { name: 'Widam Food Company', nameAr: 'شركة ودام الغذائية', industry: 'Meat Processing', type: 'limited_liability' },
    { name: 'Qatar Poultry', nameAr: 'الدواجن القطرية', industry: 'Poultry', type: 'SME' },
    { name: 'Senyar Industries', nameAr: 'صناعات سنيار', industry: 'Food Processing', type: 'SME' },
    { name: 'Al Watania Dairy', nameAr: 'ألبان الوطنية', industry: 'Dairy Products', type: 'limited_liability' },
    { name: 'Qatar Food Industries', nameAr: 'قطر للصناعات الغذائية', industry: 'Food Manufacturing', type: 'Corporate' }
  ],
  'Bahrain': [
    { name: 'Bahrain Flour Mills', nameAr: 'مطاحن البحرين', industry: 'Flour & Bakery', type: 'joint_stock' },
    { name: 'Awal Dairy Company', nameAr: 'شركة أوال للألبان', industry: 'Dairy', type: 'limited_liability' },
    { name: 'Trafco Group', nameAr: 'مجموعة ترافكو', industry: 'Food Trading', type: 'Corporate' },
    { name: 'Bahrain Food Import', nameAr: 'البحرين لاستيراد الأغذية', industry: 'Food Import', type: 'SME' },
    { name: 'Al Zain Dairy', nameAr: 'ألبان الزين', industry: 'Dairy Products', type: 'SME' },
    { name: 'Delmon Poultry', nameAr: 'دواجن دلمون', industry: 'Poultry', type: 'limited_liability' },
    { name: 'Bahrain Fresh Fruits', nameAr: 'البحرين للفواكه الطازجة', industry: 'Fresh Produce', type: 'sole_proprietorship' },
    { name: 'Al Jazira Food', nameAr: 'أغذية الجزيرة', industry: 'Food Distribution', type: 'SME' },
    { name: 'Manazel Food Company', nameAr: 'شركة منازل للأغذية', industry: 'Food Processing', type: 'limited_liability' },
    { name: 'Bahrain Beverages', nameAr: 'مشروبات البحرين', industry: 'Beverages', type: 'SME' }
  ],
  'Oman': [
    { name: 'Oman Flour Mills', nameAr: 'مطاحن عمان', industry: 'Flour & Bakery', type: 'joint_stock' },
    { name: 'A\'Saffa Foods', nameAr: 'أغذية الصفاء', industry: 'Poultry & Food', type: 'Corporate' },
    { name: 'Oman Refreshment Company', nameAr: 'الشركة العمانية للمرطبات', industry: 'Beverages', type: 'joint_stock' },
    { name: 'National Mineral Water', nameAr: 'المياه المعدنية الوطنية', industry: 'Water & Beverages', type: 'Corporate' },
    { name: 'Al Maha Dairy', nameAr: 'ألبان المها', industry: 'Dairy', type: 'limited_liability' },
    { name: 'Sweets of Oman', nameAr: 'حلويات عمان', industry: 'Confectionery', type: 'SME' },
    { name: 'Dhofar Beverages', nameAr: 'مشروبات ظفار', industry: 'Beverages', type: 'SME' },
    { name: 'Sohar Poultry', nameAr: 'دواجن صحار', industry: 'Poultry', type: 'limited_liability' },
    { name: 'Areej Vegetable Oils', nameAr: 'زيوت أريج النباتية', industry: 'Oils & Fats', type: 'limited_liability' },
    { name: 'Oman Foodstuff Factory', nameAr: 'مصنع عمان للمواد الغذائية', industry: 'Food Processing', type: 'Corporate' }
  ]
};

const CITY_MAPPINGS = {
  'Egypt': ['Cairo', 'Alexandria', 'Giza', 'Luxor'],
  'Saudi Arabia': ['Riyadh', 'Jeddah', 'Mecca', 'Dammam'],
  'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman'],
  'Yemen': ['Sanaa', 'Aden', 'Taiz'],
  'Kuwait': ['Kuwait City', 'Hawalli', 'Farwaniya'],
  'Qatar': ['Doha', 'Al Wakrah', 'Al Rayyan'],
  'Bahrain': ['Manama', 'Muharraq', 'Riffa'],
  'Oman': ['Muscat', 'Salalah', 'Sohar']
};

const OWNER_NAMES = {
  'Egypt': ['Ahmed Hassan', 'Mohamed Ali', 'Khaled Ibrahim', 'Omar Farouk', 'Yasser Mahmoud', 'Safwan Thabet', 'Hassan Allam', 'Naguib Sawiris', 'Hisham Talaat', 'Mahmoud El-Khatib'],
  'Saudi Arabia': ['Abdullah Al-Rashid', 'Mohammed Al-Qahtani', 'Khalid Al-Saud', 'Fahad Al-Mutairi', 'Saud Al-Dosari', 'Majed Al-Qasabi', 'Sulaiman Al-Rajhi', 'Abdullah Al-Othaim', 'Fawaz Al-Hokair', 'Mohammed Al-Amoudi'],
  'United Arab Emirates': ['Sheikh Mohammed', 'Rashid Al-Maktoum', 'Hamdan Al-Nahyan', 'Sultan Al-Qasimi', 'Ahmed Al-Sharqi', 'Majid Al Futtaim', 'Abdullah Al Ghurair', 'Saif Al Ghurair', 'Hussain Sajwani', 'Mohamed Alabbar'],
  'Yemen': ['Abdullah Al-Ahmar', 'Ali Al-Houthi', 'Saleh Al-Sammad', 'Abdo Rabbo', 'Ahmed Al-Yemeni', 'Hayel Saeed Anam', 'Mohammed Al-Awlaki', 'Abdul Aziz Al-Hadrami', 'Salem Al-Eryani', 'Ahmed Al-Sanabani'],
  'Kuwait': ['Jaber Al-Ahmad', 'Sabah Al-Salem', 'Nasser Al-Mohammed', 'Mubarak Al-Kabeer', 'Ahmad Al-Jaber', 'Mohammed Al-Shaya', 'Bader Al-Kharafi', 'Fawzi Al-Sultan', 'Kutayba Al-Ghanim', 'Bassam Al-Sayer'],
  'Qatar': ['Hamad Al-Thani', 'Tamim Al-Thani', 'Abdullah Al-Attiyah', 'Khalid Al-Attiyah', 'Mohammed Al-Thani', 'Hassan Al-Thani', 'Faisal Al-Thani', 'Abdulla Al-Mahmoud', 'Ali Al-Kuwari', 'Nasser Al-Suwaidi'],
  'Bahrain': ['Hamad Al-Khalifa', 'Salman Al-Khalifa', 'Khalifa Al-Khalifa', 'Abdullah Al-Khalifa', 'Mohammed Al-Khalifa', 'Yousif Al-Zayani', 'Farouk Al-Moayyed', 'Ahmed Jawad', 'Ebrahim Dawood', 'Khalid Al-Amin'],
  'Oman': ['Haitham Al-Said', 'Fahd Al-Said', 'Assad Al-Said', 'Shihab Al-Said', 'Tareq Al-Said', 'Mohammed Al-Barwani', 'Omar Al-Zawawi', 'Suhail Bahwan', 'Ali Al-Lawati', 'Ahmed Al-Busaidi']
};

const SALES_ORG_MAPPING = {
  'Egypt': ['egypt_cairo_office', 'egypt_alexandria_branch', 'egypt_giza_branch', 'egypt_upper_egypt_branch'],
  'Saudi Arabia': ['ksa_riyadh_office', 'ksa_jeddah_branch', 'ksa_dammam_branch', 'ksa_makkah_branch'],
  'United Arab Emirates': ['uae_dubai_office', 'uae_abu_dhabi_branch', 'uae_sharjah_branch', 'uae_ajman_branch'],
  'Yemen': ['yemen_main_office', 'yemen_aden_branch', 'yemen_taiz_branch', 'yemen_hodeidah_branch'],
  'Kuwait': ['kuwait_main_office', 'kuwait_hawalli_branch', 'kuwait_farwaniya_branch'],
  'Qatar': ['qatar_doha_office', 'qatar_industrial_area_branch'],
  'Bahrain': ['bahrain_manama_office', 'bahrain_muharraq_branch'],
  'Oman': ['oman_muscat_office', 'oman_salalah_branch', 'oman_sohar_branch']
};

const DISTRIBUTION_CHANNELS = ['direct_sales', 'authorized_distributors', 'retail_chains', 'wholesale_partners', 'ecommerce_platform', 'business_to_business', 'hospitality_sector', 'export_partners', 'government_contracts', 'institutional_sales'];

const DIVISIONS = ['food_products', 'beverages', 'dairy_products', 'biscuits_confectionery', 'pasta_wheat_products', 'cooking_oils_fats', 'detergents_cleaning', 'personal_care', 'industrial_supplies', 'packaging_materials'];

// Company Pool (to prevent duplication)
let companyPool = {
  all: [],
  available: [],
  quarantine: [],
  duplicate: [],
  complete: []
};

/**
 * Initialize company pool with all 70 companies
 */
function initializeCompanyPool() {
  const allCompanies = [];
  let globalIndex = 0;

  Object.entries(MASTER_COMPANY_DATA).forEach(([country, companies]) => {
    const cities = CITY_MAPPINGS[country] || [];
    const owners = OWNER_NAMES[country] || [];
    const salesOrgs = SALES_ORG_MAPPING[country] || [];

    companies.forEach((company, index) => {
      const city = cities[index % cities.length];
      const owner = owners[index % owners.length];
      const salesOrg = salesOrgs[index % salesOrgs.length];

      allCompanies.push({
        id: `${country.toLowerCase().replace(/\s+/g, '_')}_${index + 1}`,
        name: company.name,
        nameAr: company.nameAr,
        customerType: company.type,
        ownerName: owner,
        taxNumber: generateTaxNumber(country, index + 1),
        buildingNumber: `${1000 + index}`,
        street: generateStreet(city, index),
        country: country,
        city: city,
        industry: company.industry,
        salesOrg: salesOrg,
        distributionChannel: DISTRIBUTION_CHANNELS[index % DISTRIBUTION_CHANNELS.length],
        division: DIVISIONS[globalIndex % DIVISIONS.length],
        source: ['Oracle Forms', 'SAP S/4HANA', 'SAP ByDesign'][index % 3]
      });

      globalIndex++;
    });
  });

  companyPool.all = allCompanies;
  companyPool.available = [...allCompanies];

  console.log(`✅ [POOL] Initialized with ${allCompanies.length} companies across ${Object.keys(MASTER_COMPANY_DATA).length} countries`);
  return allCompanies;
}

/**
 * Get companies for specific use case
 */
function getCompaniesForUseCase(useCase, count) {
  if (companyPool.all.length === 0) {
    initializeCompanyPool();
  }

  const selectedCompanies = [];

  // Ensure we have enough available companies
  if (companyPool.available.length < count) {
    console.warn(`⚠️ [POOL] Not enough available companies (${companyPool.available.length}). Requested: ${count}. Resetting pool.`);
    companyPool.available = [...companyPool.all];
  }

  // Select companies from available pool
  for (let i = 0; i < count && companyPool.available.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * companyPool.available.length);
    const company = companyPool.available.splice(randomIndex, 1)[0];
    
    company.usedIn = useCase;
    selectedCompanies.push(company);
    companyPool[useCase].push(company);
  }

  console.log(`📊 [POOL] Selected ${selectedCompanies.length} companies for ${useCase}. Remaining: ${companyPool.available.length}`);
  return selectedCompanies;
}

/**
 * Generate tax number for a country
 */
function generateTaxNumber(country, index) {
  const countryPrefixes = {
    'Egypt': '200',
    'Saudi Arabia': '300',
    'United Arab Emirates': '400',
    'Yemen': '500',
    'Kuwait': '600',
    'Qatar': '700',
    'Bahrain': '800',
    'Oman': '900'
  };

  const prefix = countryPrefixes[country] || '100';
  return `${prefix}${String(index).padStart(12, '0')}`;
}

/**
 * Generate street name
 */
function generateStreet(city, index) {
  const streetTypes = ['Street', 'Avenue', 'Road', 'Boulevard'];
  const streetNames = ['King Abdulaziz', 'Sheikh Zayed', 'Industrial', 'Corniche', 'Al Manara', 'Main', 'Central', 'Business'];
  
  return `${streetNames[index % streetNames.length]} ${streetTypes[index % streetTypes.length]}, ${city}`;
}

/**
 * Vary company name for duplicate variations
 */
function varyCompanyName(originalName, variation) {
  const suffixes = ['', ' Co.', ' LLC', ' Ltd.', ' Trading', ' International', ' Group'];
  return `${originalName}${suffixes[variation % suffixes.length]}`;
}

/**
 * Generate quarantine data
 */
function generateQuarantineData(count = 40) {
  const baseCompanyCount = Math.ceil(count / 4);
  const companies = getCompaniesForUseCase('quarantine', baseCompanyCount);
  const quarantineRecords = [];

  companies.forEach((company, index) => {
    // Create 4 variants per company with missing data
    for (let variant = 0; variant < 4; variant++) {
      const record = { ...company };
      
      // Remove different fields for each variant
      if (variant === 0) {
        delete record.street;
        delete record.buildingNumber;
      }
      if (variant === 1) {
        delete record.city;
      }
      if (variant === 2) {
        delete record.buildingNumber;
      }
      if (variant === 3) {
        delete record.street;
      }
      
      // Make tax number unique
      record.taxNumber = `${company.taxNumber}_V${variant}`;
      record.status = 'Quarantine';
      record.assignedTo = 'data_entry';
      record.rejectReason = `Incomplete record - missing ${variant === 0 ? 'address details' : variant === 1 ? 'city' : variant === 2 ? 'building number' : 'street'}`;
      record.confidence = 60 + Math.random() * 20;
      
      quarantineRecords.push(record);
    }
  });

  console.log(`📊 [QUARANTINE] Generated ${quarantineRecords.length} records from ${companies.length} base companies`);
  return quarantineRecords;
}

/**
 * Generate duplicate groups
 */
function generateDuplicateGroups(groupCount = 20) {
  const companies = getCompaniesForUseCase('duplicate', groupCount);
  const duplicateRecords = [];

  companies.forEach((company, groupIndex) => {
    const groupSize = [2, 3, 4][groupIndex % 3];
    const sharedTax = company.taxNumber;
    const masterId = `master_${Date.now()}_${groupIndex}`;

    for (let i = 0; i < groupSize; i++) {
      const record = { ...company };
      
      // First record = master
      if (i === 0) {
        record.isMaster = 1;
        record.status = 'Duplicate';
        record.taxNumber = sharedTax; // Keep original tax number
      } 
      // All other records = duplicates with same tax number but name variations
      else {
        record.name = varyCompanyName(company.name, i);
        record.nameAr = varyCompanyName(company.nameAr, i);
        record.status = 'Duplicate'; // Changed from 'Linked' to 'Duplicate'
        record.isMaster = 0;
        record.taxNumber = sharedTax; // Same tax number for all in group
      }

      record.masterId = masterId;
      record.confidence = 85 + Math.random() * 10;
      
      duplicateRecords.push(record);
    }
  });

  console.log(`📊 [DUPLICATES] Generated ${duplicateRecords.length} records in ${groupCount} groups`);
  return duplicateRecords;
}

/**
 * Reset pool for a specific category
 */
function resetPoolForCategory(category) {
  const usedCompanies = companyPool[category];
  companyPool.available.push(...usedCompanies);
  companyPool[category] = [];
  console.log(`🔄 [POOL] Reset category: ${category}`);
}

/**
 * Get all companies
 */
function getAllCompanies() {
  if (companyPool.all.length === 0) {
    initializeCompanyPool();
  }
  return companyPool.all;
}

/**
 * Get companies by country
 */
function getCompaniesByCountry(country) {
  if (companyPool.all.length === 0) {
    initializeCompanyPool();
  }
  return companyPool.all.filter(c => c.country === country);
}

/**
 * Get pool statistics
 */
function getPoolStatistics() {
  return {
    total: companyPool.all.length,
    available: companyPool.available.length,
    used: companyPool.all.length - companyPool.available.length,
    byCategory: {
      quarantine: companyPool.quarantine.length,
      duplicate: companyPool.duplicate.length,
      complete: companyPool.complete.length
    }
  };
}

// Export functions
module.exports = {
  MASTER_COMPANY_DATA,
  CITY_MAPPINGS,
  OWNER_NAMES,
  SALES_ORG_MAPPING,
  DISTRIBUTION_CHANNELS,
  DIVISIONS,
  initializeCompanyPool,
  getCompaniesForUseCase,
  generateQuarantineData,
  generateDuplicateGroups,
  getAllCompanies,
  getCompaniesByCountry,
  getPoolStatistics,
  resetPoolForCategory
};

