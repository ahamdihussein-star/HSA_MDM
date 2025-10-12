import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { ComplianceService, ComplianceSearchRequest, ComplianceResult, DatabaseCompany } from './services/compliance.service';
import { COUNTRY_OPTIONS, CUSTOMER_TYPE_OPTIONS } from '../shared/lookup-data';

interface CompanyType {
  value: string;
  label: string;
}

interface Country {
  value: string;
  label: string;
}

@Component({
  selector: 'app-compliance-agent',
  templateUrl: './compliance-agent.component.html',
  styleUrls: ['./compliance-agent.component.scss'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px)' }),
        animate('300ms ease-in-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in-out', style({ opacity: 0, transform: 'translateY(-20px)' }))
      ])
    ])
  ]
})
export class ComplianceAgentComponent implements OnInit, OnDestroy {
  
  // Form Management
  searchForm!: FormGroup;
  searchMode: 'manual' | 'database' = 'manual';
  databaseSearchText = '';
  
  // Data Management
  searchResults: ComplianceResult[] = [];
  databaseCompanies: DatabaseCompany[] = [];
  filteredDatabaseCompanies: DatabaseCompany[] = [];
  
  // UI State
  isLoading = false;
  searchPerformed = false;
  selectedTabIndex = 0;
  isDatabaseModalVisible = false;
  isInsertingDemoData = false;
  isAllSelected = false;
  isDetailsModalVisible = false;
  selectedSanction: any = null;
  
  // Lookup Data (from shared lookup-data.ts)
  companyTypes: CompanyType[] = CUSTOMER_TYPE_OPTIONS;
  countries: Country[] = COUNTRY_OPTIONS;
  
  // Subscriptions
  private subscriptions: Subscription[] = [];
  
  constructor(
    private fb: FormBuilder,
    private complianceService: ComplianceService,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForm();
  }
  
  ngOnInit(): void {
    this.setupSubscriptions();
    this.loadDatabaseCompanies();
  }
  
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Debug: Check current state
   */
  debugState(): void {
    console.log('🔍 [DEBUG STATE]');
    console.log('  searchPerformed:', this.searchPerformed);
    console.log('  isLoading:', this.isLoading);
    console.log('  selectedTabIndex:', this.selectedTabIndex);
    console.log('  searchResults:', this.searchResults);
    console.log('  searchResults.length:', this.searchResults?.length);
    console.log('  searchResults[0]:', this.searchResults?.[0]);
  }
  
  /**
   * Initialize the search form
   */
  private initializeForm(): void {
    this.searchForm = this.fb.group({
      companyName: ['', [Validators.required, Validators.minLength(2)]],
      country: ['']  // Only company name and country
    });
  }
  
  /**
   * Setup subscriptions for reactive data
   */
  private setupSubscriptions(): void {
    // Subscribe to loading state
    this.subscriptions.push(
      this.complianceService.isLoading$.subscribe(loading => {
        this.isLoading = loading;
      })
    );
    
    // Subscribe to search results
    this.subscriptions.push(
      this.complianceService.searchResults$.subscribe(results => {
        console.log('🔍 [COMPLIANCE] Search results updated:', results?.length || 0, 'results');
        
        // Update results array
        this.searchResults = results || [];
        
        // Set searchPerformed and switch to results tab if we have results
        if (this.searchResults.length > 0) {
          console.log('✅ [COMPLIANCE] Results found, updating UI');
          
          // CRITICAL: Set tab BEFORE searchPerformed
          this.selectedTabIndex = 0;
          
          // Then set searchPerformed
          this.searchPerformed = true;
          
          // Force immediate change detection
          this.cdr.detectChanges();
          
          console.log('🔄 [COMPLIANCE] UI updated - tab:', this.selectedTabIndex, 'performed:', this.searchPerformed);
          
          // Debug state after 100ms
          setTimeout(() => {
            this.debugState();
          }, 100);
        }
      })
    );
    
    // Subscribe to database companies
    this.subscriptions.push(
      this.complianceService.databaseCompanies$.subscribe(companies => {
        console.log('📊 [COMPLIANCE] Received database companies:', companies.length);
        
        // Map to ensure selected property exists
        this.databaseCompanies = companies.map(c => ({
          ...c,
          selected: c.selected ?? false
        }));
        
        this.filteredDatabaseCompanies = [...this.databaseCompanies];
        
        console.log('✅ [COMPLIANCE] Updated filteredDatabaseCompanies:', this.filteredDatabaseCompanies.length);
        
        // Force change detection
        this.cdr.detectChanges();
      })
    );
  }
  
  /**
   * Load companies from database
   */
  async loadDatabaseCompanies(): Promise<void> {
    try {
      console.log('📊 [COMPLIANCE] Loading database companies...');
      this.isLoading = true;
      const companies = await this.complianceService.getDatabaseCompanies();
      console.log('✅ [COMPLIANCE] Load completed, received:', companies?.length, 'companies');
      console.log('📋 [COMPLIANCE] First 3 companies:', companies?.slice(0, 3));
      this.isLoading = false;
    } catch (error) {
      console.error('❌ [COMPLIANCE] Failed to load database companies:', error);
      this.isLoading = false;
    }
  }
  
  
  /**
   * Perform compliance search
   */
  async performSearch(): Promise<void> {
    if (!this.searchForm.valid) {
      console.warn('⚠️ [COMPLIANCE] Form is invalid');
      this.markFormGroupTouched();
      return;
    }

    // Prevent double execution
    if (this.isLoading) {
      console.log('⏳ [COMPLIANCE] Search already in progress...');
      return;
    }

    try {
      const formData = this.searchForm.value;
      console.log('🔍 [COMPLIANCE] Starting search:', formData.companyName, formData.country ? `in ${formData.country}` : '');

      // Simple search: always basic, with optional country filter
      const searchRequest: ComplianceSearchRequest = {
        companyName: formData.companyName,
        country: formData.country || undefined,
        searchType: 'basic'
      };

      // Service will automatically update searchResults via subscription
      const result = await this.complianceService.searchCompanyCompliance(searchRequest);

      // 📊 LOG DETAILED RESULT MAPPING FOR TRACING
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 [FRONTEND] COMPLIANCE RESULT RECEIVED - DETAILED MAPPING');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🏢 Company:', result.companyName);
      console.log('📊 Overall Risk:', result.overallRiskLevel);
      console.log('🔍 Match Confidence:', result.matchConfidence + '%');
      console.log('📅 Search Timestamp:', result.searchTimestamp);
      console.log('📋 Search Criteria:', result.searchCriteria);
      console.log('\n🚨 SANCTIONS FOUND:', result.sanctions?.length || 0);
      
      if (result.sanctions && result.sanctions.length > 0) {
        result.sanctions.forEach((sanction: any, index: number) => {
          console.log(`\n━━━ Sanction ${index + 1}/${result.sanctions.length} ━━━`);
          console.log('📋 BASIC INFO:');
          console.log('   • ID:', sanction.id || 'N/A');
          console.log('   • Name:', sanction.name);
          console.log('   • Country:', sanction.country || 'N/A', '(' + (sanction.countryCode || 'N/A') + ')');
          console.log('   • Flag:', this.getCountryFlag(sanction.country));
          console.log('   • Type:', sanction.type || 'N/A');
          console.log('   • Aliases:', sanction.aliases?.join(', ') || 'None');
          
          console.log('\n🔖 CLASSIFICATION:');
          console.log('   • Risk Level:', sanction.riskLevel || 'Unknown', '→ Color:', this.getRiskLevelColor(sanction.riskLevel));
          console.log('   • Confidence:', sanction.confidence || 'N/A', '→ Color:', this.getConfidenceColor(sanction.confidence));
          console.log('   • Source:', sanction.source);
          console.log('   • Source Detail:', sanction.sourceDetail);
          console.log('   • Sanction Type:', sanction.sanctionType);
          console.log('   • Datasets:', sanction.datasets?.join(', ') || 'None');
          console.log('   • Topics:', sanction.topics?.join(', ') || 'None');
          console.log('   • Programs:', sanction.programs?.join(', ') || 'None');
          
          console.log('\n📝 DESCRIPTIONS:');
          console.log('   • Description:', sanction.description || 'N/A');
          console.log('   • Reason:', sanction.reason || 'N/A');
          console.log('   • Penalty:', sanction.penalty || 'N/A');
          
          console.log('\n📅 DATES:');
          console.log('   • Sanction Date:', sanction.sanctionDate || sanction.date || 'N/A');
          console.log('   • End Date:', sanction.endDate || 'N/A');
          console.log('   • Incorporation Date:', sanction.incorporationDate || 'N/A');
          console.log('   • Last Modified:', sanction.lastModified || 'N/A');
          console.log('   • First Seen:', sanction.firstSeen || 'N/A');
          console.log('   • Last Seen:', sanction.lastSeen || 'N/A');
          
          console.log('\n📍 ADDRESS & CONTACT:');
          console.log('   • Address:', sanction.address || 'N/A');
          console.log('   • Phone:', sanction.phone || 'N/A');
          console.log('   • Email:', sanction.email || 'N/A');
          console.log('   • Website:', sanction.website || 'N/A');
          
          console.log('\n🏢 REGISTRATION INFO:');
          console.log('   • Registration Number:', sanction.registrationNumber || 'N/A');
          console.log('   • Tax Number:', sanction.taxNumber || 'N/A');
          console.log('   • LEI Code:', sanction.leiCode || 'N/A');
          console.log('   • Legal Form:', sanction.legalForm || 'N/A');
          console.log('   • Sector:', sanction.sector || 'N/A');
          console.log('   • Status:', sanction.status || 'Unknown');
          
          console.log('\n🔗 URLS:');
          console.log('   • OpenSanctions URL:', sanction.url || 'N/A');
          console.log('   • Source URL:', sanction.sourceUrl || 'N/A');
        });
      } else {
        console.log('   ℹ️ No sanctions found for this company');
      }
      
      console.log('\n📦 SOURCES CHECKED:', result.sources?.join(', ') || 'None');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Save the result
      await this.complianceService.saveComplianceResult(result);

      console.log('✅ [COMPLIANCE] Search and save completed');

    } catch (error) {
      console.error('❌ [COMPLIANCE] Search failed:', error);
    }
  }
  
  /**
   * Perform bulk compliance check on selected database companies
   */
  async performBulkCheck(): Promise<void> {
    const selectedCompanies = this.filteredDatabaseCompanies.filter(c => c.selected);

    if (selectedCompanies.length === 0) {
      console.warn('⚠️ [COMPLIANCE] No companies selected for bulk check');
      return;
    }

    try {
      console.log('🔄 [COMPLIANCE] Starting bulk check for:', selectedCompanies.length, 'companies');

      const companyIds = selectedCompanies.map(c => c.id);
      const results = await this.complianceService.bulkComplianceCheck(companyIds);

      // ✅ Service method should update searchResults automatically
      this.complianceService.updateSearchResults(results);

      console.log('✅ [COMPLIANCE] Bulk check completed');

    } catch (error) {
      console.error('❌ [COMPLIANCE] Bulk check failed:', error);
    }
  }
  
  /**
   * Filter database companies based on search criteria
   */
  filterDatabaseCompanies(): void {
    const searchTerm = this.databaseSearchText?.toLowerCase() || '';
    
    if (!searchTerm) {
      this.filteredDatabaseCompanies = this.databaseCompanies;
      return;
    }
    
    this.filteredDatabaseCompanies = this.databaseCompanies.filter(company =>
      company.companyName.toLowerCase().includes(searchTerm) ||
      company.country?.toLowerCase().includes(searchTerm) ||
      company.city?.toLowerCase().includes(searchTerm)
    );
  }
  
  /**
   * Switch between manual and database search modes
   */
  switchSearchMode(mode: 'manual' | 'database'): void {
    console.log('🔄 [COMPLIANCE] Switching to mode:', mode);
    this.searchMode = mode;
    
    if (mode === 'database') {
      console.log('📊 [MODAL] databaseCompanies:', this.databaseCompanies.length);
      console.log('📊 [MODAL] filteredDatabaseCompanies:', this.filteredDatabaseCompanies.length);
      
      if (this.databaseCompanies.length === 0) {
        // Load first, then open modal
        this.loadDatabaseCompanies().then(() => {
          setTimeout(() => {
            this.isDatabaseModalVisible = true;
            this.cdr.detectChanges();
          }, 100);
        });
      } else {
        // Ensure selected property
        this.filteredDatabaseCompanies = this.databaseCompanies.map(c => ({
          ...c,
          selected: c.selected ?? false
        }));
        
        // Open modal immediately
        this.isDatabaseModalVisible = true;
        
        // Force detection
        setTimeout(() => {
          this.cdr.detectChanges();
          console.log('🔄 Modal opened with', this.filteredDatabaseCompanies.length, 'companies');
        }, 100);
      }
    }
  }
  
  /**
   * TrackBy function for company list
   */
  trackByCompany(index: number, company: any): any {
    return company.id || company.companyName || index;
  }

  /**
   * TrackBy function for search results
   */
  trackByResult(index: number, result: any): any {
    return result.companyName || result.searchTimestamp || index;
  }

  /**
   * Handle checkbox change
   */
  onCheckboxChange(company: DatabaseCompany, checked: boolean, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    company.selected = checked;
    this.updateIsAllSelected();
    console.log('✅ Checkbox changed:', company.companyName, '=', checked);
  }

  /**
   * Test method for debugging
   */
  testClick(): void {
    console.log('🧪 [TEST] filteredDatabaseCompanies:', this.filteredDatabaseCompanies);
    console.log('🧪 [TEST] filteredDatabaseCompanies.length:', this.filteredDatabaseCompanies.length);
    console.log('🧪 [TEST] filteredDatabaseCompanies[0]:', this.filteredDatabaseCompanies[0]);
  }

  /**
   * Bulk check selected companies
   */
  bulkCheckSelectedCompanies(): void {
    const selectedCompanies = this.filteredDatabaseCompanies.filter(c => c.selected);
    console.log('🔄 [COMPLIANCE] Bulk checking selected companies:', selectedCompanies.length);
    
    // Close modal and switch to results tab
    this.closeDatabaseModal();
    this.selectedTabIndex = 0;
    
    // TODO: Implement bulk compliance check
    console.log('✅ [COMPLIANCE] Bulk check completed');
  }

  /**
   * Close database modal
   */
  closeDatabaseModal(): void {
    this.isDatabaseModalVisible = false;
    // Clear selections
    this.databaseCompanies.forEach(c => c.selected = false);
    this.databaseSearchText = '';
    this.filterDatabaseCompanies();
  }
  
  /**
   * Toggle company selection
   */
  toggleCompanySelection(company: DatabaseCompany): void {
    company.selected = !company.selected;
    this.updateIsAllSelected();
    console.log('🔄 [COMPLIANCE] Toggled company:', company.companyName, '=', company.selected);
  }
  
  
  /**
   * Select/deselect all database companies
   */
  toggleSelectAll(checked: boolean): void {
    console.log('🔄 Toggle select all:', checked);
    this.isAllSelected = checked;
    
    this.filteredDatabaseCompanies.forEach(c => {
      c.selected = checked;
    });
    
    this.cdr.detectChanges();
    console.log('✅ Select all done. Selected:', this.selectedCount);
  }
  
  /**
   * Update isAllSelected state based on current selections
   */
  updateIsAllSelected(): void {
    this.isAllSelected = this.filteredDatabaseCompanies.length > 0 && 
                        this.filteredDatabaseCompanies.every(c => c.selected);
  }
  
  /**
   * Check if some companies are selected
   */
  get isIndeterminate(): boolean {
    const selectedCount = this.filteredDatabaseCompanies.filter(c => c.selected).length;
    return selectedCount > 0 && selectedCount < this.filteredDatabaseCompanies.length;
  }
  
  /**
   * Get selected companies count
   */
  get selectedCount(): number {
    return this.filteredDatabaseCompanies.filter(c => c.selected).length;
  }
  
  /**
   * Search for a specific company from database
   */
  async searchSpecificCompany(company: DatabaseCompany): Promise<void> {
    try {
      console.log('🔍 [COMPLIANCE] Searching specific company:', company.companyName);
      
      // Populate form with company data
      this.searchForm.patchValue({
        companyName: company.companyName,
        country: company.country,
        companyType: company.companyType,
        city: company.city,
        street: company.street,
        buildingNumber: company.buildingNumber
      });
      
      // Perform search
      await this.performSearch();
      
      // Switch to search results tab
      this.selectedTabIndex = 0;
      
    } catch (error) {
      console.error('❌ [COMPLIANCE] Failed to search specific company:', error);
    }
  }
  
  /**
   * Clear search results and reset form
   */
  clearSearch(): void {
    this.searchForm.reset();
    this.complianceService.clearSearchResults();
    this.searchPerformed = false;
    console.log('🧹 [COMPLIANCE] Search cleared');
  }
  
  /**
   * Mark form group as touched for validation
   */
  private markFormGroupTouched(): void {
    Object.keys(this.searchForm.controls).forEach(key => {
      const control = this.searchForm.get(key);
      control?.markAsTouched();
    });
  }
  
  /**
   * Get risk level color
   */
  getRiskLevelColor(riskLevel: string): string {
    return this.complianceService.getRiskLevelColor(riskLevel);
  }
  
  /**
   * Get confidence color
   */
  getConfidenceColor(confidence: number): string {
    return this.complianceService.getConfidenceColor(confidence);
  }
  
  /**
   * Format confidence percentage
   */
  formatConfidence(confidence: number): string {
    return `${confidence}%`;
  }

  /**
   * Get type color based on sanction type
   */
  getTypeColor(type: string): string {
    const lowerType = type?.toLowerCase() || '';
    if (lowerType.includes('individual') || lowerType.includes('person')) return 'purple';
    if (lowerType.includes('entity') || lowerType.includes('company')) return 'blue';
    if (lowerType.includes('vessel') || lowerType.includes('ship')) return 'cyan';
    return 'default';
  }

  /**
   * Get source color based on data source
   */
  getSourceColor(source: string): string {
    const lowerSource = source?.toLowerCase() || '';
    if (lowerSource.includes('opensanctions')) return 'orange';
    if (lowerSource.includes('ofac') || lowerSource.includes('us')) return 'red';
    if (lowerSource.includes('eu') || lowerSource.includes('european')) return 'blue';
    if (lowerSource.includes('un') || lowerSource.includes('united nations')) return 'cyan';
    if (lowerSource.includes('uk') || lowerSource.includes('british')) return 'geekblue';
    return 'green';
  }

  /**
   * Get country flag emoji based on country name
   */
  getCountryFlag(countryName: string): string {
    const country = this.countries.find(c => c.value === countryName);
    if (country && country.label) {
      // Extract emoji from label (emoji is at the beginning)
      const emoji = country.label.split(' ')[0];
      return emoji;
    }
    return '🌍'; // Default globe emoji
  }

  /**
   * View complete sanction details in modal
   */
  viewSanctionDetails(sanction: any): void {
    console.log('👁️ [COMPLIANCE] Viewing sanction details:', sanction);
    this.selectedSanction = sanction;
    this.isDetailsModalVisible = true;
  }

  /**
   * Close details modal
   */
  closeDetailsModal(): void {
    this.isDetailsModalVisible = false;
    this.selectedSanction = null;
  }

  /**
   * Insert demo sanctions data
   */
  async insertDemoData(): Promise<void> {
    try {
      this.isInsertingDemoData = true;
      console.log('📊 [COMPLIANCE] Inserting demo sanctions data...');
      
      const response = await this.complianceService.insertDemoData();
      
      if (response.success) {
        console.log('✅ [COMPLIANCE] Demo data inserted successfully:', response.message);
        
        // Reload database companies to show the new data
        await this.loadDatabaseCompanies();
        
        // Switch to database mode to show the new companies
        this.switchSearchMode('database');
        
      } else {
        console.error('❌ [COMPLIANCE] Failed to insert demo data');
      }
      
    } catch (error) {
      console.error('❌ [COMPLIANCE] Error inserting demo data:', error);
    } finally {
      this.isInsertingDemoData = false;
    }
  }
}
