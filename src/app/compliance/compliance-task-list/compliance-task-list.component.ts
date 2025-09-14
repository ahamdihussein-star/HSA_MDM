import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { Component, Inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { DATA_REPO, IDataRepo } from '../../Core/data-repo';
import { environment } from '../../../environments/environment';

type TaskRow = {
  id?: string;
  requestId?: string;
  status?: string;
  firstName?: string;
  firstNameAr?: string;
  tax?: string;
  country?: string;
  city?: string;
  customerType?: string;
  submittedAt?: string;
  createdAt?: string;
  createdBy?: string;
  assignedTo?: string;
  ComplianceStatus?: string;
  companyStatus?: string;
  isGolden?: number | boolean;
  rejectReason?: string;
  blockReason?: string;
  requestType?: string;
  originalRequestType?: string;
  isMaster?: number | boolean;
  masterId?: string;
  linkedRecords?: any[];
  [k: string]: any;
};

@Component({
  selector: 'app-compliance-task-list',
  templateUrl: './compliance-task-list.component.html',
  styleUrls: ['./compliance-task-list.component.scss'],
})
export class ComplianceTaskListComponent implements OnInit {
  // ==== API configuration ====
  private apiBase = environment.apiBaseUrl || 'http://localhost:3000/api';
  
  // ==== data / state ====
  taskList: TaskRow[] = [];
  filtered: TaskRow[] = [];
  loading = false;
  error: string | null = null;
  search = '';
  
  // Current user info
  currentUser: any = null;
  userRole: string | null = null;

  // selection state for <nz-table>
  checked = false;
  indeterminate = false;
  setOfCheckedId = new Set<string>();

  // dialogs state
  isApproveModalVisible = false;
  isBlockModalVisible = false;
  blockReason = '';
  approveNote = '';
  
  // Current row being processed
  currentRow: TaskRow | null = null;

  // Filter tabs
  activeFilter: string = 'all';
  filterCounts = {
    all: 0,
    new: 0,
    duplicate: 0,
    quarantine: 0,
    golden_update: 0
  };

  constructor(
    @Inject(DATA_REPO) private repo: IDataRepo,
    private router: Router,
    private message: NzMessageService,
    private notification: NzNotificationService,
    private http: HttpClient
  ) {}

  async ngOnInit(): Promise<void> {
    await this.getCurrentUser();
    await this.load();
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
        if (user.role === '3' || user.role === 'compliance') {
          this.userRole = 'compliance';
        } else if (user.role === 'admin' || user.role === 'demo-admin') {
          this.userRole = 'admin';
        } else {
          this.userRole = user.role;
        }
      }
    } catch (error) {
      console.error('[ComplianceTaskList] Error getting current user:', error);
      this.userRole = 'compliance';
    }
  }

  // ====== data loading ======
  async load(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const list = await firstValueFrom(this.repo.list());
      const rows = Array.isArray(list) ? list : [];
      
      // Filter for Approved requests assigned to compliance that haven't been processed
      const complianceTasks = rows.filter(r => {
        const status = (r.status ?? '').toLowerCase();
        const assignedTo = (r as any).assignedTo ?? '';
        const complianceStatus = (r as any).ComplianceStatus ?? '';
        const isGolden = (r as any).isGolden ?? 0;
        
        return status === 'approved' && 
               assignedTo === 'compliance' && 
               !complianceStatus && 
               !isGolden;
      });

      this.taskList = complianceTasks.map((r: any) => ({
        ...r,
        id: r?.id ?? r?.requestId ?? r?._id ?? this.cryptoRandomId(),
        status: r.status ?? 'Approved',
        submittedAt: r.submittedAt ?? r.createdAt ?? new Date().toISOString()
      }));

      // Calculate counts by originalRequestType
      this.filterCounts = {
        all: this.taskList.length,
        new: this.taskList.filter(r => (r.originalRequestType || r.requestType) === 'new').length,
        duplicate: this.taskList.filter(r => (r.originalRequestType || r.requestType) === 'duplicate').length,
        quarantine: this.taskList.filter(r => (r.originalRequestType || r.requestType) === 'quarantine').length,
        golden_update: this.taskList.filter(r => (r.originalRequestType || r.requestType) === 'golden_update').length
      };
      
      // Apply filter
      this.applyFilter();
      console.log('[ComplianceTaskList] Loaded tasks:', this.taskList.length);
    } catch (e) {
      console.error('[ComplianceTaskList] load error', e);
      this.error = 'Failed to load tasks';
      this.taskList = [];
      this.filtered = [];
      this.setOfCheckedId.clear();
      this.refreshCheckedStatus();
    } finally {
      this.loading = false;
    }
  }

  // ====== Filter methods ======
  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.activeFilter === 'all') {
      this.filtered = [...this.taskList];
    } else {
      this.filtered = this.taskList.filter(r => {
        const type = r.originalRequestType || r.requestType || 'new';
        return type === this.activeFilter;
      });
    }
    
    // Apply search filter if exists
    if (this.search && this.search.trim() !== '') {
      const searchLower = this.search.toLowerCase();
      this.filtered = this.filtered.filter(row => {
        return (
          (row.firstName ?? '').toLowerCase().includes(searchLower) ||
          (row.firstNameAr ?? '').toLowerCase().includes(searchLower) ||
          (row.tax ?? '').toLowerCase().includes(searchLower) ||
          (row.country ?? '').toLowerCase().includes(searchLower) ||
          (row.city ?? '').toLowerCase().includes(searchLower) ||
          (row.customerType ?? '').toLowerCase().includes(searchLower)
        );
      });
    }
    
    this.refreshCheckedStatus();
  }

  // ====== Search functionality ======
  onSearchChange(searchValue: string): void {
    this.search = searchValue;
    this.applyFilter();
  }

  // ====== Origin/Type helpers ======
  getOriginBadge(record: TaskRow): string {
    const origin = record.originalRequestType || record.requestType || 'new';
    switch (origin) {
      case 'quarantine':
        return '🔶 Quarantine';
      case 'duplicate':
        return '👥 Duplicate';
      case 'golden_update':
        return '⭐ Golden Update';
      case 'new':
        return '➕ New';
      default:
        return '📋 Request';
    }
  }

  getOriginColor(record: TaskRow): string {
    const origin = record.originalRequestType || record.requestType || 'new';
    switch (origin) {
      case 'quarantine': return 'orange';
      case 'duplicate': return 'blue';
      case 'golden_update': return 'purple';
      case 'new': return 'green';
      default: return 'default';
    }
  }

  getRequestTypeLabel(record: TaskRow): string {
    const originalType = record.originalRequestType || record.requestType || 'new';
    switch (originalType) {
      case 'new': return 'New Request';
      case 'quarantine': return 'Quarantine Record';
      case 'golden_update': return 'Golden Record Update';
      case 'duplicate': return 'Duplicate Master';
      default: return 'Request';
    }
  }

  // ====== Navigation - CRITICAL: Route based on record type ======
  viewDetails(row: TaskRow): void {
    const id = this.getRowKey(row);
    if (!id) return;
    
    const recordType = row.originalRequestType || row.requestType || 'new';
    console.log('[ComplianceTaskList] Navigating for type:', recordType, 'id:', id);
    
    // CRITICAL: Navigate to correct page based on record type
    if (recordType === 'duplicate' && (row.isMaster === 1 || row.isMaster === true)) {
      // Navigate to duplicate-customer page for duplicate master records
      this.router.navigate(['/dashboard/duplicate-customer'], {
        queryParams: { 
          masterId: id,
          mode: 'compliance-review',
          from: 'compliance-task-list',
          action: 'compliance-review'
        },
        state: { record: row }
      });
    } else {
      // Navigate to new-request page for all other types
      this.router.navigate(['/dashboard/new-request', id], {
        queryParams: { 
          mode: 'view',
          status: row.status,
          requestType: row.requestType,
          originalRequestType: row.originalRequestType,
          from: 'compliance-task-list',
          action: 'compliance-review',
          userRole: 'compliance'
        },
        state: { record: row }
      });
    }
  }

  // Alias for template
  view(row: TaskRow): void {
    this.viewDetails(row);
  }

  // ====== Process single row (opens appropriate modal) ======
  processSingle(row: TaskRow): void {
    this.currentRow = row;
    this.setOfCheckedId.clear();
    this.setOfCheckedId.add(this.getRowKey(row));
    
    // Show approve modal for single processing
    this.approveNote = '';
    this.isApproveModalVisible = true;
  }

  // ====== Bulk Actions ======
  showBulkApprove(): void {
    const selected = this.selectedRows();
    if (selected.length === 0) {
      this.message.warning('Please select items to approve');
      return;
    }
    
    this.currentRow = null;
    this.approveNote = '';
    this.isApproveModalVisible = true;
  }

  showBulkBlock(): void {
    const selected = this.selectedRows();
    if (selected.length === 0) {
      this.message.warning('Please select items to block');
      return;
    }
    
    this.currentRow = null;
    this.blockReason = '';
    this.isBlockModalVisible = true;
  }

  // ====== Approve Modal Methods ======
  async confirmApprove(): Promise<void> {
    const selectedRows = this.currentRow ? [this.currentRow] : this.selectedRows();
    
    if (selectedRows.length === 0) {
      this.message.warning('No items to approve');
      return;
    }

    // Show choice modal: Active or Blocked
    this.isApproveModalVisible = false;
    
    // For simplicity, we'll approve as Active by default
    // In production, you'd show a choice modal here
    await this.processAsActive(selectedRows);
  }

  async processAsActive(rows: TaskRow[]): Promise<void> {
    this.loading = true;
    try {
      for (const row of rows) {
        const id = this.getRowKey(row);
        if (id) {
          await firstValueFrom(
            this.http.post(`${this.apiBase}/requests/${id}/compliance/approve`, {
              note: this.approveNote || `${this.getRequestTypeLabel(row)} approved as Golden Record - Active`,
              requestType: row.requestType,
              originalRequestType: row.originalRequestType,
              companyStatus: 'Active'
            })
          );
        }
      }
      
      this.notification.success('Success', `${rows.length} request(s) approved as Active Golden Records`);
      this.cancelApprove();
      await this.load();
    } catch (error) {
      console.error('Compliance approve error:', error);
      this.message.error('Failed to approve requests');
    } finally {
      this.loading = false;
    }
  }

  // ====== Block Modal Methods ======
  async confirmBlock(): Promise<void> {
    const selectedRows = this.currentRow ? [this.currentRow] : this.selectedRows();
    const reason = this.blockReason.trim();
    
    if (selectedRows.length === 0) {
      this.message.warning('No items to block');
      return;
    }
    
    if (!reason) {
      this.message.warning('Please enter a block reason');
      return;
    }

    this.loading = true;
    try {
      for (const row of selectedRows) {
        const id = this.getRowKey(row);
        if (id) {
          await firstValueFrom(
            this.http.post(`${this.apiBase}/requests/${id}/compliance/block`, { 
              reason: reason,
              requestType: row.requestType,
              originalRequestType: row.originalRequestType,
              companyStatus: 'Blocked'
            })
          );
        }
      }
      
      this.notification.success('Success', `${selectedRows.length} request(s) created as Blocked Golden Records`);
      this.cancelBlock();
      await this.load();
    } catch (error) {
      console.error('Compliance block error:', error);
      this.message.error('Failed to block requests');
    } finally {
      this.loading = false;
    }
  }

  cancelApprove(): void {
    this.isApproveModalVisible = false;
    this.approveNote = '';
    this.currentRow = null;
    this.setOfCheckedId.clear();
    this.refreshCheckedStatus();
  }

  cancelBlock(): void {
    this.isBlockModalVisible = false;
    this.blockReason = '';
    this.currentRow = null;
    this.setOfCheckedId.clear();
    this.refreshCheckedStatus();
  }

  // ====== Table helpers ======


  // ====== Format helpers ======
  formatDate(date: string | undefined): string {
    if (!date) return '—';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return '—';
    }
  }

  getCustomerTypeLabel(type: string): string {
    const typeMap: Record<string, string> = {
      'sole_proprietorship': 'Sole Proprietorship',
      'limited_liability': 'Limited Liability Company',
      'joint_stock': 'Joint Stock Company',
      'partnership': 'Partnership',
      'public_sector': 'Public Sector',
      'Corporate': 'Corporate',
      'SME': 'SME',
      'other': 'Other'
    };
    return typeMap[type] || type || '—';
  }

  // ====== Refresh data ======
  async refreshData(): Promise<void> {
    await this.load();
    this.message.success('Data refreshed');
  }

  // ====== Selection getters ======
  private selectedRows(): TaskRow[] {
    return this.filtered.filter(r => this.setOfCheckedId.has(this.getRowKey(r)));
  }
  
  private selectedIds(): string[] {
    return this.selectedRows().map(r => this.getRowKey(r)).filter(Boolean);
  }

  // ====== Status helpers ======
  getStatusColor(status: string): string {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'pending': return 'gold';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      case 'quarantine': return 'orange';
      default: return 'default';
    }
  }

  getStatusIcon(status: string): string {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'pending': return 'clock-circle';
      case 'approved': return 'check-circle';
      case 'rejected': return 'close-circle';
      case 'quarantine': return 'warning';
      default: return 'question-circle';
    }
  }

  // ====== Table helpers - Make PUBLIC ======
  public getRowKey(row: TaskRow): string {
    return String(row.id ?? row.requestId ?? '');
  }

  private updateCheckedSet(id: string, checked: boolean): void {
    if (!id) return;
    checked ? this.setOfCheckedId.add(id) : this.setOfCheckedId.delete(id);
    this.refreshCheckedStatus();
  }

  refreshCheckedStatus(): void {
    const total = this.filtered.length;
    const selected = this.filtered.filter(r => this.setOfCheckedId.has(this.getRowKey(r))).length;
    this.checked = total > 0 && selected === total;
    this.indeterminate = selected > 0 && selected < total;
  }

  onAllChecked(checked: boolean): void {
    this.filtered.forEach(item => this.updateCheckedSet(this.getRowKey(item), checked));
  }

  onItemChecked(id: string, checked: boolean): void {
    this.updateCheckedSet(id, checked);
  }

  // ====== Selection getters - Make PUBLIC ======


  // Helper methods for modals
  public getSelectedRows(): TaskRow[] {
    return this.selectedRows();
  }

  public switchToBlockModal(): void {
    this.isApproveModalVisible = false;
    this.blockReason = '';
    this.isBlockModalVisible = true;
  }
  // ====== Utility ======
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