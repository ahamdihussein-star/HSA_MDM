// ============================================================================
// DOCUMENT IMAGE GENERATOR SERVICE
// Generates realistic document images using HTML5 Canvas
// src/app/services/document-image-generator.service.ts
// ============================================================================

import { Injectable } from '@angular/core';

export type ImageFormat = 'png' | 'jpeg';

export interface DocumentImage {
  id: string;
  name: string;
  type: string;
  format: ImageFormat;
  contentBase64: string;
  size: number;
  width: number;
  height: number;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentImageGeneratorService {
  
  // Standard A4 dimensions at 96 DPI
  private readonly A4_WIDTH = 794;  // pixels at 96 DPI
  private readonly A4_HEIGHT = 1123; // pixels at 96 DPI
  
  constructor() {}
  
  /**
   * Generate document image
   */
  async generateDocumentImage(
    type: string,
    companyName: string,
    country: string,
    companyData: any,
    format: ImageFormat = 'png'
  ): Promise<DocumentImage> {
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = this.A4_WIDTH;
    canvas.height = this.A4_HEIGHT;
    const ctx = canvas.getContext('2d')!;
    
    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Generate document based on type
    switch (type) {
      case 'commercial_registration':
        this.drawCommercialRegistration(ctx, companyName, country, companyData);
        break;
      case 'tax_certificate':
        this.drawTaxCertificate(ctx, companyName, country, companyData);
        break;
      case 'vat_certificate':
        this.drawVATCertificate(ctx, companyName, country, companyData);
        break;
      case 'chamber_certificate':
        this.drawChamberCertificate(ctx, companyName, country, companyData);
        break;
      case 'trade_license':
        this.drawTradeLicense(ctx, companyName, country, companyData);
        break;
      case 'authorization_letter':
        this.drawAuthorizationLetter(ctx, companyName, country, companyData);
        break;
      case 'bank_letter':
        this.drawBankLetter(ctx, companyName, country, companyData);
        break;
      case 'utility_bill':
        this.drawUtilityBill(ctx, companyName, country, companyData);
        break;
      case 'company_profile':
        this.drawCompanyProfile(ctx, companyName, country, companyData);
        break;
      default:
        this.drawGenericDocument(ctx, 'DOCUMENT', companyName, country, companyData);
    }
    
    // Convert to base64
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const quality = format === 'jpeg' ? 0.92 : undefined;
    const base64 = canvas.toDataURL(mimeType, quality);
    
    // Calculate size
    const size = Math.floor((base64.length * 0.75));
    
    return {
      id: this.generateId(),
      name: `${this.getDocumentName(type)} - ${companyName}`,
      type: type,
      format: format,
      contentBase64: base64,
      size: size,
      width: canvas.width,
      height: canvas.height
    };
  }
  
  // ========================================================================
  // COMMERCIAL REGISTRATION
  // ========================================================================
  private drawCommercialRegistration(
    ctx: CanvasRenderingContext2D,
    companyName: string,
    country: string,
    data: any
  ): void {
    const authority = this.getAuthorityName(country, 'commercial');
    const regNumber = this.generateRegNumber(country);
    const issueDate = this.formatDate(new Date());
    
    // Header background
    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(0, 0, this.A4_WIDTH, 150);
    
    // Title
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('COMMERCIAL REGISTRATION', this.A4_WIDTH / 2, 80);
    
    // Authority
    ctx.font = '24px Arial';
    ctx.fillText(authority, this.A4_WIDTH / 2, 120);
    
    // Border
    ctx.strokeStyle = '#0066CC';
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 170, this.A4_WIDTH - 80, 830);
    
    // Registration Number
    ctx.textAlign = 'left';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('Registration No:', 80, 230);
    
    ctx.textAlign = 'right';
    ctx.font = '28px Arial';
    ctx.fillText(regNumber, this.A4_WIDTH - 80, 230);
    
    // Company Information Section
    let y = 290;
    ctx.textAlign = 'left';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('Company Information:', 80, y);
    
    y += 50;
    ctx.font = '22px Arial';
    ctx.fillText('Company Name:', 100, y);
    ctx.font = 'bold 22px Arial';
    ctx.fillText(companyName, 350, y);
    
    y += 40;
    ctx.font = '22px Arial';
    ctx.fillText('Country:', 100, y);
    ctx.fillText(country, 350, y);
    
    y += 40;
    ctx.fillText('Registration Date:', 100, y);
    ctx.fillText(issueDate, 350, y);
    
    y += 40;
    ctx.fillText('Legal Status:', 100, y);
    ctx.fillText(data?.customerType || data?.CustomerType || 'Limited Company', 350, y);
    
    y += 40;
    ctx.fillText('Tax Number:', 100, y);
    ctx.fillText(data?.tax || this.generateTaxNumber(country), 350, y);
    
    // Business Activities
    y += 80;
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Business Activities:', 80, y);
    
    y += 40;
    ctx.font = '20px Arial';
    const activities = [
      '• Commercial Trading',
      '• Import and Export',
      '• Distribution Services',
      '• General Business Activities'
    ];
    
    activities.forEach(activity => {
      ctx.fillText(activity, 100, y);
      y += 35;
    });
    
    // Footer stamps
    this.drawStamp(ctx, 150, 900, 'OFFICIAL\nSTAMP', '#0066CC');
    this.drawStamp(ctx, this.A4_WIDTH - 150, 900, 'VERIFIED\n' + issueDate, '#006633');
    
    // Verification code
    y = 1050;
    ctx.font = 'italic 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#666666';
    ctx.fillText('Verification Code: ' + this.generateVerificationCode(), this.A4_WIDTH / 2, y);
  }
  
  // ========================================================================
  // TAX CERTIFICATE
  // ========================================================================
  private drawTaxCertificate(
    ctx: CanvasRenderingContext2D,
    companyName: string,
    country: string,
    data: any
  ): void {
    const authority = this.getAuthorityName(country, 'tax');
    const taxNumber = data?.tax || this.generateTaxNumber(country);
    const issueDate = this.formatDate(new Date());
    
    // Header
    ctx.fillStyle = '#006633';
    ctx.fillRect(0, 0, this.A4_WIDTH, 130);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TAX REGISTRATION CERTIFICATE', this.A4_WIDTH / 2, 80);
    
    // Authority background
    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(40, 170, this.A4_WIDTH - 80, 80);
    
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 28px Arial';
    ctx.fillText(authority, this.A4_WIDTH / 2, 220);
    
    // Certificate number background
    ctx.fillStyle = '#FFFFCC';
    ctx.fillRect(40, 280, this.A4_WIDTH - 80, 60);
    
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(`Certificate No: ${taxNumber}`, this.A4_WIDTH / 2, 320);
    
    // Main content
    let y = 400;
    ctx.font = 'bold 24px Arial';
    ctx.fillText('This is to certify that:', this.A4_WIDTH / 2, y);
    
    y += 60;
    ctx.font = 'bold 36px Arial';
    ctx.fillText(companyName, this.A4_WIDTH / 2, y);
    
    y += 60;
    ctx.font = '22px Arial';
    ctx.textAlign = 'center';
    const certText = 'Is duly registered with the Tax Authority and authorized to';
    ctx.fillText(certText, this.A4_WIDTH / 2, y);
    y += 35;
    ctx.fillText('conduct business activities subject to applicable tax laws.', this.A4_WIDTH / 2, y);
    
    // Tax Details box
    y += 80;
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(100, y, this.A4_WIDTH - 200, 250);
    
    y += 40;
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Tax Registration Details', this.A4_WIDTH / 2, y);
    
    y += 50;
    ctx.textAlign = 'left';
    ctx.font = '20px Arial';
    
    const details = [
      ['Tax Registration Number:', taxNumber],
      ['Registration Date:', issueDate],
      ['Tax Type:', 'Corporate Income Tax'],
      ['Status:', 'Active'],
      ['Valid Until:', this.getExpiryDate(1)]
    ];
    
    details.forEach(([label, value]) => {
      ctx.fillText(label, 150, y);
      ctx.font = 'bold 20px Arial';
      ctx.fillText(value, 500, y);
      ctx.font = '20px Arial';
      y += 35;
    });
    
    // Digital signature
    y += 40;
    ctx.font = 'italic 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Digitally Signed and Verified', this.A4_WIDTH / 2, y);
    
    // Stamps
    this.drawStamp(ctx, 150, 950, 'TAX\nAUTHORITY', '#006633');
    this.drawStamp(ctx, this.A4_WIDTH - 150, 950, 'VERIFIED\n' + issueDate, '#006633');
    
    // Footer
    y = 1080;
    ctx.font = '16px Arial';
    ctx.fillStyle = '#666666';
    ctx.fillText('This certificate is valid and can be verified online', this.A4_WIDTH / 2, y);
  }
  
  // ========================================================================
  // VAT CERTIFICATE
  // ========================================================================
  private drawVATCertificate(
    ctx: CanvasRenderingContext2D,
    companyName: string,
    country: string,
    data: any
  ): void {
    const vatNumber = this.generateVATNumber(country);
    const issueDate = this.formatDate(new Date());
    
    // Header gradient effect
    const gradient = ctx.createLinearGradient(0, 0, 0, 140);
    gradient.addColorStop(0, '#1a5490');
    gradient.addColorStop(1, '#2980b9');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.A4_WIDTH, 140);
    
    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('VAT REGISTRATION CERTIFICATE', this.A4_WIDTH / 2, 60);
    
    ctx.font = '24px Arial';
    ctx.fillText('Value Added Tax Authority', this.A4_WIDTH / 2, 100);
    
    // VAT Number highlight
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(40, 180, this.A4_WIDTH - 80, 80);
    
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 38px Arial';
    ctx.fillText(`VAT No: ${vatNumber}`, this.A4_WIDTH / 2, 230);
    
    // Company info
    let y = 320;
    ctx.font = 'bold 28px Arial';
    ctx.fillText('Certificate Holder', this.A4_WIDTH / 2, y);
    
    y += 50;
    ctx.font = 'bold 32px Arial';
    ctx.fillText(companyName, this.A4_WIDTH / 2, y);
    
    y += 45;
    ctx.font = '22px Arial';
    ctx.fillText(country, this.A4_WIDTH / 2, y);
    
    // Registration details
    y += 80;
    ctx.fillStyle = '#F8F9FA';
    ctx.fillRect(80, y, this.A4_WIDTH - 160, 300);
    
    y += 45;
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 26px Arial';
    ctx.fillText('Registration Information', this.A4_WIDTH / 2, y);
    
    y += 50;
    ctx.textAlign = 'left';
    ctx.font = '20px Arial';
    
    const info = [
      ['Registration Date:', issueDate],
      ['Certificate Type:', 'Standard VAT Registration'],
      ['Tax Rate:', '15%'],
      ['Status:', 'Active and Valid'],
      ['Valid Until:', this.getExpiryDate(2)]
    ];
    
    info.forEach(([label, value]) => {
      ctx.fillText(label, 150, y);
      ctx.font = 'bold 20px Arial';
      ctx.fillText(value, 450, y);
      ctx.font = '20px Arial';
      y += 45;
    });
    
    // Important notice
    y += 60;
    ctx.fillStyle = '#FFF3CD';
    ctx.fillRect(80, y, this.A4_WIDTH - 160, 120);
    
    y += 35;
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('IMPORTANT NOTICE:', 120, y);
    
    y += 35;
    ctx.font = '18px Arial';
    ctx.fillText('• This certificate must be displayed at business premises', 120, y);
    y += 30;
    ctx.fillText('• All invoices must include the VAT registration number', 120, y);
    
    // QR Code placeholder
    y += 70;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    const qrSize = 150;
    const qrX = (this.A4_WIDTH - qrSize) / 2;
    ctx.strokeRect(qrX, y, qrSize, qrSize);
    
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SCAN TO VERIFY', this.A4_WIDTH / 2, y + qrSize + 25);
    
    // Footer
    y = 1080;
    ctx.font = '18px Arial';
    ctx.fillStyle = '#666666';
    ctx.fillText(`Issue Date: ${issueDate}`, this.A4_WIDTH / 2, y);
  }
  
  // ========================================================================
  // SIMPLIFIED DOCUMENTS (Using Generic Template)
  // ========================================================================
  private drawChamberCertificate(ctx: CanvasRenderingContext2D, companyName: string, country: string, data: any): void {
    this.drawGenericDocument(ctx, 'CHAMBER OF COMMERCE CERTIFICATE', companyName, country, data);
  }
  
  private drawTradeLicense(ctx: CanvasRenderingContext2D, companyName: string, country: string, data: any): void {
    this.drawGenericDocument(ctx, 'TRADE LICENSE', companyName, country, data);
  }
  
  private drawAuthorizationLetter(ctx: CanvasRenderingContext2D, companyName: string, country: string, data: any): void {
    this.drawGenericDocument(ctx, 'AUTHORIZATION LETTER', companyName, country, data);
  }
  
  private drawBankLetter(ctx: CanvasRenderingContext2D, companyName: string, country: string, data: any): void {
    this.drawGenericDocument(ctx, 'BANK REFERENCE LETTER', companyName, country, data);
  }
  
  private drawUtilityBill(ctx: CanvasRenderingContext2D, companyName: string, country: string, data: any): void {
    this.drawGenericDocument(ctx, 'UTILITY BILL', companyName, country, data);
  }
  
  private drawCompanyProfile(ctx: CanvasRenderingContext2D, companyName: string, country: string, data: any): void {
    this.drawGenericDocument(ctx, 'COMPANY PROFILE', companyName, country, data);
  }
  
  // ========================================================================
  // GENERIC DOCUMENT TEMPLATE
  // ========================================================================
  private drawGenericDocument(
    ctx: CanvasRenderingContext2D,
    title: string,
    companyName: string,
    country: string,
    data: any
  ): void {
    // Header
    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(0, 0, this.A4_WIDTH, 140);
    
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, this.A4_WIDTH / 2, 85);
    
    // Company name
    let y = 220;
    ctx.font = 'bold 32px Arial';
    ctx.fillText(companyName, this.A4_WIDTH / 2, y);
    
    // Details
    y += 80;
    ctx.textAlign = 'left';
    ctx.font = '22px Arial';
    ctx.fillText(`Country: ${country}`, 100, y);
    
    y += 45;
    ctx.fillText(`Date: ${this.formatDate(new Date())}`, 100, y);
    
    y += 45;
    ctx.fillText(`Document Type: ${title}`, 100, y);
    
    y += 45;
    ctx.fillText(`Reference: ${this.generateId().toUpperCase()}`, 100, y);
    
    // Content area
    y += 80;
    ctx.fillStyle = '#F8F9FA';
    ctx.fillRect(80, y, this.A4_WIDTH - 160, 400);
    
    y += 50;
    ctx.fillStyle = '#000000';
    ctx.font = '20px Arial';
    ctx.fillText('This document certifies that the above-mentioned company', 120, y);
    y += 35;
    ctx.fillText('is duly registered and authorized to conduct business', 120, y);
    y += 35;
    ctx.fillText('activities in accordance with applicable laws and regulations.', 120, y);
    
    // Stamp
    this.drawStamp(ctx, this.A4_WIDTH / 2, 950, 'OFFICIAL\nDOCUMENT', '#0066CC');
  }
  
  // ========================================================================
  // HELPER METHODS
  // ========================================================================
  
  /**
   * Draw official stamp
   */
  private drawStamp(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    color: string
  ): void {
    ctx.save();
    
    // Circle
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 60, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Text
    ctx.fillStyle = color;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    
    const lines = text.split('\n');
    const lineHeight = 20;
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    
    lines.forEach((line, i) => {
      ctx.fillText(line, x, startY + i * lineHeight);
    });
    
    ctx.restore();
  }
  
  /**
   * Get authority name based on country and document type
   */
  private getAuthorityName(country: string, type: string): string {
    const authorities: any = {
      'Saudi Arabia': {
        commercial: 'Ministry of Commerce and Investment',
        tax: 'Zakat, Tax and Customs Authority (ZATCA)',
        vat: 'Zakat, Tax and Customs Authority'
      },
      'Egypt': {
        commercial: 'General Authority for Investment and Free Zones',
        tax: 'Egyptian Tax Authority',
        vat: 'Egyptian Tax Authority'
      },
      'United Arab Emirates': {
        commercial: 'Department of Economic Development',
        tax: 'Federal Tax Authority',
        vat: 'Federal Tax Authority'
      },
      'Kuwait': {
        commercial: 'Ministry of Commerce and Industry',
        tax: 'Kuwait Tax Department',
        vat: 'Kuwait Tax Authority'
      }
    };
    
    return authorities[country]?.[type] || 'Government Authority';
  }
  
  /**
   * Generate registration number
   */
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
  
  /**
   * Generate tax number
   */
  private generateTaxNumber(country: string): string {
    return `${Math.floor(Math.random() * 900) + 100}${Math.floor(Math.random() * 900000000) + 100000000}${Math.floor(Math.random() * 900) + 100}`;
  }
  
  /**
   * Generate VAT number (15 digits)
   */
  private generateVATNumber(country: string): string {
    return `${Math.floor(Math.random() * 900000000000000) + 100000000000000}`;
  }
  
  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
  
  /**
   * Format date
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  }
  
  /**
   * Get expiry date (years in future)
   */
  private getExpiryDate(years: number): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() + years);
    return this.formatDate(date);
  }
  
  /**
   * Generate verification code
   */
  private generateVerificationCode(): string {
    return Array.from({ length: 12 }, () => 
      Math.random().toString(36).charAt(2).toUpperCase()
    ).join('');
  }
  
  /**
   * Get document name
   */
  private getDocumentName(type: string): string {
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
}
