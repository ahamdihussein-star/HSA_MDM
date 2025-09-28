import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TranslateService } from '@ngx-translate/core';
import { interval, Subscription } from 'rxjs';
import { environment } from '../../environments/environment';

interface StatCard {
  id: string;
  title: string;
  titleAr: string;
  value: number;
  icon: string;
  color: string;
  canDrillDown: boolean;
  description?: string;
  route?: string;
  queryParams?: any;
}

interface SystemSourceStat {
  system: string;
  displayName?: string;
  count: number;
  quarantine: number;
  duplicate: number;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-technical-dashboard',
  templateUrl: './technical-dashboard.component.html',
  styleUrls: ['./technical-dashboard.component.scss', './additional-styles.scss', './technical-dashboard-rtl.scss']
})
export class TechnicalDashboardComponent implements OnInit, OnDestroy {
  
  private apiBase = environment.apiBaseUrl || 'http://localhost:3001/api';
  private refreshSubscription?: Subscription;
  
  isArabic = localStorage.getItem('lang') === 'ar';
  isLoading = true;
  autoRefresh = true;
  lastUpdated = new Date();
  statCards: StatCard[] = [];
  dataStatCards: StatCard[] = [];
  taskListCards: StatCard[] = [];
  systemSources: SystemSourceStat[] = [];
  
  // Modal States
  isModalVisible = false;
  modalTitle = '';
  modalData: any[] = [];
  modalLoading = false;
  
  // Table Pagination
  pageIndex = 1;
  pageSize = 10;
  total = 0;
  currentFilter: any = {};
  
  constructor(
    private http: HttpClient,
    private router: Router,
    private modal: NzModalService,
    private message: NzMessageService,
    private translate: TranslateService
  ) {
    // Language detection
    this.isArabic = localStorage.getItem('lang') === 'ar';
  }

  ngOnInit(): void {
    this.loadDashboardData();
    this.setupAutoRefresh();
  }

  private setupAutoRefresh(): void {
    if (this.autoRefresh) {
      this.refreshSubscription = interval(30000).subscribe(() => {
        if (this.autoRefresh) {
          this.loadDashboardData();
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  async loadDashboardData(): Promise<void> {
    this.isLoading = true;
    
    try {
      // Load technical stats (includes both stats and system sources)
      const response = await this.http.get<any>(`${this.apiBase}/dashboard/technical-stats`).toPromise();
      
      console.log('Technical Dashboard - Full response:', response);
      console.log('Technical Dashboard - Stats:', response.stats);
      console.log('Technical Dashboard - System Sources:', response.systemSources);
      
      this.processStatCards(response.stats);
      this.loadSystemSourceStats(response.systemSources);
      this.lastUpdated = new Date();
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.message.error('Failed to load dashboard statistics');
    } finally {
      this.isLoading = false;
    }
  }

  private loadSystemSourceStats(systemData: any): void {
    console.log('Technical Dashboard - System sources data:', systemData);
    
    this.systemSources = [
      {
        system: 'Oracle Forms', // Keep English name for API calls
        displayName: this.translate.instant('Oracle Forms'),
        count: systemData.oracleForms?.total || 0,
        quarantine: systemData.oracleForms?.quarantine || 0,
        duplicate: systemData.oracleForms?.duplicate || 0,
        icon: 'database',
        color: '#f5222d'
      },
      {
        system: 'SAP S/4HANA', // Keep English name for API calls
        displayName: this.translate.instant('SAP S/4HANA'),
        count: systemData.sapS4Hana?.total || 0,
        quarantine: systemData.sapS4Hana?.quarantine || 0,
        duplicate: systemData.sapS4Hana?.duplicate || 0,
        icon: 'cloud',
        color: '#1890ff'
      },
      {
        system: 'SAP ByD', // Keep English name for API calls
        displayName: this.translate.instant('SAP ByD'),
        count: systemData.sapByDesign?.total || 0,
        quarantine: systemData.sapByDesign?.quarantine || 0,
        duplicate: systemData.sapByDesign?.duplicate || 0,
        icon: 'cloud',
        color: '#52c41a'
      }
    ];
  }

  private processStatCards(stats: any): void {
    // Data Statistics Cards
    this.dataStatCards = [
      {
        id: 'golden',
        title: this.translate.instant('Golden Records'),
        titleAr: this.translate.instant('Golden Records'),
        value: stats.goldenRecords || 0,
        icon: 'trophy',
        color: '#faad14',
        canDrillDown: true,
        description: this.translate.instant('Active golden master records')
      },
      {
        id: 'quarantine',
        title: this.translate.instant('Quarantine Records (Unprocessed)'),
        titleAr: this.translate.instant('Quarantine Records (Unprocessed)'),
        value: stats.quarantineRecords || 0,
        icon: 'exclamation-circle',
        color: '#ff4d4f',
        canDrillDown: true,
        description: this.translate.instant('Quarantine records not yet processed')
      },
      {
        id: 'duplicates',
        title: this.translate.instant('Unprocessed Duplicates'),
        titleAr: this.translate.instant('Unprocessed Duplicates'),
        value: stats.unprocessedDuplicates || 0,
        icon: 'copy',
        color: '#722ed1',
        canDrillDown: true,
        description: this.translate.instant('Duplicate records not yet processed')
      },
      {
        id: 'new_requests',
        title: this.translate.instant('New Requests Created'),
        titleAr: this.translate.instant('New Requests Created'),
        value: stats.newRequests || 0,
        icon: 'file-add',
        color: '#1890ff',
        canDrillDown: true,
        description: this.translate.instant('New requests created by data entry')
      },
      {
        id: 'processed_quarantine',
        title: this.translate.instant('Processed Quarantine Records'),
        titleAr: this.translate.instant('Processed Quarantine Records'),
        value: stats.processedQuarantine || 0,
        icon: 'check-circle',
        color: '#52c41a',
        canDrillDown: true,
        description: this.translate.instant('Quarantine records that have been processed')
      },
      {
        id: 'processed_duplicates',
        title: this.translate.instant('Processed Duplicate Records'),
        titleAr: this.translate.instant('Processed Duplicate Records'),
        value: stats.processedDuplicates || 0,
        icon: 'bulb',
        color: '#13c2c2',
        canDrillDown: true,
        description: this.translate.instant('Duplicate records that have been merged or linked')
      }
    ];

    // Task Lists Cards
    this.taskListCards = [
      {
        id: 'data_entry_tasks',
        title: this.translate.instant('Data Entry Tasks'),
        titleAr: this.translate.instant('Data Entry Tasks'),
        value: stats.dataEntryTasks || 0,
        icon: 'edit',
        color: '#fa8c16',
        canDrillDown: true,
        route: '/dashboard/my-task',
        description: this.translate.instant('All rejected requests assigned to data entry')
      },
      {
        id: 'reviewer_tasks',
        title: this.translate.instant('Reviewer Tasks'),
        titleAr: this.translate.instant('Reviewer Tasks'),
        value: stats.reviewerTasks || 0,
        icon: 'file-search',
        color: '#52c41a',
        canDrillDown: true,
        route: '/dashboard/admin-task-list',
        description: this.translate.instant('Records awaiting review')
      },
      {
        id: 'compliance_tasks',
        title: this.translate.instant('Compliance Tasks'),
        titleAr: this.translate.instant('Compliance Tasks'),
        value: stats.complianceTasks || 0,
        icon: 'safety',
        color: '#eb2f96',
        canDrillDown: true,
        route: '/dashboard/compliance-task-list',
        description: this.translate.instant('Records pending compliance approval')
      }
    ];

    // للـ compatibility مع الكود القديم
    this.statCards = [...this.dataStatCards, ...this.taskListCards];
  }

  // Helper Functions removed - now using direct values from API

  // Drill Down Functions
  async drillDown(card: StatCard): Promise<void> {
    if (!card.canDrillDown) return;
    
    // If has route, navigate directly
    if (card.route) {
      this.router.navigate([card.route], { queryParams: card.queryParams });
      return;
    }
    
    // Otherwise show modal with data
    this.showDrillDownModal(card);
  }

  async showDrillDownModal(card: StatCard): Promise<void> {
    this.modalTitle = `${card.title} - ${this.translate.instant('Detailed View')}`;
    this.isModalVisible = true;
    this.modalLoading = true;
    this.modalData = [];
    
    try {
      let endpoint = '';
      
      switch (card.id) {
        case 'golden':
          endpoint = '/requests?isGolden=true';
          break;
        case 'quarantine':
          endpoint = '/requests?status=Quarantine';
          break;
        case 'duplicates':
          endpoint = '/requests?status=Duplicate';
          break;
        case 'new_requests':
          endpoint = '/requests?createdBy=data_entry&excludeTypes=duplicate,quarantine';
          break;
        case 'processed_quarantine':
          endpoint = '/requests?originalRequestType=quarantine&processedQuarantine=true';
          break;
        case 'processed_duplicates':
          endpoint = '/requests?processedDuplicates=true';
          break;
        case 'data_entry_tasks':
          endpoint = '/requests?assignedTo=data_entry';
          break;
        case 'reviewer_tasks':
          endpoint = '/requests?assignedTo=reviewer';
          break;
        case 'compliance_tasks':
          endpoint = '/requests?assignedTo=compliance';
          break;
      }
      
      const response = await this.http.get<any[]>(`${this.apiBase}${endpoint}`).toPromise();
      this.modalData = response || [];
      this.total = this.modalData.length;
      
    } catch (error) {
      console.error('Error loading drill-down data:', error);
      this.message.error('Failed to load detailed data');
      this.isModalVisible = false;
    } finally {
      this.modalLoading = false;
    }
  }

  async drillDownBySystem(system: SystemSourceStat): Promise<void> {
    this.modalTitle = `${this.translate.instant('Records from')} ${system.displayName || system.system}`;
    this.isModalVisible = true;
    this.modalLoading = true;
    this.modalData = [];
    
    try {
      // Use the English system name for API call
      console.log('Drilling down for system:', system.displayName || system.system, '-> API name:', system.system);
      
      const response = await this.http.get<any[]>(`${this.apiBase}/requests?systemBreakdown=true&sourceSystem=${system.system}`).toPromise();
      this.modalData = response || [];
      this.total = this.modalData.length;
      
      console.log('System drill-down response:', this.modalData.length, 'records');
    } catch (error) {
      console.error('Error loading system data:', error);
      this.message.error('Failed to load system data');
      this.isModalVisible = false;
    } finally {
      this.modalLoading = false;
    }
  }

  // Modal Actions
  closeModal(): void {
    this.isModalVisible = false;
    this.modalData = [];
    this.currentFilter = {};
  }

  viewRecord(record: any): void {
    this.closeModal();
    this.router.navigate(['/dashboard/new-request', record.id], {
      queryParams: { mode: 'view' }
    });
  }

  editRecord(record: any): void {
    this.closeModal();
    this.router.navigate(['/dashboard/new-request', record.id], {
      queryParams: { mode: 'edit' }
    });
  }

  // Table Events
  onQueryParamsChange(params: any): void {
    const { pageSize, pageIndex } = params;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
    // In real app, reload data with new pagination
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    
    if (this.autoRefresh) {
      this.setupAutoRefresh();
    }
    
    this.message.info(`Auto-refresh ${this.autoRefresh ? 'enabled' : 'disabled'}`);
  }

  async refreshData(): Promise<void> {
    await this.loadDashboardData();
    this.message.success('Dashboard refreshed');
  }

  exportModalData(): void {
    if (this.modalData.length === 0) {
      this.message.warning('No data to export');
      return;
    }

    const csvContent = this.convertModalDataToCSV(this.modalData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${this.modalTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.message.success('Data exported successfully');
  }

  private convertModalDataToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = ['Company Name', 'Company Name (Arabic)', 'Status', 'Created Date'];
    let csvContent = headers.join(',') + '\n';
    
    data.forEach(record => {
      const row = [
        `"${record.firstName || ''}"`,
        `"${record.firstNameAr || ''}"`,
        `"${record.status || ''}"`,
        `"${record.createdAt || ''}"`
      ];
      csvContent += row.join(',') + '\n';
    });
    
    return csvContent;
  }

  exportData(): void {
    this.message.info('Exporting technical dashboard...');
    
    // Prepare technical dashboard data for export
    const dashboardData = {
      summary: {
        exportDate: new Date().toLocaleString('en-US'),
        exportType: 'Technical Dashboard'
      },
      dataStatistics: {
        goldenRecords: this.getCardValue('golden_records'),
        quarantineRecords: this.getCardValue('quarantine_records'),
        unprocessedDuplicates: this.getCardValue('unprocessed_duplicates'),
        processedQuarantine: this.getCardValue('processed_quarantine'),
        processedDuplicates: this.getCardValue('processed_duplicates'),
        newRequests: this.getCardValue('new_requests')
      },
      taskLists: {
        dataEntryTasks: this.getCardValue('data_entry_tasks'),
        reviewerTasks: this.getCardValue('reviewer_tasks'),
        complianceTasks: this.getCardValue('compliance_tasks')
      },
      systemSources: this.systemSources.map(system => ({
        System: system.system,
        Total: system.count,
        Quarantine: system.quarantine,
        Duplicate: system.duplicate
      }))
    };

    // Create comprehensive CSV content
    let csvContent = '';
    
    // Add Header
    csvContent += 'TECHNICAL DASHBOARD EXPORT\n';
    csvContent += `Export Date: ${dashboardData.summary.exportDate}\n\n`;
    
    // Add Data Statistics Section
    csvContent += 'DATA STATISTICS\n';
    csvContent += `Golden Records: ${dashboardData.dataStatistics.goldenRecords}\n`;
    csvContent += `Quarantine Records (Unprocessed): ${dashboardData.dataStatistics.quarantineRecords}\n`;
    csvContent += `Unprocessed Duplicates: ${dashboardData.dataStatistics.unprocessedDuplicates}\n`;
    csvContent += `Processed Quarantine: ${dashboardData.dataStatistics.processedQuarantine}\n`;
    csvContent += `Processed Duplicates: ${dashboardData.dataStatistics.processedDuplicates}\n`;
    csvContent += `New Requests Created: ${dashboardData.dataStatistics.newRequests}\n\n`;
    
    // Add Task Lists Section
    csvContent += 'TASK LISTS\n';
    csvContent += `Data Entry Tasks: ${dashboardData.taskLists.dataEntryTasks}\n`;
    csvContent += `Reviewer Tasks: ${dashboardData.taskLists.reviewerTasks}\n`;
    csvContent += `Compliance Tasks: ${dashboardData.taskLists.complianceTasks}\n\n`;
    
    // Add System Sources Section
    csvContent += 'DATA EXTRACTED FROM SYSTEMS\n';
    csvContent += 'System,Total,Quarantine,Duplicate\n';
    dashboardData.systemSources.forEach(system => {
      csvContent += `"${system.System}",${system.Total},${system.Quarantine},${system.Duplicate}\n`;
    });
    csvContent += '\n';
    
    // Add Summary Totals
    const totalExtracted = dashboardData.systemSources.reduce((sum, sys) => sum + sys.Total, 0);
    const totalQuarantine = dashboardData.systemSources.reduce((sum, sys) => sum + sys.Quarantine, 0);
    const totalDuplicate = dashboardData.systemSources.reduce((sum, sys) => sum + sys.Duplicate, 0);
    
    csvContent += 'SYSTEM SOURCES SUMMARY\n';
    csvContent += `Total Records Extracted: ${totalExtracted}\n`;
    csvContent += `Total Quarantine from Systems: ${totalQuarantine}\n`;
    csvContent += `Total Duplicates from Systems: ${totalDuplicate}\n\n`;
    
    // Add Processing Summary
    const totalProcessed = dashboardData.dataStatistics.processedQuarantine + dashboardData.dataStatistics.processedDuplicates;
    const totalUnprocessed = dashboardData.dataStatistics.quarantineRecords + dashboardData.dataStatistics.unprocessedDuplicates;
    
    csvContent += 'PROCESSING SUMMARY\n';
    csvContent += `Total Processed Records: ${totalProcessed}\n`;
    csvContent += `Total Unprocessed Records: ${totalUnprocessed}\n`;
    csvContent += `Processing Efficiency: ${totalExtracted > 0 ? ((totalProcessed / totalExtracted) * 100).toFixed(2) : 0}%\n`;

    // Download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `technical-dashboard-${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.message.success('Technical dashboard exported successfully!');
  }

  async generateSampleData(): Promise<void> {
    try {
      this.message.loading('Generating sample data...', { nzDuration: 0 });
      
      // Generate quarantine data
      await this.http.post(`${this.apiBase}/requests/admin/generate-quarantine`, {}).toPromise();
      // Generate duplicate data
      await this.http.post(`${this.apiBase}/requests/admin/generate-duplicates`, {}).toPromise();
      
      this.message.remove();
      this.message.success('Sample data generated successfully!');
      
      // Refresh dashboard
      await this.loadDashboardData();
    } catch (error) {
      this.message.remove();
      console.error('Error generating sample data:', error);
      this.message.error('Failed to generate sample data');
    }
  }

  async clearData(type: string): Promise<void> {
    try {
      this.message.loading(`Clearing ${type} data...`, { nzDuration: 0 });
      
      let endpoint = '';
      switch (type) {
        case 'all':
          endpoint = '/requests/admin/clear-all';
          break;
        case 'quarantine':
          endpoint = '/requests/admin/clear-quarantine';
          break;
        case 'duplicates':
          endpoint = '/requests/admin/clear-duplicates';
          break;
        case 'golden':
          endpoint = '/requests/admin/clear-golden';
          break;
        default:
          endpoint = '/requests/admin/clear-requests';
      }
      
      await this.http.delete(`${this.apiBase}${endpoint}`).toPromise();
      
      this.message.remove();
      this.message.success(`${type} data cleared successfully!`);
      
      // Refresh dashboard
      await this.loadDashboardData();
    } catch (error) {
      this.message.remove();
      console.error(`Error clearing ${type} data:`, error);
      this.message.error(`Failed to clear ${type} data`);
    }
  }

  // Get total count for progress calculation
  getTotalSystemRecords(): number {
    return this.systemSources.reduce((sum, system) => sum + system.count, 0);
  }

  // Math helper for template
  Math = Math;

  // Helper method to get card value by ID
  getCardValue(cardId: string): number {
    const card = this.statCards.find(c => c.id === cardId);
    return card?.value || 0;
  }

  // Status color helper
  getStatusColor(status: string): string {
    const colors: any = {
      'Pending': 'orange',
      'Approved': 'green',
      'Rejected': 'red',
      'Quarantine': 'purple',
      'Duplicate': 'blue',
      'Active': 'green',
      'Blocked': 'red'
    };
    return colors[status] || 'default';
  }
}
