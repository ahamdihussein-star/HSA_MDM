import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { Component, Inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { DATA_REPO, IDataRepo, RequestType } from '../Core/data-repo';
import { environment } from '../../environments/environment';
import { NotificationService } from '../services/notification.service';

type TaskRow = {
  id?: string;
  requestId?: string;
  status?: string;
  firstName?: string;
  firstNameAr?: string;
  tax?: string;
  country?: string;
  city?: string;
  createdAt?: string;
  createdBy?: string;
  assignedTo?: string;
  rejectReason?: string;
  
  // Duplicate fields
  masterId?: string;
  isMaster?: number;
  isMerged?: number;
  mergedIntoId?: string;
  origin?: string;
  confidence?: number;
  sourceSystem?: string;
  notes?: string;
  
  // Request type fields
  requestType?: RequestType;
  originalRequestType?: RequestType;  // NEW: Add originalRequestType
  
  // UI enhancement fields
  hasMergedDuplicates?: boolean;
  displayStatus?: string;
  
  [k: string]: any;
};

@Component({
  selector: 'app-admin-task-list',
  templateUrl: './admin-task-list.component.html',
  styleUrls: ['./admin-task-list.component.scss'],
})
export class AdminTaskListComponent implements OnInit {
  // ==== API configuration ====
  private apiBase = environment.apiBaseUrl || 'http://localhost:3000/api';
  
  // ==== data / state ====
  taskList: TaskRow[] = [];
  filteredTaskList: TaskRow[] = [];
  loading = false;
  error: string | null = null;

  // Search and filter properties
  searchTerm = '';
  filterByRecordType = '';
  uniqueRecordTypes: string[] = [];

  // Current user info (from API, not localStorage)
  currentUser: any = null;
  userRole: string | null = null;

  // selection state for <nz-table>
  checked = false;
  indeterminate = false;
  setOfCheckedId = new Set<string>();

  // dialogs state
  isApprovedVisible = false;
  isRejectedConfirmVisible = false;
  isRejectedVisible = false;
  isAssignVisible = false;

  // form fields داخل المودالز
  approvedChecked = false;
  rejectedChecked = false;
  inputValue = '';
  selectedDepartment: string | null = null;

  constructor(
    @Inject(DATA_REPO) private repo: IDataRepo,
    private router: Router,
    private message: NzMessageService,
    private notification: NzNotificationService,
    private http: HttpClient,
    private notificationService: NotificationService
  ) {}

  async ngOnInit(): Promise<void> {
    // Get current user from API first
    await this.getCurrentUser();
    // Then load tasks
    await this.load();
    
    // Reload notifications for current user
    this.notificationService.reloadNotifications();
  }

  // Method to sync notifications with current tasks
  syncNotificationsWithTasks(): void {
    // Get current task list and create notifications from it
    const currentTasks = this.taskList || [];
    console.log('🔔 Syncing notifications for admin tasks:', currentTasks.length);
    this.notificationService.createNotificationsFromTaskList(currentTasks);
  }

  // ====== Get current user from API ======
  private async getCurrentUser(): Promise<void> {
    try {
      const user = await firstValueFrom(
        this.http.get<any>(`${this.apiBase}/auth/me`)
      );
      
      if (user) {
        this.currentUser = user;
        // Map role
        if (user.role === '2' || user.role === 'reviewer' || user.role === 'master') {
          this.userRole = 'reviewer';
        } else if (user.role === 'admin' || user.role === 'demo-admin') {
          this.userRole = 'admin';
        } else {
          this.userRole = user.role;
        }
      }
    } catch (error) {
      console.error('[AdminTaskList] Error getting current user:', error);
      // Default to reviewer role for this page
      this.userRole = 'reviewer';
    }
  }

  // ====== data loading ======
  async load(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const list = await firstValueFrom(this.repo.list());
      const rows = Array.isArray(list) ? list : [];
      
      // Filter for tasks that should appear in reviewer task list
      this.taskList = rows
        .filter(r => {
          const status = (r.status ?? '').toLowerCase();
          const assignedTo = r.assignedTo ?? '';
          
          // Must be assigned to reviewer
          if (assignedTo !== 'reviewer') {
            return false;
          }
          
          // Show master records (regardless of status)
          if (r.isMaster === 1) {
            return true;
          }
          
          // Show pending OR quarantined requests that are NOT duplicates (don't have masterId)
          if ((status === 'pending' || status === 'quarantined') && !r.masterId) {
            return true;
          }
          
          return false;
        })
        .map((r: any) => ({
          ...r,
          id: r?.id ?? r?.requestId ?? r?._id ?? this.cryptoRandomId(),
          // Set display status based on requestType
          displayStatus: this.getDisplayStatus(r),
          // Add flag to identify master records (for UI indicators)
          hasMergedDuplicates: r.isMaster === 1
        }));
        
      this.refreshCheckedStatus();
      this.generateUniqueRecordTypes();
      this.applyFilters();
      console.log('[AdminTaskList] Loaded tasks:', this.taskList.length);
      console.log('[AdminTaskList] Master records:', 
                 this.taskList.filter(t => t.isMaster === 1).length);
      console.log('[AdminTaskList] New requests:', 
                 this.taskList.filter(t => t.requestType === 'new').length);
    } catch (e) {
      console.error('[AdminTaskList] load error', e);
      this.error = 'Failed to load tasks';
      this.taskList = [];
      this.setOfCheckedId.clear();
      this.refreshCheckedStatus();
    } finally {
      this.loading = false;
    }
    
    // Sync notifications after loading
    this.syncNotificationsWithTasks();
  }

  // NEW: Get origin badge for display
  getOriginBadge(record: TaskRow): string {
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
  getOriginColor(record: TaskRow): string {
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
  getRecordOrigin(record: TaskRow): string {
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

  // UPDATED: Get display status based on requestType and originalRequestType
  private getDisplayStatus(record: any): string {
    const originalType = record.originalRequestType || record.requestType;
    const isMaster = record.isMaster === 1;
    
    // Handle based on originalRequestType first, then fallback to requestType
    switch (originalType) {
      case 'new':
        return 'New Request';
      case 'quarantine':
        return record.status === 'Pending' ? 'Quarantine Completed' : 'Quarantine Updated';
      case 'rejected':
        return 'Rejected & Resubmitted';
      case 'golden':
        return 'Golden Record Update';
      case 'duplicate':
        return 'Duplicates';
      default:
        // Fallback logic for records without requestType
        if (isMaster) {
          return 'Duplicates';
        }
        // Use original status as fallback
        return record.status || 'Pending';
    }
  }

  // ====== helpers ======
  private getRowKey(row: TaskRow): string {
    return String(row.id ?? row.requestId ?? '');
  }

  private updateCheckedSet(id: string, checked: boolean): void {
    if (!id) return;
    checked ? this.setOfCheckedId.add(id) : this.setOfCheckedId.delete(id);
    this.refreshCheckedStatus();
  }

  refreshCheckedStatus(): void {
    const total = this.taskList.length;
    const selected = this.taskList.filter(r => this.setOfCheckedId.has(this.getRowKey(r))).length;
    this.checked = total > 0 && selected === total;
    this.indeterminate = selected > 0 && selected < total;
  }

  // ====== table events ======
  onAllChecked(checked: boolean): void {
    this.taskList.forEach(item => this.updateCheckedSet(this.getRowKey(item), checked));
  }

  onItemChecked(id: string, checked: boolean): void {
    this.updateCheckedSet(id, checked);
  }

  // ====== status filters - UPDATED to use originalRequestType ======
  onlyNewRequests(): boolean {
    const sel = this.selectedRows();
    return sel.length > 0 && sel.every(r => (r.originalRequestType || r.requestType) === 'new');
  }

  onlyDuplicates(): boolean {
    const sel = this.selectedRows();
    return sel.length > 0 && sel.every(r => 
      (r.originalRequestType || r.requestType) === 'duplicate' || r.hasMergedDuplicates
    );
  }

  onlyRejected(): boolean {
    const sel = this.selectedRows();
    return sel.length > 0 && sel.every(r => (r.originalRequestType || r.requestType) === 'rejected');
  }

  mixedRequestTypes(): boolean {
    const sel = this.selectedRows();
    if (sel.length < 2) return false;
    const uniq = new Set(sel.map(r => r.originalRequestType || r.requestType || 'unknown'));
    return uniq.size > 1;
  }

  // ====== Helper methods for duplicate identification - UPDATED ======
  isDuplicateRecord(row: TaskRow): boolean {
    const originalType = row.originalRequestType || row.requestType;
    return Boolean(originalType === 'duplicate' || 
                  row.hasMergedDuplicates || 
                  (row.origin === 'duplicate' || row.origin === 'duplicate_merge'));
  }

  isMergedDuplicate(row: TaskRow): boolean {
    const originalType = row.originalRequestType || row.requestType;
    return Boolean(row.hasMergedDuplicates || originalType === 'duplicate');
  }

  // UPDATED: Check if this is a master record that should open duplicate page
  shouldOpenDuplicatePage(row: TaskRow): boolean {
    const originalType = row.originalRequestType || row.requestType;
    return Boolean(row.hasMergedDuplicates || 
                  originalType === 'duplicate' ||
                  (row.isMaster === 1 && row.masterId));
  }

  // ====== Template getter methods for complex expressions ======
  get newRequestsCount(): number {
    return this.taskList.filter(t => (t.originalRequestType || t.requestType) === 'new').length;
  }

  get duplicatesCount(): number {
    return this.taskList.filter(t => 
      (t.originalRequestType || t.requestType) === 'duplicate' || t.hasMergedDuplicates
    ).length;
  }

  get rejectedCount(): number {
    return this.taskList.filter(t => (t.originalRequestType || t.requestType) === 'rejected').length;
  }

  get quarantineCount(): number {
    return this.taskList.filter(t => (t.originalRequestType || t.requestType) === 'quarantine').length;
  }

  get goldenCount(): number {
    return this.taskList.filter(t => (t.originalRequestType || t.requestType) === 'golden').length;
  }

  get totalTasksCount(): number {
    return this.taskList.length;
  }

  get hasSelectedDuplicates(): boolean {
    return this.selectedRows().some(r => this.isMergedDuplicate(r));
  }

  get hasSelectedNewOnly(): boolean {
    const selected = this.selectedRows();
    return selected.length > 0 && selected.every(r => 
      (r.originalRequestType || r.requestType) === 'new'
    );
  }

  get hasSelectedDuplicatesOnly(): boolean {
    const selected = this.selectedRows();
    return selected.length > 0 && selected.every(r => this.isMergedDuplicate(r));
  }

  get hasSelectedMixed(): boolean {
    const selected = this.selectedRows();
    if (selected.length <= 1) return false;
    const types = new Set(selected.map(r => r.originalRequestType || r.requestType));
    return types.size > 1;
  }

  get rejectionPlaceholder(): string {
    if (this.hasSelectedDuplicates) {
      return 'e.g., Incorrect master record selected, missing data validation...';
    }
    const selected = this.selectedRows();
    const hasGolden = selected.some(r => 
      (r.originalRequestType || r.requestType) === 'golden'
    );
    if (hasGolden) {
      return 'e.g., Golden record changes not appropriate, data quality issues...';
    }
    return 'Enter rejection reason...';
  }

  getRequestTypeLabel(row: TaskRow): string {
    const originalType = row.originalRequestType || row.requestType;
    switch (originalType) {
      case 'new': return 'New Request';
      case 'quarantine': return 'Quarantine Record';
      case 'rejected': return 'Rejected & Resubmitted';
      case 'golden': return 'Golden Record Update';
      case 'duplicate': return 'Duplicates';
      default: 
        if (row.hasMergedDuplicates) return 'Duplicates';
        return 'Unknown';
    }
  }

  getRequestTypeColor(row: TaskRow): string {
    const originalType = row.originalRequestType || row.requestType;
    switch (originalType) {
      case 'new': return 'gold';
      case 'quarantine': return 'orange';
      case 'rejected': return 'red';
      case 'golden': return 'purple';
      case 'duplicate': return 'blue';
      default:
        if (row.hasMergedDuplicates) return 'blue';
        return 'default';
    }
  }

  // ====== UPDATED navigation logic ======
  viewOrEditRequest(row: TaskRow, isEdit: boolean): void {
    console.log('[AdminTaskList] viewOrEditRequest called with row:', row);
    const id = this.getRowKey(row);
    console.log('[AdminTaskList] Extracted ID:', id);
    
    if (!id) {
      console.error('[AdminTaskList] No ID found in row!');
      this.message.error('Cannot open request: No ID found');
      return;
    }
    
    
    const requestType = row.requestType;
    const originalType = row.originalRequestType || row.requestType;
    
    console.log('[AdminTaskList] viewOrEditRequest:', {
      id, 
      requestType,
      originalRequestType: originalType,
      isEdit, 
      userRole: this.userRole
    });

    // Route based on requestType
    switch (requestType) {
      case 'new':
      case 'quarantine': 
      case 'rejected':
        // Navigate to New Request page with approve/reject buttons for reviewer
        console.log('[AdminTaskList] Navigating to new-request for review:', requestType);
        console.log('[AdminTaskList] Navigation URL will be: /dashboard/new-request/' + id);
        this.router.navigate(['/dashboard/new-request', id], {
          queryParams: { 
            mode: 'review',
            status: row.status,
            requestType: requestType,
            originalRequestType: originalType,
            from: 'admin-task-list',
            action: 'review',
            userRole: 'reviewer'
          },
          state: { record: row }
        }).then(success => {
          if (!success) {
            console.error('[AdminTaskList] Navigation to new-request failed');
            this.message.error('Navigation failed. Please try again.');
          } else {
            console.log('[AdminTaskList] Successfully navigated to new-request for review');
          }
        }).catch(error => {
          console.error('[AdminTaskList] Navigation to new-request error:', error);
          this.message.error('Navigation error occurred.');
        });
        break;
        
      case 'golden':
        // Navigate to Golden Records Summary page (no ID, uses state data)
        console.log('[AdminTaskList] Navigating to golden-summary for:', id);
        
        // Build state data similar to golden-requests component
        const masterData = {
          id: row.id,
          requestId: row.requestId || row.id,
          goldenCode: row['goldenRecordCode'] || `G${row.id}`,
          goldenRecordCode: row['goldenRecordCode'],
          name: row.firstName || '',
          firstName: row.firstName || '',
          nameAr: row.firstNameAr || '',
          firstNameAr: row.firstNameAr || '',
          tax: row.tax || '',
          taxNumber: row.tax || '',
          CustomerType: row['CustomerType'] || '',
          CompanyOwner: row['CompanyOwner'] || '',
          ContactName: row['ContactName'] || '',
          JobTitle: row['JobTitle'] || '',
          EmailAddress: row['EmailAddress'] || '',
          MobileNumber: row['MobileNumber'] || '',
          Landline: row['Landline'] || '',
          PrefferedLanguage: row['PrefferedLanguage'] || '',
          buildingNumber: row['buildingNumber'] || '',
          street: row['street'] || '',
          city: row.city || '',
          country: row.country || '',
          SalesOrgOption: row['SalesOrgOption'] || '',
          DistributionChannelOption: row['DistributionChannelOption'] || '',
          DivisionOption: row['DivisionOption'] || '',
          status: row.status || 'Pending',
          companyStatus: row['companyStatus'] || 'Active',
          origin: row.origin || '',
          sourceSystem: row.sourceSystem || '',
          isGolden: row['isGolden'] || 0,
          createdBy: row.createdBy || '',
          createdAt: row.createdAt || '',
          updatedAt: row['updatedAt'] || '',
          originalRequestType: originalType
        };

        this.router.navigate(['/dashboard/golden-summary'], {
          state: {
            master: masterData,
            duplicates: [],
            record: {
              contacts: row['contacts'] || [],
              documents: row['documents'] || [],
              blockReason: row['blockReason'] || null
            }
          }
        }).then(success => {
          if (!success) {
            console.error('[AdminTaskList] Navigation to golden-summary failed');
            this.message.error('Failed to open Golden Records Summary page');
          } else {
            console.log('[AdminTaskList] Successfully navigated to golden-summary');
          }
        }).catch(error => {
          console.error('[AdminTaskList] Navigation to golden-summary error:', error);
          this.message.error('Navigation error occurred.');
        });
        break;
        
      case 'duplicate':
      default:
        // Navigate to Duplicate Customer page (existing logic)
        if (this.shouldOpenDuplicatePage(row)) {
          this.openDuplicateCustomerPage(row);
        } else {
          // Fallback to new-request page for unknown types
          console.log('[AdminTaskList] Fallback navigation to new-request for unknown type:', requestType);
          this.router.navigate(['/dashboard/new-request', id], {
            queryParams: { 
              mode: 'review',
              status: row.status,
              requestType: requestType || 'unknown',
              originalRequestType: originalType,
              from: 'admin-task-list',
              action: 'review',
              userRole: 'reviewer'
            },
            state: { record: row }
          }).catch(error => {
            console.error('[AdminTaskList] Fallback navigation error:', error);
            this.message.error('Navigation error occurred.');
          });
        }
        break;
    }
  }

  // UPDATED: Open duplicate customer page for master records
  openDuplicateCustomerPage(row: TaskRow): void {
    console.log('[AdminTaskList] Opening duplicate customer page for master record:', row);
    
    const masterId = row.id || row.requestId;
    if (!masterId) {
      this.message.error('Cannot open duplicate page: Master ID not found');
      return;
    }

    // Navigate to duplicate-customer page with master ID
    this.router.navigate(['/dashboard/duplicate-customer'], {
      queryParams: { 
        groupId: masterId,
        from: 'admin-task-list',
        userRole: 'reviewer',
        action: 'review',
        originalRequestType: row.originalRequestType || row.requestType
      },
      state: { 
        record: row,
        masterId: masterId,
        taxNumber: row.tax
      }
    }).then(success => {
      if (!success) {
        console.error('[AdminTaskList] Navigation to duplicate page failed');
        this.message.error('Failed to open duplicate customer page');
      }
    }).catch(error => {
      console.error('[AdminTaskList] Navigation to duplicate page error:', error);
      this.message.error('Navigation error occurred');
    });
  }

  // View details (for review)
  viewDetails(row: any): void {
    // Navigate to duplicate-customer in review mode
    this.router.navigate(
      ['/dashboard/duplicate-customer'],
      {
        queryParams: {
          recordId: row.id,
          username: 'reviewer',
          userRole: 'reviewer',
          action: 'review',
          originalRequestType: row.originalRequestType || row.requestType
        }
      }
    );
  }

  // Edit request (not typically used by reviewer, but keeping for flexibility)
  editRequest(row: TaskRow): void {
    const id = this.getRowKey(row);
    if (!id) return;
    
    // If the request is rejected and was created by current user, allow edit
    if (row.requestType === 'rejected' && row.createdBy === this.currentUser?.id) {
      this.router.navigate(['/dashboard/new-request', id], {
        queryParams: { 
          mode: 'edit',
          status: row.status,
          requestType: row.requestType,
          originalRequestType: row.originalRequestType,
          from: 'admin-task-list',
          action: 'edit',
          userRole: 'data_entry'
        }
      });
    } else {
      // Otherwise, just view for review
      this.viewDetails(row);
    }
  }

  // ====== Single row actions - UPDATED for different request types ======
  async approveSingle(row: TaskRow): Promise<void> {
    const id = this.getRowKey(row);
    if (!id) return;

    // Handle different request types
    if (this.isMergedDuplicate(row)) {
      await this.approveDuplicate(row);
      return;
    }

    if (row.status !== 'Pending') {
      this.message.warning('Can only approve pending requests');
      return;
    }

    try {
      await firstValueFrom(
        this.http.post(`${this.apiBase}/requests/${id}/approve`, {
          note: `${this.getRequestTypeLabel(row)} approved by reviewer`,
          requestType: row.requestType,
          originalRequestType: row.originalRequestType
        })
      );
      
      this.notification.success('Success', `${this.getRequestTypeLabel(row)} approved successfully`);
      await this.load();
    } catch (error) {
      console.error('Approve error:', error);
      this.message.error('Failed to approve request');
    }
  }

  // UPDATED: Approve duplicate/merged record
  async approveDuplicate(row: TaskRow): Promise<void> {
    const id = this.getRowKey(row);
    if (!id) return;

    console.log('[AdminTaskList] Approving duplicate:', id);

    try {
      await firstValueFrom(
        this.http.post(`${this.apiBase}/requests/${id}/approve`, {
          note: 'Duplicate merge approved by reviewer',
          type: 'duplicate',
          requestType: row.requestType,
          originalRequestType: row.originalRequestType
        })
      );
      
      this.notification.success('Success', 'Duplicate approved successfully');
      await this.load();
    } catch (error) {
      console.error('Approve duplicate error:', error);
      this.message.error('Failed to approve duplicate');
    }
  }

  async rejectSingle(row: TaskRow): Promise<void> {
    const id = this.getRowKey(row);
    if (!id) return;

    if (row.status !== 'Pending') {
      this.message.warning('Can only reject pending requests');
      return;
    }

    // Show a prompt for rejection reason
    this.inputValue = '';
    this.setOfCheckedId.clear();
    this.setOfCheckedId.add(id);
    this.refreshCheckedStatus();
    this.isRejectedConfirmVisible = true;
  }

  deleteSingle(row: TaskRow): void {
    const id = this.getRowKey(row);
    if (!id) return;
    
    console.log('[AdminTaskList] deleteSingle', id);
    // Only admin should be able to delete
    if (this.userRole !== 'admin') {
      this.message.warning('You do not have permission to delete requests');
      return;
    }
    
    // TODO: Implement delete API call if needed
    this.message.info('Delete functionality not implemented');
  }

  // ====== Bulk actions - UPDATED for different request types ======
  deleteRows(): void {
    const ids = this.selectedIds();
    if (ids.length === 0) {
      this.message.warning('Please select items to delete');
      return;
    }
    
    // Only admin should be able to delete
    if (this.userRole !== 'admin') {
      this.message.warning('You do not have permission to delete requests');
      return;
    }
    
    console.log('[AdminTaskList] deleteRows', ids);
    // TODO: Implement bulk delete API call if needed
    this.message.info('Bulk delete functionality not implemented');
  }

  // ====== approve workflow - UPDATED for different request types ======
  showApproveModal(): void { 
    const selectedRows = this.selectedRows();
    
    if (selectedRows.length === 0) {
      this.message.warning('Please select items to approve');
      return;
    }

    // Check if we can approve all selected items (all should be pending)
    const canApproveAll = selectedRows.every(row => 
      row.status?.toLowerCase() === 'pending'
    );

    if (!canApproveAll) {
      this.message.warning('Can only approve pending requests');
      return;
    }

    this.isApprovedVisible = true; 
  }

  async submitApprove(): Promise<void> {
    const selectedRows = this.selectedRows();
    if (selectedRows.length === 0) {
      this.message.warning('Please select items to approve');
      return;
    }

    this.loading = true;
    try {
      // Approve each selected item
      for (const row of selectedRows) {
        const id = this.getRowKey(row);
        
        await firstValueFrom(
          this.http.post(`${this.apiBase}/requests/${id}/approve`, {
            note: `${this.getRequestTypeLabel(row)} approved by reviewer`,
            requestType: row.requestType,
            originalRequestType: row.originalRequestType,
            type: this.isMergedDuplicate(row) ? 'duplicate' : 'normal'
          })
        );
      }
      
      this.notification.success('Success', `${selectedRows.length} item(s) approved successfully`);
      this.isApprovedVisible = false;
      this.setOfCheckedId.clear();
      this.refreshCheckedStatus();
      
      // Reload to get updated data
      await this.load();
    } catch (error) {
      console.error('Bulk approve error:', error);
      this.message.error('Failed to approve items');
    } finally {
      this.loading = false;
    }
  }

  // ====== reject workflow - UPDATED for different request types ======
  showRejectedModal(): void { 
    const selectedRows = this.selectedRows();
    
    if (selectedRows.length === 0) {
      this.message.warning('Please select items to reject');
      return;
    }

    // Check if we can reject all selected items (all should be pending)
    const canRejectAll = selectedRows.every(row => 
      row.status?.toLowerCase() === 'pending'
    );

    if (!canRejectAll) {
      this.message.warning('Can only reject pending requests');
      return;
    }

    this.isRejectedConfirmVisible = true; 
  }

  rejectApprove(): void {
    this.isRejectedConfirmVisible = false;
    this.isRejectedVisible = true;
  }

  async confirmReject(): Promise<void> {
    const selectedRows = this.selectedRows();
    const reason = this.inputValue.trim() || 'Rejected by reviewer';
    
    if (selectedRows.length === 0) {
      this.message.warning('Please select items to reject');
      return;
    }

    this.loading = true;
    try {
      // Reject each selected item
      for (const row of selectedRows) {
        const id = this.getRowKey(row);
        
        await firstValueFrom(
          this.http.post(`${this.apiBase}/requests/${id}/reject`, { 
            reason: reason,
            requestType: row.requestType,
            originalRequestType: row.originalRequestType,
            type: this.isMergedDuplicate(row) ? 'duplicate' : 'normal'
          })
        );
      }
      
      this.notification.success('Success', `${selectedRows.length} item(s) rejected successfully`);
      this.isRejectedVisible = false;
      this.inputValue = '';
      this.setOfCheckedId.clear();
      this.refreshCheckedStatus();
      
      // Reload to get updated data
      await this.load();
    } catch (error) {
      console.error('Bulk reject error:', error);
      this.message.error('Failed to reject items');
    } finally {
      this.loading = false;
    }
  }

  // ====== assign workflow ======
  showAssignModal(): void { 
    this.isAssignVisible = true; 
  }

  async assignToBtn(): Promise<void> {
    const ids = this.selectedIds();
    if (ids.length === 0) {
      this.message.warning('Please select items to assign');
      return;
    }
    
    if (!this.selectedDepartment) {
      this.message.warning('Please select a department');
      return;
    }
    
    console.log('[AdminTaskList] Assigning to:', { 
      ids, 
      department: this.selectedDepartment 
    });
    
    // TODO: Implement assignment API call when backend is ready
    try {
      this.notification.info('Info', 'Assignment functionality will be implemented');
      this.isAssignVisible = false;
      this.selectedDepartment = null;
      
    } catch (error) {
      console.error('Assignment error:', error);
      this.message.error('Failed to assign requests');
    }
  }

  // ====== modal handlers ======
  handleCancel(): void {
    this.isApprovedVisible = false;
    this.isRejectedConfirmVisible = false;
    this.isRejectedVisible = false;
    this.isAssignVisible = false;
    this.inputValue = '';
    this.selectedDepartment = null;
  }

  // ====== Refresh data ======
  async refreshData(): Promise<void> {
    await this.load();
    this.message.success('Data refreshed');
  }

  // ====== selection getters ======
  private selectedRows(): TaskRow[] {
    return this.taskList.filter(r => this.setOfCheckedId.has(this.getRowKey(r)));
  }
  
  private selectedIds(): string[] {
    return this.selectedRows().map(r => this.getRowKey(r)).filter(Boolean);
  }

  // ====== Status badge helpers - UPDATED to use originalRequestType ======
  getStatusColor(status: string): string {
    // This method now uses the displayStatus which is based on requestType
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'new request': return 'gold';
      case 'quarantine completed':
      case 'quarantine updated': return 'orange';
      case 'rejected & resubmitted': return 'red';
      case 'golden record update': return 'purple';
      case 'duplicates': return 'blue';
      // Fallback to original status colors
      case 'pending': return 'gold';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      case 'quarantined': return 'orange';
      case 'merged': return 'purple';
      default: return 'default';
    }
  }

  getStatusIcon(status: string): string {
    // This method now uses the displayStatus which is based on requestType
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'new request': return 'plus';
      case 'quarantine completed':
      case 'quarantine updated': return 'alert';
      case 'rejected & resubmitted': return 'reload';
      case 'golden record update': return 'star';
      case 'duplicates': return 'copy';
      // Fallback to original status icons
      case 'pending': return 'clock-circle';
      case 'approved': return 'check-circle';
      case 'rejected': return 'close-circle';
      case 'quarantined': return 'warning';
      case 'merged': return 'merge-cells';
      default: return 'question-circle';
    }
  }

  // NEW: Get source system badge color
  getSourceSystemColor(sourceSystem: string): string {
    switch (sourceSystem) {
      case 'SAP':
      case 'SAP ByD':
      case 'SAP S/4HANA':
        return 'blue';
      case 'Oracle':
      case 'Oracle Forms':
        return 'red';
      case 'Legacy':
        return 'orange';
      case 'Data Steward':
      case 'Manual':
        return 'gray';
      default:
        return 'default';
    }
  }

  // NEW: Format confidence score
  formatConfidence(confidence?: number): string {
    if (!confidence) return '—';
    return `${Math.round(confidence * 100)}%`;
  }

  // NEW: Get confidence color
  getConfidenceColor(confidence?: number): string {
    if (!confidence) return 'default';
    if (confidence >= 0.9) return 'green';
    if (confidence >= 0.7) return 'orange';
    return 'red';
  }

  // UPDATED: Get tooltip for view details button
  getViewTooltip(row: TaskRow): string {
    const originalType = row.originalRequestType || row.requestType;
    switch (originalType) {
      case 'new':
        return 'Review new request with approve/reject options';
      case 'quarantine':
        return 'Review quarantine request with approve/reject options';
      case 'rejected':
        return 'Review resubmitted request with approve/reject options';
      case 'golden':
        return 'View golden record changes with approve/reject options';
      case 'duplicate':
        return 'View master record with merged duplicates and approve/reject options';
      default:
        return 'View request details';
    }
  }

  // ====== search and filter methods ======
  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.applyFilters();
  }

  onFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.filterByRecordType = target.value;
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterByRecordType = '';
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.taskList];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const query = this.searchTerm.toLowerCase();
      filtered = filtered.filter(row => {
        const searchText = [
          row.firstName || '',
          row.firstNameAr || '',
          row.tax || '',
          row.requestId || row.id || ''
        ].join(' ').toLowerCase();
        return searchText.includes(query);
      });
    }

    // Apply record type filter
    if (this.filterByRecordType) {
      filtered = filtered.filter(row => {
        const recordType = this.getOriginBadge(row);
        return recordType === this.filterByRecordType;
      });
    }

    this.filteredTaskList = filtered;
  }

  generateUniqueRecordTypes(): void {
    const types = new Set<string>();
    this.taskList.forEach(row => {
      const recordType = this.getOriginBadge(row);
      // Exclude Golden Record from filter options
      if (recordType !== '⭐ Golden') {
        types.add(recordType);
      }
    });
    this.uniqueRecordTypes = Array.from(types).sort();
  }

  // ====== utility ======
  private cryptoRandomId(): string {
    try {
      const c: any = (globalThis as any).crypto;
      if (c?.getRandomValues) {
        const arr = new Uint8Array(16);
        c.getRandomValues(arr);
        return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch {}
    return 'm' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

}