// ============================================================================
// PDF BULK GENERATOR COMPONENT - COMPLETE FIXED VERSION
// src/app/pdf-bulk-generator/pdf-bulk-generator.component.ts
// ============================================================================

import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DemoDataGeneratorService } from '../services/demo-data-generator.service';
import { RealisticDocumentGeneratorService, RealisticDocument, DocumentType } from '../services/realistic-document-generator.service';
import { DocumentImageGeneratorService, ImageFormat, DocumentImage } from '../services/document-image-generator.service';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-pdf-bulk-generator',
  templateUrl: './pdf-bulk-generator.component.html',
  styleUrls: ['./pdf-bulk-generator.component.scss']
})
export class PdfBulkGeneratorComponent implements OnInit {
  
  // Countries
  availableCountries = [
    { value: 'Saudi Arabia', label: 'Saudi Arabia', labelAr: 'المملكة العربية السعودية' },
    { value: 'Egypt', label: 'Egypt', labelAr: 'مصر' },
    { value: 'United Arab Emirates', label: 'UAE', labelAr: 'الإمارات العربية المتحدة' },
    { value: 'Kuwait', label: 'Kuwait', labelAr: 'الكويت' },
    { value: 'Qatar', label: 'Qatar', labelAr: 'قطر' },
    { value: 'Yemen', label: 'Yemen', labelAr: 'اليمن' },
    { value: 'Bahrain', label: 'Bahrain', labelAr: 'البحرين' },
    { value: 'Oman', label: 'Oman', labelAr: 'عمان' }
  ];
  
  // Document Types
  availableDocumentTypes = [
    { value: 'commercial_registration', label: 'Commercial Registration', labelAr: 'السجل التجاري' },
    { value: 'tax_certificate', label: 'Tax Certificate', labelAr: 'الشهادة الضريبية' },
    { value: 'vat_certificate', label: 'VAT Certificate', labelAr: 'شهادة ضريبة القيمة المضافة' },
    { value: 'chamber_certificate', label: 'Chamber Certificate', labelAr: 'شهادة الغرفة التجارية' },
    { value: 'trade_license', label: 'Trade License', labelAr: 'الرخصة التجارية' },
    { value: 'authorization_letter', label: 'Authorization Letter', labelAr: 'خطاب التفويض' },
    { value: 'bank_letter', label: 'Bank Letter', labelAr: 'خطاب البنك' },
    { value: 'utility_bill', label: 'Utility Bill', labelAr: 'فاتورة المرافق' },
    { value: 'company_profile', label: 'Company Profile', labelAr: 'ملف الشركة' }
  ];
  
  // Selection States
  selectedCountries: string[] = [];
  selectedDocumentTypes: string[] = [];
  
  // Output Format Options
  outputFormat: any = 'both';
  imageFormat: any = 'png';
  
  availableOutputFormats = [
    { value: 'pdf', label: 'PDF Only', labelAr: 'PDF فقط' },
    { value: 'images', label: 'Images Only', labelAr: 'صور فقط' },
    { value: 'both', label: 'PDF + Images', labelAr: 'PDF + صور' }
  ];
  
  availableImageFormats = [
    { value: 'png', label: 'PNG (High Quality)', labelAr: 'PNG (جودة عالية)' },
    { value: 'jpeg', label: 'JPEG (Smaller Size)', labelAr: 'JPEG (حجم أصغر)' }
  ];
  
  // Generation States
  isGenerating: boolean = false;
  downloadReady: boolean = false;
  generatedCount: number = 0;
  totalCompanies: number = 0;
  progress: number = 0;
  currentStep: string = '';
  zipSize: number = 0;
  
  // Generated Data
  private generatedZipBlob: Blob | null = null;
  
  constructor(
    private http: HttpClient,
    private demoDataService: DemoDataGeneratorService,
    private docGeneratorService: RealisticDocumentGeneratorService,
    private imageGeneratorService: DocumentImageGeneratorService
  ) {}
  
  ngOnInit(): void {
    // Initialize with all selected by default
    this.selectAllCountries();
    this.selectAllDocumentTypes();
  }
  
  // =========================================================================
  // COUNTRY SELECTION METHODS
  // =========================================================================
  
  selectAllCountries(): void {
    this.selectedCountries = this.availableCountries.map(c => c.value);
  }
  
  deselectAllCountries(): void {
    this.selectedCountries = [];
  }
  
  onCountryChange(country: string, checked: boolean): void {
    if (checked) {
      if (!this.selectedCountries.includes(country)) {
        this.selectedCountries.push(country);
      }
    } else {
      this.selectedCountries = this.selectedCountries.filter(c => c !== country);
    }
  }
  
  // =========================================================================
  // DOCUMENT TYPE SELECTION METHODS
  // =========================================================================
  
  selectAllDocumentTypes(): void {
    this.selectedDocumentTypes = this.availableDocumentTypes.map(d => d.value);
  }
  
  deselectAllDocumentTypes(): void {
    this.selectedDocumentTypes = [];
  }
  
  isDocTypeSelected(docType: string): boolean {
    return this.selectedDocumentTypes.includes(docType);
  }
  
  onDocTypeChange(docType: string, checked: boolean): void {
    if (checked) {
      if (!this.selectedDocumentTypes.includes(docType)) {
        this.selectedDocumentTypes.push(docType);
      }
    } else {
      this.selectedDocumentTypes = this.selectedDocumentTypes.filter(d => d !== docType);
    }
  }
  
  // =========================================================================
  // GENERATION METHODS
  // =========================================================================
  
  async startBulkGeneration(): Promise<void> {
    if (this.selectedCountries.length === 0 || this.selectedDocumentTypes.length === 0) {
      alert('Please select at least one country and one document type');
      return;
    }
    
    // Reset states
    this.isGenerating = true;
    this.downloadReady = false;
    this.generatedCount = 0;
    this.progress = 0;
    this.currentStep = 'Initializing...';
    
    try {
      // Get all demo companies
      const allCompanies = this.getAllDemoCompanies();
      
      // Filter by selected countries
      const filteredCompanies = allCompanies.filter(company => 
        this.selectedCountries.includes(company.country)
      );
      
      this.totalCompanies = filteredCompanies.length;
      
      if (this.totalCompanies === 0) {
        alert('No companies found for selected countries');
        this.isGenerating = false;
        return;
      }
      
      // Create ZIP
      const zip = new JSZip();
      
      // Generate documents for each company
      for (let i = 0; i < filteredCompanies.length; i++) {
        const company = filteredCompanies[i];
        this.currentStep = `Processing ${company.name}...`;
        
        // Create country folder
        const countryFolder = zip.folder(this.sanitizeFolderName(company.country));
        
        // Create company folder
        const companyFolder = countryFolder!.folder(this.sanitizeFolderName(company.name));
        
        // ⭐ Create PDF and Images subfolders
        const pdfFolder = companyFolder!.folder('PDF');
        const imagesFolder = companyFolder!.folder('Images');
        
        // Generate each selected document type
        for (const docType of this.selectedDocumentTypes) {
          // Generate PDF if needed
          if (this.outputFormat === 'pdf' || this.outputFormat === 'both') {
            const doc = this.docGeneratorService.generateDocument(
              docType as DocumentType,
              company.name,
              company.country,
              company
            );
            
            if (doc) {
              const documentName = this.getCleanDocumentName(docType);
              const pdfContent = this.base64ToBlob(doc.contentBase64, 'application/pdf');
              pdfFolder!.file(`${documentName}.pdf`, pdfContent);
            }
          }
          
          // Generate Image if needed
          if (this.outputFormat === 'images' || this.outputFormat === 'both') {
            const imageDoc = await this.imageGeneratorService.generateDocumentImage(
              docType,
              company.name,
              company.country,
              company,
              this.imageFormat
            );
            
            if (imageDoc) {
              const documentName = this.getCleanDocumentName(docType);
              const imageMime = this.imageFormat === 'png' ? 'image/png' : 'image/jpeg';
              const imageContent = this.base64ToBlob(imageDoc.contentBase64, imageMime);
              const imageExt = this.imageFormat === 'png' ? 'png' : 'jpg';
              imagesFolder!.file(`${documentName}.${imageExt}`, imageContent);
            }
          }
        }
        
        this.generatedCount = i + 1;
        this.progress = Math.round((this.generatedCount / this.totalCompanies) * 100);
        
        // Small delay to prevent UI freezing
        await this.delay(100);
      }
      
      // Generate ZIP file
      this.currentStep = 'Creating ZIP file...';
      const blob = await zip.generateAsync({ type: 'blob' });
      this.generatedZipBlob = blob;
      this.zipSize = blob.size;
      
      // Mark as ready
      this.downloadReady = true;
      this.isGenerating = false;
      this.currentStep = 'Generation complete!';
      
      const formatText = this.outputFormat === 'both' ? 'PDFs and Images' : 
                         this.outputFormat === 'pdf' ? 'PDFs' : 'Images';
      alert(`Successfully generated ${formatText} for ${this.generatedCount} companies!`);
      
    } catch (error) {
      console.error('Error generating documents:', error);
      alert('Failed to generate documents. Please try again.');
      this.isGenerating = false;
      this.downloadReady = false;
    }
  }
  
  downloadAllDocuments(): void {
    if (this.generatedZipBlob) {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `MDM_Documents_${timestamp}.zip`;
      saveAs(this.generatedZipBlob, filename);
      alert('ZIP file downloaded successfully!');
    }
  }
  
  // =========================================================================
  // HELPER METHODS
  // =========================================================================
  
  private getAllDemoCompanies(): any[] {
    // Get all companies from demo service
    const companies: any[] = [];
    
    // Get all 70 companies from unified pool
    const allCompanies = this.demoDataService.getAllCompanies();
    
    // Filter by selected countries
    const filteredCompanies = this.selectedCountries.length > 0
      ? allCompanies.filter(c => this.selectedCountries.includes(c.country))
      : allCompanies;
    
    companies.push(...filteredCompanies);
    console.log(`📊 Using ${companies.length} companies from unified pool`);
    
    return companies;
  }
  
  private sanitizeFolderName(name: string): string {
    return name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
  }
  
  private getDocumentFolderName(docType: string): string {
    const folderMap: { [key: string]: string } = {
      'commercial_registration': '01_Commercial_Registration',
      'tax_certificate': '02_Tax_Certificate',
      'vat_certificate': '03_VAT_Certificate',
      'chamber_certificate': '04_Chamber_Certificate',
      'trade_license': '05_Trade_License',
      'authorization_letter': '06_Authorization_Letter',
      'bank_letter': '07_Bank_Letter',
      'utility_bill': '08_Utility_Bill',
      'company_profile': '09_Company_Profile'
    };
    return folderMap[docType] || docType;
  }
  
  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteString = atob(base64.split(',')[1]);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([uint8Array], { type: mimeType });
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
  
  previewStructure(): string {
    const sampleDocs = this.selectedDocumentTypes.slice(0, 2).map(docType => 
      `│   │   │   ├── ${this.getCleanDocumentName(docType)}`
    ).join('.pdf\n') + '.pdf';
    
    const moreDocsIndicator = this.selectedDocumentTypes.length > 2 
      ? `\n│   │   │   └── ... (${this.selectedDocumentTypes.length - 2} more documents)` 
      : '';
    
    const structure = `
MDM_Documents_${new Date().toISOString().split('T')[0]}.zip
│
${this.selectedCountries.slice(0, 2).map(country => `
├── ${this.sanitizeFolderName(country)}/
│   ├── Company_1/
│   │   ├── PDF/
${sampleDocs}
${moreDocsIndicator}
│   │   └── Images/
│   │       ├── ${this.getCleanDocumentName(this.selectedDocumentTypes[0])}.png
│   │       └── ... (all documents as images)
│   └── ... (more companies)
`).join('')}
${this.selectedCountries.length > 2 ? '└── ... (more countries)' : ''}
    `.trim();
    
    return structure;
  }
  
  private getCleanDocumentName(docType: string): string {
    const nameMap: { [key: string]: string } = {
      'commercial_registration': 'Commercial_Registration',
      'tax_certificate': 'Tax_Certificate',
      'vat_certificate': 'VAT_Certificate',
      'chamber_certificate': 'Chamber_Certificate',
      'trade_license': 'Trade_License',
      'authorization_letter': 'Authorization_Letter',
      'bank_letter': 'Bank_Letter',
      'utility_bill': 'Utility_Bill',
      'company_profile': 'Company_Profile'
    };
    return nameMap[docType] || docType;
  }
}