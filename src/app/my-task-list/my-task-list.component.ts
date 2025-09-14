import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiRepo } from '../Core/api.repo';

@Component({
  selector: "app-my-task-list",
  templateUrl: "./my-task-list.component.html",
  styleUrl: "./my-task-list.component.scss",
})
export class MyTaskListComponent implements OnInit {
  // Arrays للطلبات
  CustomerRequests: any[] = [];
  ProductRequests: any[] = [];
  SupplierRequests: any[] = [];
  AllRequests: any[] = [];
  
  // Properties للـ template
  rows: any[] = [];
  search: string = '';
  statusTab: string = 'all';
  loading: boolean = false;
  counters = {
    rejected: 0,
    duplicate: 0,
    quarantine: 0,
    updated: 0,
    all: 0
  };

  // Loading state
  isLoading: boolean = false;
  errorMessage: string = '';

  // Duplicate rejected tracking
  duplicateRejected: any[] = [];

  // Checkbox management
  setOfCheckedIds: Record<string, Set<number>> = {
    all: new Set<number>(),
    customer: new Set<number>(),
    product: new Set<number>(),
    supplier: new Set<number>(),
  };

  checkedStates: Record<string, boolean> = {
    all: false,
    customer: false,
    product: false,
    supplier: false,
  };

  indeterminateStates: Record<string, boolean> = {
    all: false,
    customer: false,
    product: false,
    supplier: false,
  };

  setOfCheckedId = new Set<number>();
  statusCount: Record<string, number> = {};
  selectedIndex = 1;

  constructor(
    public router: Router,
    private apiRepo: ApiRepo
  ) {
    console.log('MyTaskListComponent initialized');
  }

  ngOnInit(): void {
    console.log('MyTaskList: Loading data entry rejected requests');
    this.loadMyRequests();
  }

  // في my-task-list.component.ts - تعديل دالة loadMyRequests()

async loadMyRequests(): Promise<void> {
  this.loading = true;
  this.isLoading = true;
  this.errorMessage = '';

  this.apiRepo.list().subscribe(
    (data: any[]) => {
      console.log('Total records received:', data?.length || 0);
      
      // Filter rejected requests assigned to data_entry
      const rejectedRequests = (data || []).filter(r => {
        // تحقق من assignedTo مع مراعاة القيم المختلفة
        const isAssignedToDataEntry = r.assignedTo === 'data_entry' || 
                                      r.assignedTo === 'system_import' || // إضافة للتوافق
                                      !r.assignedTo; // أو إذا كان فارغ
        
        // Regular rejected requests
        const isRegularRejected = r.status === 'Rejected' && 
                                 isAssignedToDataEntry && 
                                 r.requestType !== 'duplicate' &&
                                 r.requestType !== 'quarantine';
        
        // Duplicate records that were rejected
        const isDuplicateRejected = r.requestType === 'duplicate' && 
                                    r.status === 'Rejected' &&
                                    isAssignedToDataEntry;
        
        // Quarantine records that were rejected
        const isQuarantineRejected = (r.requestType === 'quarantine' || 
                                      r.originalRequestType === 'quarantine') && 
                                     r.status === 'Rejected' &&
                                     isAssignedToDataEntry;
        
        return isRegularRejected || isDuplicateRejected || isQuarantineRejected;
      });
      
      console.log('Rejected requests for data_entry:', rejectedRequests.length);
      console.log('Regular rejected:', rejectedRequests.filter(r => 
        r.requestType !== 'duplicate' && r.requestType !== 'quarantine').length);
      console.log('Duplicate rejected:', rejectedRequests.filter(r => 
        r.requestType === 'duplicate').length);
      console.log('Quarantine rejected:', rejectedRequests.filter(r => 
        r.requestType === 'quarantine' || r.originalRequestType === 'quarantine').length);
      
      this.loading = false;
      this.isLoading = false;
      this.categorizeRequests(rejectedRequests);
      this.updateAllRequests();
      this.updateRows();
      this.updateCounters();
    },
    (error) => {
      console.error('Error loading requests:', error);
      this.loading = false;
      this.isLoading = false;
      this.errorMessage = 'خطأ في تحميل البيانات';
      this.AllRequests = [];
      this.CustomerRequests = [];
      this.ProductRequests = [];
      this.SupplierRequests = [];
      this.updateRows();
    }
  );
}

  // NEW: Get origin badge for display
  getOriginBadge(record: any): string {
    const origin = record.originalRequestType || record.requestType || 'new';
    switch (origin) {
      case 'quarantine':
        return '🔶 Quarantine';
      case 'duplicate':
        return '👥 Duplicate';
      case 'golden':
        return '⭐ Golden';
      case 'rejected':
        return '🔄 Resubmitted';
      default:
        return '➕ New';
    }
  }

  // NEW: Get origin color
  getOriginColor(record: any): string {
    const origin = record.originalRequestType || record.requestType || 'new';
    switch (origin) {
      case 'quarantine': return 'orange';
      case 'duplicate': return 'blue';
      case 'golden': return 'purple';
      case 'rejected': return 'red';
      default: return 'green';
    }
  }

  // NEW: Get record origin description
  getRecordOrigin(record: any): string {
    const origin = record.originalRequestType || record.requestType || 'new';
    
    switch (origin) {
      case 'quarantine':
        return 'Originally from Quarantine';
      case 'duplicate':
        return 'Duplicate Record';
      case 'golden':
        return 'Golden Record Edit';
      case 'new':
        return 'New Request';
      default:
        return 'Request';
    }
  }

  // Status display methods - UPDATED
  getStatusColor(record: any): string {
    // Check original type first
    const originalType = record.originalRequestType || record.requestType;
    
    if (originalType === 'quarantine' && record.status === 'Quarantine') {
      return 'warning';
    }
    if (originalType === 'duplicate' && record.status === 'Rejected') {
      return 'volcano';
    }
    
    switch (record.status) {
      case 'Rejected': return 'red';
      case 'Pending': return 'gold';
      case 'Approved': return 'green';
      case 'Quarantine': return 'warning';
      default: return 'default';
    }
  }

  getStatusLabel(record: any): string {
    const originalType = record.originalRequestType || record.requestType;
    
    if (originalType === 'duplicate' && record.status === 'Rejected') {
      return 'Duplicate Rejected';
    }
    if (originalType === 'quarantine' && record.status === 'Quarantine') {
      return 'In Quarantine';
    }
    return record.status || 'Pending';
  }

  getActionIcon(record: any): string {
    const originalType = record.originalRequestType || record.requestType;
    
    if (originalType === 'duplicate') {
      return record.status === 'Rejected' ? 'edit' : 'team';
    }
    if (originalType === 'quarantine') {
      return 'warning';
    }
    return record.status === 'Rejected' ? 'edit' : 'eye';
  }

  getActionLabel(record: any): string {
    const originalType = record.originalRequestType || record.requestType;
    
    if (originalType === 'duplicate') {
      return record.status === 'Rejected' ? 'Fix & Resubmit' : 'Manage Duplicates';
    }
    if (originalType === 'quarantine') {
      return 'Complete Data';
    }
    return record.status === 'Rejected' ? 'Edit' : 'View';
  }

  handleRecordAction(record: any): void {
  const originalType = record.originalRequestType || record.requestType;
  
  if (originalType === 'duplicate') {
    // Handle duplicate records
    if (record.status === 'Rejected') {
      this.router.navigate(['/dashboard/duplicate-customer'], {
        queryParams: {
          recordId: record.id,
          action: 'edit',
          rejectionReason: record.rejectReason || record.IssueDescription,
          username: 'data_entry'
        }
      });
    } else {
      this.openDuplicateCustomerPage(record);
    }
  } else if (originalType === 'quarantine') {
    // ✅ تحديث: التعامل مع quarantine بناءً على الحالة
    if (record.status === 'Quarantine') {
      // للإكمال الأولي - يذهب لصفحة Quarantine
      this.router.navigate(['/dashboard/quarantine'], {
        queryParams: {
          recordId: record.id,
          action: 'complete',
          username: 'data_entry'
        }
      });
    } else if (record.status === 'Rejected') {
      // ✅ للـ rejected quarantine - يذهب لـ New Request page
      this.viewOrEditRequest(record.id, record.status, true);
    }
  } else {
    // السلوك العادي للـ records
    if (record.status === 'Rejected') {
      this.editRecord(record);
    } else {
      this.viewOrEditRequest(record.id, record.status, false);
    }
  }
}

  openDuplicateCustomerPage(record: any): void {
    // Navigate to duplicate customer page with record data
    this.router.navigate(['/dashboard/duplicate-customer'], {
      queryParams: { 
        groupId: record.id,
        taxNumber: record.tax,
        username: 'data_entry'
      },
      state: {
        group: record,
        records: []
      }
    });
  }

  onSearchChange(value: string): void {
    this.search = value;
    this.updateRows();
  }

  setStatusTab(tab: string): void {
    this.statusTab = tab;
    this.updateRows();
  }

  updateRows(): void {
    let filtered = [...this.AllRequests];
    
    // Filter by status tab
    if (this.statusTab === 'rejected') {
      // Show regular rejected requests (not duplicates)
      filtered = filtered.filter(r => 
        r.status === 'Rejected' && r.requestType !== 'duplicate'
      );
    } else if (this.statusTab === 'duplicate') {
      // Show duplicate/master rejected requests
      filtered = filtered.filter(r => 
        r.requestType === 'duplicate' && r.status === 'Rejected'
      );
    } else if (this.statusTab === 'quarantine') {
      // Show quarantine records
      filtered = filtered.filter(r => 
        r.status === 'Quarantine' || r.originalRequestType === 'quarantine'
      );
    } else if (this.statusTab === 'updated') {
      // Show requests that have been updated after creation
      filtered = filtered.filter(r => 
        r.updatedAt && 
        r.updatedAt !== r.createdAt
      );
    }
    // 'all' tab shows everything
    
    // Filter by search
    if (this.search) {
      const searchLower = this.search.toLowerCase();
      filtered = filtered.filter(r => 
        r.name?.toLowerCase().includes(searchLower) ||
        r.firstName?.toLowerCase().includes(searchLower) ||
        r.firstNameAr?.toLowerCase().includes(searchLower) ||
        r.requestId?.toLowerCase().includes(searchLower) ||
        r.id?.toString().toLowerCase().includes(searchLower) ||
        r.tax?.toLowerCase().includes(searchLower) ||
        r.city?.toLowerCase().includes(searchLower)
      );
    }
    
    this.rows = filtered;
    console.log('Filtered rows:', this.rows.length);
  }

  updateCounters(): void {
    // Count different types of rejected requests
    this.counters.rejected = this.AllRequests.filter(r => 
      r.status === 'Rejected' && r.requestType !== 'duplicate'
    ).length;
    this.counters.duplicate = this.AllRequests.filter(r => 
      r.requestType === 'duplicate' && r.status === 'Rejected'
    ).length;
    this.counters.quarantine = this.AllRequests.filter(r => 
      r.status === 'Quarantine' || r.originalRequestType === 'quarantine'
    ).length;
    this.counters.updated = this.AllRequests.filter(r => 
      r.updatedAt && r.updatedAt !== r.createdAt
    ).length;
    this.counters.all = this.AllRequests.length;
  }

  getCustomerTypeLabel(type: string): string {
    const labels: any = {
      'limited_liability': 'Limited Liability',
      'corporation': 'Corporation', 
      'sole_proprietorship': 'Sole Proprietorship',
      'Corporate': 'Corporate',
      'SME': 'SME'
    };
    return labels[type] || type || 'General';
  }

  getRecordTypeLabel(row: any): string {
    const originalType = row.originalRequestType || row.requestType;
    
    if (originalType === 'quarantine') {
      return 'Quarantine Record';
    }
    if (row.requestType === 'duplicate' && row.status === 'Rejected') {
      return 'Duplicate Rejected';
    }
    if (row.isDuplicate || row.requestType === 'duplicate') {
      if (row.isMaster === 1) {
        return 'Master Record';
      }
      return 'Duplicate Record';
    }
    return 'Regular Request';
  }

editRecord(row: any): void {
  const originalType = row.originalRequestType || row.requestType;
  
  if (originalType === 'duplicate' || row.requestType === 'duplicate') {
    // For duplicate/master records
    this.router.navigate(['/dashboard/duplicate-customer'], {
      queryParams: { 
        recordId: row.id,
        action: 'edit',
        rejectionReason: row.rejectReason || row.IssueDescription,
        username: 'data_entry'
      }
    });
  } else if (originalType === 'quarantine' && row.status === 'Quarantine') {
    // ✅ للـ quarantine غير المكتملة
    this.router.navigate(['/dashboard/quarantine'], {
      queryParams: {
        recordId: row.id,
        action: 'complete',
        username: 'data_entry'
      }
    });
  } else {
    // ✅ للـ regular requests و quarantine rejected
    this.viewOrEditRequest(row.id, row.status, true);
  }
}

  private categorizeRequests(requests: any[]): void {
    this.CustomerRequests = [];
    this.ProductRequests = [];
    this.SupplierRequests = [];

    requests.forEach(req => {
      const formattedRequest = {
        id: req.id || req.requestId,
        requestId: req.requestId || req.id,
        name: req.firstName || req.firstNameAr || 'غير محدد',
        firstName: req.firstName,
        firstNameAr: req.firstNameAr,
        submittedBy: req.createdBy || 'System',
        status: req.status || 'Rejected',
        RecordIdentifier: req.DivisionOption || req.origin || 'General',
        isRejected: req.status === 'Rejected',
        rejectReason: req.rejectReason,
        IssueDescription: req.rejectReason || req.IssueDescription || req.notes,
        canEdit: true, // Data entry can always edit rejected records
        assignedTo: req.assignedTo,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
        CustomerType: req.CustomerType,
        tax: req.tax,
        city: req.city,
        street: req.street,
        buildingNumber: req.buildingNumber,
        
        // Duplicate-specific fields
        isDuplicate: req.requestType === 'duplicate' || req.isMaster === 1 || req.masterId !== null,
        isMaster: req.isMaster,
        masterId: req.masterId,
        requestType: req.requestType,
        originalRequestType: req.originalRequestType, // NEW: Add originalRequestType
        linkedRecords: req.linkedRecords || 0,
        builtFromRecords: req.builtFromRecords
      };

      // Categorize based on CustomerType or origin
      if (req.CustomerType === 'supplier' || req.origin === 'supplier') {
        this.SupplierRequests.push(formattedRequest);
      } else if (req.CustomerType === 'product' || req.origin === 'product') {
        this.ProductRequests.push(formattedRequest);
      } else {
        this.CustomerRequests.push(formattedRequest);
      }
    });

    // Sort by creation date (newest first)
    const sortByDate = (a: any, b: any) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    };

    this.CustomerRequests.sort(sortByDate);
    this.ProductRequests.sort(sortByDate);
    this.SupplierRequests.sort(sortByDate);

    console.log('Categorized requests - Customer:', this.CustomerRequests.length, 
                'Product:', this.ProductRequests.length, 
                'Supplier:', this.SupplierRequests.length);
  }

  private updateAllRequests(): void {
    this.AllRequests = [
      ...this.CustomerRequests,
      ...this.ProductRequests,
      ...this.SupplierRequests,
    ];
    this.updateRows();
    this.updateCounters();
  }

  refreshData(): void {
    console.log('Refreshing data...');
    this.loadMyRequests();
  }

  mixedStatuses(): boolean {
    // Check if there are both regular and duplicate rejected
    const hasRegularRejected = this.AllRequests.some(r => 
      r.status === 'Rejected' && r.requestType !== 'duplicate'
    );
    const hasDuplicateRejected = this.AllRequests.some(r => 
      r.requestType === 'duplicate' && r.status === 'Rejected'
    );
    const hasQuarantine = this.AllRequests.some(r => 
      r.status === 'Quarantine' || r.originalRequestType === 'quarantine'
    );
    return hasRegularRejected && hasDuplicateRejected && hasQuarantine;
  }

  deleteRecod(index: number): void {
    if (this.selectedIndex === 0) {
      this.AllRequests.splice(index, 1);
      this.AllRequests = [...this.AllRequests];
    } else if (this.selectedIndex === 1) {
      this.CustomerRequests.splice(index, 1);
      this.CustomerRequests = [...this.CustomerRequests];
    } else if (this.selectedIndex === 2) {
      this.ProductRequests.splice(index, 1);
      this.ProductRequests = [...this.ProductRequests];
    } else if (this.selectedIndex === 3) {
      this.SupplierRequests.splice(index, 1);
      this.SupplierRequests = [...this.SupplierRequests];
    }
    this.updateAllRequests();
  }

  deleteRows(): void {
    const tabKey = this.getCurrentTabKey();
    const set = this.setOfCheckedIds[tabKey];
    
    if (this.selectedIndex === 0) {
      this.AllRequests = this.AllRequests.filter(item => !set.has(item.id));
    } else if (this.selectedIndex === 1) {
      this.CustomerRequests = this.CustomerRequests.filter(item => !set.has(item.id));
    } else if (this.selectedIndex === 2) {
      this.ProductRequests = this.ProductRequests.filter(item => !set.has(item.id));
    } else if (this.selectedIndex === 3) {
      this.SupplierRequests = this.SupplierRequests.filter(item => !set.has(item.id));
    }

    set.clear();
    this.refreshCheckedStatus();
    this.updateAllRequests();
  }

  getCurrentTabKey(): string {
    return ["all", "customer", "product", "supplier"][this.selectedIndex];
  }

  getCurrentTableData(): any[] {
    switch (this.selectedIndex) {
      case 0:
        return this.AllRequests;
      case 1:
        return this.CustomerRequests;
      case 2:
        return this.ProductRequests;
      case 3:
        return this.SupplierRequests;
      default:
        return [];
    }
  }

  onAllChecked(value: boolean): void {
    const tabKey = this.getCurrentTabKey();
    const data = this.getCurrentTableData();
    const set = this.setOfCheckedIds[tabKey];

    data.forEach((item) => {
      if (value) {
        set.add(item.id);
      } else {
        set.delete(item.id);
      }
    });

    this.refreshCheckedStatus();
  }

  refreshCheckedStatus(): void {
    const tabKey = this.getCurrentTabKey();
    const data = this.getCurrentTableData();
    const set = this.setOfCheckedIds[tabKey];

    const allChecked = data.length > 0 && data.every((item) => set.has(item.id));
    const someChecked = data.some((item) => set.has(item.id));

    this.checkedStates[tabKey] = allChecked;
    this.indeterminateStates[tabKey] = someChecked && !allChecked;

    const selectedItems = data.filter((item) => set.has(item.id));
    this.statusCount = selectedItems.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  onItemChecked(id: string, checkedOrEvent: any, status?: string): void {
    const checked = typeof checkedOrEvent === 'boolean' ? 
      checkedOrEvent : 
      !!(checkedOrEvent?.target?.checked ?? checkedOrEvent);
    
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    const tabKey = this.getCurrentTabKey();
    const set = this.setOfCheckedIds[tabKey];
    
    if (checked) {
      set.add(numId);
    } else {
      set.delete(numId);
    }
    
    this.refreshCheckedStatus();
  }

  updateCheckedSet(id: number, status: string, checked: boolean): void {
    this.onItemChecked(id.toString(), checked, status);
  }

  onTabChange(index: number): void {
    this.selectedIndex = index;
    this.refreshCheckedStatus();
  }

  viewOrEditRequest(id: number | string, status: string, canEdit: boolean): void {
    this.router.navigate(["/dashboard/new-request", id], {
      queryParams: { edit: canEdit, status },
    });
  }
}