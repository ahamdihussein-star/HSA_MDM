import { ApiRepo } from '../Core/api.repo';
import { Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';

type ChangeType = 'Create' | 'Update' | 'Delete' | 'Merge';
type SourceSys  = 'SAP S/4HANA' | 'SAP ByD' | 'Oracle EBS' | 'Data Steward';

interface HistoryEvent {
  field: string;
  oldValue: string | null;
  newValue: string | null;
  updatedBy: string;
  updatedDate: string;
  approvedBy?: string | null;
  approvedDate?: string | null;
  source: SourceSys;
  changeType: ChangeType;
  requestId?: string;
  step?: string;
}

@Component({
  selector: "app-golden-requests",
  templateUrl: "./golden-requests.component.html",
  styleUrls: ["./golden-requests.component.scss"]
})
export class GoldenRequestsComponent implements OnInit {
  user: string = "2";
  loading: boolean = false;
  rows: any[] = [];
  filteredRows: any[] = [];
  searchTerm: string = '';

  private approvers = ['Ahmed Ali', 'Nour Samir', 'Layla Hassan', 'Omar Khaled', 'Compliance Owner', 'MDM Steward'];
  private updaters  = ['Merolla Safwat', 'Sales Ops', 'Integration Job', 'Data Steward', 'Compliance Bot'];
  private sources: SourceSys[] = ['SAP S/4HANA', 'SAP ByD', 'Oracle EBS', 'Data Steward'];

  private pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

  private formatDate(d: Date): string {
    const dd = d.getDate().toString().padStart(2, '0');
    const m  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    const yyyy = d.getFullYear();
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${dd} ${m} ${yyyy} ${hh}:${mm}`;
  }

  private randomDateWithin(daysBack = 30, addMinutes = 0): string {
    const now = new Date();
    const back = Math.floor(Math.random() * daysBack);
    const d = new Date(now.getTime() - back * 24 * 60 * 60 * 1000);
    if (addMinutes) d.setMinutes(d.getMinutes() + addMinutes);
    d.setHours(9 + Math.floor(Math.random() * 9));
    d.setMinutes(Math.floor(Math.random() * 60));
    return this.formatDate(d);
  }

  private buildHistory(row: any): HistoryEvent[] {
    const id = (row.goldenCode || 'GR-0000000').replace('G', 'GR-');
    const events: HistoryEvent[] = [];

    if (row?.summary?.duplicates?.length) {
      const srcOld = this.pick(this.sources);
      const updBy  = this.pick(['Integration Job', 'Data Steward', 'MDM Merge']);
      const updAt  = this.randomDateWithin(20);
      const appAt  = this.randomDateWithin(20, 20);
      events.push({
        field: "Golden Merge",
        oldValue: row.summary.duplicates[0].oldCode || null,
        newValue: row.goldenCode || null,
        updatedBy: updBy,
        updatedDate: updAt,
        approvedBy: this.pick(this.approvers),
        approvedDate: appAt,
        source: srcOld,
        changeType: "Merge",
        requestId: `MRG-${(row.goldenCode || '0000000').slice(-7)}`,
        step: "Auto-Merge"
      });
    }

    {
      const src = this.pick(this.sources);
      const updAt = this.randomDateWithin(25);
      const appAt = this.randomDateWithin(25, 15);
      events.push({
        field: "Company Name",
        oldValue: row.name?.replace('é','e') || null,
        newValue: row.name || null,
        updatedBy: this.pick(this.updaters),
        updatedDate: updAt,
        approvedBy: this.pick(this.approvers),
        approvedDate: appAt,
        source: src,
        changeType: "Update",
        requestId: `${id}`,
        step: "MDM Approval"
      });
    }

    if (row.summary?.master?.nameAr) {
      const create = Math.random() > 0.4;
      const src = this.pick(this.sources);
      const updAt = this.randomDateWithin(18);
      const appAt = this.randomDateWithin(18, 10);
      events.push({
        field: "Company Name (Arabic)",
        oldValue: create ? '—' : row.summary.master.nameAr,
        newValue: row.summary.master.nameAr,
        updatedBy: create ? 'Data Steward' : this.pick(this.updaters),
        updatedDate: updAt,
        approvedBy: this.pick(this.approvers),
        approvedDate: appAt,
        source: src,
        changeType: create ? "Create" : "Update",
        requestId: `${id}`,
        step: create ? "Enrichment" : "Normalization"
      });
    }

    {
      const src = this.pick(this.sources);
      const updAt = this.randomDateWithin(16);
      const appAt = this.randomDateWithin(16, 12);
      const taxNew = row.summary?.master?.taxNumber || 'EG1122334455';
      const taxOld = taxNew.slice(0, -1);
      events.push({
        field: "Tax Number",
        oldValue: taxOld,
        newValue: taxNew,
        updatedBy: this.pick(this.updaters),
        updatedDate: updAt,
        approvedBy: this.pick(this.approvers),
        approvedDate: appAt,
        source: src,
        changeType: "Update",
        requestId: `${id}`,
        step: "Validation Fix"
      });
    }

    if (row.summary?.master?.commercialRegDocName) {
      const src = this.pick(this.sources);
      const updAt = this.randomDateWithin(14);
      const appAt = this.randomDateWithin(14, 8);
      events.push({
        field: "Commercial Registration Document",
        oldValue: "Not Uploaded",
        newValue: row.summary.master.commercialRegDocName,
        updatedBy: this.pick(this.updaters),
        updatedDate: updAt,
        approvedBy: this.pick(this.approvers),
        approvedDate: appAt,
        source: src,
        changeType: "Create",
        requestId: `${id}`,
        step: "Attachments"
      });
    }

    if (row.summary?.master?.distributionChannel) {
      const src = this.pick(this.sources);
      const updAt = this.randomDateWithin(12);
      const appAt = this.randomDateWithin(12, 6);
      const chNew = row.summary.master.distributionChannel;
      const chOld = chNew === '01' ? '02' : '01';
      events.push({
        field: "Distribution Channel",
        oldValue: chOld,
        newValue: chNew,
        updatedBy: this.pick(this.updaters),
        updatedDate: updAt,
        approvedBy: this.pick(this.approvers),
        approvedDate: appAt,
        source: src,
        changeType: "Update",
        requestId: `${id}`,
        step: "Sales Alignment"
      });
    }

    if ((row.status || '').toLowerCase() === 'blocked') {
      const updAt = this.randomDateWithin(10);
      const appAt = this.randomDateWithin(10, 5);
      events.push({
        field: "Status",
        oldValue: "Active",
        newValue: "Blocked",
        updatedBy: "Compliance Bot",
        updatedDate: updAt,
        approvedBy: this.pick(['Compliance Owner', 'Ahmed Ali', 'Nour Samir']),
        approvedDate: appAt,
        source: this.pick(['SAP S/4HANA', 'Oracle EBS']),
        changeType: "Update",
        requestId: `CMP-${(row.goldenCode || '0000000').slice(-5)}`,
        step: "Sanctions Screening"
      });
    }

    return events.sort((a,b) => (a.updatedDate > b.updatedDate ? -1 : 1));
  }


  constructor(public router: Router, private apiRepo: ApiRepo) {}

  ngOnInit(): void {
    // Get user from sessionStorage (not localStorage)
    const u = sessionStorage.getItem("username");
    if (u) this.user = u;

    // Load Golden Records from API
    this.loadGoldenRecords();
  }

  private loadGoldenRecords(): void {
    this.loading = true;
    
    this.apiRepo.list().subscribe({
      next: (records: any[]) => {
        console.log('=== LOADING GOLDEN RECORDS ===');
        console.log('Total records from API:', records.length);
        
        // ENHANCED Filter: Golden Records that are approved and active/blocked
        const goldenRecords = records.filter((r: any) => {
          const isGolden = r.isGolden === 1;
          // Fix: Handle null companyStatus - treat as 'Active' by default
          const hasValidStatus = !r.companyStatus || r.companyStatus === 'Active' || r.companyStatus === 'Blocked';
          const isApproved = !r.ComplianceStatus || r.ComplianceStatus === 'Approved' || r.ComplianceStatus === 'Under Review';
          
          const shouldInclude = isGolden && hasValidStatus && isApproved;
          
          if (isGolden && !shouldInclude) {
            console.log(`Filtering out Golden Record ${r.id}: companyStatus=${r.companyStatus}, ComplianceStatus=${r.ComplianceStatus}`);
          }
          
          return shouldInclude;
        });

        console.log('Filtered Golden Records:', goldenRecords.length);
        console.log('Golden Records:', goldenRecords.map(r => ({
          id: r.id,
          firstName: r.firstName,
          companyStatus: r.companyStatus,
          ComplianceStatus: r.ComplianceStatus,
          isGolden: r.isGolden,
          originalRequestType: r.originalRequestType
        })));

        // Map records to display format
        this.rows = goldenRecords.map((rec: any) => this.mapFromApiRecord(rec));
        
        // Add history to each record
        this.rows = this.rows.map((r: any) => ({ ...r, history: this.buildHistory(r) }));
        
        // Initialize filtered rows
        this.filteredRows = [...this.rows];
        
        console.log('Final rows for display:', this.rows.length);
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading golden records:', error);
        this.loading = false;
        this.rows = [];
      }
    });
  }

  private normalizeStatus(status?: string): 'Active' | 'Blocked' {
    return (status || '').toLowerCase() === 'blocked' ? 'Blocked' : 'Active';
  }

  private normalizeContacts(rec: any): any[] {
    const list = Array.isArray(rec?.contacts) ? rec.contacts : [];
    return list.map((c: any) => ({
      id: c?.id,
      name: c?.name || c?.ContactName || rec?.ContactName || null,
      jobTitle: c?.jobTitle || c?.JobTitle || null,
      email: c?.email || c?.EmailAddress || null,
      mobile: c?.mobile || c?.MobileNumber || null,
      landline: c?.landline || c?.Landline || null,
      preferredLanguage: c?.preferredLanguage || c?.PrefferedLanguage || null
    }));
  }

  private normalizeDocs(rec: any): any[] {
    const docs = Array.isArray(rec?.documents) ? rec.documents : [];
    return docs.map((d: any) => ({
      id: d?.id,
      name: d?.name,
      type: d?.type,
      description: d?.description,
      size: d?.size,
      mime: d?.mime,
      uploadedAt: d?.uploadedAt,
      contentBase64: d?.contentBase64 || d?.base64 || null
    }));
  }

  /** Map API record to display format */
  private mapFromApiRecord(rec: any): any {
    // Generate golden code - use goldenRecordCode if available
    const goldenCode = rec.goldenRecordCode || 
                      (rec.id ? rec.id.replace(/^CR/, 'G') : `G${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`);
    const normalized = this.normalizeStatus(rec.companyStatus || rec.status);

    // Parse contacts and documents if they're JSON strings
    let contacts: any[] = [];
    let documents: any[] = [];
    
    try {
      contacts = rec.contacts ? (typeof rec.contacts === 'string' ? JSON.parse(rec.contacts) : rec.contacts) : [];
    } catch (e) {
      contacts = [];
    }
    
    try {
      documents = rec.documents ? (typeof rec.documents === 'string' ? JSON.parse(rec.documents) : rec.documents) : [];
    } catch (e) {
      documents = [];
    }

    contacts = this.normalizeContacts({ contacts });
    documents = this.normalizeDocs({ documents });

    const master = {
      // Database fields
      id: rec.id,
      requestId: rec.requestId || rec.id,
      goldenCode,
      goldenRecordCode: rec.goldenRecordCode,
      oldCode: rec.customerCode || rec.requestId || rec.id,
      customerCode: rec.customerCode || rec.requestId || rec.id,
      recordType: rec.CustomerType || 'Customer',
      status: normalized,
      companyStatus: rec.companyStatus,
      
      // ✅ ADD: originalRequestType
      originalRequestType: rec.originalRequestType,
      
      // Company Info
      name: rec.firstName || rec.name || '',
      firstName: rec.firstName || rec.name || '',
      nameAr: rec.firstNameAr || rec.nameAr || '',
      firstNameAr: rec.firstNameAr || rec.nameAr || '',
      tax: rec.tax || rec.taxNumber || '',
      taxNumber: rec.tax || rec.taxNumber || '',
      CustomerType: rec.CustomerType,
      CompanyOwner: rec.CompanyOwner || rec.companyOwnerName || '',
      companyOwnerName: rec.CompanyOwner || rec.companyOwnerName || '',
      
      // Contact Info  
      contactName: rec.ContactName || rec.contactName || '',
      ContactName: rec.ContactName || rec.contactName || '',
      jobTitle: rec.JobTitle || rec.jobTitle || '',
      JobTitle: rec.JobTitle || rec.jobTitle || '',
      email: rec.EmailAddress || rec.email || '',
      EmailAddress: rec.EmailAddress || rec.email || '',
      phone: rec.phone || rec.MobileNumber || '',
      mobileNumber: rec.MobileNumber || rec.mobile || '',
      MobileNumber: rec.MobileNumber || rec.mobile || '',
      landline: rec.Landline || rec.landline || '',
      Landline: rec.Landline || rec.landline || '',
      preferredLanguage: rec.PrefferedLanguage || rec.preferredLanguage || '',
      PrefferedLanguage: rec.PrefferedLanguage || rec.preferredLanguage || '',
      
      // Address
      address: rec.address || '',
      buildingNumber: rec.buildingNumber || '',
      streetName: rec.street || rec.streetName || '',
      street: rec.street || rec.streetName || '',
      city: rec.city || '',
      country: rec.country || '',
      
      // Sales Info
      salesOrg: rec.SalesOrgOption || rec.salesOrg || '',
      SalesOrgOption: rec.SalesOrgOption || rec.salesOrg || '',
      distributionChannel: rec.DistributionChannelOption || rec.distributionChannel || '',
      DistributionChannelOption: rec.DistributionChannelOption || rec.distributionChannel || '',
      division: rec.DivisionOption || rec.division || '',
      DivisionOption: rec.DivisionOption || rec.division || '',
      
      // System Fields
      origin: rec.origin,
      sourceSystem: rec.sourceSystem,
      isGolden: rec.isGolden,
      createdBy: rec.createdBy,
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt,
      
      // Documents
      commercialRegDocName: documents.find((d: any) => (d.type || '').toLowerCase().includes('commercial'))?.name,
      taxCertificateDocName: documents.find((d: any) => (d.type || '').toLowerCase().includes('tax'))?.name,
      CommercialRegistrationDocName: documents.find((d: any) => (d.type || '').toLowerCase().includes('commercial'))?.name,
      TaxCertificateDocName: documents.find((d: any) => (d.type || '').toLowerCase().includes('tax'))?.name,
      
      // Arrays
      contacts,
      documents
    };

    // ✅ UPDATED: Handle duplicates based on originalRequestType
    let duplicates: any[] = [];
    
    // Check originalRequestType before processing duplicates
    if (rec.originalRequestType !== 'quarantine') {
      try {
        duplicates = rec.duplicates ? (typeof rec.duplicates === 'string' ? JSON.parse(rec.duplicates) : rec.duplicates) : [];
      } catch (e) {
        duplicates = [];
      }
    } else {
      // For quarantine-origin records, always set duplicates to empty
      console.log(`Clearing duplicates for quarantine-origin record: ${rec.id}`);
      duplicates = [];
    }

    return {
      // Top level for display
      goldenCode,
      recordType: master.recordType,
      country: master.country,
      status: normalized,
      name: master.name,
      
      // Nested structure for compatibility
      summary: {
        master,
        duplicates
      },
      _extras: {
        contacts,
        documents,
        blockReason: rec?.blockReason || rec?.BlockReason || null,
        lineage: Array.isArray(rec?.lineage) ? rec.lineage : [],
        linkedRecords: [],  // Will be populated if needed
        quarantineRecords: [],  // Will be populated if needed
        // Add direct access to record fields
        originalRecord: rec
      }
    };
  }

  viewDetails(row: any): void {
    if (!row?.summary?.master) return;
    const extras = row?._extras || {};
    
    // ✅ Check originalRequestType before passing duplicates
    const shouldIncludeDuplicates = row.summary.master.originalRequestType !== 'quarantine';
    
    console.log('Navigating to golden-summary:', {
      masterId: row.summary.master.id,
      originalRequestType: row.summary.master.originalRequestType,
      shouldIncludeDuplicates: shouldIncludeDuplicates
    });
    
    this.router.navigate(["/dashboard/golden-summary"], {
      state: {
        master: row.summary.master,
        duplicates: shouldIncludeDuplicates ? (row.summary.duplicates || []) : [],
        linkedRecords: shouldIncludeDuplicates ? (extras.linkedRecords || []) : [],
        quarantineRecords: shouldIncludeDuplicates ? (extras.quarantineRecords || []) : [],
        record: {
          contacts: extras.contacts || [],
          documents: extras.documents || [],
          blockReason: extras.blockReason || null
        }
      }
    });
  }

  /** ENHANCED: Map data for lineage page with complete field coverage */
  private mapForLineage(payload: any): any {
    const master = payload?.summary?.master ?? payload ?? {};
    const contacts = (payload?._extras?.contacts) || payload?.contacts || master?.contacts || [];
    const documents = (payload?._extras?.documents) || payload?.documents || master?.documents || [];
    const originalRecord = payload?._extras?.originalRecord || {};

    // Comprehensive field mapping for Data Lineage
    return {
      // IDs and Codes
      id: master.id || originalRecord.id,
      requestId: master.requestId || originalRecord.requestId || master.id,
      goldenCode: master.goldenCode ?? (payload.goldenCode || ''),
      goldenRecordCode: master.goldenRecordCode || originalRecord.goldenRecordCode,
      oldCode: master.oldCode,
      customerCode: master.customerCode,
      
      // Record Info
      recordType: master.recordType ?? payload.recordType,
      status: master.status ?? payload.status,
      companyStatus: master.companyStatus || originalRecord.companyStatus,
      ComplianceStatus: originalRecord.ComplianceStatus || (master.status ?? payload.status),
      originalRequestType: master.originalRequestType || originalRecord.originalRequestType,
      
      // Company Identity
      name: master.name,
      firstName: master.firstName || master.name,
      nameAr: master.nameAr,
      firstNameAr: master.firstNameAr || master.nameAr,
      tax: master.tax || master.taxNumber,
      taxNumber: master.taxNumber || master.tax,
      CustomerType: master.CustomerType || master.recordType,
      CompanyOwner: master.CompanyOwner || master.companyOwnerName,
      companyOwnerName: master.companyOwnerName || master.CompanyOwner,
      
      // Contact Information
      contactName: master.contactName,
      ContactName: master.ContactName || master.contactName,
      jobTitle: master.jobTitle,
      JobTitle: master.JobTitle || master.jobTitle,
      email: master.email,
      EmailAddress: master.EmailAddress || master.email,
      phone: master.phone,
      mobileNumber: master.mobileNumber,
      MobileNumber: master.MobileNumber || master.mobileNumber,
      landline: master.landline,
      Landline: master.Landline || master.landline,
      preferredLanguage: master.preferredLanguage,
      PrefferedLanguage: master.PrefferedLanguage || master.preferredLanguage,
      
      // Address
      address: master.address,
      buildingNumber: master.buildingNumber,
      building: master.buildingNumber,
      streetName: master.streetName || master.street,
      street: master.street || master.streetName,
      city: master.city,
      country: master.country,
      country2: master.country,
      
      // Sales Organization
      salesOrg: master.salesOrg,
      SalesOrgOption: master.SalesOrgOption || master.salesOrg,
      distributionChannel: master.distributionChannel,
      DistributionChannelOption: master.DistributionChannelOption || master.distributionChannel,
      division: master.division,
      DivisionOption: master.DivisionOption || master.division,
      
      // System Fields
      origin: master.origin || originalRecord.origin,
      sourceSystem: master.sourceSystem || originalRecord.sourceSystem,
      isGolden: master.isGolden ?? originalRecord.isGolden,
      createdBy: master.createdBy || originalRecord.createdBy,
      createdAt: master.createdAt || originalRecord.createdAt,
      updatedAt: master.updatedAt || originalRecord.updatedAt,
      
      // Documents
      commercialRegDocName: master.commercialRegDocName,
      CommercialRegistrationDocName: master.CommercialRegistrationDocName || master.commercialRegDocName,
      taxCertificateDocName: master.taxCertificateDocName,
      TaxCertificateDocName: master.TaxCertificateDocName || master.taxCertificateDocName,
      
      // Arrays
      contacts,
      documents,
      
      // Legacy compatibility
      lineage: (payload?._extras?.lineage) || payload?.lineage || payload?.history || [],
      history: (payload?._extras?.lineage) || payload?.lineage || payload?.history || [],
      summary: { duplicates: payload?.summary?.duplicates ?? [] }
    };
  }

  /** ENHANCED: Navigate to Data Lineage with comprehensive data mapping */
  goDataLineage(row: any): void {
    console.log('=== NAVIGATING TO DATA LINEAGE ===');
    console.log('Row data:', row);
    
    const recordForLineage = this.mapForLineage(row);
    
    console.log('Mapped record for lineage:', recordForLineage);
    console.log('Record ID:', recordForLineage.id);
    console.log('Record firstName:', recordForLineage.firstName);
    
    this.router.navigate(["/dashboard/data-lineage"], { 
      state: { 
        record: recordForLineage 
      } 
    });
  }

  statusClass(status: string): any {
    const s = this.normalizeStatus(status);
    return {
      "status-active": s === "Active",
      "status-blocked": s === "Blocked"
    };
  }

  // Search functionality
  onSearch(event: any): void {
    const searchValue = event.target.value.toLowerCase().trim();
    this.searchTerm = searchValue;
    this.filterData();
  }

  private filterData(): void {
    if (!this.searchTerm) {
      this.filteredRows = [...this.rows];
    } else {
      this.filteredRows = this.rows.filter(row => {
        const searchFields = [
          row.name,
          row.goldenCode,
          row.country,
          row.recordType,
          row.status
        ];
        
        return searchFields.some(field => 
          field && field.toString().toLowerCase().includes(this.searchTerm)
        );
      });
    }
  }

  // ====== NAVIGATION ======
  
  goToSyncPage(): void {
    this.router.navigate(['/dashboard/sync-golden-records']);
  }

  /** ====== AUTO-ADDED NAV HELPERS ====== */
  private getRowId(row: any): string {
    return ((row?.requestId ?? row?.id ?? row?.key ?? row?.RequestId ?? '') + '');
  }

  /** Open details page; editable=true opens edit mode, false opens view */
  viewOrEditRequest(row: any, editable: boolean): void {
    const id = this.getRowId(row);
    if (!id) return;
    this.router?.navigate(['/new-request', id], {
      queryParams: { mode: editable ? 'edit' : 'view' },
    });
  }

  /** ====== AUTO-ADDED SAFE STUBS (no-op / defaults) ====== */
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
  onlyQuarantined(): boolean { return false; }
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

  // Get current user role
  getCurrentUserRole(): string {
    return sessionStorage.getItem('userRole') || '';
  }

  // Check if current user is admin
  isAdmin(): boolean {
    return this.getCurrentUserRole() === 'admin';
  }

  // Check if current user is reviewer or admin
  isReviewerOrAdmin(): boolean {
    const role = this.getCurrentUserRole();
    return role === 'reviewer' || role === 'admin';
  }
}