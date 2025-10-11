import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
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
    
    // ✅ FIX: Generate new session ID after clearing
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('🆕 [SESSION] New session ID generated:', this.sessionId);
  }
  
  getSessionId(): string {
    return this.sessionId;
  }
  
  /**
   * ✅ NEW: Save documents ONLY (without extraction) - OLD METHOD (base64)
   */
  async saveDocumentsOnly(documents: File[]): Promise<any> {
    console.log('📄 [SESSION] Saving documents only (no extraction)...');
    console.log('📄 [SESSION] Documents count:', documents.length);
    
    const documentsForSave = await Promise.all(
      documents.map(async (file, index) => {
        console.log(`📄 [SESSION] Converting document ${index + 1}: ${file.name}`);
        const base64 = await this.fileToBase64(file);
        console.log(`✅ [SESSION] Document ${index + 1} converted: ${base64.length} chars`);
        return {
          name: file.name,
          content: base64,
          type: file.type,
          size: file.size
        };
      })
    );
    
    const response = await this.http.post<any>(`${this.apiBase}/session/save-documents-only`, {
      sessionId: this.sessionId,
      documents: documentsForSave
    }).toPromise();
    
    console.log('✅ [SESSION] Documents saved successfully:', response);
    return response;
  }

  /**
   * ✅ NEW: Save documents directly to filesystem (bypasses base64 encoding)
   */
  async saveDocumentsDirect(documents: File[]): Promise<any> {
    console.log('📁 [DIRECT SESSION] Saving documents directly to filesystem...');
    console.log('📁 [DIRECT SESSION] Documents count:', documents.length);
    
    const formData = new FormData();
    formData.append('sessionId', this.sessionId);
    
    documents.forEach((file, index) => {
      console.log(`📁 [DIRECT SESSION] Adding document ${index + 1}:`, {
        name: file.name,
        type: file.type,
        size: file.size
      });
      formData.append('files', file);
    });
    
    const response = await this.http.post<any>(`${this.apiBase}/session/upload-files-direct`, formData).toPromise();
    
    console.log('✅ [DIRECT SESSION] Documents uploaded directly:', response);
    return response;
  }
  
  /**
   * ✅ NEW: Get documents for AI processing
   */
  async getDocumentsForProcessing(documentIds: string[]): Promise<any> {
    console.log('📥 [SESSION] Getting documents for AI processing...');
    console.log('📥 [SESSION] Document IDs:', documentIds);
    
    const response = await this.http.post<any>(`${this.apiBase}/session/get-documents-for-processing`, {
      sessionId: this.sessionId,
      documentIds
    }).toPromise();
    
    console.log('✅ [SESSION] Documents retrieved:', response.documents?.length || 0);
    return response;
  }

  /**
   * ✅ NEW: Get documents for AI processing (from filesystem)
   */
  async getDocumentsForProcessingFiles(documentIds: string[]): Promise<any> {
    console.log('📥 [FILES SESSION] Getting documents for AI processing from filesystem...');
    console.log('📥 [FILES SESSION] Document IDs:', documentIds);
    
    const response = await this.http.post<any>(`${this.apiBase}/session/get-documents-for-processing-files`, {
      sessionId: this.sessionId,
      documentIds
    }).toPromise();
    
    console.log('✅ [FILES SESSION] Documents retrieved from filesystem:', response.documents?.length || 0);
    return response;
  }

  /**
   * ✅ NEW: Get documents for modal display (from filesystem)
   */
  async getDocumentsForModal(companyId: string): Promise<any> {
    console.log('📄 [MODAL SESSION] Getting documents for modal display...');
    console.log('📄 [MODAL SESSION] Company ID:', companyId);
    console.log('📄 [MODAL SESSION] Session ID:', this.sessionId);
    
    const response = await this.http.get<any>(`${this.apiBase}/session/documents/${this.sessionId}/${companyId}`).toPromise();
    
    console.log('✅ [MODAL SESSION] Documents retrieved for modal:', response.documents?.length || 0);
    return response;
  }

  /**
   * ✅ NEW: Convert filesystem documents to File objects for display
   */
  async convertFilesystemDocumentsToFiles(documents: any[]): Promise<File[]> {
    console.log('📄 [CONVERSION] Converting filesystem documents to File objects...');
    console.log('📄 [CONVERSION] Documents count:', documents.length);
    
    const fileObjects: File[] = [];
    
    for (const doc of documents) {
      try {
        console.log(`📄 [CONVERSION] Converting document:`, {
          name: doc.name,
          fileUrl: doc.fileUrl,
          type: doc.mime
        });
        
        // Fetch file from filesystem URL
        const response = await fetch(doc.fileUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const file = new File([blob], doc.name, { type: doc.mime });
        
        console.log(`✅ [CONVERSION] Document converted:`, {
          name: file.name,
          size: file.size,
          type: file.type
        });
        
        fileObjects.push(file);
      } catch (error) {
        console.error(`❌ [CONVERSION] Error converting document ${doc.name}:`, error);
        // Create empty file as fallback to maintain structure
        const emptyFile = new File([''], doc.name, { type: doc.mime });
        fileObjects.push(emptyFile);
      }
    }
    
    console.log('✅ [CONVERSION] Conversion complete:', fileObjects.length, 'files');
    return fileObjects;
  }
  
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log('🔍 [ENCODING DEBUG] Starting fileToBase64 for:', file.name);
      console.log('🔍 [ENCODING DEBUG] File size:', file.size, 'bytes');
      console.log('🔍 [ENCODING DEBUG] File type:', file.type);
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        console.log('🔍 [ENCODING DEBUG] Full data URL length:', result.length);
        console.log('🔍 [ENCODING DEBUG] Data URL prefix:', result.substring(0, 50));
        
        // Remove data:application/pdf;base64, prefix
        const base64 = result.split(',')[1];
        console.log('🔍 [ENCODING DEBUG] Base64 length:', base64.length);
        console.log('🔍 [ENCODING DEBUG] Base64 start:', base64.substring(0, 50));
        
        resolve(base64);
      };
      reader.onerror = error => {
        console.error('🔍 [ENCODING DEBUG] FileReader error:', error);
        reject(error);
      };
    });
  }
  
  /**
   * ✅ NEW: Get documents with filesystem paths for submission
   * Returns documents with document_path for new filesystem-based approach
   */
  async getDocumentsForSubmit(companyId: string): Promise<any[]> {
    try {
      console.log('📁 [SUBMIT DOCS] Getting documents for submission...');
      console.log('📁 [SUBMIT DOCS] Company ID:', companyId);
      console.log('📁 [SUBMIT DOCS] Session ID:', this.sessionId);
      
      const response: any = await firstValueFrom(
        this.http.get(`${this.apiBase}/session/documents/${this.sessionId}/${companyId}`)
      );
      
      const documents = response.documents || response || [];
      
      console.log('✅ [SUBMIT DOCS] Documents retrieved:', documents.length);
      documents.forEach((doc: any, index: number) => {
        console.log(`📄 [SUBMIT DOCS] Document ${index + 1}:`, {
          id: doc.id,
          name: doc.name,
          type: doc.type,
          hasPath: !!doc.document_path,
          hasUrl: !!doc.fileUrl
        });
      });
      
      return documents;
    } catch (error) {
      console.error('❌ [SUBMIT DOCS] Error getting documents:', error);
      return [];
    }
  }
}
