import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { SOURCE_SYSTEM_OPTIONS, COUNTRY_OPTIONS, CUSTOMER_TYPE_OPTIONS, CITY_OPTIONS } from '../shared/lookup-data';

interface TargetSystem {
  id: string;
  name: string;
  type: string;
  description: string;
  icon: string;
  color: string;
  isConnected: boolean;
  recordsToSync?: number;
  lastSync?: string;
  lastSyncTime?: string;
}

interface SyncRule {
  id?: number;
  name: string;
  description: string;
  targetSystem: string;
  conditions: any[];
  filterCriteria?: {
    conditions: any[];
    logic: string;
  };
  isActive: boolean;
  lastRun?: string;
  lastSyncAt?: string;
}

interface GoldenRecord {
  id: string;
  firstName: string;
  firstNameAr?: string;
  tax: string;
  country: string;
  city: string;
  CustomerType: string;
  companyStatus: string;
  syncStatus?: string;
  lastSyncedAt?: string;
  selected?: boolean;
}

@Component({
  selector: 'app-sync-golden-records',
  templateUrl: './sync-golden-records.component.html',
  styleUrls: ['./sync-golden-records.component.scss']
})
export class SyncGoldenRecordsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private apiBase = environment.apiBaseUrl || 'http://localhost:3001/api';

  // Overview Stats
  totalGoldenRecords = 0;
  totalSynced = 0;
  pendingSync = 0;
  connectedSystems = 3;
  activeSystems = ['Oracle', 'SAP', 'ByD'];
  syncPercentage = 0;

  // Stats object for template
  stats = {
    totalGoldenRecords: 0,
    syncedRecords: 0,
    pendingSync: 0,
    successRate: 0
  };

  // Target Systems
  targetSystems: TargetSystem[] = [
    {
      id: 'Oracle Forms',
      name: 'Oracle Forms',
      type: 'ERP System',
      description: 'Legacy Oracle Forms Application',
      icon: 'database',
      color: '#FF6B6B',
      isConnected: true,
      recordsToSync: 0
    },
    {
      id: 'SAP S/4HANA',
      name: 'SAP S/4HANA',
      type: 'Cloud ERP',
      description: 'Modern SAP Cloud Platform',
      icon: 'cloud-server',
      color: '#4ECDC4',
      isConnected: true,
      recordsToSync: 0
    },
    {
      id: 'SAP ByD',
      name: 'SAP ByDesign',
      type: 'Business Suite',
      description: 'SAP Business by Design Suite',
      icon: 'cluster',
      color: '#95E1D3',
      isConnected: true,
      recordsToSync: 0
    }
  ];

  // Mapping between frontend system IDs and backend system IDs
  private systemIdMapping: { [key: string]: string } = {
    'Oracle Forms': 'Oracle Forms',
    'SAP S/4HANA': 'SAP S/4HANA', 
    'SAP ByD': 'SAP ByD'
  };

  selectedSystem: TargetSystem | null = null;
  selectedSystems: string[] = [];
  systemTargets: TargetSystem[] = [];
  
  // Source system options from lookup data
  sourceSystemOptions = SOURCE_SYSTEM_OPTIONS;
  
  // Lookup data for dropdowns
  countryOptions = COUNTRY_OPTIONS;
  customerTypeOptions = CUSTOMER_TYPE_OPTIONS;
  cityOptions: { [key: string]: any[] } = {};

  // Dynamic dropdown values from actual data
  dynamicCountries: any[] = [];
  dynamicCities: { [key: string]: any[] } = {};
  dynamicCustomerTypes: any[] = [];
  dynamicStatuses: any[] = [];

  // Records
  goldenRecords: GoldenRecord[] = [];
  displayedRecords: GoldenRecord[] = [];
  selectedRecords: GoldenRecord[] = [];
  isLoadingRecords = false;
  
  // Filters
  searchText = '';
  filterCountry = '';
  filterStatus = '';

  // Rules
  syncRules: SyncRule[] = [];
  rules: SyncRule[] = [];
  showRuleModal = false;
  isRuleModalVisible = false;
  editingRule: SyncRule | null = null;
  selectedRule: SyncRule | null = null;
  ruleForm!: FormGroup;
  isSavingRule = false;

  // Sync Progress
  showSyncProgress = false;
  isSyncing = false;
  syncProgress = 0;
  syncStatus: 'active' | 'success' | 'exception' = 'active';
  currentSyncMessage = '';
  currentSyncSystem = '';
  processedRecords = 0;
  totalRecordsToSync = 0;
  syncCompleted = false;
  syncLogs: any[] = [];

  // History
  syncHistory: any[] = [];
  operations: any[] = [];
  isSyncHistoryVisible = false;
  selectedSystemHistory: any = null;

  // UI
  selectedTabIndex = 0;
  isRefreshing = false;
  realTimeProgress = 0;
  syncSteps: any[] = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private message: NzMessageService,
    private modal: NzModalService
  ) {
    this.initializeForm();
  }

  async ngOnInit(): Promise<void> {
    await this.loadGoldenRecords();
    await this.loadSyncRules();
    await this.loadSyncHistory();
    await this.loadDashboardData();
    await this.updateSystemStats();
    this.initializeSystemTargets();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeForm(): void {
    this.ruleForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      targetSystem: ['', Validators.required],
      conditions: this.fb.array([this.createCondition()])
    });
  }

  createCondition(): FormGroup {
    return this.fb.group({
      field: ['country', Validators.required],
      operator: ['equals', Validators.required],
      value: ['', Validators.required]
    });
  }

  get conditions(): FormArray {
    return this.ruleForm.get('conditions') as FormArray;
  }

  addCondition(): void {
    this.conditions.push(this.createCondition());
  }

  removeCondition(index: number): void {
    if (this.conditions.length > 1) {
      this.conditions.removeAt(index);
    }
  }

  async loadDashboardData(): Promise<void> {
    try {
      await this.loadGoldenRecords();
      await this.loadSyncHistory();
      
      this.totalGoldenRecords = this.goldenRecords.filter(r => r.companyStatus === 'Active').length;
      
      // Count records that are actually synced (check syncStatus field)
      this.totalSynced = this.goldenRecords.filter(r => 
        r.syncStatus === 'synced'
      ).length;
      
      this.pendingSync = this.totalGoldenRecords - this.totalSynced;
      
      this.syncPercentage = this.totalGoldenRecords > 0 
        ? Math.round((this.totalSynced / this.totalGoldenRecords) * 100) 
        : 0;
      
      this.updateStatsObject();
      
      console.log(`[DASHBOARD] Golden: ${this.totalGoldenRecords}, Synced: ${this.totalSynced}, Pending: ${this.pendingSync}`);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.totalGoldenRecords = 0;
      this.totalSynced = 0;
      this.pendingSync = 0;
      this.syncPercentage = 0;
      this.updateStatsObject();
    }
  }

  async loadGoldenRecords(): Promise<void> {
    this.isLoadingRecords = true;
    try {
      const records = await this.http.get<any[]>(`${this.apiBase}/requests?isGolden=true`).toPromise();
      this.goldenRecords = (records || [])
        .filter(r => r.companyStatus === 'Active')
        .map(r => ({
          ...r,
          selected: false
        }));
      
      // Extract dynamic values from actual records
      this.extractDynamicValues();
      
      this.applyFilters();
    } catch (error) {
      console.error('Error loading golden records:', error);
    } finally {
      this.isLoadingRecords = false;
    }
  }

  // Extract unique values from golden records for dropdowns
  extractDynamicValues(): void {
    // Extract unique countries
    const countriesSet = new Set<string>();
    const citiesByCountry: { [key: string]: Set<string> } = {};
    const customerTypesSet = new Set<string>();
    const statusesSet = new Set<string>();

    this.goldenRecords.forEach(record => {
      // Countries
      if (record.country) {
        countriesSet.add(record.country);
        
        // Cities per country
        if (record.city) {
          if (!citiesByCountry[record.country]) {
            citiesByCountry[record.country] = new Set<string>();
          }
          citiesByCountry[record.country].add(record.city);
        }
      }
      
      // Customer Types
      if (record.CustomerType) {
        customerTypesSet.add(record.CustomerType);
      }
      
      // Statuses
      if (record.companyStatus) {
        statusesSet.add(record.companyStatus);
      }
    });

    // Convert to arrays for dropdowns
    this.dynamicCountries = Array.from(countriesSet).map(country => ({
      value: country,
      label: country
    }));

    // Convert cities
    this.dynamicCities = {};
    Object.keys(citiesByCountry).forEach(country => {
      this.dynamicCities[country] = Array.from(citiesByCountry[country]).map(city => ({
        value: city,
        label: city
      }));
    });

    // Customer types
    this.dynamicCustomerTypes = Array.from(customerTypesSet).map(type => ({
      value: type,
      label: type
    }));

    // Statuses
    this.dynamicStatuses = Array.from(statusesSet).map(status => ({
      value: status,
      label: status
    }));

    // Update the options properties to use dynamic values
    this.countryOptions = this.dynamicCountries.length > 0 ? this.dynamicCountries : COUNTRY_OPTIONS;
    this.cityOptions = Object.keys(this.dynamicCities).length > 0 ? this.dynamicCities : CITY_OPTIONS;
    this.customerTypeOptions = this.dynamicCustomerTypes.length > 0 ? this.dynamicCustomerTypes : CUSTOMER_TYPE_OPTIONS;
  }

  async loadSyncRules(): Promise<void> {
    try {
      const rules = await this.http.get<any[]>(`${this.apiBase}/sync/rules`).toPromise();
      this.syncRules = (rules || []).map(rule => ({
        ...rule,
        conditions: rule.filterCriteria?.conditions || [],
        filterCriteria: rule.filterCriteria || { conditions: [], logic: 'AND' }
      }));
      this.rules = [...this.syncRules];
      
      // Debug: Log each rule's matching records
      console.log('[SYNC] Rules loaded:');
      this.rules.forEach(rule => {
        const count = this.getMatchingRecords(rule);
        console.log(`  - "${rule.name}" (${rule.targetSystem}): ${count} matching records`);
        if (rule.conditions && rule.conditions.length > 0) {
          rule.conditions.forEach(c => {
            console.log(`    Condition: ${c.field} ${c.operator} ${c.value}`);
          });
        }
      });
      
      // Update system stats after loading rules
      await this.updateSystemStats();
      
    } catch (error) {
      console.error('Error loading sync rules:', error);
    }
  }

  async loadSyncHistory(): Promise<void> {
    try {
      const history = await this.http.get<any[]>(`${this.apiBase}/sync/operations`).toPromise();
      this.syncHistory = (history || []);
      this.operations = [...this.syncHistory];
      
      const totalSynced = this.operations.reduce((sum, op) => sum + (op.syncedRecords || 0), 0);
      const totalFailed = this.operations.reduce((sum, op) => sum + (op.failedRecords || 0), 0);
      console.log(`[SYNC HISTORY] Total operations: ${this.operations.length}, Total synced: ${totalSynced}, Total failed: ${totalFailed}`);
      
    } catch (error) {
      console.error('Error loading sync history:', error);
      this.syncHistory = [];
      this.operations = [];
    }
  }

  async updateSystemStats(): Promise<void> {
    if (this.goldenRecords.length === 0) {
      await this.loadGoldenRecords();
    }
    
    const activeGoldenRecords = this.goldenRecords.filter(r => r.companyStatus === 'Active');
    
    for (const system of this.targetSystems) {
      try {
        const backendSystemId = this.getBackendSystemId(system.id);
        const rule = this.syncRules.find(r => 
          r.targetSystem === backendSystemId && r.isActive
        );
        
        if (rule) {
          system.recordsToSync = this.getMatchingRecords(rule);
          console.log(`[SYNC] ${system.name}: ${system.recordsToSync} records match rule "${rule.name}"`);
        } else {
          system.recordsToSync = 0;
          console.log(`[SYNC] ${system.name}: No active rule configured`);
        }
        
        const systemHistory = this.syncHistory.filter(h => h.targetSystem === backendSystemId);
        
        if (systemHistory.length > 0) {
          const lastOp = systemHistory[0];
          system.lastSync = lastOp.startedAt;
          system.lastSyncTime = lastOp.completedAt || lastOp.startedAt;
        } else {
          system.lastSync = undefined;
          system.lastSyncTime = undefined;
        }
        
      } catch (error) {
        console.error(`Error updating stats for ${system.name}:`, error);
        system.recordsToSync = 0;
      }
    }
  }

  selectSystem(system: TargetSystem): void {
    this.selectedSystem = system;
  }

  applyFilters(): void {
    let filtered = [...this.goldenRecords];

    if (this.searchText) {
      const search = this.searchText.toLowerCase();
      filtered = filtered.filter(r => 
        r.firstName?.toLowerCase().includes(search) ||
        r.firstNameAr?.includes(search) ||
        r.tax?.toLowerCase().includes(search)
      );
    }

    if (this.filterCountry) {
      filtered = filtered.filter(r => r.country === this.filterCountry);
    }

    if (this.filterStatus) {
      filtered = filtered.filter(r => r.syncStatus === this.filterStatus);
    }

    this.displayedRecords = filtered;
  }

  searchRecords(): void {
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchText = '';
    this.filterCountry = '';
    this.filterStatus = '';
    this.applyFilters();
  }

  filterPendingRecords(): void {
    this.filterStatus = 'not_synced';
    this.applyFilters();
    this.selectedTabIndex = 0;
  }






  addSyncLog(icon: string, message: string, color: string): void {
    this.syncLogs.push({ icon, message, color });
  }

  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  closeSyncProgress(): void {
    this.showSyncProgress = false;
  }

  viewSyncReport(): void {
    // Navigate to detailed report
    this.closeSyncProgress();
    this.selectedTabIndex = 2; // Go to history tab
  }


  refreshSystems(): void {
    this.isRefreshing = true;
    setTimeout(() => {
      this.updateSystemStats();
      this.isRefreshing = false;
      this.message.success('Systems refreshed');
    }, 1000);
  }

  openRuleModal(rule?: SyncRule): void {
    if (rule) {
      this.editingRule = rule;
      this.selectedRule = rule;
      this.loadRuleToForm(rule);
    } else {
      this.editingRule = null;
      this.selectedRule = null;
      this.initializeForm();
    }
    this.showRuleModal = true;
    this.isRuleModalVisible = true;
  }

  loadRuleToForm(rule: SyncRule): void {
    this.ruleForm.patchValue({
      name: rule.name,
      description: rule.description,
      targetSystem: rule.targetSystem
    });

    // Clear and reload conditions
    while (this.conditions.length !== 0) {
      this.conditions.removeAt(0);
    }

    rule.conditions.forEach(condition => {
      const condGroup = this.createCondition();
      condGroup.patchValue(condition);
      this.conditions.push(condGroup);
    });
  }

  async saveRule(): Promise<void> {
    if (this.ruleForm.invalid) {
      this.message.error('Please fill all required fields');
      return;
    }

    this.isSavingRule = true;

    const ruleData = {
      ...this.ruleForm.value,
      isActive: true,
      filterCriteria: {
        conditions: this.conditions.value,
        logic: 'AND'
      },
      fieldMapping: { mappings: [] },
      createdBy: sessionStorage.getItem('username') || 'admin'
    };

    try {
      if (this.editingRule?.id) {
        await this.http.put(`${this.apiBase}/sync/rules/${this.editingRule.id}`, {
          ...ruleData,
          updatedBy: ruleData.createdBy
        }).toPromise();
        this.message.success('Rule updated successfully');
      } else {
        await this.http.post(`${this.apiBase}/sync/rules`, ruleData).toPromise();
        this.message.success('Rule created successfully');
      }

      this.showRuleModal = false;
      this.isRuleModalVisible = false;
      await this.loadSyncRules();
      await this.updateSystemStats();
    } catch (error) {
      this.message.error('Failed to save rule');
    } finally {
      this.isSavingRule = false;
    }
  }

  async toggleRule(rule: SyncRule): Promise<void> {
    try {
      await this.http.put(`${this.apiBase}/sync/rules/${rule.id}`, {
        ...rule,
        isActive: rule.isActive,
        filterCriteria: { conditions: rule.conditions, logic: 'AND' },
        fieldMapping: { mappings: [] },
        updatedBy: sessionStorage.getItem('username') || 'admin'
      }).toPromise();
      
      this.message.success(`Rule ${rule.isActive ? 'activated' : 'deactivated'}`);
      await this.updateSystemStats();
    } catch (error) {
      rule.isActive = !rule.isActive;
      this.message.error('Failed to update rule');
    }
  }

  editRule(rule: SyncRule): void {
    this.openRuleModal(rule);
  }

  testRule(rule: SyncRule): void {
    // Show matching records
    this.message.info(`Rule matches ${this.getMatchingRecords(rule)} records`);
  }

  async deleteRule(rule: SyncRule): Promise<void> {
    this.modal.confirm({
      nzTitle: 'Delete Rule',
      nzContent: `Are you sure you want to delete "${rule.name}"?`,
      nzOkDanger: true,
      nzOnOk: async () => {
        try {
          await this.http.delete(`${this.apiBase}/sync/rules/${rule.id}`).toPromise();
          this.message.success('Rule deleted');
          await this.loadSyncRules();
          await this.updateSystemStats();
        } catch (error) {
          this.message.error('Failed to delete rule');
        }
      }
    });
  }

  // Helper methods
  formatDate(date: string | undefined): string {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (hours < 168) return `${Math.floor(hours / 24)}d ago`;
    return d.toLocaleDateString();
  }

  formatLastSync(date: string | undefined): string {
    return date ? this.formatDate(date) : 'Never';
  }

  formatLastRun(date: string | undefined): string {
    return date ? this.formatDate(date) : 'Never run';
  }

  getSyncStatusClass(status: string | undefined): string {
    return status || 'not_synced';
  }

  getSyncStatusIcon(status: string | undefined): string {
    switch (status) {
      case 'synced': return 'check';
      case 'sync_failed': return 'close';
      default: return 'clock-circle';
    }
  }


  formatCondition(condition: any): string {
    return `${condition.field} ${condition.operator} ${condition.value}`;
  }

  getMatchingRecords(rule: SyncRule): number {
    if (!rule) {
      return 0;
    }
    
    // Check if rule has conditions in the new format
    let conditions = [];
    let logic = 'AND';
    
    if (rule.filterCriteria && rule.filterCriteria.conditions) {
      conditions = rule.filterCriteria.conditions;
      logic = rule.filterCriteria.logic || 'AND';
    } else if (rule.conditions) {
      conditions = rule.conditions;
    }
    
    if (conditions.length === 0) {
      return 0;
    }
    
    let matchingCount = 0;
    
    this.goldenRecords.forEach(record => {
      let recordMatches = false;
      
      if (logic === 'OR') {
        // Apply OR logic - any condition can match
        recordMatches = conditions.some(condition => this.checkCondition(record, condition));
      } else {
        // Apply AND logic - all conditions must match
        recordMatches = conditions.every(condition => this.checkCondition(record, condition));
      }
      
      if (recordMatches) {
        matchingCount++;
      }
    });
    
    return matchingCount;
  }

  // Helper method للتحقق من condition واحد
  private checkCondition(record: any, condition: any): boolean {
    const fieldValue = record[condition.field];
    const conditionValue = condition.value;
    
    // Handle null/undefined values
    if (fieldValue === null || fieldValue === undefined) {
      return condition.operator === 'not_equals' && conditionValue !== null && conditionValue !== undefined;
    }
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === conditionValue;
      case 'not_equals':
        return fieldValue !== conditionValue;
      case 'contains':
        return fieldValue && fieldValue.toString().toLowerCase().includes(conditionValue.toString().toLowerCase());
      case 'not_contains':
        return !fieldValue || !fieldValue.toString().toLowerCase().includes(conditionValue.toString().toLowerCase());
      case 'starts_with':
        return fieldValue && fieldValue.toString().toLowerCase().startsWith(conditionValue.toString().toLowerCase());
      case 'ends_with':
        return fieldValue && fieldValue.toString().toLowerCase().endsWith(conditionValue.toString().toLowerCase());
      case 'in':
        const values = Array.isArray(conditionValue) ? conditionValue : [conditionValue];
        return values.includes(fieldValue);
      case 'not_in':
        const notValues = Array.isArray(conditionValue) ? conditionValue : [conditionValue];
        return !notValues.includes(fieldValue);
      default:
        return fieldValue === conditionValue;
    }
  }

  getOperationColor(status: string): string {
    switch (status) {
      case 'completed': return 'green';
      case 'failed': return 'red';
      case 'partial': return 'orange';
      default: return 'blue';
    }
  }

  // Missing methods for template
  initializeSystemTargets(): void {
    this.systemTargets = [...this.targetSystems];
  }


  isSystemSelected(systemId: string): boolean {
    return this.selectedSystems.includes(systemId);
  }

  toggleSystemSelection(systemId: string): void {
    const index = this.selectedSystems.indexOf(systemId);
    if (index > -1) {
      this.selectedSystems.splice(index, 1);
    } else {
      this.selectedSystems.push(systemId);
    }
  }

  updateSystemStatuses(): void {
    this.updateSystemStats();
  }

  toggleRuleStatus(rule: SyncRule): void {
    this.toggleRule(rule);
  }

  previewRecords(rule: SyncRule): void {
    this.testRule(rule);
  }

  getStatusColor(status: string): string {
    return this.getOperationColor(status);
  }

  // Update stats object when data changes
  updateStatsObject(): void {
    this.stats = {
      totalGoldenRecords: this.totalGoldenRecords,
      syncedRecords: this.totalSynced,
      pendingSync: this.pendingSync,
      successRate: this.syncPercentage
    };
  }

  // Check if user can perform sync (now allows all users)
  canPerformSync(): boolean {
    // Allow all users to perform sync
    return true;
  }

  // Get current user info
  getCurrentUser(): string {
    return sessionStorage.getItem('username') || 'user';
  }

  // Clear sync data (operations and records) but keep rules
  async clearSyncData(): Promise<void> {
    this.modal.confirm({
      nzTitle: 'Clear Sync Data',
      nzContent: 'This will clear all sync operations and records but keep the sync rules. Are you sure?',
      nzOkText: 'Clear Data',
      nzOkDanger: true,
      nzCancelText: 'Cancel',
      nzOnOk: async () => {
        try {
          const result = await this.http.post<any>(`${this.apiBase}/sync/clear-data`, {}).toPromise();
          
          if (result && result.success) {
            this.message.success(`Sync data cleared: ${result.clearedOperations} operations, ${result.clearedRecords} records, ${result.resetRecords} records reset`);
            
            // Refresh data
            await this.loadDashboardData();
            await this.loadSyncHistory();
            await this.updateSystemStats();
          } else {
            this.message.error('Failed to clear sync data');
          }
        } catch (error: any) {
          this.message.error('Error clearing sync data: ' + (error.message || 'Unknown error'));
        }
      }
    });
  }

  // Update city options based on selected country
  updateCityOptions(country: string): void {
    this.cityOptions = { [country]: CITY_OPTIONS[country] || [] };
  }

  // Get city options for a specific country
  getCityOptionsForCountry(country: string): any[] {
    return CITY_OPTIONS[country] || [];
  }

  // Handle field change to reset value
  onFieldChange(index: number): void {
    // Clear the value when field changes
    this.conditions.at(index).get('value')?.setValue('');
    
    // If changing from country and there are city conditions, clear them
    const fieldValue = this.conditions.at(index).get('field')?.value;
    if (fieldValue === 'country') {
      // Clear city values in other conditions
      for (let i = 0; i < this.conditions.length; i++) {
        if (i !== index && this.conditions.at(i).get('field')?.value === 'city') {
          this.conditions.at(i).get('value')?.setValue('');
        }
      }
    }
  }

  // Handle country change to update city options in other conditions
  onCountryChange(index: number): void {
    const selectedCountry = this.conditions.at(index).get('value')?.value;
    if (selectedCountry) {
      // Update city options for all city conditions
      this.updateCityOptions(selectedCountry);
      
      // Clear city values in other conditions
      for (let i = 0; i < this.conditions.length; i++) {
        if (i !== index && this.conditions.at(i).get('field')?.value === 'city') {
          this.conditions.at(i).get('value')?.setValue('');
        }
      }
    }
  }

  // Get value options based on selected field
  getValueOptions(field: string, conditionIndex?: number): any[] {
    switch (field) {
      case 'country':
        return this.countryOptions;
      case 'city':
        // Get city options based on selected country from other conditions
        const selectedCountry = this.getSelectedCountryFromOtherConditions(conditionIndex);
        return this.getCityOptionsForCountry(selectedCountry);
      case 'CustomerType':
        return this.customerTypeOptions;
      case 'companyStatus':
        return [
          { value: 'Active', label: 'Active' },
          { value: 'Inactive', label: 'Inactive' },
          { value: 'Pending', label: 'Pending' }
        ];
      default:
        return [];
    }
  }

  // Get selected country from other conditions
  getSelectedCountryFromOtherConditions(currentIndex?: number): string {
    if (currentIndex === undefined) return 'Egypt';
    
    for (let i = 0; i < this.conditions.length; i++) {
      if (i !== currentIndex && this.conditions.at(i).get('field')?.value === 'country') {
        return this.conditions.at(i).get('value')?.value || 'Egypt';
      }
    }
    return 'Egypt'; // Default to Egypt if no country is selected
  }

  // Get condition field value by index
  getConditionField(index: number): string {
    return this.conditions.at(index).get('field')?.value || '';
  }

  // Get condition value by index
  getConditionValue(index: number): string {
    return this.conditions.at(index).get('value')?.value || '';
  }

  // Get city options for specific condition index
  getCityOptionsForIndex(index: number): any[] {
    // Find if there's a country condition
    let selectedCountry = '';
    
    for (let i = 0; i < this.conditions.length; i++) {
      if (this.conditions.at(i).get('field')?.value === 'country') {
        selectedCountry = this.conditions.at(i).get('value')?.value || '';
        if (selectedCountry) break;
      }
    }
    
    // Use dynamic cities if available
    if (selectedCountry && this.dynamicCities[selectedCountry]) {
      return this.dynamicCities[selectedCountry];
    }
    
    return selectedCountry ? (this.cityOptions[selectedCountry] || []) : [];
  }

  // Operation details cache
  operationDetailsCache: Map<number, any[]> = new Map();
  loadingOperationDetails: Set<number> = new Set();

  // Get operation records (with caching)
  getOperationRecords(operation: any): any[] {
    if (!operation.id) return [];
    
    // Check cache first
    if (this.operationDetailsCache.has(operation.id)) {
      return this.operationDetailsCache.get(operation.id) || [];
    }
    
    // Load details if not cached
    if (!this.loadingOperationDetails.has(operation.id)) {
      this.loadOperationDetails(operation.id);
    }
    
    return [];
  }

  // Load operation details
  async loadOperationDetails(operationId: number): Promise<void> {
    if (this.loadingOperationDetails.has(operationId)) {
      return;
    }
    
    this.loadingOperationDetails.add(operationId);
    
    try {
      const response = await this.http.get<any>(`${this.apiBase}/sync/operations/${operationId}`).toPromise();
      
      if (response && response.records) {
        // Merge with golden records data for display
        const enrichedRecords = response.records.map((syncRecord: any) => {
          const goldenRecord = this.goldenRecords.find(gr => gr.id === syncRecord.requestId);
          return {
            ...syncRecord,
            firstName: goldenRecord?.firstName || syncRecord.firstName || 'N/A',
            firstNameAr: goldenRecord?.firstNameAr || syncRecord.firstNameAr,
            tax: goldenRecord?.tax || syncRecord.tax || 'N/A',
            country: goldenRecord?.country || syncRecord.country || 'N/A',
            city: goldenRecord?.city || syncRecord.city || 'N/A',
            CustomerType: goldenRecord?.CustomerType || syncRecord.CustomerType || 'N/A'
          };
        });
        
        this.operationDetailsCache.set(operationId, enrichedRecords);
      } else {
        this.operationDetailsCache.set(operationId, []);
      }
    } catch (error) {
      console.error(`Error loading operation ${operationId} details:`, error);
      this.operationDetailsCache.set(operationId, []);
    } finally {
      this.loadingOperationDetails.delete(operationId);
    }
  }

  // Check if loading operation details
  isLoadingOperationDetails(operationId: number): boolean {
    return this.loadingOperationDetails.has(operationId);
  }

  getTotalSyncedCount(): number {
    const total = this.operations.reduce((sum, op) => {
      return sum + (op.syncedRecords || 0);
    }, 0);
    console.log(`[SYNC] Total successful sync operations: ${total}`);
    return total;
  }

  getTotalFailedCount(): number {
    const total = this.operations.reduce((sum, op) => {
      return sum + (op.failedRecords || 0);
    }, 0);
    console.log(`[SYNC] Total failed sync operations: ${total}`);
    return total;
  }

  // Format date and time
  formatDateTime(date: string | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }

  // Calculate duration between two dates
  calculateDuration(startDate: string, endDate: string | undefined): string {
    if (!startDate) return 'N/A';
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diff = end.getTime() - start.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Get system icon
  getSystemIcon(systemId: string): string {
    const system = this.targetSystems.find(s => s.id === systemId);
    return system?.icon || 'api';
  }

  // Get system color
  getSystemColor(systemId: string): string {
    const system = this.targetSystems.find(s => s.id === systemId);
    return system?.color || '#1890ff';
  }

  // Get operation status color
  getOperationStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'processing';
      case 'partial': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  }

  // Get system name
  getSystemName(systemId: string): string {
    // First try to find by frontend system ID
    const system = this.targetSystems.find(s => s.id === systemId);
    if (system) {
      return system.name;
    }
    
    // If not found, try to find by backend system ID
    const backendSystem = this.targetSystems.find(s => this.getBackendSystemId(s.id) === systemId);
    if (backendSystem) {
      return backendSystem.name;
    }
    
    return systemId;
  }

  // Convert frontend system ID to backend system ID
  private getBackendSystemId(frontendSystemId: string): string {
    return this.systemIdMapping[frontendSystemId] || frontendSystemId;
  }

  // Select all target systems
  selectAllSystems(): void {
    this.selectedSystems = this.targetSystems.map(system => system.id);
    this.message.success('All systems selected');
  }

  // Sync all records to all systems
  async syncAllRecords(): Promise<void> {
    if (this.isSyncing) {
      return;
    }

    // Get all active golden records
    const activeRecords = this.goldenRecords.filter(r => r.companyStatus === 'Active');
    
    if (activeRecords.length === 0) {
      this.message.warning('No active golden records to sync');
      return;
    }

    // Auto-select all systems if none selected
    if (this.selectedSystems.length === 0) {
      this.selectAllSystems();
    }

    this.modal.confirm({
      nzTitle: 'Sync All Records',
      nzContent: `This will sync all ${activeRecords.length} active golden records to ${this.selectedSystems.length} selected systems. Continue?`,
      nzOkText: 'Start Sync',
      nzOkType: 'primary',
      nzOnOk: async () => {
        await this.performSyncAll();
      }
    });
  }

  // Perform actual sync all operation
  async performSyncAll(): Promise<void> {
    this.isSyncing = true;
    this.syncStatus = 'active';
    this.showSyncProgress = true;
    this.syncCompleted = false;
    this.syncProgress = 0;
    this.syncLogs = [];
    this.processedRecords = 0;
    this.currentSyncSystem = 'All Systems';
    this.syncSteps = [];

    this.addSyncLog('info', 'Starting sync all operation...', '#3b82f6');

    try {
      let totalSynced = 0;
      let totalFailed = 0;

      // Sync to each selected system
      const systemsToSync = this.targetSystems.filter(system => 
        this.selectedSystems.includes(system.id)
      );

      // Initialize sync steps
      this.syncSteps = systemsToSync.map(system => ({
        name: system.name,
        icon: 'sync',
        status: 'wait'
      }));

      for (const system of systemsToSync) {
        if (!system.isConnected) {
          this.addSyncLog('warning', `Skipping ${system.name} - not connected`, '#f59e0b');
          continue;
        }

        // Find the rule for this system to get expected count
        const backendSystemId = this.getBackendSystemId(system.id);
        const rule = this.syncRules.find(r => 
          r.targetSystem === backendSystemId && r.isActive
        );
        
        const expectedCount = rule ? this.getMatchingRecords(rule) : 0;
        
        this.currentSyncSystem = system.name;
        this.currentSyncMessage = `Syncing to ${system.name} (${expectedCount} records expected)...`;
        this.addSyncLog('api', `Starting sync to ${system.name} - Expecting ${expectedCount} records`, '#1890ff');

        try {
          // Send ALL golden record IDs, let backend filter based on rules
          const allGoldenRecords = this.goldenRecords.filter(r => r.companyStatus === 'Active');
          
          const result = await this.http.post<any>(`${this.apiBase}/sync/execute-selected`, {
            recordIds: allGoldenRecords.map(r => r.id),
            targetSystem: this.getBackendSystemId(system.id),
            executedBy: this.getCurrentUser()
          }).toPromise();

          if (result.success) {
            totalSynced += result.syncedRecords;
            totalFailed += result.failedRecords;
            
            this.addSyncLog('check-circle', 
              `${system.name}: ${result.syncedRecords}/${expectedCount} synced successfully`, 
              '#10b981'
            );
            
            // Log if count doesn't match expected
            if (result.syncedRecords !== expectedCount) {
              this.addSyncLog('warning', 
                `Note: Synced ${result.syncedRecords} but expected ${expectedCount}`, 
                '#f59e0b'
              );
            }
          } else {
            this.addSyncLog('close-circle', 
              `${system.name}: Sync failed - ${result.error}`, 
              '#ef4444'
            );
          }

          // Update progress
          const currentIndex = systemsToSync.indexOf(system);
          this.syncProgress = Math.round(((currentIndex + 1) / systemsToSync.length) * 100);
          this.processedRecords = currentIndex + 1;
          
          // Update real-time progress for UI
          this.realTimeProgress = this.syncProgress;
          
          // Update sync steps
          this.syncSteps = systemsToSync.map((s, idx) => ({
            name: s.name,
            icon: 'sync',
            status: idx < currentIndex ? 'finish' : idx === currentIndex ? 'process' : 'wait'
          }));

        } catch (error: any) {
          this.addSyncLog('close-circle', 
            `${system.name}: Error - ${error.message || 'Unknown error'}`, 
            '#ef4444'
          );
        }
      }

      // Final status
      this.syncProgress = 100;
      this.realTimeProgress = 100;
      this.syncStatus = totalFailed === 0 ? 'success' : 'exception';
      this.currentSyncMessage = `Sync completed: ${totalSynced} synced, ${totalFailed} failed`;
      
      this.addSyncLog('check-circle', 
        `Sync completed: ${totalSynced} records synced successfully`, 
        '#10b981'
      );

      this.message.success(`Sync completed: ${totalSynced} synced`);

      // Refresh data
      await this.loadDashboardData();
      await this.loadGoldenRecords();
      await this.loadSyncHistory();
      await this.updateSystemStats();

    } catch (error: any) {
      this.syncStatus = 'exception';
      this.currentSyncMessage = 'Sync failed';
      this.addSyncLog('close-circle', error.message || 'Sync failed', '#ef4444');
      this.message.error('Sync failed: ' + (error.message || 'Unknown error'));
    } finally {
      this.isSyncing = false;
      this.syncCompleted = true;
    }
  }
}

