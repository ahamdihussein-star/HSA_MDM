// Demo Sanctions Data for Middle East Companies
// This file contains realistic mock data for companies under international sanctions
// from Egypt, UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman, and Yemen

const demoSanctionsData = {
  companies: [
    // Egypt
    {
      id: "SANCT_EGY_001",
      companyName: "Al-Masry Food Industries Ltd",
      country: "Egypt",
      companyType: "limited_liability",
      city: "Cairo",
      street: "Nasr City, Industrial Zone 3",
      buildingNumber: "45",
      source: "compliance_task",
      status: "Under Sanctions",
      lastUpdated: "2024-01-15T10:30:00Z",
      sanctions: [
        {
          name: "US Treasury OFAC",
          type: "Economic Sanctions",
          country: "United States",
          source: "OFAC",
          riskLevel: "High",
          confidence: 95,
          description: "Designated for providing material support to designated terrorist organizations",
          effectiveDate: "2023-08-15",
          endDate: null
        }
      ],
      registrationNumber: "EG-2023-4456",
      industry: "Food Processing"
    },
    {
      id: "SANCT_EGY_002", 
      companyName: "Nile Agricultural Exports Co",
      country: "Egypt",
      companyType: "joint_stock",
      city: "Alexandria",
      street: "Port Said Street",
      buildingNumber: "123",
      source: "compliance_task",
      status: "Under Sanctions",
      lastUpdated: "2024-02-20T14:45:00Z",
      sanctions: [
        {
          name: "EU Sanctions List",
          type: "Asset Freeze",
          country: "European Union",
          source: "EU",
          riskLevel: "Medium",
          confidence: 88,
          description: "Listed for involvement in arms proliferation activities",
          effectiveDate: "2023-11-30",
          endDate: null
        }
      ],
      registrationNumber: "EG-2022-7890",
      industry: "Agricultural Exports"
    },

    // UAE
    {
      id: "SANCT_UAE_001",
      companyName: "Gulf Food Manufacturing LLC",
      country: "UAE",
      companyType: "limited_liability",
      city: "Dubai",
      street: "Jebel Ali Free Zone",
      buildingNumber: "FZ-456",
      source: "compliance_task", 
      status: "Under Sanctions",
      lastUpdated: "2024-01-10T09:15:00Z",
      sanctions: [
        {
          name: "UK OFSI",
          type: "Financial Sanctions",
          country: "United Kingdom",
          source: "UK OFSI",
          riskLevel: "Critical",
          confidence: 98,
          description: "Designated for facilitating money laundering operations",
          effectiveDate: "2023-09-20",
          endDate: null
        },
        {
          name: "US Treasury OFAC",
          type: "Economic Sanctions", 
          country: "United States",
          source: "OFAC",
          riskLevel: "High",
          confidence: 92,
          description: "Listed for connections to sanctioned entities",
          effectiveDate: "2023-10-05",
          endDate: null
        }
      ],
      registrationNumber: "UAE-2023-1122",
      industry: "Food Manufacturing"
    },
    {
      id: "SANCT_UAE_002",
      companyName: "Emirates Beverage Corporation",
      country: "UAE", 
      companyType: "public_joint_stock",
      city: "Abu Dhabi",
      street: "Industrial City of Abu Dhabi",
      buildingNumber: "ICAD-789",
      source: "compliance_task",
      status: "Under Sanctions", 
      lastUpdated: "2024-03-05T16:20:00Z",
      sanctions: [
        {
          name: "UN Security Council",
          type: "Asset Freeze",
          country: "United Nations",
          source: "UN",
          riskLevel: "Critical",
          confidence: 99,
          description: "Listed by UN Security Council for terrorism financing",
          effectiveDate: "2023-12-01",
          endDate: null
        }
      ],
      registrationNumber: "UAE-2021-5566",
      industry: "Beverage Production"
    },

    // Saudi Arabia
    {
      id: "SANCT_SAU_001",
      companyName: "Saudi Food Processing Industries",
      country: "Saudi Arabia",
      companyType: "limited_liability",
      city: "Riyadh",
      street: "King Abdulaziz Industrial City",
      buildingNumber: "KAIC-334",
      source: "compliance_task",
      status: "Under Sanctions",
      lastUpdated: "2024-02-15T11:30:00Z",
      sanctions: [
        {
          name: "US Treasury OFAC",
          type: "Economic Sanctions",
          country: "United States", 
          source: "OFAC",
          riskLevel: "High",
          confidence: 94,
          description: "Designated for providing support to sanctioned individuals",
          effectiveDate: "2023-07-10",
          endDate: null
        }
      ],
      registrationNumber: "SA-2023-7788",
      industry: "Food Processing"
    },
    {
      id: "SANCT_SAU_002",
      companyName: "Red Sea Agricultural Co",
      country: "Saudi Arabia",
      companyType: "joint_stock",
      city: "Jeddah", 
      street: "Industrial Zone 2",
      buildingNumber: "IZ2-991",
      source: "compliance_task",
      status: "Under Sanctions",
      lastUpdated: "2024-01-25T13:45:00Z",
      sanctions: [
        {
          name: "EU Sanctions List",
          type: "Asset Freeze",
          country: "European Union",
          source: "EU", 
          riskLevel: "Medium",
          confidence: 85,
          description: "Listed for involvement in prohibited trade activities",
          effectiveDate: "2023-10-15",
          endDate: null
        }
      ],
      registrationNumber: "SA-2022-4455",
      industry: "Agriculture"
    },

    // Qatar
    {
      id: "SANCT_QAT_001",
      companyName: "Qatar Food & Beverage Industries",
      country: "Qatar",
      companyType: "limited_liability",
      city: "Doha",
      street: "Doha Industrial Area",
      buildingNumber: "DIA-667",
      source: "compliance_task",
      status: "Under Sanctions",
      lastUpdated: "2024-03-01T08:20:00Z",
      sanctions: [
        {
          name: "UK OFSI",
          type: "Financial Sanctions",
          country: "United Kingdom",
          source: "UK OFSI",
          riskLevel: "High",
          confidence: 91,
          description: "Designated for facilitating prohibited financial transactions",
          effectiveDate: "2023-11-20",
          endDate: null
        }
      ],
      registrationNumber: "QA-2023-2233",
      industry: "Food & Beverage"
    },

    // Kuwait
    {
      id: "SANCT_KUW_001",
      companyName: "Kuwaiti Food Manufacturing Co",
      country: "Kuwait",
      companyType: "limited_liability", 
      city: "Kuwait City",
      street: "Shuwaikh Industrial Area",
      buildingNumber: "SIA-889",
      source: "compliance_task",
      status: "Under Sanctions",
      lastUpdated: "2024-02-28T15:10:00Z",
      sanctions: [
        {
          name: "US Treasury OFAC",
          type: "Economic Sanctions",
          country: "United States",
          source: "OFAC",
          riskLevel: "Medium",
          confidence: 87,
          description: "Listed for connections to sanctioned entities",
          effectiveDate: "2023-09-05",
          endDate: null
        }
      ],
      registrationNumber: "KW-2023-5566",
      industry: "Food Manufacturing"
    },

    // Bahrain
    {
      id: "SANCT_BHR_001",
      companyName: "Bahrain Food Industries Ltd",
      country: "Bahrain",
      companyType: "limited_liability",
      city: "Manama",
      street: "Hidd Industrial Area",
      buildingNumber: "HIA-445",
      source: "compliance_task",
      status: "Under Sanctions",
      lastUpdated: "2024-01-20T12:35:00Z",
      sanctions: [
        {
          name: "EU Sanctions List",
          type: "Asset Freeze",
          country: "European Union",
          source: "EU",
          riskLevel: "High",
          confidence: 93,
          description: "Designated for involvement in prohibited activities",
          effectiveDate: "2023-08-30",
          endDate: null
        }
      ],
      registrationNumber: "BH-2023-7789",
      industry: "Food Industries"
    },

    // Oman
    {
      id: "SANCT_OMN_001",
      companyName: "Omani Agricultural Products Co",
      country: "Oman",
      companyType: "limited_liability",
      city: "Muscat",
      street: "Rusayl Industrial Estate",
      buildingNumber: "RIE-223",
      source: "compliance_task",
      status: "Under Sanctions",
      lastUpdated: "2024-03-10T10:50:00Z",
      sanctions: [
        {
          name: "UK OFSI",
          type: "Financial Sanctions",
          country: "United Kingdom",
          source: "UK OFSI",
          riskLevel: "Medium",
          confidence: 89,
          description: "Listed for facilitating prohibited financial operations",
          effectiveDate: "2023-12-15",
          endDate: null
        }
      ],
      registrationNumber: "OM-2023-4455",
      industry: "Agricultural Products"
    },

    // Yemen
    {
      id: "SANCT_YEM_001",
      companyName: "Yemen Food Processing Industries",
      country: "Yemen",
      companyType: "limited_liability",
      city: "Sana'a",
      street: "Industrial Zone",
      buildingNumber: "IZ-112",
      source: "compliance_task",
      status: "Under Sanctions",
      lastUpdated: "2024-02-05T14:25:00Z",
      sanctions: [
        {
          name: "UN Security Council",
          type: "Asset Freeze",
          country: "United Nations",
          source: "UN",
          riskLevel: "Critical",
          confidence: 97,
          description: "Listed by UN Security Council for terrorism financing",
          effectiveDate: "2023-06-20",
          endDate: null
        },
        {
          name: "US Treasury OFAC",
          type: "Economic Sanctions",
          country: "United States",
          source: "OFAC",
          riskLevel: "High",
          confidence: 96,
          description: "Designated for providing material support to designated groups",
          effectiveDate: "2023-07-15",
          endDate: null
        }
      ],
      registrationNumber: "YE-2023-3344",
      industry: "Food Processing"
    }
  ]
};

module.exports = demoSanctionsData;

