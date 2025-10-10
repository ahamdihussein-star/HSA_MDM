import { Injectable } from '@angular/core';

export interface DemoCompany {
  id?: string;
  name: string;
  nameAr: string;
  customerType: string;
  ownerName: string;
  taxNumber: string;
  buildingNumber?: string;
  street?: string;
  country: string;
  city?: string;
  industry?: string;
  contacts: DemoContact[];
  salesOrg?: string;
  distributionChannel?: string;
  division?: string;
  usedIn?: string;
  status?: string;
  assignedTo?: string;
  rejectReason?: string;
  source?: string;
  confidence?: number;
  isMaster?: number;
  masterId?: string;
}

export interface DemoContact {
  name: string;
  jobTitle: string;
  email: string;
  mobile: string;
  landline: string;
  preferredLanguage: string;
}

export interface CompanyPool {
  all: DemoCompany[];
  available: DemoCompany[];
  quarantine: DemoCompany[];
  duplicate: DemoCompany[];
  complete: DemoCompany[];
  lastUsedCategory: string;
}

@Injectable({
  providedIn: 'root'
})
export class DemoDataGeneratorService {
  
  private companyPool: CompanyPool = {
    all: [],
    available: [],
    quarantine: [],
    duplicate: [],
    complete: [],
    lastUsedCategory: ''
  };

  // Master list of 70 companies (10 per country x 7 countries)
  private readonly masterCompanyData = {
    'Egypt': [
      { name: 'Juhayna Food Industries', nameAr: 'جهينة للصناعات الغذائية', industry: 'Food & Beverage', type: 'Public Company' },
      { name: 'Edita Food Industries', nameAr: 'إيديتا للصناعات الغذائية', industry: 'Food & Beverage', type: 'Public Company' },
      { name: 'Domty', nameAr: 'دومتي', industry: 'Dairy Products', type: 'Public Company' },
      { name: 'Cairo Poultry', nameAr: 'القاهرة للدواجن', industry: 'Poultry', type: 'Private Company' },
      { name: 'Wadi Food', nameAr: 'وادي فوود', industry: 'Food Processing', type: 'Private Company' },
      { name: 'Beyti', nameAr: 'بيتي', industry: 'Juice & Beverages', type: 'Private Company' },
      { name: 'Farm Frites Egypt', nameAr: 'فارم فرايتس مصر', industry: 'Frozen Food', type: 'Private Company' },
      { name: 'Americana Foods', nameAr: 'أمريكانا للأغذية', industry: 'Food & Snacks', type: 'Public Company' },
      { name: 'Carrefour Egypt', nameAr: 'كارفور مصر', industry: 'Retail', type: 'Private Company' },
      { name: 'Spinneys Egypt', nameAr: 'سبينيس مصر', industry: 'Retail', type: 'Private Company' }
    ],
    'Saudi Arabia': [
      { name: 'Almarai', nameAr: 'المراعي', industry: 'Dairy & Food', type: 'Public Company' },
      { name: 'Saudia Dairy & Foodstuff', nameAr: 'سدافكو', industry: 'Dairy', type: 'Public Company' },
      { name: 'Al Safi Danone', nameAr: 'الصافي دانون', industry: 'Dairy', type: 'Private Company' },
      { name: 'Nadec', nameAr: 'نادك', industry: 'Agriculture & Food', type: 'Public Company' },
      { name: 'Savola Group', nameAr: 'مجموعة صافولا', industry: 'Food & Retail', type: 'Public Company' },
      { name: 'Herfy Food Services', nameAr: 'هرفي للخدمات الغذائية', industry: 'Fast Food', type: 'Public Company' },
      { name: 'Halwani Bros', nameAr: 'إخوان حلواني', industry: 'Food Processing', type: 'Private Company' },
      { name: 'Al Kabeer', nameAr: 'الكبير', industry: 'Frozen Food', type: 'Private Company' },
      { name: 'Sunbulah Group', nameAr: 'مجموعة سنبلة', industry: 'Frozen Food', type: 'Private Company' },
      { name: 'Panda Retail', nameAr: 'بنده للتجزئة', industry: 'Retail', type: 'Private Company' }
    ],
    'United Arab Emirates': [
      { name: 'Al Ain Farms', nameAr: 'مزارع العين', industry: 'Fresh Produce', type: 'Private Company' },
      { name: 'National Food Products', nameAr: 'الشركة الوطنية للمنتجات الغذائية', industry: 'Food Manufacturing', type: 'Public Company' },
      { name: 'Al Islami Foods', nameAr: 'الإسلامي للأغذية', industry: 'Halal Food', type: 'Private Company' },
      { name: 'Emirates Snack Foods', nameAr: 'الإمارات للوجبات الخفيفة', industry: 'Snacks', type: 'Private Company' },
      { name: 'Agthia Group', nameAr: 'مجموعة أغذية', industry: 'Food & Beverages', type: 'Public Company' },
      { name: 'IFFCO', nameAr: 'إيفكو', industry: 'Oils & Food', type: 'Public Company' },
      { name: 'Al Rawdah Dairy', nameAr: 'ألبان الروضة', industry: 'Dairy', type: 'Private Company' },
      { name: 'Barakah Dates', nameAr: 'تمور بركة', industry: 'Dates & Fruits', type: 'Private Company' },
      { name: 'Hunter Foods', nameAr: 'هنتر فودز', industry: 'Meat Processing', type: 'Private Company' },
      { name: 'Al Khaleej Sugar', nameAr: 'سكر الخليج', industry: 'Sugar Refinery', type: 'Public Company' }
    ],
    'Yemen': [
      { name: 'Yemen Soft Drinks', nameAr: 'اليمن للمشروبات الغازية', industry: 'Beverages', type: 'Private Company' },
      { name: 'Hayel Saeed Anam Group', nameAr: 'مجموعة هائل سعيد أنعم', industry: 'Trading & Food', type: 'Private Company' },
      { name: 'Yemen Dairy Factory', nameAr: 'مصنع اليمن للألبان', industry: 'Dairy', type: 'Private Company' },
      { name: 'Sanaa Flour Mills', nameAr: 'مطاحن صنعاء', industry: 'Flour & Grains', type: 'Public Company' },
      { name: 'Al-Saeed Trading', nameAr: 'السعيد للتجارة', industry: 'Food Trading', type: 'Private Company' },
      { name: 'Yemen Food Industries', nameAr: 'اليمن للصناعات الغذائية', industry: 'Food Processing', type: 'Private Company' },
      { name: 'Taiz Food Company', nameAr: 'شركة تعز للأغذية', industry: 'Food Distribution', type: 'Private Company' },
      { name: 'Aden Refinery Company', nameAr: 'شركة مصافي عدن', industry: 'Oil & Food', type: 'Public Company' },
      { name: 'Hodeidah Mills', nameAr: 'مطاحن الحديدة', industry: 'Flour Mills', type: 'Private Company' },
      { name: 'Al-Rowad Food Co', nameAr: 'شركة الرواد للأغذية', industry: 'Food Import', type: 'Private Company' }
    ],
    'Kuwait': [
      { name: 'Kuwait Flour Mills', nameAr: 'مطاحن الكويت', industry: 'Flour & Bakery', type: 'Public Company' },
      { name: 'Kuwait Food Company', nameAr: 'شركة الكويت للأغذية', industry: 'Food & Restaurant', type: 'Public Company' },
      { name: 'Al Yasra Foods', nameAr: 'أغذية اليسرة', industry: 'Food Trading', type: 'Private Company' },
      { name: 'Kout Food Group', nameAr: 'مجموعة كوت الغذائية', industry: 'Restaurants', type: 'Public Company' },
      { name: 'Kuwait Danish Dairy', nameAr: 'الألبان الدنماركية الكويتية', industry: 'Dairy', type: 'Private Company' },
      { name: 'Al Wazzan Foods', nameAr: 'الوزان للأغذية', industry: 'Food Import', type: 'Private Company' },
      { name: 'Safat Dairy', nameAr: 'ألبان الصفاة', industry: 'Dairy Products', type: 'Private Company' },
      { name: 'Kuwait Protein Company', nameAr: 'الشركة الكويتية للبروتين', industry: 'Meat & Poultry', type: 'Public Company' },
      { name: 'Al Durraq Food', nameAr: 'الدراق للأغذية', industry: 'Food Processing', type: 'Private Company' },
      { name: 'Mezzan Holding', nameAr: 'شركة مزن القابضة', industry: 'Food & Beverages', type: 'Public Company' }
    ],
    'Qatar': [
      { name: 'Qatar National Food Company', nameAr: 'الشركة القطرية الوطنية للأغذية', industry: 'Food Manufacturing', type: 'Public Company' },
      { name: 'Baladna', nameAr: 'بلدنا', industry: 'Dairy', type: 'Public Company' },
      { name: 'Zulal Oasis', nameAr: 'واحة زلال', industry: 'Water & Beverages', type: 'Private Company' },
      { name: 'Qatar Flour Mills', nameAr: 'مطاحن قطر', industry: 'Flour & Bakery', type: 'Public Company' },
      { name: 'Al Meera Consumer Goods', nameAr: 'الميرة للسلع الاستهلاكية', industry: 'Retail & Food', type: 'Public Company' },
      { name: 'Widam Food Company', nameAr: 'شركة ودام الغذائية', industry: 'Meat Processing', type: 'Private Company' },
      { name: 'Qatar Poultry', nameAr: 'الدواجن القطرية', industry: 'Poultry', type: 'Private Company' },
      { name: 'Senyar Industries', nameAr: 'صناعات سنيار', industry: 'Food Processing', type: 'Private Company' },
      { name: 'Al Watania Dairy', nameAr: 'ألبان الوطنية', industry: 'Dairy Products', type: 'Private Company' },
      { name: 'Qatar Food Industries', nameAr: 'قطر للصناعات الغذائية', industry: 'Food Manufacturing', type: 'Public Company' }
    ],
    'Bahrain': [
      { name: 'Bahrain Flour Mills', nameAr: 'مطاحن البحرين', industry: 'Flour & Bakery', type: 'Public Company' },
      { name: 'Awal Dairy Company', nameAr: 'شركة أوال للألبان', industry: 'Dairy', type: 'Private Company' },
      { name: 'Trafco Group', nameAr: 'مجموعة ترافكو', industry: 'Food Trading', type: 'Public Company' },
      { name: 'Bahrain Food Import', nameAr: 'البحرين لاستيراد الأغذية', industry: 'Food Import', type: 'Private Company' },
      { name: 'Al Zain Dairy', nameAr: 'ألبان الزين', industry: 'Dairy Products', type: 'Private Company' },
      { name: 'Delmon Poultry', nameAr: 'دواجن دلمون', industry: 'Poultry', type: 'Private Company' },
      { name: 'Bahrain Fresh Fruits', nameAr: 'البحرين للفواكه الطازجة', industry: 'Fresh Produce', type: 'Private Company' },
      { name: 'Al Jazira Food', nameAr: 'أغذية الجزيرة', industry: 'Food Distribution', type: 'Private Company' },
      { name: 'Manazel Food Company', nameAr: 'شركة منازل للأغذية', industry: 'Food Processing', type: 'Private Company' },
      { name: 'Bahrain Beverages', nameAr: 'مشروبات البحرين', industry: 'Beverages', type: 'Private Company' }
    ],
    'Oman': [
      { name: 'Oman Flour Mills', nameAr: 'مطاحن عمان', industry: 'Flour & Bakery', type: 'Public Company' },
      { name: 'A\'Saffa Foods', nameAr: 'أغذية الصفاء', industry: 'Poultry & Food', type: 'Public Company' },
      { name: 'Oman Refreshment Company', nameAr: 'الشركة العمانية للمرطبات', industry: 'Beverages', type: 'Public Company' },
      { name: 'National Mineral Water', nameAr: 'المياه المعدنية الوطنية', industry: 'Water & Beverages', type: 'Public Company' },
      { name: 'Al Maha Dairy', nameAr: 'ألبان المها', industry: 'Dairy', type: 'Private Company' },
      { name: 'Sweets of Oman', nameAr: 'حلويات عمان', industry: 'Confectionery', type: 'Private Company' },
      { name: 'Dhofar Beverages', nameAr: 'مشروبات ظفار', industry: 'Beverages', type: 'Private Company' },
      { name: 'Sohar Poultry', nameAr: 'دواجن صحار', industry: 'Poultry', type: 'Private Company' },
      { name: 'Areej Vegetable Oils', nameAr: 'زيوت أريج النباتية', industry: 'Oils & Fats', type: 'Private Company' },
      { name: 'Oman Foodstuff Factory', nameAr: 'مصنع عمان للمواد الغذائية', industry: 'Food Processing', type: 'Public Company' }
    ]
  };

  // City mappings for each country
  private readonly cityMappings: { [key: string]: string[] } = {
    'Egypt': ['Cairo', 'Alexandria', 'Giza', 'Luxor'],
    'Saudi Arabia': ['Riyadh', 'Jeddah', 'Mecca', 'Dammam'],
    'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman'],
    'Yemen': ['Sanaa', 'Aden', 'Taiz'],
    'Kuwait': ['Kuwait City', 'Hawalli', 'Farwaniya'],
    'Qatar': ['Doha', 'Al Wakrah', 'Al Rayyan'],
    'Bahrain': ['Manama', 'Muharraq', 'Riffa'],
    'Oman': ['Muscat', 'Salalah', 'Sohar']
  };

  private usedCompanies: Set<number> = new Set();
  private lastUsedIndex: number = -1;

  constructor() {
    this.initializeCompanyPool();
  }

  /**
   * Initialize the company pool with all 70 companies
   */
  private initializeCompanyPool(): void {
    const allCompanies: DemoCompany[] = [];
    let globalIndex = 0;
    
    Object.entries(this.masterCompanyData).forEach(([country, companies]) => {
      const cities = this.cityMappings[country] || [];
      
      companies.forEach((company, index) => {
        const city = cities[index % cities.length];
        const companyId = `${country.toLowerCase().replace(/\s+/g, '_')}_${index + 1}`;
        
        // Generate static, consistent data for each company
        const staticData = this.generateStaticCompanyData(companyId, company.name, country, city, company.industry, company.type, index);
        
        allCompanies.push({
          id: companyId,
          name: company.name,
          nameAr: company.nameAr,
          customerType: staticData.customerType, // ✅ Use mapped customer type from staticData
          ownerName: staticData.ownerName,
          taxNumber: staticData.taxNumber,
          buildingNumber: staticData.buildingNumber,
          street: staticData.street,
          country: country,
          city: city,
          industry: company.industry,
          contacts: staticData.contacts, // Now static with 5 contacts
          salesOrg: staticData.salesOrg,
          distributionChannel: staticData.distributionChannel,
          division: staticData.division
        });
        
        globalIndex++;
      });
    });

    this.companyPool.all = allCompanies;
    this.companyPool.available = [...allCompanies];
    
    console.log(`✅ Initialized company pool with ${allCompanies.length} companies across ${Object.keys(this.masterCompanyData).length} countries`);
  }

  /**
   * Get companies for specific use case ensuring no duplication
   */
  getCompaniesForUseCase(useCase: 'quarantine' | 'duplicate' | 'complete', count: number): DemoCompany[] {
    const selectedCompanies: DemoCompany[] = [];
    
    // Ensure we have enough available companies
    if (this.companyPool.available.length < count) {
      console.warn(`⚠️ Not enough available companies (${this.companyPool.available.length}). Requested: ${count}. Resetting pool for ${useCase}`);
      this.resetPoolForCategory(useCase);
    }

    // Select companies from available pool (always take first ones for consistency)
    for (let i = 0; i < count && this.companyPool.available.length > 0; i++) {
      // Always take from the beginning for consistent order
      const company = this.companyPool.available.shift()!;
      
      // Mark where it's used
      company.usedIn = useCase;
      selectedCompanies.push(company);
      
      // Track usage by category
      this.companyPool[useCase].push(company);
    }

    this.companyPool.lastUsedCategory = useCase;
    
    return selectedCompanies;
  }

  /**
   * Generate demo data for forms (sequential from pool)
   */
  generateDemoData(): DemoCompany {
    // Check if we're still using old method
    if (this.usedCompanies.size >= this.companyPool.all.length) {
      this.usedCompanies.clear();
    }

    // Find next unused company from pool (sequential for consistency)
    let selectedIndex: number = 0;
    
    // Find the first unused index
    while (this.usedCompanies.has(selectedIndex) && selectedIndex < this.companyPool.all.length) {
      selectedIndex++;
    }
    
    // If all used, reset and start from 0
    if (selectedIndex >= this.companyPool.all.length) {
      this.usedCompanies.clear();
      selectedIndex = 0;
    }

    this.usedCompanies.add(selectedIndex);
    this.lastUsedIndex = selectedIndex;

    const company = this.deepClone(this.companyPool.all[selectedIndex]);
    return company;
  }

  /**
   * Gets the last used company (for reference)
   */
  getLastUsedCompany(): DemoCompany | null {
    if (this.lastUsedIndex >= 0) {
      return this.deepClone(this.companyPool.all[this.lastUsedIndex]);
    }
    return null;
  }

  /**
   * Gets remaining unused companies count
   */
  getRemainingCompaniesCount(): number {
    return this.companyPool.available.length;
  }

  /**
   * Resets the generator (clears used companies)
   */
  resetGenerator(): void {
    this.usedCompanies.clear();
    this.lastUsedIndex = -1;
    this.companyPool.available = [...this.companyPool.all];
    this.companyPool.quarantine = [];
    this.companyPool.duplicate = [];
    this.companyPool.complete = [];
    console.log('🔄 Company pool reset');
  }

  /**
   * Find company by name in the pool
   */
  findCompanyByName(name: string): DemoCompany | null {
    if (this.companyPool.all.length === 0) {
      this.initializeCompanyPool();
    }

    const searchName = name.trim().toLowerCase();
    
    // Normalize Arabic text (remove spaces, diacritics, etc.)
    const normalizeArabic = (text: string): string => {
      return text
        .replace(/\s+/g, '') // Remove all spaces
        .replace(/[ًٌٍَُِّْ]/g, '') // Remove diacritics
        .trim()
        .toLowerCase();
    };
    
    const searchNameAr = normalizeArabic(name);
    
    // Search in all companies with improved matching
    const found = this.companyPool.all.find(company => {
      const companyNameEn = company.name.toLowerCase();
      const companyNameAr = normalizeArabic(company.nameAr);
      
      // More flexible matching
      return companyNameEn === searchName || 
             companyNameEn.includes(searchName) ||
             searchName.includes(companyNameEn) ||
             companyNameAr === searchNameAr ||
             companyNameAr.includes(searchNameAr) ||
             searchNameAr.includes(companyNameAr) ||
             // Additional fuzzy matching for common variations
             companyNameEn.replace(/[^a-z]/g, '') === searchName.replace(/[^a-z]/g, '') ||
             companyNameAr.replace(/[^a-z]/g, '') === searchNameAr.replace(/[^a-z]/g, '');
    });

    console.log('🔍 [DEMO DATA] Finding company by name:', name);
    console.log('🔍 [DEMO DATA] Search name (EN):', searchName);
    console.log('🔍 [DEMO DATA] Search name (AR):', searchNameAr);
    console.log('🔍 [DEMO DATA] Found company:', found?.name || 'Not found');
    
    if (found) {
      console.log('🔍 [DEMO DATA] Company details:', {
        name: found.name,
        nameAr: found.nameAr,
        country: found.country,
        contactsCount: found.contacts?.length || 0
      });
    }

    return found ? this.deepClone(found) : null;
  }

  /**
   * Reset pool for specific category
   */
  private resetPoolForCategory(category: string): void {
    // Return used companies back to available pool
    const categoryKey = category as keyof Pick<CompanyPool, 'quarantine' | 'duplicate' | 'complete'>;
    const usedCompanies = this.companyPool[categoryKey];
    this.companyPool.available.push(...usedCompanies);
    this.companyPool[categoryKey] = [];
    console.log(`🔄 Reset pool for category: ${category}`);
  }

  // Removed generateOwnerName - now using generateStaticOwnerName

  /**
   * Generate tax number for a country
   */
  private generateTaxNumber(country: string, index: number): string {
    const countryPrefixes: { [key: string]: string } = {
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
  private generateStreet(city: string, index: number): string {
    const streetTypes = ['Street', 'Avenue', 'Road', 'Boulevard'];
    const streetNames = ['King Abdulaziz', 'Sheikh Zayed', 'Industrial', 'Corniche', 'Al Manara'];
    
    return `${streetNames[index % streetNames.length]} ${streetTypes[index % streetTypes.length]}, ${city}`;
  }

  /**
   * Get sales organization by country
   */
  private getSalesOrgByCountry(country: string, index: number): string {
    const baseOrg = 1000 + (Object.keys(this.masterCompanyData).indexOf(country) * 5000);
    return String(baseOrg + (index * 1000));
  }

  /**
   * Get distribution channel
   */
  private getDistributionChannel(index: number): string {
    const channels = ['10', '20', '30', '40', '50', '60', '70', '80', '90', '100'];
    return channels[index % channels.length];
  }

  /**
   * Get division by industry
   */
  private getDivision(industry: string): string {
    const industryToDivision: { [key: string]: string } = {
      'Food & Beverage': '00',
      'Dairy Products': '10',
      'Dairy': '10',
      'Poultry': '20',
      'Frozen Food': '30',
      'Retail': '40',
      'Food Processing': '50',
      'Beverages': '60',
      'Trading & Food': '70',
      'Flour & Bakery': '80',
      'Food Import': '90'
    };
    
    return industryToDivision[industry] || '00';
  }

  /**
   * Generate static, consistent data for a company
   */
  private generateStaticCompanyData(companyId: string, companyName: string, country: string, city: string, industry: string, customerType: string, index: number): any {
    // Use company ID as seed for consistent generation
    const seed = this.hashString(companyId);
    
    // Map company type to CUSTOMER_TYPE_OPTIONS values
    const mappedCustomerType = this.mapToSystemCustomerType(customerType);
    
    return {
      ownerName: this.generateStaticOwnerName(country, seed),
      taxNumber: this.generateStaticTaxNumber(country, index, seed),
      buildingNumber: this.generateStaticBuildingNumber(index, seed),
      street: this.generateStaticStreet(city, index, seed),
      customerType: mappedCustomerType, // Use mapped type
      contacts: this.generateStaticContacts(companyName, country, seed), // 5 static contacts
      salesOrg: this.getSalesOrgByCountry(country, index),
      distributionChannel: this.getDistributionChannel(index),
      division: this.getDivision(industry)
    };
  }
  
  /**
   * Map company type to system CUSTOMER_TYPE_OPTIONS values
   */
  private mapToSystemCustomerType(type: string): string {
    const lowerType = type.toLowerCase();
    
    if (lowerType.includes('public')) return 'joint_stock';
    if (lowerType.includes('private')) return 'limited_liability';
    if (lowerType.includes('llc')) return 'limited_liability';
    if (lowerType.includes('sole')) return 'sole_proprietorship';
    if (lowerType.includes('sme')) return 'SME';
    if (lowerType.includes('retail')) return 'Retail Chain';
    
    return 'Corporate'; // Default
  }

  /**
   * Hash string to create consistent seed
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Generate static owner name based on seed
   */
  private generateStaticOwnerName(country: string, seed: number): string {
    const countryData = this.getCountryData(country);
    const firstNames = countryData.firstNames;
    const lastNames = countryData.lastNames;
    
    const firstNameIndex = seed % firstNames.length;
    const lastNameIndex = (seed >> 4) % lastNames.length;
    
    return `${firstNames[firstNameIndex]} ${lastNames[lastNameIndex]}`;
  }

  /**
   * Generate static tax number based on seed
   */
  private generateStaticTaxNumber(country: string, index: number, seed: number): string {
    const countryPrefixes: { [key: string]: string } = {
      'Egypt': '3',
      'Saudi Arabia': '3',
      'United Arab Emirates': '7',
      'Yemen': '2',
      'Kuwait': '2',
      'Qatar': '3',
      'Bahrain': '1',
      'Oman': '1'
    };
    
    const prefix = countryPrefixes[country] || '3';
    const baseNumber = (seed % 1000000000).toString().padStart(9, '0');
    return `${prefix}${baseNumber}`;
  }

  /**
   * Generate static building number
   */
  private generateStaticBuildingNumber(index: number, seed: number): string {
    return `${1000 + index + (seed % 100)}`;
  }

  /**
   * Generate static street name
   */
  private generateStaticStreet(city: string, index: number, seed: number): string {
    const streets = [
      'King Fahd Road', 'Tahrir Square', 'Sheikh Zayed Road', 'Al-Qasr Street',
      'Corniche Road', 'Airport Road', 'Main Street', 'Business District',
      'Industrial Area', 'Commercial Zone', 'Downtown', 'Financial Center'
    ];
    
    const streetIndex = (seed + index) % streets.length;
    return streets[streetIndex];
  }

  /**
   * Generate 5 static contacts for each company
   */
  private generateStaticContacts(companyName: string, country: string, seed: number): DemoContact[] {
    const countryData = this.getCountryData(country);
    const firstNames = countryData.firstNames;
    const lastNames = countryData.lastNames;
    const phoneFormat = countryData.phoneFormat;
    
    const jobTitles = [
      "Chief Executive Officer",
      "Operations Manager", 
      "Sales Manager",
      "Finance Manager",
      "Marketing Director"
    ];
    
    // Generate email domain from company name
    const cleanName = companyName
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 15);
    
    const countryExt = countryData.domains[0].split('.').pop();
    const emailDomain = `${cleanName}.com.${countryExt}`;
    
    const contacts: DemoContact[] = [];
    
    for (let i = 0; i < 5; i++) {
      // Use seed + i to ensure consistent but different contacts
      const contactSeed = seed + (i * 1000);
      
      const firstNameIndex = contactSeed % firstNames.length;
      const lastNameIndex = (contactSeed >> 4) % lastNames.length;
      const jobTitleIndex = (contactSeed >> 8) % jobTitles.length;
      
      const firstName = firstNames[firstNameIndex];
      const lastName = lastNames[lastNameIndex];
      const jobTitle = jobTitles[jobTitleIndex];
      
      // Generate consistent phone numbers
      const mobileBase = phoneFormat.mobile.replace(/X/g, '');
      const mobileSuffix = (contactSeed % 1000000000).toString().padStart(9, '0');
      const mobile = mobileBase + mobileSuffix;
      
      const landlineBase = phoneFormat.landline.replace(/X/g, '');
      const landlineSuffix = ((contactSeed >> 2) % 1000000000).toString().padStart(9, '0');
      const landline = landlineBase + landlineSuffix;
      
      contacts.push({
        name: `${firstName} ${lastName}`,
        jobTitle: jobTitle,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace('al-', '')}@${emailDomain}`,
        mobile: mobile,
        landline: landline,
        preferredLanguage: i % 2 === 0 ? "Arabic" : "English"
      });
    }
    
    return contacts;
  }

  /**
   * Generate contacts for a company (kept for backward compatibility)
   */
  private generateContactsForCompany(country: string, count: number = 2, companyName?: string): DemoContact[] {
    return this.generateAdditionalContacts(count, country, companyName);
  }

  /**
   * Deep clone utility
   */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Generate additional contacts for a company (used when more contacts are needed)
   * Returns static contacts from the company's predefined list
   * Can generate more than 5 contacts by using seed-based generation
   */
  generateAdditionalContacts(count: number = 1, country?: string, companyName?: string): DemoContact[] {
    // If we have a company name, try to find the company
    if (companyName) {
      const foundCompany = this.findCompanyByName(companyName);
      if (foundCompany) {
        // If we need more contacts than the company has (5), generate more using same seed
        const existingContacts = foundCompany.contacts || [];
        
        if (count <= existingContacts.length) {
          // Return existing contacts
          console.log(`✅ [DEMO DATA] Returning ${count} static contacts for company: ${companyName}`);
          return existingContacts.slice(0, count);
        } else {
          // Need more than 5 - generate additional ones using static seed
          const seed = this.hashString(foundCompany.id || companyName);
          const additionalNeeded = count - existingContacts.length;
          const moreContacts = this.generateStaticContactsWithOffset(
            companyName, 
            foundCompany.country, 
            seed, 
            existingContacts.length, // Start from contact 6, 7, 8, etc.
            additionalNeeded
          );
          
          console.log(`✅ [DEMO DATA] Returning ${existingContacts.length} existing + ${moreContacts.length} generated contacts for company: ${companyName}`);
          return [...existingContacts, ...moreContacts];
        }
      }
    }
    
    // Fallback: return empty array to maintain consistency
    console.log('⚠️ [DEMO DATA] No company found, returning empty array for consistency');
    return [];
  }
  
  /**
   * Generate additional static contacts with offset (for contacts 6+)
   */
  private generateStaticContactsWithOffset(companyName: string, country: string, seed: number, offset: number, count: number): DemoContact[] {
    const countryData = this.getCountryData(country);
    const firstNames = countryData.firstNames;
    const lastNames = countryData.lastNames;
    const phoneFormat = countryData.phoneFormat;
    
    const jobTitles = [
      "Chief Executive Officer",
      "Operations Manager", 
      "Sales Manager",
      "Finance Manager",
      "Marketing Director",
      "Procurement Manager",
      "Quality Control Manager",
      "Supply Chain Director",
      "Production Manager",
      "Logistics Manager"
    ];
    
    // Generate email domain from company name
    const cleanName = companyName
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 15);
    
    const countryExt = countryData.domains[0].split('.').pop();
    const emailDomain = `${cleanName}.com.${countryExt}`;
    
    const contacts: DemoContact[] = [];
    
    for (let i = 0; i < count; i++) {
      // Use seed + offset + i to ensure consistent but different contacts
      const contactIndex = offset + i;
      const contactSeed = seed + (contactIndex * 1000);
      
      const firstNameIndex = contactSeed % firstNames.length;
      const lastNameIndex = (contactSeed >> 4) % lastNames.length;
      const jobTitleIndex = (contactSeed >> 8) % jobTitles.length;
      
      const firstName = firstNames[firstNameIndex];
      const lastName = lastNames[lastNameIndex];
      const jobTitle = jobTitles[jobTitleIndex];
      
      // Generate consistent phone numbers
      const mobileBase = phoneFormat.mobile.replace(/X/g, '');
      const mobileSuffix = (contactSeed % 1000000000).toString().padStart(9, '0');
      const mobile = mobileBase + mobileSuffix;
      
      const landlineBase = phoneFormat.landline.replace(/X/g, '');
      const landlineSuffix = ((contactSeed >> 2) % 1000000000).toString().padStart(9, '0');
      const landline = landlineBase + landlineSuffix;
      
      contacts.push({
        name: `${firstName} ${lastName}`,
        jobTitle: jobTitle,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace('al-', '')}@${emailDomain}`,
        mobile: mobile,
        landline: landline,
        preferredLanguage: i % 2 === 0 ? "Arabic" : "English"
      });
    }
    
    return contacts;
  }

  /**
   * Get country-specific data (names, phone formats, domains)
   */
  private getCountryData(country: string): any {
    const countryData: { [key: string]: any } = {
      'Saudi Arabia': {
        firstNames: [
          "Ahmed", "Mohammed", "Omar", "Khalid", "Saud", "Fahad", "Abdullah", "Yousef",
          "Fatima", "Noura", "Layla", "Reem", "Sarah", "Aisha", "Hala", "Mona"
        ],
        lastNames: [
          "Al-Rashid", "Al-Shehri", "Al-Mansouri", "Al-Zahrani", "Al-Dosari", 
          "Al-Mutairi", "Al-Harbi", "Al-Ghamdi", "Al-Sheikh", "Al-Malki",
          "Al-Otaibi", "Al-Qahtani", "Al-Sulaimani", "Al-Balawi", "Al-Shammari"
        ],
        phoneFormat: {
          mobile: "+9665XXXXXXXX",
          landline: "+9661XXXXXXXX"
        },
        domains: ["company.com.sa", "corp.sa", "group.com.sa", "holdings.sa", "enterprise.com.sa"]
      },
      'Egypt': {
        firstNames: [
          "Ahmed", "Mohammed", "Omar", "Khalid", "Hassan", "Mahmoud", "Ali", "Youssef",
          "Fatima", "Aisha", "Mona", "Nour", "Dina", "Hala", "Rania", "Yasmin"
        ],
        lastNames: [
          "Hassan", "Mahmoud", "Ali", "Ahmed", "Ibrahim", "Omar", "Khalil", "Youssef",
          "Farouk", "Nasser", "Saad", "Taha", "Zaki", "Rashad", "Fouad"
        ],
        phoneFormat: {
          mobile: "+201XXXXXXXXX",
          landline: "+202XXXXXXXX"
        },
        domains: ["company.com.eg", "corp.eg", "group.com.eg", "holdings.eg", "enterprise.com.eg"]
      },
      'United Arab Emirates': {
        firstNames: [
          "Ahmed", "Mohammed", "Omar", "Khalid", "Saeed", "Rashid", "Hamdan", "Zayed",
          "Fatima", "Aisha", "Mona", "Nour", "Dina", "Hala", "Rania", "Yasmin"
        ],
        lastNames: [
          "Al-Rashid", "Al-Maktoum", "Al-Nahyan", "Al-Qasimi", "Al-Shamsi", 
          "Al-Zaabi", "Al-Suwaidi", "Al-Mansouri", "Al-Dhaheri", "Al-Kaabi"
        ],
        phoneFormat: {
          mobile: "+9715XXXXXXXX",
          landline: "+9714XXXXXXXX"
        },
        domains: ["company.ae", "corp.ae", "group.ae", "holdings.ae", "enterprise.ae"]
      },
      'Yemen': {
        firstNames: [
          "Abdullah", "Ali", "Saleh", "Abdo", "Ahmed", "Mohammed", "Omar", "Hassan",
          "Fatima", "Aisha", "Mona", "Nour", "Dina", "Hala", "Rania", "Yasmin"
        ],
        lastNames: [
          "Al-Ahmar", "Al-Houthi", "Al-Sammad", "Al-Yemeni", "Al-Hadrami", 
          "Al-Awlaki", "Al-Zindani", "Al-Sanabani", "Al-Eryani", "Al-Iryani"
        ],
        phoneFormat: {
          mobile: "+96770XXXXXXX",
          landline: "+9671XXXXXXX"
        },
        domains: ["company.com.ye", "corp.ye", "group.com.ye", "enterprise.com.ye"]
      },
      'Kuwait': {
        firstNames: [
          "Ahmed", "Mohammed", "Omar", "Khalid", "Saud", "Fahad", "Abdullah", "Yousef",
          "Fatima", "Noura", "Layla", "Reem", "Sarah", "Aisha", "Hala", "Mariam"
        ],
        lastNames: [
          "Al-Sabah", "Al-Kandari", "Al-Mutairi", "Al-Rashid", "Al-Dosari", 
          "Al-Adwani", "Al-Ajmi", "Al-Enezi", "Al-Azmi", "Al-Shammari"
        ],
        phoneFormat: {
          mobile: "+9656XXXXXXXX",
          landline: "+9652XXXXXXXX"
        },
        domains: ["company.com.kw", "corp.kw", "group.com.kw", "holdings.kw", "enterprise.com.kw"]
      },
      'Qatar': {
        firstNames: [
          "Ahmed", "Mohammed", "Omar", "Khalid", "Hamad", "Tamim", "Abdullah", "Nasser",
          "Fatima", "Noura", "Layla", "Reem", "Sarah", "Aisha", "Hala", "Mona"
        ],
        lastNames: [
          "Al-Thani", "Al-Mahmoud", "Al-Kuwari", "Al-Suwaidi", "Al-Dosari", 
          "Al-Attiyah", "Al-Ansari", "Al-Emadi", "Al-Mohannadi", "Al-Marri"
        ],
        phoneFormat: {
          mobile: "+9745XXXXXXXX",
          landline: "+9744XXXXXXXX"
        },
        domains: ["company.com.qa", "corp.qa", "group.com.qa", "holdings.qa", "enterprise.com.qa"]
      },
      'Bahrain': {
        firstNames: [
          "Ahmed", "Mohammed", "Omar", "Khalid", "Hamad", "Salman", "Abdullah", "Yousef",
          "Fatima", "Noura", "Layla", "Reem", "Sarah", "Aisha", "Hala", "Mona"
        ],
        lastNames: [
          "Al-Khalifa", "Al-Dosari", "Al-Mahmoud", "Al-Mannai", "Al-Fadhel", 
          "Al-Noaimi", "Al-Binali", "Al-Koheji", "Al-Sayed", "Al-Hashimi"
        ],
        phoneFormat: {
          mobile: "+9733XXXXXXXX",
          landline: "+9731XXXXXXXX"
        },
        domains: ["company.com.bh", "corp.bh", "group.com.bh", "holdings.bh", "enterprise.com.bh"]
      },
      'Oman': {
        firstNames: [
          "Ahmed", "Mohammed", "Omar", "Khalid", "Haitham", "Fahd", "Assad", "Tareq",
          "Fatima", "Noura", "Layla", "Reem", "Sarah", "Aisha", "Hala", "Mona"
        ],
        lastNames: [
          "Al-Said", "Al-Busaidi", "Al-Lawati", "Al-Maamari", "Al-Hinai", 
          "Al-Balushi", "Al-Harthi", "Al-Kindi", "Al-Rashdi", "Al-Habsi"
        ],
        phoneFormat: {
          mobile: "+9689XXXXXXXX",
          landline: "+9682XXXXXXX"
        },
        domains: ["company.com.om", "corp.om", "group.com.om", "holdings.om", "enterprise.com.om"]
      }
    };

    return countryData[country] || countryData['Saudi Arabia'];
  }

  /**
   * Generate phone number based on format (legacy - now uses seed-based generation)
   * Kept for backward compatibility
   */
  private generatePhoneNumber(format: string, seed: number = 12345): string {
    // Use seed to generate consistent digits
    let currentSeed = seed;
    return format.replace(/X/g, () => {
      currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
      return (currentSeed % 10).toString();
    });
  }

  /**
   * Generates demo documents for testing the document viewer
   */
  generateDemoDocuments(): any[] {
    const documents = [
      {
        name: 'Commercial Registration.pdf',
        type: 'Commercial Registration',
        description: 'Official commercial registration certificate',
        mime: 'application/pdf',
        size: 245760,
        contentBase64: this.generatePdfBase64('Commercial Registration'),
        uploadedAt: new Date().toISOString()
      },
      {
        name: 'Tax Certificate.pdf', 
        type: 'Tax Certificate',
        description: 'Tax certificate issued by tax authority',
        mime: 'application/pdf',
        size: 189440,
        contentBase64: this.generatePdfBase64('Tax Certificate'),
        uploadedAt: new Date().toISOString()
      },
      {
        name: 'VAT Certificate.jpg',
        type: 'VAT Certificate',
        description: 'Value Added Tax certificate',
        mime: 'image/jpeg',
        size: 156789,
        contentBase64: this.generateImageBase64('VAT Certificate'),
        uploadedAt: new Date().toISOString()
      }
    ];

    // Always return all 3 documents for consistency
    return documents;
  }

  /**
   * Generates a simple PDF base64 content (demo purposes)
   */
  private generatePdfBase64(title: string): string {
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 50
>>
stream
BT
/F1 12 Tf
100 700 Td
(Demo Document) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000368 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
471
%%EOF`;

    return btoa(pdfContent);
  }

  /**
   * Generates a simple image base64 content (demo purposes)
   */
  private generateImageBase64(title: string): string {
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }

  /**
   * Generate quarantine data with incomplete fields
   * Returns 40 records (10 companies × 4 variants each)
   */
  generateQuarantineData(count: number = 40): any[] {
    const baseCompanyCount = Math.ceil(count / 4); // 4 variants per company
    const companies = this.getCompaniesForUseCase('quarantine', baseCompanyCount);
    const quarantineRecords: any[] = [];

    companies.forEach((company, index) => {
      // Create 4 variants per company with missing data
      for (let variant = 0; variant < 4; variant++) {
        const record = this.deepClone(company);
        
        // Randomly remove some fields to simulate incomplete data
        if (variant === 0) {
          record.street = undefined;
          record.buildingNumber = undefined;
        }
        if (variant === 1) {
          record.city = undefined;
        }
        if (variant === 2) {
          record.buildingNumber = undefined;
        }
        if (variant === 3) {
          record.street = undefined;
        }
        
        // Make tax number unique for each variant
        record.taxNumber = `${company.taxNumber}_V${variant}`;
        
        // Add metadata
        const sourceSystems = ['Oracle Forms', 'SAP S/4HANA', 'SAP ByDesign'];
        record.status = 'Quarantine';
        record.assignedTo = 'data_entry';
        record.rejectReason = `Incomplete record - missing ${variant === 0 ? 'address details' : variant === 1 ? 'city' : variant === 2 ? 'building number' : 'street'}`;
        record.source = sourceSystems[variant % 3];
        // Static confidence based on variant (consistent)
        record.confidence = 60 + (variant * 5); // 60, 65, 70, 75 for each variant
        
        quarantineRecords.push(record);
      }
    });

    console.log(`📊 Generated ${quarantineRecords.length} quarantine records from ${companies.length} base companies`);
    return quarantineRecords;
  }

  /**
   * Generate duplicate groups with variations
   * Returns ~60 records in 20 groups (2-4 records per group)
   */
  generateDuplicateGroups(groupCount: number = 20): any[] {
    const companies = this.getCompaniesForUseCase('duplicate', groupCount);
    const duplicateRecords: any[] = [];

    companies.forEach((company, groupIndex) => {
      const groupSize = [2, 3, 4][groupIndex % 3]; // Vary group sizes: 2, 3, or 4
      const sharedTax = company.taxNumber;
      const sharedType = company.customerType;
      const masterId = `master_${Date.now()}_${groupIndex}`;

      for (let i = 0; i < groupSize; i++) {
        const record = this.deepClone(company);
        
        // First record = master
        if (i === 0) {
          record.isMaster = 1;
          record.status = 'Duplicate';
          record.taxNumber = sharedTax; // Keep original tax number
        } 
      // All other records = duplicates with same tax number but name variations
      else {
        record.name = this.varyCompanyName(company.name, i);
        record.nameAr = this.varyCompanyName(company.nameAr, i);
        record.status = 'Duplicate'; // Changed from 'Linked' to 'Duplicate'
        record.isMaster = 0;
        record.taxNumber = sharedTax; // Same tax number for all in group
      }

        record.masterId = masterId;
        const sourceSystems = ['Oracle Forms', 'SAP S/4HANA', 'SAP ByDesign'];
        record.source = sourceSystems[i % 3];
        // Static confidence based on index (consistent)
        record.confidence = 85 + (i % 3) * 3; // 85, 88, 91 for each duplicate
        
        duplicateRecords.push(record);
      }
    });

    console.log(`📊 Generated ${duplicateRecords.length} duplicate records in ${groupCount} groups`);
    return duplicateRecords;
  }

  /**
   * Vary company name for duplicate variations
   */
  private varyCompanyName(originalName: string, variation: number): string {
    const suffixes = ['', ' Co.', ' LLC', ' Ltd.', ' Trading', ' International', ' Group'];
    return `${originalName}${suffixes[variation % suffixes.length]}`;
  }

  /**
   * Get all companies from pool (for external use like PDF bulk generator)
   */
  getAllCompanies(): DemoCompany[] {
    return this.deepClone(this.companyPool.all);
  }

  /**
   * Get companies by country
   */
  getCompaniesByCountry(country: string): DemoCompany[] {
    return this.companyPool.all.filter(c => c.country === country);
  }

  /**
   * Get pool statistics
   */
  getPoolStatistics(): { total: number; available: number; used: number; byCategory: any } {
    return {
      total: this.companyPool.all.length,
      available: this.companyPool.available.length,
      used: this.companyPool.all.length - this.companyPool.available.length,
      byCategory: {
        quarantine: this.companyPool.quarantine.length,
        duplicate: this.companyPool.duplicate.length,
        complete: this.companyPool.complete.length
      }
    };
  }
}
