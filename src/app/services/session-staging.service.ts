import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SessionStagingService {
  private apiBase = environment.apiBaseUrl;
  private sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  constructor(private http: HttpClient) {
    console.log('🏛️ [SESSION] Session ID generated:', this.sessionId);
    console.log('🏛️ [SESSION] API Base URL:', this.apiBase);
  }
  
  async saveCompany(companyData: {
    companyId: string;
    companyName: string;
    firstName?: string;
    firstNameAr?: string;
    taxNumber?: string;
    customerType?: string;
    companyOwner?: string;
    buildingNumber?: string;
    street?: string;
    country?: string;
    city?: string;
    documentContent?: string;
    salesOrg?: string;
    distributionChannel?: string;
    division?: string;
    registrationNumber?: string;
    legalForm?: string;
    documents?: File[];
    contacts?: any[];
  }): Promise<void> {
    
    console.log('💾 [SESSION SAVE] Starting save process...');
    console.log('💾 [SESSION SAVE] Input documents:', companyData.documents?.length || 0);
    
    const documentsForSave = companyData.documents ? 
      await Promise.all(companyData.documents.map(async (file, index) => {
        console.log(`📄 [SESSION SAVE] Converting document ${index + 1}: ${file.name} (${file.size} bytes)`);
        const base64 = await this.fileToBase64(file);
        console.log(`✅ [SESSION SAVE] Document ${index + 1} converted: ${base64.length} chars`);
        return {
          name: file.name,
          content: base64,
          type: file.type,
          size: file.size
        };
      })) : [];
    
    console.log('💾 [SESSION SAVE] Company data to save:', {
      sessionId: this.sessionId,
      companyId: companyData.companyId,
      companyName: companyData.companyName,
      documentsCount: documentsForSave.length,
      contactsCount: companyData.contacts?.length || 0
    });
    
    console.log('📄 [SESSION SAVE] Documents to send:', documentsForSave.map(d => ({
      name: d.name,
      type: d.type,
      size: d.size,
      contentLength: d.content.length
    })));
    
    await this.http.post(`${this.apiBase}/session/save-company`, {
      sessionId: this.sessionId,
      ...companyData,
      documents: documentsForSave
    }).toPromise();
    
    console.log('✅ [SESSION SAVE] Company data saved successfully');
  }
  
  async getCompany(companyId: string): Promise<any> {
    console.log('📋 [SESSION GET] Getting company data:', companyId);
    console.log('📋 [SESSION GET] Session ID:', this.sessionId);
    console.log('📋 [SESSION GET] Request URL:', `${this.apiBase}/session/company/${this.sessionId}/${companyId}`);
    
    const response: any = await this.http.get(`${this.apiBase}/session/company/${this.sessionId}/${companyId}`).toPromise();
    
    console.log('📋 [SESSION GET] Response received');
    console.log('📋 [SESSION GET] Company name:', response.company_name);
    console.log('📋 [SESSION GET] Documents count:', response.documents?.length || 0);
    console.log('📋 [SESSION GET] Contacts count:', response.contacts?.length || 0);
    
    if (response.documents && response.documents.length > 0) {
      response.documents.forEach((doc: any, index: number) => {
        const contentLength = doc.document_content ? doc.document_content.length : 0;
        const contentPreview = doc.document_content ? doc.document_content.substring(0, 50) : 'empty';
        console.log(`📄 [SESSION GET] Document ${index + 1}: ${doc.document_name} (${contentLength} chars, starts: ${contentPreview}...)`);
      });
    } else {
      console.warn('⚠️ [SESSION GET] No documents found in response');
    }
    
    return response;
  }
  
  async getCompanies(): Promise<any[]> {
    console.log('📋 [SESSION] Getting all companies for session');
    const response = await this.http.get(`${this.apiBase}/session/companies/${this.sessionId}`).toPromise();
    console.log('📋 [SESSION] Companies retrieved:', response);
    return response as any[];
  }
  
  async clearSession(): Promise<void> {
    console.log('🗑️ [SESSION] Clearing session data');
    await this.http.delete(`${this.apiBase}/session/${this.sessionId}`).toPromise();
    console.log('✅ [SESSION] Session data cleared');
  }
  
  getSessionId(): string {
    return this.sessionId;
  }
  
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:application/pdf;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }
}
