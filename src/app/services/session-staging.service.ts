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
    salesOrg?: string;
    distributionChannel?: string;
    division?: string;
    registrationNumber?: string;
    legalForm?: string;
    documents?: File[];
    contacts?: any[];
  }): Promise<void> {
    
    const documentsForSave = companyData.documents ? 
      await Promise.all(companyData.documents.map(async (file) => ({
        name: file.name,
        content: await this.fileToBase64(file),
        type: file.type,
        size: file.size
      }))) : [];
    
    console.log('💾 [SESSION] Saving company data:', {
      companyId: companyData.companyId,
      companyName: companyData.companyName,
      documentsCount: documentsForSave.length,
      contactsCount: companyData.contacts?.length || 0
    });
    
    await this.http.post(`${this.apiBase}/session/save-company`, {
      sessionId: this.sessionId,
      ...companyData,
      documents: documentsForSave
    }).toPromise();
    
    console.log('✅ [SESSION] Company data saved successfully');
  }
  
  async getCompany(companyId: string): Promise<any> {
    console.log('📋 [SESSION] Getting company data:', companyId);
    const response = await this.http.get(`${this.apiBase}/session/company/${this.sessionId}/${companyId}`).toPromise();
    console.log('📋 [SESSION] Company data retrieved:', response);
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
