import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

type Row = {
  id: string;
  requestId?: string;
  firstName?: string;
  firstNameAr?: string;
  tax?: string;
  CustomerType?: string;
  CompanyOwner?: string;
  recordType?: 'Customer' | 'Supplier' | string;
  country?: string;
  city?: string;
  street?: string;
  buildingNumber?: string;
  ContactName?: string;
  EmailAddress?: string;
  MobileNumber?: string;
  JobTitle?: string;
  Landline?: string;
  PrefferedLanguage?: string;
  SalesOrgOption?: string;
  DistributionChannelOption?: string;
  DivisionOption?: string;
  sourceSystem?: 'SAP S/4HANA' | 'SAP ByDesign' | 'SAP By Design' | 'Oracle Forms' | string;
  documents?: Array<{ type?: string; name?: string }>;
  contacts?: Array<any>;
  issues?: Array<{ description?: string; date?: string }>;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  missingFields?: string[];
  requestType?: string;           // NEW: Add requestType
  originalRequestType?: string;    // NEW: Add originalRequestType
};

@Component({
  selector: 'app-quarantine',
  templateUrl: './quarantine.component.html',
  styleUrls: ['./quarantine.component.scss']
})
export class QuarantineComponent implements OnInit {

  // API Base URL
  private apiBase = environment.apiBaseUrl || 'http://localhost:3000/api';

  rows: Row[] = [];
  filtered: Row[] = [];
  loading = false;
  q = '';
  
  // Filter properties
  filterBySource = '';
  uniqueSourceSystems: string[] = [];

  // ==== Pagination ====
  page = 1;
  pageSize = 10;
  pageSizeOptions = [10, 20, 50, 100];

  constructor(private http: HttpClient, public router: Router) {}

  // -------- helpers ----------
  private normStatus(s?: string): string {
    const v = (s || '').trim().toLowerCase();
    // accepts: Quarantined / quarantine / Quarantine / ...
    if (v.startsWith('quarantin')) return 'quarantined';
    return v;
  }

  private normSource(s?: string): string {
    const v = (s || '').toLowerCase();
    if (!v) return '';
    if (v.includes('bydesign') || v.includes('by design') || v.includes('byd')) return 'SAP ByD';
    if (v.includes('s/4') || v.includes('s4') || v.includes('hana')) return 'SAP S/4HANA';
    if (v.includes('oracle')) return 'Oracle Forms';
    return s || '';
  }

  // NEW: Get origin badge for display
  getOriginBadge(record: Row): string {
    const origin = record.originalRequestType || record.requestType || 'quarantine';
    switch (origin) {
      case 'quarantine':
        return '🔶 Quarantine';
      case 'duplicate':
        return '👥 From Duplicate';
      case 'golden':
        return '⭐ From Golden';
      case 'rejected':
        return '🔄 From Rejected';
      case 'new':
        return '➕ From New';
      default:
        return '🔶 Quarantine';
    }
  }

  // NEW: Get origin color
  getOriginColor(record: Row): string {
    const origin = record.originalRequestType || record.requestType || 'quarantine';
    switch (origin) {
      case 'quarantine': return 'orange';
      case 'duplicate': return 'blue';
      case 'golden': return 'purple';
      case 'rejected': return 'red';
      case 'new': return 'green';
      default: return 'orange';
    }
  }

  // NEW: Get record origin description
  getRecordOrigin(record: Row): string {
    const origin = record.originalRequestType || record.requestType || 'quarantine';
    
    switch (origin) {
      case 'quarantine':
        return 'Original Quarantine Record';
      case 'duplicate':
        return 'Quarantined from Duplicate Process';
      case 'golden':
        return 'Quarantined from Golden Record';
      case 'rejected':
        return 'Quarantined from Rejection';
      case 'new':
        return 'Quarantined from New Request';
      default:
        return 'Quarantine Record';
    }
  }

  // Identify missing required fields
  private identifyMissingFields(r: Row): string[] {
    const missing: string[] = [];
    
    // Required fields check
    if (!r.firstName) missing.push('Company Name');
    if (!r.firstNameAr) missing.push('Company Name (Arabic)');
    if (!r.tax) missing.push('Tax Number');
    if (!r.CustomerType) missing.push('Customer Type');
    if (!r.country) missing.push('Country');
    if (!r.city) missing.push('City');
    
    // Contact info check
    if (!r.ContactName) missing.push('Contact Name');
    if (!r.EmailAddress) missing.push('Email Address');
    if (!r.MobileNumber) missing.push('Mobile Number');
    
    // Address check
    if (!r.street) missing.push('Street');
    if (!r.buildingNumber) missing.push('Building Number');
    
    // Sales info check for enterprise customers
    if (r.CustomerType === 'enterprise') {
      if (!r.SalesOrgOption) missing.push('Sales Organization');
      if (!r.DistributionChannelOption) missing.push('Distribution Channel');
      if (!r.DivisionOption) missing.push('Division');
    }
    
    return missing;
  }

  // -------- lifecycle ----------
  async ngOnInit(): Promise<void> {
    await this.load();
  }

async load(): Promise<void> {
  this.loading = true;

  try {
    console.log('Loading quarantine data from API...');
    
    // استخدم الـ endpoint الجديد المخصص للـ quarantine
    const url = `${this.apiBase}/duplicates/quarantine`;
    console.log('Fetching from:', url);
    
    const response = await firstValueFrom(
      this.http.get<any>(url)
    );

    if (!response.success) {
      throw new Error('Failed to load quarantine records');
    }

    console.log('Quarantine records fetched:', response.totalRecords);
    console.log('Raw records:', response.records);

    // Map and enhance the data
    this.rows = response.records
      .filter((r: any) => {
        // فلتر صارم: فقط السجلات التي لا تزال في Quarantine
        const isQuarantine = r.status === 'Quarantine';
        const isAssignedToDataEntry = !r.assignedTo || r.assignedTo === 'data_entry';
        const notLinkedToMaster = !r.masterId;
        
        // Log للتشخيص
        console.log(`Record ${r.id}: status=${r.status}, assignedTo=${r.assignedTo}, masterId=${r.masterId}`);
        
        // الفلتر الأساسي - فقط السجلات في حالة Quarantine المخصصة لـ data_entry
        return isQuarantine && isAssignedToDataEntry && notLinkedToMaster;
      })
      .map((r: any) => {
        // Map the data
        const row: Row = {
          id: r.id,
          requestId: r.requestId || r.id,
          firstName: r.firstName,
          firstNameAr: r.firstNameAr,
          tax: r.tax,
          CustomerType: r.CustomerType,
          CompanyOwner: r.CompanyOwner,
          recordType: r.CustomerType === 'enterprise' ? 'Customer' : r.recordType || 'Customer',
          country: r.country,
          city: r.city,
          street: r.street,
          buildingNumber: r.buildingNumber,
          ContactName: r.ContactName || (r.contacts && r.contacts[0]?.name),
          EmailAddress: r.EmailAddress || (r.contacts && r.contacts[0]?.email),
          MobileNumber: r.MobileNumber || (r.contacts && r.contacts[0]?.mobile),
          JobTitle: r.JobTitle || (r.contacts && r.contacts[0]?.jobTitle),
          Landline: r.Landline || (r.contacts && r.contacts[0]?.landline),
          PrefferedLanguage: r.PrefferedLanguage,
          SalesOrgOption: r.SalesOrgOption,
          DistributionChannelOption: r.DistributionChannelOption,
          DivisionOption: r.DivisionOption,
          sourceSystem: this.normSource(r.sourceSystem || r.SourceSystem),
          status: r.status,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          documents: r.documents || [],
          contacts: r.contacts || [],
          issues: r.issues || [],
          missingFields: [],
          requestType: r.requestType,                    // NEW: Add requestType
          originalRequestType: r.originalRequestType     // NEW: Add originalRequestType
        };

        // Identify missing fields
        row.missingFields = this.identifyMissingFields(row);

        return row;
      });

    // Sort by creation date (newest first)
    this.rows.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    this.filtered = [...this.rows];
    this.page = 1; // reset pager
    
    // Generate unique source systems for filter
    this.uniqueSourceSystems = [...new Set(
      this.rows.map(r => this.getSourceBadgeText(r.sourceSystem))
    )].filter(Boolean);
    
    console.log('Quarantine data loaded successfully. Total rows:', this.rows.length);
    console.log('Active quarantine records (not submitted):', this.filtered.length);

  } catch (error) {
    console.error('Error loading quarantine data:', error);
    
    // Fallback to empty state
    this.rows = [];
    this.filtered = [];
  } finally {
    this.loading = false;
  }
}

  // Fetch related documents
  private async fetchDocuments(requestId: string): Promise<any[]> {
    try {
      const docs = await firstValueFrom(
        this.http.get<any[]>(`${this.apiBase}/requests/${requestId}/documents`)
      );
      return docs || [];
    } catch {
      return [];
    }
  }

  // Fetch related contacts  
  private async fetchContacts(requestId: string): Promise<any[]> {
    try {
      const contacts = await firstValueFrom(
        this.http.get<any[]>(`${this.apiBase}/requests/${requestId}/contacts`)
      );
      return contacts || [];
    } catch {
      return [];
    }
  }

  // Fetch related issues
  private async fetchIssues(requestId: string): Promise<any[]> {
    try {
      const issues = await firstValueFrom(
        this.http.get<any[]>(`${this.apiBase}/requests/${requestId}/issues`)
      );
      return issues || [];
    } catch {
      return [];
    }
  }

  // -------- counts ----------
  getDocsCount = (r: Row) => (r.documents?.length || 0);
  getIssuesCount = (r: Row) => (r.issues?.length || 0);
  getContactsCount = (r: Row) => (r.contacts?.length || 0);
  getMissingFieldsCount = (r: Row) => (r.missingFields?.length || 0);

  // Get missing fields display
  getMissingFieldsDisplay(r: Row): string {
    if (!r.missingFields || r.missingFields.length === 0) return 'None';
    if (r.missingFields.length > 3) {
      return `${r.missingFields.slice(0, 3).join(', ')} (+${r.missingFields.length - 3} more)`;
    }
    return r.missingFields.join(', ');
  }

  // -------- statistics ----------
  get sapS4HanaCount(): number {
    return this.rows.filter(r => this.normSource(r.sourceSystem) === 'SAP S/4HANA').length;
  }

  get sapByDCount(): number {
    return this.rows.filter(r => this.normSource(r.sourceSystem) === 'SAP ByD').length;
  }

  get oracleFormsCount(): number {
    return this.rows.filter(r => this.normSource(r.sourceSystem) === 'Oracle Forms').length;
  }

  // NEW: Count by original request type
  get fromDuplicateCount(): number {
    return this.rows.filter(r => r.originalRequestType === 'duplicate').length;
  }

  get fromQuarantineCount(): number {
    return this.rows.filter(r => r.originalRequestType === 'quarantine' || !r.originalRequestType).length;
  }

  // -------- search and filters ----------
  onSearch(term: string) {
    this.q = (term || '').toLowerCase().trim();
    this.applyFilters();
  }

  onFilterChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.filterBySource = target.value;
    this.applyFilters();
  }

  clearFilters() {
    this.q = '';
    this.filterBySource = '';
    this.applyFilters();
  }

  applyFilters() {
    let result = [...this.rows];

    // Apply search filter
    if (this.q.trim()) {
      result = result.filter(r => {
        const hay = [
          r.id,
          r.firstName,
          r.firstNameAr,
          r.country,
        r.city,
        r.recordType,
        r.sourceSystem,
        r.ContactName,
        r.EmailAddress,
        r.tax
      ].join(' ').toLowerCase();
      return hay.includes(this.q);
      });
    }

    // Apply source system filter
    if (this.filterBySource) {
      result = result.filter(r => 
        this.getSourceBadgeText(r.sourceSystem) === this.filterBySource
      );
    }

    this.filtered = result;
    this.page = 1; // start from first page after a search
  }

  // -------- navigation ----------
  view(r: Row) {
    // Navigate to new-request page in edit mode to complete missing fields
    this.router.navigate(['/dashboard/new-request'], { 
      state: { 
        record: r,
        mode: 'edit',
        isQuarantine: true,
        originalRequestType: r.originalRequestType  // NEW: Pass originalRequestType
      } 
    });
  }

  // Complete quarantine record - open in edit mode
 // في quarantine.component.ts
// Complete quarantine record - open in edit mode
completeRecord(r: Row) {
  const id = r.id || r.requestId;
  
  // إضافة logs للتشخيص
  console.log('Complete Record clicked for:', r);
  console.log('Record ID:', id);
  console.log('Record object:', {
    id: r.id,
    requestId: r.requestId,
    firstName: r.firstName,
    tax: r.tax
  });
  
  if (!id) {
    console.error('No ID found for record');
    return;
  }
  
  console.log('Navigating to edit quarantine record with ID:', id);
  
  // Navigate to new-request in edit mode with ID in the path
  this.router.navigate(['/dashboard/new-request', id], {
    queryParams: { 
      mode: 'edit',
      fromQuarantine: 'true',
      originalRequestType: r.originalRequestType || 'quarantine',
      userRole: 'data_entry',  // أضف السطر ده
      edit: true,               // وده كمان
      from: 'quarantine'        // وده للتأكيد
    }
  });
  
  // لا تحذف السجل من القائمة هنا - دع الصفحة تُحدث نفسها بعد النجاح
  // this.rows = this.rows.filter(row => row.id !== id);
  // this.filtered = this.filtered.filter(row => row.id !== id);
}

  linkDuplicates(r: Row) {
    this.router.navigate(['/dashboard/duplicate-management'], { 
      state: { 
        record: r,
        searchTerm: r.firstName || r.tax,
        originalRequestType: r.originalRequestType  // NEW: Pass originalRequestType
      } 
    });
  }

  viewDataLineage(r: Row) {
    this.router.navigate(['/dashboard/data-lineage'], { 
      state: { 
        record: r,
        originalRequestType: r.originalRequestType  // NEW: Pass originalRequestType
      } 
    });
  }

  trackById = (_: number, item: Row) => item?.id;

  badgeClass(source?: string) {
    const normalized = this.normSource(source);
    switch (normalized) {
      case 'SAP S/4HANA': return 'badge badge-sap';
      case 'SAP ByD': return 'badge badge-byd';
      case 'Oracle Forms': return 'badge badge-oracle';
      default: return 'badge badge-default';
    }
  }

  getSourceBadgeText(source?: string): string {
    const normalized = this.normSource(source);
    return normalized || 'Unknown';
  }

  // -------- pagination utils ----------
  get total(): number { return this.filtered.length; }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  get startIndex(): number {
    return this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }

  get paged(): Row[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  setPageSize(n: number) {
    this.pageSize = n;
    this.page = 1; // reset to first page
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
  }

  nextPage() { this.goToPage(this.page + 1); }
  prevPage() { this.goToPage(this.page - 1); }

  // Refresh data
  async refresh() {
    await this.load();
  }

  /** ====== NAV HELPERS ====== */
  private getRowId(row: any): string {
    return ((row?.requestId ?? row?.id ?? row?.key ?? row?.RequestId ?? '') + '');
  }

  /** Open details page; editable=true opens edit mode, false opens view */
  viewOrEditRequest(row: any, editable: boolean): void {
    const id = this.getRowId(row);
    if (!id) return;
    
    // For quarantine records, always open in edit mode with originalRequestType
    this.router?.navigate(['/dashboard/new-request', id], {
      queryParams: { 
        mode: editable ? 'edit' : 'view',
        fromQuarantine: 'true',
        originalRequestType: row.originalRequestType || 'quarantine'  // NEW: Pass originalRequestType
      }
    });
  }

  /** ====== SAFE STUBS (no-op / defaults) ====== */
  taskList: any[] = [];
  checked: boolean = false;
  indeterminate: boolean = false;
  setOfCheckedId: Set<string> = new Set<string>();
  isApprovedVisible: boolean = false;
  isRejectedConfirmVisible: boolean = false;
  isRejectedVisible: boolean = false;
  isAssignVisible: boolean = false;
  inputValue: string = '';
  selectedDepartment: string | null = null;

  onlyPending(): boolean { return false; }
  onlyQuarantined(): boolean { return true; } // Always true for quarantine page
  mixedStatuses(): boolean { return false; }

  deleteRows(): void {}
  deleteSingle(_row?: any): void {}
  showApproveModal(): void { this.isApprovedVisible = true; }
  showRejectedModal(): void { this.isRejectedVisible = true; }
  showAssignModal(): void { this.isAssignVisible = true; }
  submitApprove(): void { this.isApprovedVisible = false; }
  rejectApprove(): void { this.isRejectedConfirmVisible = false; }
  confirmReject(): void { this.isRejectedVisible = false; }

  onAllChecked(_ev?: any): void {}
  onItemChecked(id: string, checkedOrEvent: any, status?: string): void {
    const checked = typeof checkedOrEvent === 'boolean' ? checkedOrEvent : !!(checkedOrEvent?.target?.checked ?? checkedOrEvent);
    try {
      if (typeof (this as any).updateCheckedSet === 'function') {
        (this as any).updateCheckedSet(id, checked, status);
      } else if (typeof (this as any).onItemCheckedCore === 'function') {
        (this as any).onItemCheckedCore(id, checked, status);
      }
    } catch {}
  }
}