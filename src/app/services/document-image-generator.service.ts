// ============================================================================
// DOCUMENT IMAGE GENERATOR SERVICE
// Generates realistic document images using HTML5 Canvas
// ============================================================================

import { Injectable } from '@angular/core';
import { CUSTOMER_TYPE_OPTIONS } from '../shared/lookup-data';

export type ImageFormat = 'png' | 'jpeg';

export interface DocumentImage {
  id: string;
  name: string;
  type: string;
  format: ImageFormat;
  contentBase64: string;
  size: number;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentImageGeneratorService {
  
  // A4 size at 96 DPI
  private readonly A4_WIDTH = 794;
  private readonly A4_HEIGHT = 1123;
  
  async generateDocumentImage(
    type: string,
    companyName: string,
    country: string,
    companyData: any,
    format: ImageFormat = 'png'
  ): Promise<DocumentImage> {
    
    const canvas = document.createElement('canvas');
    canvas.width = this.A4_WIDTH;
    canvas.height = this.A4_HEIGHT;
    const ctx = canvas.getContext('2d')!;
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Render based on type
    switch (type) {
      case 'commercial_registration':
        this.renderCommercialRegistration(ctx, companyName, country, companyData);
        break;
      case 'tax_certificate':
        this.renderTaxCertificate(ctx, companyName, country, companyData);
        break;
      default:
        this.renderGenericDocument(ctx, type, companyName, country, companyData);
    }
    
    // Convert to base64
    const quality = format === 'jpeg' ? 0.85 : undefined;
    const base64 = canvas.toDataURL(`image/${format}`, quality);
    
    return {
      id: this.generateId(),
      name: `${this.getDocumentName(type)} - ${companyName}`,
      type: type,
      format: format,
      contentBase64: base64,
      size: Math.floor(base64.length * 0.75)
    };
  }
  
  private renderCommercialRegistration(ctx: CanvasRenderingContext2D, companyName: string, country: string, data: any): void {
    // Header background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, this.A4_WIDTH, 100);
    
    // Title
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('COMMERCIAL REGISTRATION', this.A4_WIDTH / 2, 60);
    
    // Authority
    ctx.font = '16px Arial';
    ctx.fillText(this.getAuthorityName(country, 'commercial'), this.A4_WIDTH / 2, 85);
    
    // Border
    ctx.strokeStyle = '#0066cc';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 120, this.A4_WIDTH - 60, 800);
    
    // Content
    let y = 170;
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('Registration No:', 50, y);
    ctx.font = '20px Arial';
    ctx.fillText(data?.registrationNumber || this.generateRegNumber(country, companyName), 300, y);
    
    y += 50;
    ctx.font = 'bold 18px Arial';
    ctx.fillText('Company Information:', 50, y);
    
    y += 35;
    ctx.font = '16px Arial';
    ctx.fillText('Company Name:', 70, y);
    ctx.fillText(companyName, 250, y);
    
    y += 30;
    ctx.fillText('Country:', 70, y);
    ctx.fillText(country, 250, y);
    
    y += 30;
    ctx.fillText('Company Type:', 70, y);
    const customerTypeLabel = this.getCustomerTypeLabel(data?.customerType || data?.CustomerType);
    ctx.fillText(customerTypeLabel, 250, y);
    
    y += 30;
    ctx.fillText('Company Owner:', 70, y);
    ctx.fillText(data?.ownerName || data?.CompanyOwner || 'N/A', 250, y);
    
    y += 30;
    ctx.fillText('Tax Number:', 70, y);
    ctx.fillText(data?.tax || data?.taxNumber || this.generateTaxNumber(country, companyName), 250, y);
    
    y += 30;
    ctx.fillText('Address:', 70, y);
    const address = `${data?.buildingNumber || ''} ${data?.street || ''}, ${data?.city || ''}, ${country}`;
    ctx.fillText(address, 250, y);
    
    // Business Activities
    y += 50;
    ctx.font = 'bold 18px Arial';
    ctx.fillText('Business Activities:', 50, y);
    
    y += 35;
    ctx.font = '16px Arial';
    const activities = [
      '• Commercial Trading',
      '• Import and Export',
      '• Distribution Services',
      '• General Business Activities'
    ];
    
    activities.forEach(activity => {
      ctx.fillText(activity, 70, y);
      y += 25;
    });
    
    // Stamp
    y += 50;
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(150, y, 50, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('OFFICIAL', 150, y - 10);
    ctx.fillText('STAMP', 150, y + 10);
  }
  
  private renderTaxCertificate(ctx: CanvasRenderingContext2D, companyName: string, country: string, data: any): void {
    // Header background
    ctx.fillStyle = '#006633';
    ctx.fillRect(0, 0, this.A4_WIDTH, 90);
    
    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TAX REGISTRATION CERTIFICATE', this.A4_WIDTH / 2, 55);
    
    // Authority
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 18px Arial';
    ctx.fillRect(30, 110, this.A4_WIDTH - 60, 60);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(31, 111, this.A4_WIDTH - 62, 58);
    
    ctx.fillStyle = '#000000';
    ctx.fillText(this.getAuthorityName(country, 'tax'), this.A4_WIDTH / 2, 145);
    
    // Certificate Number
    ctx.fillStyle = '#ffffcc';
    ctx.fillRect(30, 185, this.A4_WIDTH - 60, 50);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 185, this.A4_WIDTH - 60, 50);
    
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 22px Arial';
    const taxNum = data?.tax || data?.taxNumber || this.generateTaxNumber(country, companyName);
    ctx.fillText(`Certificate No: ${taxNum}`, this.A4_WIDTH / 2, 217);
    
    // Main Content
    let y = 270;
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('This is to certify that:', 50, y);
    
    y += 50;
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(companyName, this.A4_WIDTH / 2, y);
    
    y += 80;
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('Tax Registration Details:', 50, y);
    
    y += 40;
    ctx.font = '16px Arial';
    
    const details = [
      ['Tax Registration Number:', taxNum],
      ['Registration Date:', this.formatDate(new Date())],
      ['Tax Type:', 'Corporate Income Tax'],
      ['Company Owner:', data?.ownerName || 'N/A'],
      ['Address:', `${data?.buildingNumber || ''} ${data?.street || ''}, ${data?.city || ''}, ${country}`],
      ['Status:', 'Active'],
      ['Valid Until:', this.getExpiryDate(1)]
    ];
    
    details.forEach(([label, value]) => {
      ctx.fillText(label, 70, y);
      ctx.fillText(value, 350, y);
      y += 30;
    });
    
    // Stamps
    y += 60;
    ctx.strokeStyle = '#006633';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(150, y, 50, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TAX', 150, y - 10);
    ctx.fillText('AUTHORITY', 150, y + 10);
    
    ctx.beginPath();
    ctx.arc(this.A4_WIDTH - 150, y, 50, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fillText('VERIFIED', this.A4_WIDTH - 150, y - 10);
    ctx.fillText(this.formatDate(new Date()), this.A4_WIDTH - 150, y + 10);
  }
  
  private renderGenericDocument(ctx: CanvasRenderingContext2D, type: string, companyName: string, country: string, data: any): void {
    // Header background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, this.A4_WIDTH, 100);
    
    // Title
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.getDocumentName(type).toUpperCase(), this.A4_WIDTH / 2, 60);
    
    // Content
    let y = 150;
    ctx.font = '18px Arial';
    ctx.fillText(companyName, this.A4_WIDTH / 2, y);
    
    y += 50;
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Company Owner: ${data?.ownerName || data?.CompanyOwner || 'N/A'}`, 50, y);
    
    y += 30;
    ctx.fillText(`Country: ${country}`, 50, y);
    
    y += 30;
    ctx.fillText(`Date: ${this.formatDate(new Date())}`, 50, y);
  }
  
  // Helper methods
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
  
  /**
   * Get customer type label from value (using CUSTOMER_TYPE_OPTIONS)
   */
  private getCustomerTypeLabel(customerTypeValue: string): string {
    if (!customerTypeValue) return 'Private Company';
    
    const option = CUSTOMER_TYPE_OPTIONS.find(opt => opt.value === customerTypeValue);
    return option ? option.label : customerTypeValue;
  }

  /**
   * Generate consistent registration number based on company name (seed-based)
   * Same company name will always generate same registration number
   */
  private generateRegNumber(country: string, companyName?: string): string {
    const prefix: any = {
      'Saudi Arabia': 'CR',
      'Egypt': 'EG',
      'United Arab Emirates': 'UAE',
      'Kuwait': 'KW'
    };
    
    // Use company name as seed for consistent generation
    const seed = companyName ? this.hashString(companyName) : 1000000;
    const regNumber = 1000000 + (seed % 9000000);
    
    return `${prefix[country] || 'XX'}-${regNumber}`;
  }
  
  /**
   * Generate consistent tax number based on company name (seed-based)
   * Same company name will always generate same tax number
   */
  private generateTaxNumber(country: string, companyName?: string): string {
    // Use company name as seed for consistent generation
    const seed = companyName ? this.hashString(companyName) : 100;
    
    const part1 = 100 + (seed % 900);
    const part2 = 100000000 + ((seed >> 8) % 900000000);
    const part3 = 100 + ((seed >> 16) % 900);
    
    return `${part1}${part2}${part3}`;
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
  
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  
  private getExpiryDate(years: number): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() + years);
    return this.formatDate(date);
  }
  
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
  
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