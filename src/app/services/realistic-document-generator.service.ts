// ============================================================================
// REALISTIC PDF DOCUMENT GENERATOR SERVICE - ENGLISH ONLY VERSION
// Professional document generation without Arabic text complications
// ============================================================================

import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';

export type DocumentType = 
  | 'commercial_registration'
  | 'tax_certificate'
  | 'vat_certificate'
  | 'chamber_certificate'
  | 'trade_license'
  | 'authorization_letter'
  | 'bank_letter'
  | 'utility_bill'
  | 'company_profile';

export interface RealisticDocument {
  id: string;
  name: string;
  type: DocumentType;
  contentBase64: string;
  size: number;
}

@Injectable({
  providedIn: 'root'
})
export class RealisticDocumentGeneratorService {
  
  generateDocument(
    type: DocumentType,
    companyName: string,
    country: string,
    companyData?: any
  ): RealisticDocument {
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    switch (type) {
      case 'commercial_registration':
        this.createCommercialRegistration(pdf, companyName, country, companyData);
        break;
      case 'tax_certificate':
        this.createTaxCertificate(pdf, companyName, country, companyData);
        break;
      case 'vat_certificate':
        this.createVATCertificate(pdf, companyName, country, companyData);
        break;
      case 'chamber_certificate':
        this.createChamberCertificate(pdf, companyName, country, companyData);
        break;
      case 'trade_license':
        this.createTradeLicense(pdf, companyName, country, companyData);
        break;
      case 'authorization_letter':
        this.createAuthorizationLetter(pdf, companyName, country, companyData);
        break;
      case 'bank_letter':
        this.createBankLetter(pdf, companyName, country, companyData);
        break;
      case 'utility_bill':
        this.createUtilityBill(pdf, companyName, country, companyData);
        break;
      case 'company_profile':
        this.createCompanyProfile(pdf, companyName, country, companyData);
        break;
    }
    
    const base64 = pdf.output('datauristring');
    
    return {
      id: this.generateId(),
      name: `${this.getDocumentName(type)} - ${companyName}`,
      type: type,
      contentBase64: base64,
      size: Math.floor(base64.length * 0.75)
    };
  }
  
  // ========================================================================
  // COMMERCIAL REGISTRATION
  // ========================================================================
  private createCommercialRegistration(pdf: jsPDF, companyName: string, country: string, data: any): void {
    const authority = this.getAuthorityName(country, 'commercial');
    const regNumber = this.generateRegNumber(country);
    const issueDate = this.formatDate(new Date());
    
    // Header
    pdf.setFillColor(240, 240, 240);
    pdf.rect(0, 0, 210, 40, 'F');
    
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('COMMERCIAL REGISTRATION', 105, 25, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(authority, 105, 36, { align: 'center' });
    
    // Border
    pdf.setDrawColor(0, 102, 204);
    pdf.setLineWidth(0.5);
    pdf.rect(10, 45, 190, 220);
    
    // Registration Number
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Registration No:', 20, 60);
    pdf.setFont('helvetica', 'normal');
    pdf.text(regNumber, 120, 60, { align: 'right' });
    
    // Company Information
    let y = 75;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Company Information:', 20, y);
    
    y += 10;
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Company Name:`, 25, y);
    pdf.text(companyName, 90, y);
    
    y += 8;
    pdf.text(`Country:`, 25, y);
    pdf.text(country, 90, y);
    
    y += 8;
    pdf.text(`Registration Date:`, 25, y);
    pdf.text(issueDate, 90, y);
    
    y += 8;
    pdf.text(`Legal Status:`, 25, y);
    pdf.text(data?.customerType || data?.CustomerType || 'Limited Liability Company', 90, y);
    
    y += 8;
    pdf.text(`Company Owner:`, 25, y);
    pdf.text(data?.ownerName || data?.CompanyOwner || 'N/A', 90, y);
    
    y += 8;
    pdf.text(`Address:`, 25, y);
    pdf.text(`${data?.buildingNumber || ''} ${data?.street || ''}, ${data?.city || ''}`, 90, y);
    
    // Business Activities
    y += 15;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Business Activities:', 20, y);
    y += 8;
    pdf.setFont('helvetica', 'normal');
    pdf.text('- Trading and Distribution', 25, y);
    y += 6;
    pdf.text('- Import and Export', 25, y);
    y += 6;
    pdf.text('- Wholesale and Retail', 25, y);
    
    // Certificate Validity
    y += 15;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Certificate Validity:', 20, y);
    y += 8;
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Valid Until: ${this.getExpiryDate(5)}`, 25, y);
    
    // Official Stamp
    pdf.setDrawColor(200, 200, 200);
    pdf.circle(160, 220, 20);
    pdf.setFontSize(8);
    pdf.text('OFFICIAL', 160, 218, { align: 'center' });
    pdf.text('SEAL', 160, 223, { align: 'center' });
    
    // Footer
    pdf.setFontSize(9);
    pdf.setTextColor(128, 128, 128);
    pdf.text('This is an official document issued by the competent authority', 105, 270, { align: 'center' });
    pdf.text(`Document ID: ${regNumber}`, 105, 275, { align: 'center' });
    pdf.text(`Issue Date: ${issueDate}`, 105, 280, { align: 'center' });
    
    // Barcode
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    for (let i = 0; i < 30; i++) {
      if (Math.random() > 0.5) {
        pdf.line(60 + i * 3, 285, 60 + i * 3, 290);
      }
    }
  }
  
  // ========================================================================
  // TAX CERTIFICATE
  // ========================================================================
  private createTaxCertificate(pdf: jsPDF, companyName: string, country: string, data: any): void {
    const authority = this.getAuthorityName(country, 'tax');
    const taxNumber = data?.tax || this.generateTaxNumber(country);
    const issueDate = this.formatDate(new Date());
    
    // Header
    pdf.setFillColor(0, 102, 51);
    pdf.rect(0, 0, 210, 35, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TAX REGISTRATION CERTIFICATE', 105, 20, { align: 'center' });
    
    pdf.setTextColor(0, 0, 0);
    
    // Authority
    pdf.setFillColor(240, 240, 240);
    pdf.rect(10, 45, 190, 20, 'F');
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(authority, 105, 58, { align: 'center' });
    
    // Certificate Number
    pdf.setFillColor(255, 255, 200);
    pdf.rect(10, 75, 190, 15, 'F');
    pdf.setFontSize(16);
    pdf.text(`Certificate No: ${taxNumber}`, 105, 85, { align: 'center' });
    
    // Main Content
    let y = 105;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('This is to certify that:', 20, y);
    
    y += 15;
    pdf.setFontSize(14);
    pdf.text(companyName, 105, y, { align: 'center' });
    
    y += 15;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Is duly registered with the Tax Authority and authorized to', 20, y);
    y += 7;
    pdf.text('conduct business activities subject to applicable tax laws.', 20, y);
    
    // Tax Details
    y += 20;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Tax Registration Details:', 20, y);
    
    y += 10;
    pdf.setLineWidth(0.5);
    pdf.line(20, y, 190, y);
    
    y += 8;
    pdf.setFont('helvetica', 'normal');
    const details = [
      ['Tax Registration Number:', taxNumber],
      ['Company Owner:', data?.ownerName || data?.CompanyOwner || 'N/A'],
      ['Registration Date:', issueDate],
      ['Tax Type:', 'Corporate Income Tax'],
      ['Status:', 'Active'],
      ['Valid Until:', this.getExpiryDate(1)]
    ];
    
    details.forEach(([label, value]) => {
      pdf.text(label, 25, y);
      pdf.text(value, 120, y);
      y += 8;
    });
    
    pdf.line(20, y, 190, y);
    
    // Digital Signature
    y += 20;
    pdf.setFont('helvetica', 'italic');
    pdf.text('Digitally Signed and Verified', 105, y, { align: 'center' });
    
    // Stamps
    pdf.setDrawColor(0, 102, 51);
    pdf.setLineWidth(2);
    pdf.circle(40, 240, 15);
    pdf.setFontSize(7);
    pdf.text('TAX', 40, 238, { align: 'center' });
    pdf.text('AUTHORITY', 40, 243, { align: 'center' });
    
    pdf.circle(170, 240, 15);
    pdf.text('VERIFIED', 170, 238, { align: 'center' });
    pdf.text(issueDate, 170, 243, { align: 'center' });
    
    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text('This certificate is valid and can be verified online', 105, 275, { align: 'center' });
    pdf.text(`Verification Code: ${this.generateVerificationCode()}`, 105, 280, { align: 'center' });
  }
  
  // ========================================================================
  // VAT CERTIFICATE
  // ========================================================================
  private createVATCertificate(pdf: jsPDF, companyName: string, country: string, data: any): void {
    const vatNumber = this.generateVATNumber(country);
    const issueDate = this.formatDate(new Date());
    
    // Header
    pdf.setFillColor(0, 51, 153);
    pdf.rect(0, 0, 210, 40, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('VALUE ADDED TAX', 105, 20, { align: 'center' });
    pdf.text('REGISTRATION CERTIFICATE', 105, 32, { align: 'center' });
    
    pdf.setTextColor(0, 0, 0);
    
    // VAT Number
    pdf.setFillColor(255, 200, 0);
    pdf.rect(40, 50, 130, 20, 'F');
    pdf.setFontSize(18);
    pdf.text(`VAT No: ${vatNumber}`, 105, 63, { align: 'center' });
    
    // Company Details
    let y = 85;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Registered Taxpayer:', 20, y);
    
    y += 12;
    pdf.setFontSize(13);
    pdf.text(companyName, 105, y, { align: 'center' });
    
    // Registration Information
    y += 20;
    pdf.setDrawColor(0, 51, 153);
    pdf.setLineWidth(0.8);
    pdf.rect(15, y, 180, 80);
    
    y += 10;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Registration Information', 20, y);
    
    y += 10;
    const info = [
      ['Company Owner:', data?.ownerName || data?.CompanyOwner || 'N/A'],
      ['Effective Date:', issueDate],
      ['Tax Period:', 'Monthly'],
      ['Business Activity:', 'Commercial Trade'],
      ['Address:', `${data?.city || ''}, ${country}`],
      ['Status:', 'Active & Valid']
    ];
    
    pdf.setFont('helvetica', 'normal');
    info.forEach(([label, value]) => {
      pdf.text(label, 25, y);
      pdf.text(value, 100, y);
      y += 8;
    });
    
    // Notice
    y += 15;
    pdf.setFillColor(255, 240, 240);
    pdf.rect(15, y, 180, 30, 'F');
    pdf.setDrawColor(255, 0, 0);
    pdf.rect(15, y, 180, 30);
    
    y += 8;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('IMPORTANT NOTICE:', 20, y);
    y += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.text('This certificate must be displayed at business premises', 20, y);
    y += 6;
    pdf.text('All invoices must include the VAT registration number', 20, y);
    
    // QR Code
    y += 20;
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(85, y, 40, 40);
    pdf.setFontSize(8);
    pdf.text('SCAN TO VERIFY', 105, y + 45, { align: 'center' });
    
    // Footer
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 80);
    pdf.text(`Issue Date: ${issueDate}`, 105, 275, { align: 'center' });
    pdf.text('Verify at: www.tax.gov', 105, 280, { align: 'center' });
  }
  
  // ========================================================================
  // COMPANY PROFILE
  // ========================================================================
  private createCompanyProfile(pdf: jsPDF, companyName: string, country: string, data: any): void {
    // Header
    pdf.setFillColor(41, 128, 185);
    pdf.rect(0, 0, 210, 50, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text(companyName, 105, 30, { align: 'center' });
    
    pdf.setTextColor(0, 0, 0);
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Company Profile', 105, 60, { align: 'center' });
    
    let y = 75;
    
    // Overview
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(15, y, 180, 10, 'F');
    pdf.text('Company Overview', 20, y + 7);
    
    y += 18;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    const overview = `${companyName} is a leading company in ${country}, specializing in commercial trading and distribution. Established with a commitment to excellence, we serve diverse markets with quality products and services.`;
    const splitOverview = pdf.splitTextToSize(overview, 170);
    pdf.text(splitOverview, 20, y);
    
    y += splitOverview.length * 6 + 10;
    
    // Key Information
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(15, y, 180, 10, 'F');
    pdf.text('Key Information', 20, y + 7);
    
    y += 18;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    
    const keyInfo = [
      ['Legal Name:', companyName],
      ['Country:', country],
      ['City:', data?.city || 'N/A'],
        ['Business Type:', data?.customerType || data?.CustomerType || 'Limited Liability'],
      ['Address:', `${data?.buildingNumber || ''} ${data?.street || ''}`],
      ['Established:', '2010']
    ];
    
    keyInfo.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, 20, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(value, 80, y);
      y += 8;
    });
    
    // Business Activities
    y += 10;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(15, y, 180, 10, 'F');
    pdf.text('Business Activities', 20, y + 7);
    
    y += 18;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    const activities = [
      'Import and Export of Commercial Goods',
      'Wholesale and Retail Distribution',
      'Supply Chain Management',
      'Logistics and Warehousing Services'
    ];
    
    activities.forEach(activity => {
      pdf.text('• ' + activity, 25, y);
      y += 7;
    });
    
    // Footer
    pdf.setFontSize(9);
    pdf.setTextColor(128, 128, 128);
    pdf.text(`Document Generated: ${this.formatDate(new Date())}`, 105, 280, { align: 'center' });
  }
  
  // ========================================================================
  // HELPER METHODS
  // ========================================================================
  
  private getAuthorityName(country: string, type: string): string {
    const authorities: any = {
      'Saudi Arabia': {
        commercial: 'Ministry of Commerce',
        tax: 'Zakat, Tax and Customs Authority'
      },
      'Egypt': {
        commercial: 'General Authority for Investment',
        tax: 'Egyptian Tax Authority'
      },
      'United Arab Emirates': {
        commercial: 'Department of Economic Development',
        tax: 'Federal Tax Authority'
      },
      'Kuwait': {
        commercial: 'Ministry of Commerce and Industry',
        tax: 'Kuwait Tax Department'
      }
    };
    
    return authorities[country]?.[type] || 'Government Authority';
  }
  
  private generateRegNumber(country: string): string {
    const prefix: any = {
      'Saudi Arabia': 'CR',
      'Egypt': 'EG',
      'United Arab Emirates': 'UAE',
      'Kuwait': 'KW',
      'Qatar': 'QA',
      'Yemen': 'YE'
    };
    return `${prefix[country] || 'XX'}-${Math.floor(Math.random() * 9000000) + 1000000}`;
  }
  
  private generateTaxNumber(country: string): string {
    return `${Math.floor(Math.random() * 900) + 100}${Math.floor(Math.random() * 900000000) + 100000000}${Math.floor(Math.random() * 900) + 100}`;
  }
  
  private generateVATNumber(country: string): string {
    return `${Math.floor(Math.random() * 900000000000000) + 100000000000000}`;
  }
  
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
  
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  
  private getExpiryDate(years: number): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() + years);
    return this.formatDate(date);
  }
  
  private generateVerificationCode(): string {
    return Array.from({ length: 12 }, () => 
      Math.random().toString(36).charAt(2).toUpperCase()
    ).join('');
  }
  
  private getDocumentName(type: DocumentType): string {
    const names: { [key: string]: string } = {
      'commercial_registration': 'Commercial Registration',
      'tax_certificate': 'Tax Certificate',
      'vat_certificate': 'VAT Certificate',
      'chamber_certificate': 'Chamber Certificate',
      'trade_license': 'Trade License',
      'authorization_letter': 'Authorization Letter',
      'bank_letter': 'Bank Letter',
      'utility_bill': 'Utility Bill',
      'company_profile': 'Company Profile'
    };
    return names[type] || 'Document';
  }
  
  // Placeholder implementations
  private createChamberCertificate(pdf: jsPDF, companyName: string, country: string, data: any): void {
    this.createStandardCertificate(pdf, 'CHAMBER OF COMMERCE CERTIFICATE', companyName, country, data);
  }
  
  private createTradeLicense(pdf: jsPDF, companyName: string, country: string, data: any): void {
    this.createStandardCertificate(pdf, 'TRADE LICENSE', companyName, country, data);
  }
  
  private createAuthorizationLetter(pdf: jsPDF, companyName: string, country: string, data: any): void {
    this.createStandardCertificate(pdf, 'AUTHORIZATION LETTER', companyName, country, data);
  }
  
  private createBankLetter(pdf: jsPDF, companyName: string, country: string, data: any): void {
    this.createStandardCertificate(pdf, 'BANK LETTER', companyName, country, data);
  }
  
  private createUtilityBill(pdf: jsPDF, companyName: string, country: string, data: any): void {
    this.createStandardCertificate(pdf, 'UTILITY BILL', companyName, country, data);
  }
  
  private createStandardCertificate(pdf: jsPDF, title: string, companyName: string, country: string, data: any): void {
    pdf.setFillColor(240, 240, 240);
    pdf.rect(0, 0, 210, 40, 'F');
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, 105, 25, { align: 'center' });
    
    let y = 60;
    pdf.setFontSize(14);
    pdf.text(companyName, 105, y, { align: 'center' });
    
    y += 20;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Country: ${country}`, 20, y);
    y += 10;
    pdf.text(`Date: ${this.formatDate(new Date())}`, 20, y);
  }
}