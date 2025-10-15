import { Injectable } from '@angular/core';

export interface SanctionedCompany {
  id: string;
  name: string;
  nameAr: string;
  customerType: string;
  ownerName: string;
  taxNumber: string;
  buildingNumber: string;
  street: string;
  country: string;
  city: string;
  industry: string;
  sector: string;
  salesOrg: string;
  distributionChannel: string;
  division: string;
  source: string;
  sanctionProgram: string;
  sanctionReason: string;
  sanctionStartDate: string;
  riskLevel: string;
  sourceList: string;
  datasetVersion: string;
  lastVerified: string;
  openSanctionsLink: string;
  contacts: SanctionedContact[];
}

export interface SanctionedContact {
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
export class SanctionedDemoDataService {
  
  private sanctionedCompanies: SanctionedCompany[] = [
    {
      id: "sanctioned_1",
      name: "SINOPER SHIPPING CO",
      nameAr: "شركة سينوبر للشحن",
      customerType: "Corporate",
      country: "United Arab Emirates",
      city: "Dubai",
      buildingNumber: "Office 2207, Prime Tower",
      street: "Business Bay",
      ownerName: "Saeed Al Mansoori",
      industry: "Shipping and marine logistics",
      sector: "Shipping",
      salesOrg: "uae_dubai_office",
      distributionChannel: "direct_sales",
      division: "energy_products",
      source: "OFAC Sanctions List",
      sanctionProgram: "Violating sanctions on Iranian oil trade",
      sanctionReason: "Helped Iran transport oil using front companies",
      sanctionStartDate: "2025-10-09",
      riskLevel: "High",
      sourceList: "OFAC",
      datasetVersion: "October 2025 Update",
      lastVerified: "2025-10-14",
      openSanctionsLink: "https://www.opensanctions.org/entities/ofac-55672/",
      taxNumber: "400900000000001",
      contacts: [
        { name: "Rashid Al-Maktoum", jobTitle: "Chief Executive Officer", email: "rashid@sinopershipping.com", mobile: "+971 50 1000000", landline: "+971 4 3000000", preferredLanguage: "English" },
        { name: "Maryam Al-Falasi", jobTitle: "Chief Financial Officer", email: "maryam@sinopershipping.com", mobile: "+971 50 1123456", landline: "+971 4 3123456", preferredLanguage: "English" },
        { name: "Sultan Al-Qasimi", jobTitle: "Operations Manager", email: "sultan@sinopershipping.com", mobile: "+971 50 1246913", landline: "+971 4 3246913", preferredLanguage: "English" },
        { name: "Latifa Al-Sharqi", jobTitle: "Compliance Officer", email: "latifa@sinopershipping.com", mobile: "+971 50 1370370", landline: "+971 4 3370370", preferredLanguage: "Arabic" }
      ]
    },
    {
      id: "sanctioned_2",
      name: "SLOGAL ENERGY DMCC",
      nameAr: "شركة سلوقال للطاقة",
      customerType: "limited_liability",
      country: "United Arab Emirates",
      city: "Dubai",
      buildingNumber: "Jumeirah Bay X3 Tower",
      street: "JLT",
      ownerName: "Fatima Al Suwaidi",
      industry: "Energy and petrochemical trading",
      sector: "Energy Trading",
      salesOrg: "uae_dubai_office",
      distributionChannel: "authorized_distributors",
      division: "energy_products",
      source: "OFAC Sanctions List",
      sanctionProgram: "Involved in Iranian oil trade",
      sanctionReason: "Assisted Iranian companies to sell petrochemicals secretly",
      sanctionStartDate: "2025-10-09",
      riskLevel: "High",
      sourceList: "OFAC",
      datasetVersion: "October 2025 Update",
      lastVerified: "2025-10-14",
      openSanctionsLink: "https://www.opensanctions.org/entities/ofac-55721/",
      taxNumber: "400900000000002",
      contacts: [
        { name: "Rashid Al-Maktoum", jobTitle: "Chief Executive Officer", email: "rashid@slogatlenergy.com", mobile: "+971 50 2000000", landline: "+971 4 4000000", preferredLanguage: "English" },
        { name: "Maryam Al-Falasi", jobTitle: "Chief Financial Officer", email: "maryam@slogatlenergy.com", mobile: "+971 50 2123456", landline: "+971 4 4123456", preferredLanguage: "English" },
        { name: "Sultan Al-Qasimi", jobTitle: "Operations Manager", email: "sultan@slogatlenergy.com", mobile: "+971 50 2246913", landline: "+971 4 4246913", preferredLanguage: "English" },
        { name: "Latifa Al-Sharqi", jobTitle: "Compliance Officer", email: "latifa@slogatlenergy.com", mobile: "+971 50 2370370", landline: "+971 4 4370370", preferredLanguage: "Arabic" }
      ]
    },
    {
      id: "sanctioned_3",
      name: "S E A SHIP MANAGEMENT LLC",
      nameAr: "شركة سي إي إيه لإدارة السفن",
      customerType: "limited_liability",
      country: "United Arab Emirates",
      city: "Dubai",
      buildingNumber: "Oxford Tower",
      street: "Business Bay",
      ownerName: "Hamad Al Nuaimi",
      industry: "Ship management",
      sector: "Maritime / Shipping",
      salesOrg: "uae_dubai_office",
      distributionChannel: "direct_sales",
      division: "shipping_logistics",
      source: "OFAC Sanctions List",
      sanctionProgram: "Supported Iranian shipping operations",
      sanctionReason: "Managed vessels involved in Iranian oil transport",
      sanctionStartDate: "2025-10-09",
      riskLevel: "High",
      sourceList: "OFAC",
      datasetVersion: "October 2025 Update",
      lastVerified: "2025-10-14",
      openSanctionsLink: "https://www.opensanctions.org/entities/ofac-55633/",
      taxNumber: "400900000000003",
      contacts: [
        { name: "Rashid Al-Maktoum", jobTitle: "Chief Executive Officer", email: "rashid@seaship.com", mobile: "+971 50 3000000", landline: "+971 4 5000000", preferredLanguage: "English" },
        { name: "Maryam Al-Falasi", jobTitle: "Chief Financial Officer", email: "maryam@seaship.com", mobile: "+971 50 3123456", landline: "+971 4 5123456", preferredLanguage: "English" },
        { name: "Sultan Al-Qasimi", jobTitle: "Operations Manager", email: "sultan@seaship.com", mobile: "+971 50 3246913", landline: "+971 4 5246913", preferredLanguage: "English" },
        { name: "Latifa Al-Sharqi", jobTitle: "Compliance Officer", email: "latifa@seaship.com", mobile: "+971 50 3370370", landline: "+971 4 5370370", preferredLanguage: "Arabic" }
      ]
    },
    {
      id: "sanctioned_4",
      name: "Arkan Mars Petroleum DMCC",
      nameAr: "شركة أركان مارس للبترول",
      customerType: "limited_liability",
      country: "United Arab Emirates",
      city: "Dubai",
      buildingNumber: "Dome Tower, Cluster N",
      street: "Jumeirah Lake Towers",
      ownerName: "Khalid Al Marri",
      industry: "Oil trading",
      sector: "Energy / Oil Trading",
      salesOrg: "uae_dubai_office",
      distributionChannel: "wholesale_partners",
      division: "energy_products",
      source: "OFAC Sanctions List",
      sanctionProgram: "Terrorism financing / Supporting Houthi rebels",
      sanctionReason: "Helped transfer $12 million worth of Iranian oil to the Houthi group",
      sanctionStartDate: "2025-06-20",
      riskLevel: "Very High",
      sourceList: "OFAC",
      datasetVersion: "October 2025 Update",
      lastVerified: "2025-10-14",
      openSanctionsLink: "https://www.opensanctions.org/entities/NK-bZhtJPyKJEYY7BmN2mqKmD/",
      taxNumber: "400900000000004",
      contacts: [
        { name: "Rashid Al-Maktoum", jobTitle: "Chief Executive Officer", email: "rashid@arkanmars.com", mobile: "+971 50 4000000", landline: "+971 4 6000000", preferredLanguage: "English" },
        { name: "Maryam Al-Falasi", jobTitle: "Chief Financial Officer", email: "maryam@arkanmars.com", mobile: "+971 50 4123456", landline: "+971 4 6123456", preferredLanguage: "English" },
        { name: "Sultan Al-Qasimi", jobTitle: "Operations Manager", email: "sultan@arkanmars.com", mobile: "+971 50 4246913", landline: "+971 4 6246913", preferredLanguage: "English" },
        { name: "Latifa Al-Sharqi", jobTitle: "Compliance Officer", email: "latifa@arkanmars.com", mobile: "+971 50 4370370", landline: "+971 4 6370370", preferredLanguage: "Arabic" }
      ]
    },
    {
      id: "sanctioned_5",
      name: "GRAINS MIDDLE EAST TRADING DWC-LLC",
      nameAr: "شركة الحبوب للتجارة الشرق الأوسط",
      customerType: "limited_liability",
      country: "United Arab Emirates",
      city: "Dubai",
      buildingNumber: "BUILDING A3 OFFICE 213",
      street: "Dubai World Central Business Park",
      ownerName: "Abdulla Al Falasi",
      industry: "Food and grain trading",
      sector: "Agriculture / Commodity Trading",
      salesOrg: "uae_dubai_office",
      distributionChannel: "business_to_business",
      division: "general_trading",
      source: "OFAC Sanctions List",
      sanctionProgram: "Linked to sanctioned Syrian business network",
      sanctionReason: "Connected to companies that support the Syrian regime financially",
      sanctionStartDate: "2025-06-30",
      riskLevel: "High",
      sourceList: "OFAC",
      datasetVersion: "October 2025 Update",
      lastVerified: "2025-10-14",
      openSanctionsLink: "https://www.opensanctions.org/entities/NK-o8VasJ9pUxsVdhwQeB2b9P/",
      taxNumber: "400900000000005",
      contacts: [
        { name: "Rashid Al-Maktoum", jobTitle: "Chief Executive Officer", email: "rashid@grainsme.com", mobile: "+971 50 5000000", landline: "+971 4 7000000", preferredLanguage: "English" },
        { name: "Maryam Al-Falasi", jobTitle: "Chief Financial Officer", email: "maryam@grainsme.com", mobile: "+971 50 5123456", landline: "+971 4 7123456", preferredLanguage: "English" },
        { name: "Sultan Al-Qasimi", jobTitle: "Operations Manager", email: "sultan@grainsme.com", mobile: "+971 50 5246913", landline: "+971 4 7246913", preferredLanguage: "English" },
        { name: "Latifa Al-Sharqi", jobTitle: "Compliance Officer", email: "latifa@grainsme.com", mobile: "+971 50 5370370", landline: "+971 4 7370370", preferredLanguage: "Arabic" }
      ]
    },
    {
      id: "sanctioned_6",
      name: "ABBOT TRADING CO., LTD.",
      nameAr: "شركة أبوت للتجارة المحدودة",
      customerType: "limited_liability",
      country: "Yemen",
      city: "Sanaa",
      buildingNumber: "RAND-1001",
      street: "ZAYID STREET, SHAUB DIRECTORATE",
      ownerName: "Yahya Al-Aghbari",
      industry: "General trading",
      sector: "General Trading",
      salesOrg: "yemen_main_office",
      distributionChannel: "wholesale_partners",
      division: "general_trading",
      source: "OFAC Sanctions List",
      sanctionProgram: "Terrorism financing / Supporting Houthi rebels",
      sanctionReason: "Provided financial and logistical support to the Houthi militia",
      sanctionStartDate: "2025-06-20",
      riskLevel: "Very High",
      sourceList: "OFAC",
      datasetVersion: "October 2025 Update",
      lastVerified: "2025-10-14",
      openSanctionsLink: "https://www.opensanctions.org/entities/NK-gEYNHxptrEZnh8Wu3MA2Fu/",
      taxNumber: "500900000000001",
      contacts: [
        { name: "Abdullah Al-Ahmar", jobTitle: "Chief Executive Officer", email: "abdullah@abbottrading.com", mobile: "+967 77 1000000", landline: "+967 1 3000000", preferredLanguage: "Arabic" },
        { name: "Samira Al-Houthi", jobTitle: "Chief Financial Officer", email: "samira@abbottrading.com", mobile: "+967 77 1123456", landline: "+967 1 3123456", preferredLanguage: "Arabic" },
        { name: "Saleh Al-Sammad", jobTitle: "Operations Manager", email: "saleh@abbottrading.com", mobile: "+967 77 1246913", landline: "+967 1 3246913", preferredLanguage: "Arabic" },
        { name: "Nadia Al-Yemeni", jobTitle: "Compliance Officer", email: "nadia@abbottrading.com", mobile: "+967 77 1370370", landline: "+967 1 3370370", preferredLanguage: "Arabic" }
      ]
    },
    {
      id: "sanctioned_7",
      name: "GASOLINE AMAN COMPANY FOR OIL DERIVATIVES IMPORTS",
      nameAr: "شركة جاسولين أمان لاستيراد المشتقات النفطية",
      customerType: "limited_liability",
      country: "Yemen",
      city: "Sanaa",
      buildingNumber: "RAND-1002",
      street: "Industrial zone, north Sanaa",
      ownerName: "Nabil Al-Qadhi",
      industry: "Fuel and oil imports",
      sector: "Energy / Fuel Trading",
      salesOrg: "yemen_main_office",
      distributionChannel: "direct_sales",
      division: "energy_products",
      source: "OFAC Sanctions List",
      sanctionProgram: "Terrorism financing / Supporting Houthi rebels",
      sanctionReason: "Involved in fuel trade that funds the Houthi group",
      sanctionStartDate: "2025-06-20",
      riskLevel: "Very High",
      sourceList: "OFAC",
      datasetVersion: "October 2025 Update",
      lastVerified: "2025-10-14",
      openSanctionsLink: "https://www.opensanctions.org/entities/NK-gd6siGSUtsLSEUuFF6apnp/",
      taxNumber: "500900000000002",
      contacts: [
        { name: "Abdullah Al-Ahmar", jobTitle: "Chief Executive Officer", email: "abdullah@gasolineaman.com", mobile: "+967 77 2000000", landline: "+967 1 4000000", preferredLanguage: "Arabic" },
        { name: "Samira Al-Houthi", jobTitle: "Chief Financial Officer", email: "samira@gasolineaman.com", mobile: "+967 77 2123456", landline: "+967 1 4123456", preferredLanguage: "Arabic" },
        { name: "Saleh Al-Sammad", jobTitle: "Operations Manager", email: "saleh@gasolineaman.com", mobile: "+967 77 2246913", landline: "+967 1 4246913", preferredLanguage: "Arabic" },
        { name: "Nadia Al-Yemeni", jobTitle: "Compliance Officer", email: "nadia@gasolineaman.com", mobile: "+967 77 2370370", landline: "+967 1 4370370", preferredLanguage: "Arabic" }
      ]
    },
    {
      id: "sanctioned_8",
      name: "BLACK DIAMOND PETROLEUM DERIVATIVES",
      nameAr: "شركة بلاك دايموند للمشتقات النفطية",
      customerType: "sole_proprietorship",
      country: "Yemen",
      city: "Sanaa",
      buildingNumber: "RAND-1003",
      street: "Al-Thawra District",
      ownerName: "Hussein Al-Mutawakel",
      industry: "Petroleum trading",
      sector: "Energy / Petroleum Trading",
      salesOrg: "yemen_main_office",
      distributionChannel: "business_to_business",
      division: "energy_products",
      source: "OFAC Sanctions List",
      sanctionProgram: "Terrorism financing / Supporting Houthi rebels",
      sanctionReason: "Used to channel oil sales revenue to the Houthi militia",
      sanctionStartDate: "2025-06-20",
      riskLevel: "Very High",
      sourceList: "OFAC",
      datasetVersion: "October 2025 Update",
      lastVerified: "2025-10-14",
      openSanctionsLink: "https://www.opensanctions.org/entities/NK-htPhaUZ6zJWzDdvzUnaX8s/",
      taxNumber: "500900000000003",
      contacts: [
        { name: "Abdullah Al-Ahmar", jobTitle: "Chief Executive Officer", email: "abdullah@blackdiamond.com", mobile: "+967 77 3000000", landline: "+967 1 5000000", preferredLanguage: "Arabic" },
        { name: "Samira Al-Houthi", jobTitle: "Chief Financial Officer", email: "samira@blackdiamond.com", mobile: "+967 77 3123456", landline: "+967 1 5123456", preferredLanguage: "Arabic" },
        { name: "Saleh Al-Sammad", jobTitle: "Operations Manager", email: "saleh@blackdiamond.com", mobile: "+967 77 3246913", landline: "+967 1 5246913", preferredLanguage: "Arabic" },
        { name: "Nadia Al-Yemeni", jobTitle: "Compliance Officer", email: "nadia@blackdiamond.com", mobile: "+967 77 3370370", landline: "+967 1 5370370", preferredLanguage: "Arabic" }
      ]
    },
    {
      id: "sanctioned_9",
      name: "STAR PLUS YEMEN TRADING LIMITED",
      nameAr: "شركة ستار بلس اليمن للتجارة المحدودة",
      customerType: "limited_liability",
      country: "Yemen",
      city: "Sanaa",
      buildingNumber: "7 Yulyu",
      street: "Al-Hudaydah, Al-Hudaydah Governorate",
      ownerName: "Samir Al-Hakimi",
      industry: "Import and export",
      sector: "General Trading",
      salesOrg: "yemen_aden_branch",
      distributionChannel: "authorized_distributors",
      division: "general_trading",
      source: "OFAC Sanctions List",
      sanctionProgram: "Terrorism financing / Supporting Houthi rebels",
      sanctionReason: "Engaged in trade operations generating money for the Houthi group",
      sanctionStartDate: "2025-06-20",
      riskLevel: "Very High",
      sourceList: "OFAC",
      datasetVersion: "October 2025 Update",
      lastVerified: "2025-10-14",
      openSanctionsLink: "https://www.opensanctions.org/entities/NK-TKoWB7EdbHekxkkKZQdZWy/",
      taxNumber: "500900000000004",
      contacts: [
        { name: "Abdullah Al-Ahmar", jobTitle: "Chief Executive Officer", email: "abdullah@starplusyemen.com", mobile: "+967 77 4000000", landline: "+967 1 6000000", preferredLanguage: "Arabic" },
        { name: "Samira Al-Houthi", jobTitle: "Chief Financial Officer", email: "samira@starplusyemen.com", mobile: "+967 77 4123456", landline: "+967 1 6123456", preferredLanguage: "Arabic" },
        { name: "Saleh Al-Sammad", jobTitle: "Operations Manager", email: "saleh@starplusyemen.com", mobile: "+967 77 4246913", landline: "+967 1 6246913", preferredLanguage: "Arabic" },
        { name: "Nadia Al-Yemeni", jobTitle: "Compliance Officer", email: "nadia@starplusyemen.com", mobile: "+967 77 4370370", landline: "+967 1 6370370", preferredLanguage: "Arabic" }
      ]
    },
    {
      id: "sanctioned_10",
      name: "TAMCO ESTABLISHMENT FOR OIL DERIVATIVES",
      nameAr: "مؤسسة تامكو للمشتقات النفطية",
      customerType: "sole_proprietorship",
      country: "Yemen",
      city: "Sanaa",
      buildingNumber: "RAND-1004",
      street: "Houthi-controlled areas",
      ownerName: "Fouad Al-Mashreqi",
      industry: "Oil trading",
      sector: "Energy / Oil Trading",
      salesOrg: "yemen_taiz_branch",
      distributionChannel: "wholesale_partners",
      division: "energy_products",
      source: "OFAC Sanctions List",
      sanctionProgram: "Terrorism financing / Supporting Houthi rebels",
      sanctionReason: "Operates oil networks funding the Houthi group",
      sanctionStartDate: "2025-06-20",
      riskLevel: "Very High",
      sourceList: "OFAC",
      datasetVersion: "October 2025 Update",
      lastVerified: "2025-10-14",
      openSanctionsLink: "https://www.opensanctions.org/entities/NK-TTmPT2bWFgoQY7oVRJSFKN/",
      taxNumber: "500900000000005",
      contacts: [
        { name: "Abdullah Al-Ahmar", jobTitle: "Chief Executive Officer", email: "abdullah@tamcopetroleum.com", mobile: "+967 77 5000000", landline: "+967 1 7000000", preferredLanguage: "Arabic" },
        { name: "Samira Al-Houthi", jobTitle: "Chief Financial Officer", email: "samira@tamcopetroleum.com", mobile: "+967 77 5123456", landline: "+967 1 7123456", preferredLanguage: "Arabic" },
        { name: "Saleh Al-Sammad", jobTitle: "Operations Manager", email: "saleh@tamcopetroleum.com", mobile: "+967 77 5246913", landline: "+967 1 7246913", preferredLanguage: "Arabic" },
        { name: "Nadia Al-Yemeni", jobTitle: "Compliance Officer", email: "nadia@tamcopetroleum.com", mobile: "+967 77 5370370", landline: "+967 1 7370370", preferredLanguage: "Arabic" }
      ]
    },
    {
      id: "sanctioned_11",
      name: "YEMEN ELAPH PETROLEUM DERIVATIVES IMPORT",
      nameAr: "شركة اليمن إيلاف لاستيراد المشتقات النفطية",
      customerType: "sole_proprietorship",
      country: "Yemen",
      city: "Sanaa",
      buildingNumber: "RAND-1005",
      street: "Main business area, south Sanaa",
      ownerName: "Ammar Al-Saqqaf",
      industry: "Oil imports",
      sector: "Energy / Oil Imports",
      salesOrg: "yemen_main_office",
      distributionChannel: "direct_sales",
      division: "energy_products",
      source: "OFAC Sanctions List",
      sanctionProgram: "Terrorism financing / Supporting Houthi rebels",
      sanctionReason: "Facilitated oil imports from Iran to Yemen for the Houthi group",
      sanctionStartDate: "2025-06-20",
      riskLevel: "Very High",
      sourceList: "OFAC",
      datasetVersion: "October 2025 Update",
      lastVerified: "2025-10-14",
      openSanctionsLink: "https://www.opensanctions.org/entities/NK-iYZxkFaPtTB2zoedzqF3Kg/",
      taxNumber: "500900000000006",
      contacts: [
        { name: "Hayel Anam", jobTitle: "Chief Executive Officer", email: "hayel@yemenelaph.com", mobile: "+967 77 6000000", landline: "+967 1 8000000", preferredLanguage: "Arabic" },
        { name: "Fatima Al-Awlaki", jobTitle: "Chief Financial Officer", email: "fatima@yemenelaph.com", mobile: "+967 77 6123456", landline: "+967 1 8123456", preferredLanguage: "Arabic" },
        { name: "Abdullah Al-Ahmar", jobTitle: "Operations Manager", email: "abdullah@yemenelaph.com", mobile: "+967 77 6246913", landline: "+967 1 8246913", preferredLanguage: "Arabic" },
        { name: "Samira Al-Houthi", jobTitle: "Compliance Officer", email: "samira@yemenelaph.com", mobile: "+967 77 6370370", landline: "+967 1 8370370", preferredLanguage: "Arabic" }
      ]
    },
    {
      id: "sanctioned_12",
      name: "YAHYA AL-USAILI COMPANY FOR IMPORT LIMITED",
      nameAr: "شركة يحيى العصيلي للاستيراد المحدودة",
      customerType: "limited_liability",
      country: "Yemen",
      city: "Hudaydah",
      buildingNumber: "RAND-1006",
      street: "Coastal road area",
      ownerName: "Yahya Al-Usaili",
      industry: "General imports",
      sector: "General Trading / Imports",
      salesOrg: "yemen_aden_branch",
      distributionChannel: "retail_chains",
      division: "general_trading",
      source: "OFAC Sanctions List",
      sanctionProgram: "Terrorism financing / Supporting Houthi rebels",
      sanctionReason: "Operated import routes controlled by the Houthi militia",
      sanctionStartDate: "2025-06-20",
      riskLevel: "Very High",
      sourceList: "OFAC",
      datasetVersion: "October 2025 Update",
      lastVerified: "2025-10-14",
      openSanctionsLink: "https://www.opensanctions.org/entities/NK-XhQXLNUrpBuVtvD6DwNvfe/",
      taxNumber: "500900000000007",
      contacts: [
        { name: "Hayel Anam", jobTitle: "Chief Executive Officer", email: "hayel@alusaili.com", mobile: "+967 77 7000000", landline: "+967 1 9000000", preferredLanguage: "Arabic" },
        { name: "Fatima Al-Awlaki", jobTitle: "Chief Financial Officer", email: "fatima@alusaili.com", mobile: "+967 77 7123456", landline: "+967 1 9123456", preferredLanguage: "Arabic" },
        { name: "Abdullah Al-Ahmar", jobTitle: "Operations Manager", email: "abdullah@alusaili.com", mobile: "+967 77 7246913", landline: "+967 1 9246913", preferredLanguage: "Arabic" },
        { name: "Samira Al-Houthi", jobTitle: "Compliance Officer", email: "samira@alusaili.com", mobile: "+967 77 7370370", landline: "+967 1 9370370", preferredLanguage: "Arabic" }
      ]
    },
    {
      id: "sanctioned_13",
      name: "ROYAL PLUS SHIPPING SERVICES & COMMERCIAL AGENCIES",
      nameAr: "رويال بلس للخدمات الشحن والوكالات التجارية",
      customerType: "Corporate",
      country: "Yemen",
      city: "Sanaa",
      buildingNumber: "RAND-1007",
      street: "Airport Road",
      ownerName: "Adnan Al-Daraji",
      industry: "Shipping and logistics",
      sector: "Shipping / Logistics",
      salesOrg: "yemen_main_office",
      distributionChannel: "business_to_business",
      division: "shipping_logistics",
      source: "OFAC Sanctions List",
      sanctionProgram: "Terrorism financing / Supporting Houthi rebels",
      sanctionReason: "Handled logistics for Houthi-linked shipments",
      sanctionStartDate: "2025-06-20",
      riskLevel: "Very High",
      sourceList: "OFAC",
      datasetVersion: "October 2025 Update",
      lastVerified: "2025-10-14",
      openSanctionsLink: "https://www.opensanctions.org/entities/NK-Fny6q3WBZkBeAB6mBJVnyx/",
      taxNumber: "500900000000008",
      contacts: [
        { name: "Saleh Al-Sammad", jobTitle: "Chief Executive Officer", email: "saleh@royalplus.com", mobile: "+967 77 8000000", landline: "+967 1 1000000", preferredLanguage: "Arabic" },
        { name: "Nadia Al-Yemeni", jobTitle: "Chief Financial Officer", email: "nadia@royalplus.com", mobile: "+967 77 8123456", landline: "+967 1 1123456", preferredLanguage: "Arabic" },
        { name: "Hayel Anam", jobTitle: "Operations Manager", email: "hayel@royalplus.com", mobile: "+967 77 8246913", landline: "+967 1 1246913", preferredLanguage: "Arabic" },
        { name: "Fatima Al-Awlaki", jobTitle: "Compliance Officer", email: "fatima@royalplus.com", mobile: "+967 77 8370370", landline: "+967 1 1370370", preferredLanguage: "Arabic" }
      ]
    },
    {
      id: "sanctioned_14",
      name: "ANDA COMPANY",
      nameAr: "شركة عندا",
      customerType: "Corporate",
      country: "Saudi Arabia",
      city: "Riyadh",
      buildingNumber: "RAND-1008",
      street: "King Fahd District",
      ownerName: "Abdulrahman Al-Qahtani",
      industry: "Construction and investments",
      sector: "Construction / Investment",
      salesOrg: "ksa_riyadh_office",
      distributionChannel: "business_to_business",
      division: "construction",
      source: "OFAC Sanctions List",
      sanctionProgram: "Terrorism financing / Supporting Hamas",
      sanctionReason: "Linked to Hamas financing operations",
      sanctionStartDate: "2022-05-24",
      riskLevel: "Very High",
      sourceList: "OFAC",
      datasetVersion: "October 2025 Update",
      lastVerified: "2025-10-14",
      openSanctionsLink: "https://www.opensanctions.org/entities/NK-d7MKUmNQEGmGpVxL6eqHAM/",
      taxNumber: "300900000000001",
      contacts: [
        { name: "Abdullah Al-Rashid", jobTitle: "Chief Executive Officer", email: "abdullah@andaco.com", mobile: "+966 50 1000000", landline: "+966 11 3000000", preferredLanguage: "Arabic" },
        { name: "Noura Al-Qahtani", jobTitle: "Chief Financial Officer", email: "noura@andaco.com", mobile: "+966 50 1123456", landline: "+966 11 3123456", preferredLanguage: "Arabic" },
        { name: "Mohammed Al-Qahtani", jobTitle: "Operations Manager", email: "mohammed@andaco.com", mobile: "+966 50 1246913", landline: "+966 11 3246913", preferredLanguage: "Arabic" },
        { name: "Fahad Al-Mutairi", jobTitle: "Compliance Officer", email: "fahad@andaco.com", mobile: "+966 50 1370370", landline: "+966 11 3370370", preferredLanguage: "Arabic" }
      ]
    },
    {
      id: "sanctioned_15",
      name: "AL-JABRI GENERAL TRADING & INVESTMENT CO",
      nameAr: "شركة الجابري للتجارة العامة والاستثمار",
      customerType: "sole_proprietorship",
      country: "Oman",
      city: "Salalah",
      buildingNumber: "RAND-1009",
      street: "Industrial area, Dhofar",
      ownerName: "Salim Al-Harthy",
      industry: "General trading",
      sector: "General Trading / Procurement",
      salesOrg: "oman_salalah_branch",
      distributionChannel: "wholesale_partners",
      division: "general_trading",
      source: "OFAC Sanctions List",
      sanctionProgram: "Terrorism financing / Supporting Houthi rebels",
      sanctionReason: "Assisted in smuggling and procurement for Houthi operations",
      sanctionStartDate: "2025-03-05",
      riskLevel: "Very High",
      sourceList: "OFAC",
      datasetVersion: "October 2025 Update",
      lastVerified: "2025-10-14",
      openSanctionsLink: "https://www.opensanctions.org/entities/NK-cz2Rycc3RnYchJpgMAMtvX/",
      taxNumber: "900900000000001",
      contacts: [
        { name: "Haitham Al-Said", jobTitle: "Chief Executive Officer", email: "haitham@aljabri.com", mobile: "+968 9 1000000", landline: "+968 24 3000000", preferredLanguage: "Arabic" },
        { name: "Thuraya Al-Barwani", jobTitle: "Chief Financial Officer", email: "thuraya@aljabri.com", mobile: "+968 9 1123456", landline: "+968 24 3123456", preferredLanguage: "English" },
        { name: "Fahd Al-Zawawi", jobTitle: "Operations Manager", email: "fahd@aljabri.com", mobile: "+968 9 1246913", landline: "+968 24 3246913", preferredLanguage: "Arabic" },
        { name: "Nawal Bahwan", jobTitle: "Compliance Officer", email: "nawal@aljabri.com", mobile: "+968 9 1370370", landline: "+968 24 3370370", preferredLanguage: "English" }
      ]
    },
    {
      id: "sanctioned_16",
      name: "ALDAR PROPERTIES",
      nameAr: "شركة الدار العقارية",
      customerType: "Corporate",
      country: "Qatar",
      city: "Doha",
      buildingNumber: "RAND-1010",
      street: "Al-Jazira Street, Bin Mahmoud",
      ownerName: "Mohammed Al-Kaabi",
      industry: "Real estate",
      sector: "Real Estate",
      salesOrg: "qatar_doha_office",
      distributionChannel: "direct_sales",
      division: "real_estate",
      source: "OFAC Sanctions List",
      sanctionProgram: "Linked to person under terrorism sanctions",
      sanctionReason: "Connected to Sulaiman Al-Banai (listed for terrorism financing)",
      sanctionStartDate: "2025-03-28",
      riskLevel: "Very High",
      sourceList: "OFAC",
      datasetVersion: "October 2025 Update",
      lastVerified: "2025-10-14",
      openSanctionsLink: "https://www.opensanctions.org/entities/NK-i5qreCz3GJJNZpH2T33utp/",
      taxNumber: "700900000000001",
      contacts: [
        { name: "Hamad Al-Thani", jobTitle: "Chief Executive Officer", email: "hamad@aldarproperties.qa", mobile: "+974 3 1000000", landline: "+974 4 3000000", preferredLanguage: "English" },
        { name: "Moza Al-Attiyah", jobTitle: "Chief Financial Officer", email: "moza@aldarproperties.qa", mobile: "+974 3 1123456", landline: "+974 4 3123456", preferredLanguage: "Arabic" },
        { name: "Tamim Al-Mahmoud", jobTitle: "Operations Manager", email: "tamim@aldarproperties.qa", mobile: "+974 3 1246913", landline: "+974 4 3246913", preferredLanguage: "English" },
        { name: "Jawaher Al-Kuwari", jobTitle: "Compliance Officer", email: "jawaher@aldarproperties.qa", mobile: "+974 3 1370370", landline: "+974 4 3370370", preferredLanguage: "Arabic" }
      ]
    },
    {
      id: "sanctioned_17",
      name: "MASS COM GROUP GEN. TRADING & CONTRACTING CO. WLL",
      nameAr: "مجموعة ماس كوم للتجارة العامة والمقاولات",
      customerType: "limited_liability",
      country: "Kuwait",
      city: "Kuwait City",
      buildingNumber: "RAND-1011",
      street: "Fahd Al-Salim Street, Hawally",
      ownerName: "Faisal Al-Mutairi",
      industry: "General trading and contracting",
      sector: "Trading / Contracting",
      salesOrg: "kuwait_main_office",
      distributionChannel: "business_to_business",
      division: "construction",
      source: "OFAC Sanctions List",
      sanctionProgram: "Terrorism financing / Secondary sanctions risk",
      sanctionReason: "Connected to suspicious cross-border money transfers",
      sanctionStartDate: "2025-10-09",
      riskLevel: "Very High",
      sourceList: "OFAC",
      datasetVersion: "October 2025 Update",
      lastVerified: "2025-10-14",
      openSanctionsLink: "https://www.opensanctions.org/entities/NK-LoaK6ue5Wfw5AiPZdvakdX/",
      taxNumber: "600900000000001",
      contacts: [
        { name: "Jaber Al-Ahmad", jobTitle: "Chief Executive Officer", email: "jaber@masscomgroup.com", mobile: "+965 9 1000000", landline: "+965 2 3000000", preferredLanguage: "Arabic" },
        { name: "Hessa Al-Salem", jobTitle: "Chief Financial Officer", email: "hessa@masscomgroup.com", mobile: "+965 9 1123456", landline: "+965 2 3123456", preferredLanguage: "Arabic" },
        { name: "Nasser Al-Mohammed", jobTitle: "Operations Manager", email: "nasser@masscomgroup.com", mobile: "+965 9 1246913", landline: "+965 2 3246913", preferredLanguage: "Arabic" },
        { name: "Sheikha Al-Kabeer", jobTitle: "Compliance Officer", email: "sheikha@masscomgroup.com", mobile: "+965 9 1370370", landline: "+965 2 3370370", preferredLanguage: "Arabic" }
      ]
    },
    {
      id: "sanctioned_18",
      name: "FUTURE BANK B.S.C.",
      nameAr: "بنك المستقبل",
      customerType: "joint_stock",
      country: "Bahrain",
      city: "Manama",
      buildingNumber: "RAND-1012",
      street: "Al-Seef District",
      ownerName: "Hassan Al-Mahmood",
      industry: "Banking and finance",
      sector: "Banking / Financial Services",
      salesOrg: "bahrain_manama_office",
      distributionChannel: "direct_sales",
      division: "financial_services",
      source: "OFAC Sanctions List",
      sanctionProgram: "Linked to Iranian government banks",
      sanctionReason: "Bank controlled by Iran's Bank Melli and Bank Saderat",
      sanctionStartDate: "Ongoing",
      riskLevel: "High",
      sourceList: "OFAC",
      datasetVersion: "October 2025 Update",
      lastVerified: "2025-10-14",
      openSanctionsLink: "https://www.opensanctions.org/entities/NK-ZJD8wdqYXbBKzS42rsyapL/",
      taxNumber: "800900000000001",
      contacts: [
        { name: "Hamad Al-Khalifa", jobTitle: "Chief Executive Officer", email: "hamad@futurebank.bh", mobile: "+973 3 1000000", landline: "+973 17 3000000", preferredLanguage: "English" },
        { name: "Noora Al-Zayani", jobTitle: "Chief Financial Officer", email: "noora@futurebank.bh", mobile: "+973 3 1123456", landline: "+973 17 3123456", preferredLanguage: "Arabic" },
        { name: "Khalifa Al-Moayyed", jobTitle: "Operations Manager", email: "khalifa@futurebank.bh", mobile: "+973 3 1246913", landline: "+973 17 3246913", preferredLanguage: "English" },
        { name: "Haya Jawad", jobTitle: "Compliance Officer", email: "haya@futurebank.bh", mobile: "+973 3 1370370", landline: "+973 17 3370370", preferredLanguage: "Arabic" }
      ]
    },
    {
      id: "sanctioned_19",
      name: "GOOD LAND COMPANY",
      nameAr: "شركة أرض الخير",
      customerType: "limited_liability",
      country: "Egypt",
      city: "Cairo",
      buildingNumber: "RAND-1013",
      street: "Nasr City business area",
      ownerName: "Hossam El-Masry",
      industry: "Food and beverage trading",
      sector: "Food & Beverage / Wholesale",
      salesOrg: "egypt_cairo_office",
      distributionChannel: "wholesale_partners",
      division: "food_beverage",
      source: "OFAC Sanctions List",
      sanctionProgram: "Linked to Syrian business network under sanctions",
      sanctionReason: "Operates within a network that launders money for the Syrian regime",
      sanctionStartDate: "2025-06-30",
      riskLevel: "High",
      sourceList: "OFAC",
      datasetVersion: "October 2025 Update",
      lastVerified: "2025-10-14",
      openSanctionsLink: "https://www.opensanctions.org/entities/NK-WLWjRJsGZKWavUcLTdGYhb/",
      taxNumber: "200900000000001",
      contacts: [
        { name: "Ahmed Hassan", jobTitle: "Chief Executive Officer", email: "ahmed@goodlandco.com", mobile: "+20 10 1000000", landline: "+20 2 3000000", preferredLanguage: "Arabic" },
        { name: "Fatma Ali", jobTitle: "Chief Financial Officer", email: "fatma@goodlandco.com", mobile: "+20 10 1123456", landline: "+20 2 3123456", preferredLanguage: "Arabic" },
        { name: "Omar Mahmoud", jobTitle: "Operations Manager", email: "omar@goodlandco.com", mobile: "+20 10 1246913", landline: "+20 2 3246913", preferredLanguage: "Arabic" },
        { name: "Layla Ibrahim", jobTitle: "Compliance Officer", email: "layla@goodlandco.com", mobile: "+20 10 1370370", landline: "+20 2 3370370", preferredLanguage: "Arabic" }
      ]
    }
  ];

  private currentIndex: number = 0;

  constructor() {
    // Service initialized silently
  }

  /**
   * Get next sanctioned company (rotates through list)
   */
  getNextSanctionedCompany(): SanctionedCompany | null {
    if (this.sanctionedCompanies.length === 0) {
      return null;
    }

    const company = this.sanctionedCompanies[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.sanctionedCompanies.length;
    
    return company;
  }

  /**
   * Get all sanctioned companies
   */
  getAllSanctionedCompanies(): SanctionedCompany[] {
    return [...this.sanctionedCompanies];
  }

  /**
   * Get companies by country
   */
  getSanctionedCompaniesByCountry(country: string): SanctionedCompany[] {
    return this.sanctionedCompanies.filter(c => c.country === country);
  }

  /**
   * Get remaining companies count
   */
  getRemainingCount(): number {
    return this.sanctionedCompanies.length - this.currentIndex;
  }

  /**
   * Reset the index
   */
  reset(): void {
    this.currentIndex = 0;
  }
}

