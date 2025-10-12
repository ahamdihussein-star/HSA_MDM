import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ComplianceSearchRequest {
  companyName: string;
  country?: string;
  companyType?: string;
  city?: string;
  street?: string;
  buildingNumber?: string;
  searchType: 'basic' | 'enhanced';
}

export interface SanctionInfo {
  id: string;
  name: string;
  type: string;
  country: string;
  countryCode?: string;               // ISO country code (e.g., "RU", "US")
  source: string;
  confidence: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  effectiveDate?: string;
  endDate?: string;
  reason?: string;                    // سبب العقوبة
  penalty?: string;                   // العقوبة المفروضة
  sanctionType?: string;              // نوع العقوبة
  date?: string;                      // تاريخ العقوبة
  sanctionDate?: string;              // تاريخ العقوبة (بديل)
  // Additional fields from OpenSanctions
  datasets?: string[];                // قوائم العقوبات
  topics?: string[];                  // المواضيع
  programId?: string[];               // برامج العقوبات
  address?: string;                   // العنوان
  phone?: string;                     // رقم الهاتف
  email?: string;                     // البريد الإلكتروني
  website?: string;                   // الموقع الإلكتروني
  registrationNumber?: string;        // رقم التسجيل
  taxNumber?: string;                 // الرقم الضريبي
  leiCode?: string;                   // LEI Code
  legalForm?: string;                 // الشكل القانوني
  sector?: string;                    // القطاع
  status?: string;                    // الحالة
  incorporationDate?: string;         // تاريخ التأسيس
  sourceUrl?: string;                 // رابط المصدر
  url?: string;                       // رابط OpenSanctions
}

export interface ComplianceResult {
  companyName: string;
  matchConfidence: number;
  overallRiskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  sanctions: SanctionInfo[];
  sources: string[];
  searchTimestamp: string;
  searchCriteria: ComplianceSearchRequest;
}

export interface DatabaseCompany {
  id: string;
  companyName: string;
  country?: string;
  companyType?: string;
  city?: string;
  street?: string;
  buildingNumber?: string;
  source: 'compliance_task' | 'golden_record';
  status?: string;
  lastUpdated: string;
  selected?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ComplianceService {
  private apiUrl = `${environment.apiBaseUrl}/compliance`;
  
  // BehaviorSubjects for reactive state management
  private searchResultsSubject = new BehaviorSubject<ComplianceResult[]>([]);
  private databaseCompaniesSubject = new BehaviorSubject<DatabaseCompany[]>([]);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  
  // Observables
  searchResults$ = this.searchResultsSubject.asObservable();
  databaseCompanies$ = this.databaseCompaniesSubject.asObservable();
  isLoading$ = this.isLoadingSubject.asObservable();
  
  constructor(private http: HttpClient) { }
  
  /**
   * Search for company compliance using external APIs
   */
  async searchCompanyCompliance(request: ComplianceSearchRequest): Promise<ComplianceResult> {
    this.isLoadingSubject.next(true);

    try {
      console.log('🔍 [COMPLIANCE SERVICE] Starting search:', request.companyName);

      const response = await firstValueFrom(
        this.http.post<ComplianceResult>(`${this.apiUrl}/search`, request)
      );

      console.log('✅ [COMPLIANCE SERVICE] Search completed');
      console.log('📊 [COMPLIANCE SERVICE] Result:', response);

      // ✅ CRITICAL: Update searchResults automatically
      this.searchResultsSubject.next([response]);
      console.log('📡 [COMPLIANCE SERVICE] Results broadcasted');

      return response;

    } catch (error) {
      console.error('❌ [COMPLIANCE SERVICE] Search failed:', error);
      this.searchResultsSubject.next([]); // Clear results on error
      throw error;
    } finally {
      this.isLoadingSubject.next(false);
      console.log('🏁 [COMPLIANCE SERVICE] Loading state cleared');
    }
  }
  
  /**
   * Get companies from database (compliance tasks + golden records)
   */
  async getDatabaseCompanies(): Promise<DatabaseCompany[]> {
    try {
      console.log('📊 [COMPLIANCE] Fetching database companies...');
      
      const response = await firstValueFrom(this.http.get<DatabaseCompany[]>(`${this.apiUrl}/database-companies`));
      
      console.log('📦 [COMPLIANCE] Raw response:', response);
      console.log('📊 [COMPLIANCE] Response length:', response?.length);
      
      // CRITICAL: Initialize selected property
      const companiesWithSelection = (response || []).map(company => ({
        ...company,
        selected: false // Always start with false
      }));
      
      console.log('✅ [COMPLIANCE] First company:', companiesWithSelection[0]);
      
      // Broadcast
      this.databaseCompaniesSubject.next(companiesWithSelection);
      
      console.log('✅ [COMPLIANCE] Broadcasted:', companiesWithSelection.length);
      
      return companiesWithSelection;
      
    } catch (error) {
      console.error('❌ [COMPLIANCE] Failed to load database companies:', error);
      this.databaseCompaniesSubject.next([]);
      throw error;
    }
  }
  
  /**
   * Bulk compliance check for database companies
   */
  async bulkComplianceCheck(companyIds: string[]): Promise<ComplianceResult[]> {
    this.isLoadingSubject.next(true);

    try {
      console.log('🔄 [COMPLIANCE] Starting bulk compliance check for:', companyIds);

      const response = await firstValueFrom(
        this.http.post<ComplianceResult[]>(`${this.apiUrl}/bulk-check`, { companyIds })
      );

      console.log('✅ [COMPLIANCE] Bulk check completed:', response?.length);

      // ✅ CRITICAL: Update searchResults automatically
      if (response && response.length > 0) {
        this.searchResultsSubject.next(response);
      }

      return response || [];

    } catch (error) {
      console.error('❌ [COMPLIANCE] Bulk check failed:', error);
      throw error;
    } finally {
      this.isLoadingSubject.next(false);
    }
  }
  
  /**
   * Get compliance history for a specific company
   */
  async getComplianceHistory(companyId: string): Promise<ComplianceResult[]> {
    try {
      console.log('📜 [COMPLIANCE] Fetching compliance history for:', companyId);
      
      const response = await this.http.get<ComplianceResult[]>(`${this.apiUrl}/history/${companyId}`).toPromise();
      
      console.log('✅ [COMPLIANCE] Compliance history loaded:', response?.length);
      return response || [];
      
    } catch (error) {
      console.error('❌ [COMPLIANCE] Failed to load compliance history:', error);
      throw error;
    }
  }
  
  /**
   * Save compliance check result
   */
  async saveComplianceResult(result: ComplianceResult): Promise<void> {
    try {
      console.log('💾 [COMPLIANCE] Saving compliance result:', result.companyName);
      
      await this.http.post(`${this.apiUrl}/save-result`, result).toPromise();
      
      console.log('✅ [COMPLIANCE] Compliance result saved');
      
    } catch (error) {
      console.error('❌ [COMPLIANCE] Failed to save compliance result:', error);
      throw error;
    }
  }
  
  /**
   * Update search results
   */
  updateSearchResults(results: ComplianceResult[]): void {
    this.searchResultsSubject.next(results);
  }
  
  /**
   * Get current search results
   */
  getCurrentSearchResults(): ComplianceResult[] {
    return this.searchResultsSubject.value;
  }
  
  /**
   * Clear search results
   */
  clearSearchResults(): void {
    this.searchResultsSubject.next([]);
  }
  
  /**
   * Get risk level color for UI
   */
  getRiskLevelColor(riskLevel: string): string {
    if (!riskLevel) return '#d9d9d9';
    
    switch (riskLevel.toLowerCase()) {
      case 'critical': return '#ff4d4f';
      case 'high': return '#ff7a00';
      case 'medium': return '#faad14';
      case 'low': return '#52c41a';
      default: return '#d9d9d9';
    }
  }
  
  /**
   * Get confidence level color for UI
   */
  getConfidenceColor(confidence: number): string {
    if (!confidence && confidence !== 0) return '#d9d9d9';
    
    if (confidence >= 80) return '#52c41a';
    if (confidence >= 60) return '#faad14';
    if (confidence >= 40) return '#ff7a00';
    return '#ff4d4f';
  }

  /**
   * Insert demo sanctions data
   */
  async insertDemoData(): Promise<any> {
    try {
      console.log('📊 [COMPLIANCE] Inserting demo sanctions data...');
      
      const response = await firstValueFrom(
        this.http.post(`${this.apiUrl}/insert-demo-data`, {})
      );
      
      console.log('✅ [COMPLIANCE] Demo data inserted successfully');
      return response;
      
    } catch (error) {
      console.error('❌ [COMPLIANCE] Failed to insert demo data:', error);
      throw error;
    }
  }

  /**
   * Get demo sanctions data
   */
  async getDemoData(): Promise<any> {
    try {
      console.log('📊 [COMPLIANCE] Getting demo sanctions data...');
      
      const response = await firstValueFrom(
        this.http.get(`${this.apiUrl}/demo-data`)
      );
      
      console.log('✅ [COMPLIANCE] Demo data retrieved successfully');
      return response;
      
    } catch (error) {
      console.error('❌ [COMPLIANCE] Failed to get demo data:', error);
      throw error;
    }
  }
}
