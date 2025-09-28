import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

interface DupGroup {
  tax: string;
  normalizedTax: string;
  companyNames: string[];
  records: any[];
  duplicateCount: number;
  confidence: number;
  sourceSystems: string[];
}

@Component({
  selector: 'app-duplicate-records',
  templateUrl: './duplicate-records.component.html',
  styleUrl: './duplicate-records.component.scss'
})
export class DuplicateRecordsComponent implements OnInit {
  private apiBase = environment.apiBaseUrl || 'http://localhost:3000/api';
  
  user: string = '';
  userRole: string = '';
  duplicateRecords: DupGroup[] = [];
  filteredRecords: DupGroup[] = [];
  loading = false;
  selectedRecord: DupGroup | null = null;
  searchTerm: string = '';
  filterBySource: string = '';

  constructor(
    public router: Router,
    private http: HttpClient
  ) {}

  async ngOnInit(): Promise<void> {
    await this.getCurrentUser();
    this.selectedRecord = history.state.record || null;
    await this.loadDuplicateGroups();
  }

  private async getCurrentUser(): Promise<void> {
    try {
      const username = sessionStorage.getItem('username') || 'data_entry';
      
      const url = `${this.apiBase}/auth/me?username=${username}`;
      
      try {
        const user = await firstValueFrom(this.http.get<any>(url));
        if (user) {
          this.userRole = user.role;
          this.user = user.role === 'reviewer' ? '2' : 
                     user.role === 'compliance' ? '3' : '1';
        }
      } catch {
        this.userRole = 'data_entry';
        this.user = '1';
      }
    } catch (error) {
      console.error('Error getting user:', error);
      this.userRole = 'data_entry';
      this.user = '1';
    }
  }

  private async loadDuplicateGroups(): Promise<void> {
    this.loading = true;
    
    try {
      const response = await firstValueFrom(
        this.http.get<any>(`${this.apiBase}/duplicates/groups`)
      );
      
      console.log('Duplicate groups response:', response);
      
      if (response && response.success && response.groups) {
        // UPDATED: Filter out groups that have been built or merged
        const activeGroups = response.groups.filter((group: any) => 
          group.status !== 'Built' && group.status !== 'Merged' && group.status !== 'Linked'
        );
        
        this.duplicateRecords = await Promise.all(
          activeGroups.map(async (group: any) => {
            let detailedRecords: any[] = [];
            try {
              const recordsResponse = await firstValueFrom(
                this.http.get<any>(`${this.apiBase}/duplicates/by-tax/${group.taxNumber}`)
              );
              if (recordsResponse && recordsResponse.success) {
                // UPDATED: Filter out records that are already linked to a built master
                detailedRecords = recordsResponse.records.filter((r: any) => 
                  !r.isMerged && r.status !== 'Built' && r.status !== 'Linked'
                );
              }
            } catch (error) {
              console.error(`Error loading records for tax ${group.taxNumber}:`, error);
            }

            // UPDATED: Only return groups that still have duplicate records (more than just master)
            if (detailedRecords.length > 1) {
              return {
                tax: group.taxNumber,
                normalizedTax: group.taxNumber,
                companyNames: detailedRecords.map(r => r.firstName).filter(name => name),
                records: detailedRecords,
                duplicateCount: detailedRecords.length, // Use actual count, not API count
                confidence: group.masterConfidence || 0.9,
                sourceSystems: [...new Set(detailedRecords.map(r => r.sourceSystem).filter(s => s))]
              } as DupGroup;
            }
            return null; // Return null for groups with no active duplicates
          })
        );
        
        // UPDATED: Remove null entries (groups with no duplicates left)
        this.duplicateRecords = this.duplicateRecords.filter(group => group !== null);
        
        // Sort by duplicate count (highest first)
        this.duplicateRecords.sort((a, b) => b.duplicateCount - a.duplicateCount);
        
        // Initialize filtered records
        this.filteredRecords = [...this.duplicateRecords];
        
        console.log('Active duplicate groups loaded:', this.duplicateRecords.length);
        console.log('Groups:', this.duplicateRecords.map(g => ({
          tax: g.tax,
          count: g.duplicateCount,
          names: g.companyNames.slice(0, 2)
        })));
      } else {
        this.duplicateRecords = [];
      }
      
    } catch (error) {
      console.error('Error loading duplicate groups:', error);
      this.duplicateRecords = [];
    } finally {
      this.loading = false;
    }
  }

  private normalizeTax(tax: string): string {
    if (!tax) return '';
    return tax.replace(/TAX-/gi, '').replace(/-/g, '').trim();
  }

  viewDetails(group: DupGroup): void {
    console.log('[DuplicateRecords] Opening duplicate customer page for group:', group);
    
    // Navigate to duplicate-customer with the group data and records
    this.router.navigate(
      ['/dashboard/duplicate-customer'],
      {
        state: {
          group: {
            taxNumber: group.tax,
            groupName: group.companyNames[0] || 'Unknown Group'
          },
          records: group.records
        }
      }
    );
  }

  // Check if user can manage duplicates (only data_entry)
  canManageDuplicates(): boolean {
    return this.userRole === 'data_entry' || this.userRole === 'admin';
  }

  // Get badge color based on confidence
  getConfidenceBadgeClass(confidence: number): string {
    if (confidence >= 0.95) return 'badge-danger';  // Very high match
    if (confidence >= 0.90) return 'badge-warning'; // High match
    if (confidence >= 0.80) return 'badge-info';    // Medium match
    return 'badge-default';                          // Low match
  }

  // Get confidence text
  getConfidenceText(confidence: number): string {
    if (confidence >= 0.95) return 'Very High';
    if (confidence >= 0.90) return 'High';
    if (confidence >= 0.80) return 'Medium';
    return 'Low';
  }

  // Format source systems for display
  formatSourceSystems(systems: string[]): string {
    return systems.join(', ');
  }

  // Get first company name for display
  getPrimaryCompanyName(group: DupGroup): string {
    return group.companyNames[0] || 'Unknown Company';
  }

  // Get other company names
  getOtherCompanyNames(group: DupGroup): string {
    if (group.companyNames.length <= 1) return '';
    return group.companyNames.slice(1).join(', ');
  }

  /** ====== AUTO-ADDED NAV HELPERS ====== */
  private getRowId(row: any): string {
    return ((row?.requestId ?? row?.id ?? row?.key ?? row?.RequestId ?? '') + '');
  }

  /** Open details page; editable=true opens edit mode, false opens view */
  viewOrEditRequest(row: any, editable: boolean): void {
    const id = this.getRowId(row);
    if (!id) return;
    this.router?.navigate(['/dashboard/new-request', id], {
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

  // Search functionality
  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.applyFilters();
  }

  // Filter functionality
  onFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.filterBySource = target.value;
    this.applyFilters();
  }

  // Apply both search and filter
  public applyFilters(): void {
    let filtered = [...this.duplicateRecords];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(group => 
        group.tax.toLowerCase().includes(searchLower) ||
        group.companyNames.some(name => name.toLowerCase().includes(searchLower)) ||
        group.sourceSystems.some(system => system.toLowerCase().includes(searchLower))
      );
    }

    // Apply source system filter
    if (this.filterBySource) {
      filtered = filtered.filter(group => 
        group.sourceSystems.includes(this.filterBySource)
      );
    }

    this.filteredRecords = filtered;
  }

  // Get unique source systems for filter dropdown
  getUniqueSourceSystems(): string[] {
    const allSystems = this.duplicateRecords.flatMap(group => group.sourceSystems);
    return [...new Set(allSystems)].sort();
  }

  // Clear all filters
  clearFilters(): void {
    this.searchTerm = '';
    this.filterBySource = '';
    this.filteredRecords = [...this.duplicateRecords];
  }
}