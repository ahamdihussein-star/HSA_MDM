import { Injectable } from '@angular/core';

export interface DemoCompany {
  name: string;
  nameAr: string;
  customerType: string;
  ownerName: string;
  taxNumber: string;
  buildingNumber: string;
  street: string;
  country: string;
  city: string;
  contacts: DemoContact[];
  salesOrg: string;
  distributionChannel: string;
  division: string;
}

export interface DemoContact {
  name: string;
  jobTitle: string;
  email: string;
  mobile: string;
  landline: string;
  preferredLanguage: string;
}

@Injectable({
  providedIn: 'root'
})
export class DemoDataGeneratorService {
  
  private companies: DemoCompany[] = [
    // Saudi Arabia Food Companies
    {
      name: "Almarai",
      nameAr: "المراعي",
      customerType: "Public Company",
      ownerName: "Majed Al-Qasabi",
      taxNumber: "300000000000001",
      buildingNumber: "1234",
      street: "King Abdulaziz Road",
      country: "Saudi Arabia",
      city: "Riyadh",
      contacts: [
        {
          name: "Noura Al-Dosari",
          jobTitle: "Procurement Manager",
          email: "noura.dosari@almarai.com",
          mobile: "+966501234571",
          landline: "+966112345681",
          preferredLanguage: "Arabic"
        },
        {
          name: "Khalid Al-Mutairi",
          jobTitle: "Logistics Manager",
          email: "khalid.mutairi@almarai.com",
          mobile: "+966501234572",
          landline: "+966112345682",
          preferredLanguage: "English"
        }
      ],
      salesOrg: "1000",
      distributionChannel: "10",
      division: "00"
    },
    {
      name: "Saudia Dairy & Foodstuff Company",
      nameAr: "شركة المراعي للألبان والأغذية",
      customerType: "Public Company",
      ownerName: "Abdullah Al-Othaim",
      taxNumber: "300000000000002",
      buildingNumber: "5678",
      street: "Industrial Area",
      country: "Saudi Arabia",
      city: "Jeddah",
      contacts: [
        {
          name: "Fatima Al-Shehri",
          jobTitle: "Supply Chain Director",
          email: "fatima.shehri@sdfo.com.sa",
          mobile: "+966501234573",
          landline: "+966112345683",
          preferredLanguage: "Arabic"
        }
      ],
      salesOrg: "2000",
      distributionChannel: "20",
      division: "10"
    },
    {
      name: "Al Safi Danone",
      nameAr: "الصافي دانون",
      customerType: "Private Company",
      ownerName: "Mohammed Al-Safi",
      taxNumber: "300000000000003",
      buildingNumber: "9012",
      street: "Al Kharj Road",
      country: "Saudi Arabia",
      city: "Riyadh",
      contacts: [
        {
          name: "Ahmed Al-Rashid",
          jobTitle: "Operations Manager",
          email: "ahmed.rashid@alsafi.com.sa",
          mobile: "+966501234574",
          landline: "+966112345684",
          preferredLanguage: "Arabic"
        }
      ],
      salesOrg: "3000",
      distributionChannel: "30",
      division: "20"
    },
    {
      name: "Nadec",
      nameAr: "نادك",
      customerType: "Public Company",
      ownerName: "Saud Al-Rasheed",
      taxNumber: "300000000000004",
      buildingNumber: "3456",
      street: "King Fahd Road",
      country: "Saudi Arabia",
      city: "Riyadh",
      contacts: [
        {
          name: "Sarah Al-Mansouri",
          jobTitle: "Procurement Specialist",
          email: "sarah.mansouri@nadec.com.sa",
          mobile: "+966501234575",
          landline: "+966112345685",
          preferredLanguage: "English"
        }
      ],
      salesOrg: "4000",
      distributionChannel: "40",
      division: "30"
    },
    {
      name: "Al Rabie Saudi Foods",
      nameAr: "الرابي للأغذية السعودية",
      customerType: "Private Company",
      ownerName: "Omar Al-Rabie",
      taxNumber: "300000000000005",
      buildingNumber: "7890",
      street: "Industrial Zone",
      country: "Saudi Arabia",
      city: "Dammam",
      contacts: [
        {
          name: "Layla Al-Ghamdi",
          jobTitle: "Quality Manager",
          email: "layla.ghamdi@alrabie.com.sa",
          mobile: "+966501234576",
          landline: "+966112345686",
          preferredLanguage: "Arabic"
        }
      ],
      salesOrg: "5000",
      distributionChannel: "50",
      division: "40"
    },
    // Egypt Food Companies
    {
      name: "Juhayna Food Industries",
      nameAr: "جهينة للصناعات الغذائية",
      customerType: "Public Company",
      ownerName: "Safwan Thabet",
      taxNumber: "200000000000001",
      buildingNumber: "1111",
      street: "6th October City",
      country: "Egypt",
      city: "Cairo",
      contacts: [
        {
          name: "Mohammed Hassan",
          jobTitle: "Procurement Manager",
          email: "mohammed.hassan@juhayna.com",
          mobile: "+201001234567",
          landline: "+20212345678",
          preferredLanguage: "Arabic"
        },
        {
          name: "Amina Farouk",
          jobTitle: "Supply Chain Director",
          email: "amina.farouk@juhayna.com",
          mobile: "+201001234568",
          landline: "+20212345679",
          preferredLanguage: "Arabic"
        }
      ],
      salesOrg: "6000",
      distributionChannel: "60",
      division: "50"
    },
    {
      name: "Domty",
      nameAr: "دمتي",
      customerType: "Public Company",
      ownerName: "Ahmed Domty",
      taxNumber: "200000000000002",
      buildingNumber: "2222",
      street: "New Cairo",
      country: "Egypt",
      city: "Cairo",
      contacts: [
        {
          name: "Youssef Ibrahim",
          jobTitle: "Operations Manager",
          email: "youssef.ibrahim@domty.com",
          mobile: "+201001234569",
          landline: "+20212345680",
          preferredLanguage: "Arabic"
        }
      ],
      salesOrg: "7000",
      distributionChannel: "70",
      division: "60"
    },
    {
      name: "Panda Retail Company",
      nameAr: "شركة بنده للتجزئة",
      customerType: "Private Company",
      ownerName: "Fawaz Al-Hokair",
      taxNumber: "300000000000006",
      buildingNumber: "3333",
      street: "King Abdullah Road",
      country: "Saudi Arabia",
      city: "Riyadh",
      contacts: [
        {
          name: "Reem Al-Sheikh",
          jobTitle: "Retail Operations Manager",
          email: "reem.sheikh@panda.com.sa",
          mobile: "+966501234577",
          landline: "+966112345687",
          preferredLanguage: "Arabic"
        }
      ],
      salesOrg: "8000",
      distributionChannel: "80",
      division: "70"
    },
    {
      name: "Carrefour Egypt",
      nameAr: "كارفور مصر",
      customerType: "Private Company",
      ownerName: "Majid Al Futtaim",
      taxNumber: "200000000000003",
      buildingNumber: "4444",
      street: "New Administrative Capital",
      country: "Egypt",
      city: "Cairo",
      contacts: [
        {
          name: "Hassan Al-Malki",
          jobTitle: "Store Manager",
          email: "hassan.malki@carrefour.com.eg",
          mobile: "+201001234570",
          landline: "+20212345681",
          preferredLanguage: "Arabic"
        }
      ],
      salesOrg: "9000",
      distributionChannel: "90",
      division: "80"
    },
    {
      name: "Spinneys",
      nameAr: "سبينيس",
      customerType: "Private Company",
      ownerName: "Majid Al Futtaim",
      taxNumber: "200000000000004",
      buildingNumber: "5555",
      street: "Zamalek",
      country: "Egypt",
      city: "Cairo",
      contacts: [
        {
          name: "Nour El-Din",
          jobTitle: "Procurement Specialist",
          email: "nour.eldin@spinneys.com.eg",
          mobile: "+201001234571",
          landline: "+20212345682",
          preferredLanguage: "Arabic"
        }
      ],
      salesOrg: "10000",
      distributionChannel: "100",
      division: "90"
    },
    // UAE Food Companies
    {
      name: "Emirates Food Industries",
      nameAr: "الإمارات للصناعات الغذائية",
      customerType: "Private Company",
      ownerName: "Ahmed Al-Maktoum",
      taxNumber: "400000000000001",
      buildingNumber: "6666",
      street: "Dubai Industrial City",
      country: "UAE",
      city: "Dubai",
      contacts: [
        {
          name: "Fatima Al-Zahra",
          jobTitle: "Quality Control Manager",
          email: "fatima.zahra@emiratesfood.ae",
          mobile: "+971501234567",
          landline: "+97141234567",
          preferredLanguage: "Arabic"
        }
      ],
      salesOrg: "11000",
      distributionChannel: "110",
      division: "100"
    },
    {
      name: "Al Ain Dairy",
      nameAr: "ألبان العين",
      customerType: "Private Company",
      ownerName: "Mohammed Al-Dhaheri",
      taxNumber: "400000000000002",
      buildingNumber: "7777",
      street: "Al Ain Industrial Area",
      country: "UAE",
      city: "Al Ain",
      contacts: [
        {
          name: "Khalid Al-Suwaidi",
          jobTitle: "Production Manager",
          email: "khalid.suwaidi@alaindairy.ae",
          mobile: "+971501234568",
          landline: "+97131234567",
          preferredLanguage: "Arabic"
        }
      ],
      salesOrg: "12000",
      distributionChannel: "120",
      division: "110"
    },
    // Kuwait Food Companies
    {
      name: "Kuwait Food Company",
      nameAr: "شركة الكويت للأغذية",
      customerType: "Public Company",
      ownerName: "Nasser Al-Sabah",
      taxNumber: "500000000000001",
      buildingNumber: "8888",
      street: "Shuwaikh Industrial Area",
      country: "Kuwait",
      city: "Kuwait City",
      contacts: [
        {
          name: "Mariam Al-Kandari",
          jobTitle: "Procurement Manager",
          email: "mariam.kandari@kfc.com.kw",
          mobile: "+965501234567",
          landline: "+96512345678",
          preferredLanguage: "Arabic"
        }
      ],
      salesOrg: "13000",
      distributionChannel: "130",
      division: "120"
    },
    // Yemen Food Companies
    {
      name: "Yemen Food Industries",
      nameAr: "اليمن للصناعات الغذائية",
      customerType: "Private Company",
      ownerName: "Ahmed Al-Yemeni",
      taxNumber: "600000000000001",
      buildingNumber: "9999",
      street: "Sana'a Industrial Zone",
      country: "Yemen",
      city: "Sana'a",
      contacts: [
        {
          name: "Abdullah Al-Hadrami",
          jobTitle: "Operations Director",
          email: "abdullah.hadrami@yfi.com.ye",
          mobile: "+967701234567",
          landline: "+96711234567",
          preferredLanguage: "Arabic"
        }
      ],
      salesOrg: "14000",
      distributionChannel: "140",
      division: "130"
    },
    // Qatar Food Companies
    {
      name: "Qatar Food Industries",
      nameAr: "قطر للصناعات الغذائية",
      customerType: "Private Company",
      ownerName: "Sheikh Hamad Al-Thani",
      taxNumber: "700000000000001",
      buildingNumber: "1010",
      street: "Doha Industrial Area",
      country: "Qatar",
      city: "Doha",
      contacts: [
        {
          name: "Nasser Al-Qahtani",
          jobTitle: "Supply Chain Manager",
          email: "nasser.qahtani@qfi.com.qa",
          mobile: "+974501234567",
          landline: "+97441234567",
          preferredLanguage: "Arabic"
        }
      ],
      salesOrg: "15000",
      distributionChannel: "150",
      division: "140"
    }
  ];

  private usedCompanies: Set<number> = new Set();
  private lastUsedIndex: number = -1;

  constructor() {
    // Initialize with some randomness
    this.shuffleCompanies();
  }

  /**
   * Generates demo data for a company
   * Ensures different company each time
   */
  generateDemoData(): DemoCompany {
    let selectedIndex: number;
    
    // If all companies have been used, reset and shuffle
    if (this.usedCompanies.size >= this.companies.length) {
      this.usedCompanies.clear();
      this.shuffleCompanies();
    }

    // Find next unused company
    do {
      selectedIndex = Math.floor(Math.random() * this.companies.length);
    } while (this.usedCompanies.has(selectedIndex) && this.usedCompanies.size < this.companies.length);

    // Mark as used
    this.usedCompanies.add(selectedIndex);
    this.lastUsedIndex = selectedIndex;

    // Get the company and enhance it with country-specific data
    const company = this.deepClone(this.companies[selectedIndex]);
    
    // Generate additional contacts with country-specific data
    const additionalContacts = this.generateAdditionalContacts(2, company.country);
    company.contacts = [...company.contacts, ...additionalContacts];
    
    // Update owner name to be country-specific
    const countryData = this.getCountryData(company.country);
    const ownerFirstName = countryData.firstNames[Math.floor(Math.random() * countryData.firstNames.length)];
    const ownerLastName = countryData.lastNames[Math.floor(Math.random() * countryData.lastNames.length)];
    company.ownerName = `${ownerFirstName} ${ownerLastName}`;

    return company;
  }

  /**
   * Gets the last used company (for reference)
   */
  getLastUsedCompany(): DemoCompany | null {
    if (this.lastUsedIndex >= 0) {
      return this.deepClone(this.companies[this.lastUsedIndex]);
    }
    return null;
  }

  /**
   * Gets remaining unused companies count
   */
  getRemainingCompaniesCount(): number {
    return this.companies.length - this.usedCompanies.size;
  }

  /**
   * Resets the generator (clears used companies)
   */
  resetGenerator(): void {
    this.usedCompanies.clear();
    this.lastUsedIndex = -1;
    this.shuffleCompanies();
  }

  /**
   * Shuffles the companies array for more randomness
   */
  private shuffleCompanies(): void {
    for (let i = this.companies.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.companies[i], this.companies[j]] = [this.companies[j], this.companies[i]];
    }
  }

  /**
   * Deep clone utility
   */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Generates random additional contacts for variety
   */
  generateAdditionalContacts(count: number = 1, country?: string): DemoContact[] {
    const jobTitles = [
      "Procurement Manager",
      "Operations Director", 
      "Quality Control Manager",
      "Food Safety Manager",
      "Supply Chain Director",
      "Production Manager",
      "Logistics Manager",
      "Sales Manager",
      "Marketing Manager",
      "Retail Operations Manager",
      "Store Manager",
      "Distribution Manager",
      "Warehouse Manager",
      "Customer Service Manager",
      "Business Development Manager"
    ];

    // Get country-specific names and phone formats
    const countryData = this.getCountryData(country || 'Saudi Arabia');
    const firstNames = countryData.firstNames;
    const lastNames = countryData.lastNames;
    const phoneFormat = countryData.phoneFormat;
    const domains = countryData.domains;

    const contacts: DemoContact[] = [];

    for (let i = 0; i < count; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const jobTitle = jobTitles[Math.floor(Math.random() * jobTitles.length)];
      const domain = domains[Math.floor(Math.random() * domains.length)];
      
      // Generate country-specific phone numbers
      const mobile = this.generatePhoneNumber(phoneFormat.mobile);
      const landline = this.generatePhoneNumber(phoneFormat.landline);
      
      contacts.push({
        name: `${firstName} ${lastName}`,
        jobTitle: jobTitle,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace('al-', '')}@${domain}`,
        mobile: mobile,
        landline: landline,
        preferredLanguage: Math.random() > 0.5 ? "Arabic" : "English"
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
        domains: ["company.com", "corp.sa", "group.com", "holdings.sa", "enterprise.com"]
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
          landline: "+202XXXXXXXXX"
        },
        domains: ["company.com.eg", "corp.eg", "group.com.eg", "holdings.eg", "enterprise.com.eg"]
      },
      'UAE': {
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
      'Kuwait': {
        firstNames: [
          "Ahmed", "Mohammed", "Omar", "Khalid", "Saud", "Fahad", "Abdullah", "Yousef",
          "Fatima", "Noura", "Layla", "Reem", "Sarah", "Aisha", "Hala", "Mona"
        ],
        lastNames: [
          "Al-Sabah", "Al-Kandari", "Al-Mutairi", "Al-Rashid", "Al-Dosari", 
          "Al-Mutairi", "Al-Harbi", "Al-Ghamdi", "Al-Sheikh", "Al-Malki"
        ],
        phoneFormat: {
          mobile: "+9656XXXXXXXX",
          landline: "+9652XXXXXXXX"
        },
        domains: ["company.kw", "corp.kw", "group.kw", "holdings.kw", "enterprise.kw"]
      },
      'Qatar': {
        firstNames: [
          "Ahmed", "Mohammed", "Omar", "Khalid", "Saud", "Fahad", "Abdullah", "Yousef",
          "Fatima", "Noura", "Layla", "Reem", "Sarah", "Aisha", "Hala", "Mona"
        ],
        lastNames: [
          "Al-Thani", "Al-Mahmoud", "Al-Kuwari", "Al-Suwaidi", "Al-Dosari", 
          "Al-Mutairi", "Al-Harbi", "Al-Ghamdi", "Al-Sheikh", "Al-Malki"
        ],
        phoneFormat: {
          mobile: "+9743XXXXXXXX",
          landline: "+9744XXXXXXXX"
        },
        domains: ["company.qa", "corp.qa", "group.qa", "holdings.qa", "enterprise.qa"]
      }
    };

    return countryData[country] || countryData['Saudi Arabia'];
  }

  /**
   * Generate phone number based on format
   */
  private generatePhoneNumber(format: string): string {
    return format.replace(/X/g, () => Math.floor(Math.random() * 10).toString());
  }

  /**
   * Generates demo documents for testing the document viewer
   */
  generateDemoDocuments(): any[] {
    const documents = [
      {
        name: 'السجل التجاري - شركة المراعي.pdf',
        type: 'Commercial Registration',
        description: 'السجل التجاري الرسمي للشركة',
        mime: 'application/pdf',
        size: 245760, // ~240KB
        contentBase64: this.generatePdfBase64('السجل التجاري - شركة المراعي'),
        uploadedAt: new Date().toISOString()
      },
      {
        name: 'الشهادة الضريبية - شركة المراعي.pdf', 
        type: 'Tax Certificate',
        description: 'الشهادة الضريبية الصادرة من الهيئة العامة للزكاة والدخل',
        mime: 'application/pdf',
        size: 189440, // ~185KB
        contentBase64: this.generatePdfBase64('الشهادة الضريبية - شركة المراعي'),
        uploadedAt: new Date().toISOString()
      },
      {
        name: 'صورة السجل التجاري.jpg',
        type: 'Commercial Registration',
        description: 'صورة فوتوغرافية للسجل التجاري',
        mime: 'image/jpeg',
        size: 156789, // ~153KB
        contentBase64: this.generateImageBase64('السجل التجاري'),
        uploadedAt: new Date().toISOString()
      },
      {
        name: 'الشهادة الضريبية.jpg',
        type: 'Tax Certificate', 
        description: 'صورة فوتوغرافية للشهادة الضريبية',
        mime: 'image/jpeg',
        size: 198432, // ~194KB
        contentBase64: this.generateImageBase64('الشهادة الضريبية'),
        uploadedAt: new Date().toISOString()
      },
      {
        name: 'ترخيص النشاط التجاري.pdf',
        type: 'License',
        description: 'ترخيص مزاولة النشاط التجاري',
        mime: 'application/pdf',
        size: 312456, // ~305KB
        contentBase64: this.generatePdfBase64('ترخيص النشاط التجاري'),
        uploadedAt: new Date().toISOString()
      }
    ];

    // Return 2-3 random documents
    const numDocs = Math.floor(Math.random() * 2) + 2; // 2-3 documents
    return documents.slice(0, numDocs);
  }

  /**
   * Generates a simple PDF base64 content (demo purposes)
   */
  private generatePdfBase64(title: string): string {
    // Simple PDF content for demo
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
    // Simple 1x1 pixel image as base64
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }
}
