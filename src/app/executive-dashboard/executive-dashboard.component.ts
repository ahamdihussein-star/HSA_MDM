import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription, forkJoin } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { formatDate } from '@angular/common';
import { environment } from '../../environments/environment';

// Register Chart.js components
Chart.register(...registerables);

interface KPICard {
  title: string;
  titleAr: string;
  value: number | string;
  previousValue?: number;
  change?: number;
  changeType: 'increase' | 'decrease' | 'stable';
  icon: string;
  color: string;
  suffix?: string;
  prefix?: string;
  loading?: boolean;
  target?: number;
}

interface ActivityItem {
  id: string;
  action: string;
  company_name: string;
  performedBy: string;
  performedByRole: string;
  performedAt: string;
  note?: string;
  fromStatus?: string;
  toStatus?: string;
}

interface BottleneckItem {
  stage: string;
  status: string;
  stuck_count: number;
  avg_days_stuck: number;
}

@Component({
  selector: 'app-executive-dashboard',
  templateUrl: './executive-dashboard.component.html',
  styleUrls: ['./executive-dashboard.component.scss']
})
export class ExecutiveDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  
  // Chart Elements
  @ViewChild('statusChart') statusChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('trendsChart') trendsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('qualityChart') qualityChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('performanceChart') performanceChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('geographicChart') geographicChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('bottleneckChart') bottleneckChartRef!: ElementRef<HTMLCanvasElement>;

  // Chart instances
  private charts: { [key: string]: Chart } = {};
  
  private apiBase = environment.apiBaseUrl || 'http://localhost:3001/api';
  private refreshSubscription?: Subscription;
  
  // Language
  isArabic = localStorage.getItem('lang') === 'ar';
  
  // Loading States
  isLoading = false;
  chartsLoading = false;
  activitiesLoading = false;
  
  // Date Range
  dateRange: [Date, Date] = [
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    new Date()
  ];
  
  // View Mode
  viewMode: 'executive' | 'operational' | 'technical' = 'executive';
  
  // Refresh Settings
  autoRefresh = true;
  refreshInterval = 30000; // 30 seconds
  lastUpdated = new Date();
  
  // KPI Cards
  kpiCards: KPICard[] = [];
  
  // Activity Feed
  activities: ActivityItem[] = [];
  activityFeed: any[] = [];
  alerts: any[] = [];
  
  // Bottlenecks
  bottlenecks: BottleneckItem[] = [];
  
  // Filters
  selectedDepartment = 'all';
  selectedRegion = 'all';
  selectedPeriod: '7days' | '30days' | '90days' = '30days';
  
  // Statistics
  totalRequests = 0;
  pendingRequests = 0;
  approvedRequests = 0;
  rejectedRequests = 0;
  
  constructor(
    private http: HttpClient,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.initializeDashboard();
    this.setupAutoRefresh();
  }

  ngAfterViewInit(): void {
    // Charts will be initialized after data is loaded
  }

  ngOnDestroy(): void {
    // Cleanup
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    
    // Destroy all charts
    Object.values(this.charts).forEach(chart => chart.destroy());
  }

  private async initializeDashboard(): Promise<void> {
    this.isLoading = true;
    
    try {
      // Load all data in parallel
      await this.loadAllData();
      
      // Initialize sample activity feed and alerts
      this.initializeSampleData();
      
      // Initialize charts after data is loaded
      setTimeout(() => {
        this.initializeCharts();
      }, 100);
      
    } catch (error) {
      console.error('Dashboard initialization error:', error);
      this.message.error('Failed to load dashboard data');
    } finally {
      this.isLoading = false;
    }
  }

  private initializeSampleData(): void {
    // Sample Activity Feed
    this.activityFeed = [
      { time: '2 min ago', action: 'New request created', user: 'Ahmed Hassan', status: 'success' },
      { time: '5 min ago', action: 'Duplicate resolved', user: 'Sara Ali', status: 'info' },
      { time: '12 min ago', action: 'Quarantine processed', user: 'Mohamed Farid', status: 'warning' },
      { time: '25 min ago', action: 'Golden record approved', user: 'Fatma Omar', status: 'success' },
      { time: '1 hour ago', action: 'Compliance check completed', user: 'System', status: 'info' }
    ];

    // Sample Alerts
    this.alerts = [
      { type: 'warning', title: 'High Processing Time', message: 'Average processing time increased by 15%', time: '10 min ago' },
      { type: 'info', title: 'Data Quality Improved', message: 'Quality score reached 94.2%', time: '1 hour ago' }
    ];
  }

  private async loadAllData(): Promise<void> {
    const requests = [
      this.http.get(`${this.apiBase}/dashboard/executive-stats`),
      this.http.get(`${this.apiBase}/dashboard/workflow-distribution`),
      this.http.get(`${this.apiBase}/dashboard/activity-feed`),
      this.http.get(`${this.apiBase}/dashboard/bottlenecks`),
      this.http.get(`${this.apiBase}/dashboard/quality-metrics`),
      this.http.get(`${this.apiBase}/dashboard/user-performance`),
      this.http.get(`${this.apiBase}/dashboard/geographic`),
      this.http.get(`${this.apiBase}/dashboard/trends?period=${this.selectedPeriod}`)
    ];

    const [
      stats,
      distribution,
      activities,
      bottlenecks,
      quality,
      performance,
      geographic,
      trends
    ] = await forkJoin(requests).toPromise() as any[];

    // Process KPIs
    this.processKPIData(stats.kpis);
    
    // Process Activities
    this.activities = activities.slice(0, 10);
    
    // Process Bottlenecks
    this.bottlenecks = bottlenecks;
    
    // Update last refreshed time
    this.lastUpdated = new Date();
    
    // Store data for charts
    this.chartData = {
      distribution,
      quality,
      performance,
      geographic,
      trends
    };
  }

  private chartData: any = {};

  private processKPIData(kpis: any): void {
    this.kpiCards = [
      {
        title: 'Active Golden Records',
        titleAr: 'السجلات الذهبية النشطة',
        value: kpis.activeGoldenRecords || 0,
        previousValue: kpis.previousActiveGolden,
        change: this.calculateChange(kpis.activeGoldenRecords, kpis.previousActiveGolden),
        changeType: this.getChangeType(kpis.activeGoldenRecords, kpis.previousActiveGolden),
        icon: 'trophy',
        color: '#52c41a'
      },
      {
        title: 'Data Quality Score',
        titleAr: 'جودة البيانات',
        value: kpis.dataQualityScore || 0,
        change: 2.1,
        changeType: kpis.dataQualityScore > 90 ? 'increase' : 'decrease',
        icon: 'bar-chart',
        color: '#1890ff',
        suffix: '%'
      },
      {
        title: 'Avg Processing Time',
        titleAr: 'متوسط وقت المعالجة',
        value: kpis.avgProcessingTime || 0,
        change: -0.3,
        changeType: kpis.avgProcessingTime < 3 ? 'increase' : 'decrease',
        icon: 'field-time',
        color: '#faad14',
        suffix: ' days'
      },
      {
        title: 'Monthly Growth',
        titleAr: 'النمو الشهري',
        value: kpis.monthlyGrowth || 0,
        change: kpis.monthlyGrowth,
        changeType: kpis.monthlyGrowth > 0 ? 'increase' : 'decrease',
        icon: 'rise',
        color: '#722ed1',
        suffix: '%'
      },
      {
        title: 'Compliance Rate',
        titleAr: 'معدل الامتثال',
        value: kpis.complianceRate || 0,
        change: 1.2,
        changeType: kpis.complianceRate > 95 ? 'increase' : 'decrease',
        icon: 'safety-certificate',
        color: '#13c2c2',
        suffix: '%'
      },
      {
        title: 'System Efficiency',
        titleAr: 'كفاءة النظام',
        value: kpis.systemEfficiency || 0,
        change: -1.1,
        changeType: kpis.systemEfficiency > 90 ? 'increase' : 'decrease',
        icon: 'thunderbolt',
        color: '#eb2f96',
        suffix: '%'
      }
    ];

    // Store statistics
    this.totalRequests = kpis.totalRequests || 0;
    this.pendingRequests = kpis.pendingRequests || 0;
    this.rejectedRequests = kpis.rejectedRequests || 0;
  }

  private initializeCharts(): void {
    this.chartsLoading = true;
    
    try {
      // 1. Status Distribution Chart (Donut)
      if (this.statusChartRef?.nativeElement) {
        this.createStatusDistributionChart();
      }
      
      // 2. Trends Chart (Line)
      if (this.trendsChartRef?.nativeElement) {
        this.createTrendsChart();
      }
      
      // 3. Quality Metrics Chart (Radar)
      if (this.qualityChartRef?.nativeElement) {
        this.createQualityChart();
      }
      
      // 4. User Performance Chart (Bar)
      if (this.performanceChartRef?.nativeElement) {
        this.createPerformanceChart();
      }
      
      // 5. Geographic Distribution Chart (Bar)
      if (this.geographicChartRef?.nativeElement) {
        this.createGeographicChart();
      }
      
      // 6. Bottleneck Analysis Chart (Horizontal Bar)
      if (this.bottleneckChartRef?.nativeElement) {
        this.createBottleneckChart();
      }
      
    } catch (error) {
      console.error('Chart initialization error:', error);
    } finally {
      this.chartsLoading = false;
    }
  }

  private createStatusDistributionChart(): void {
    const data = this.chartData.distribution?.statusDistribution || [];
    
    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: data.map((d: any) => d.status),
        datasets: [{
          data: data.map((d: any) => d.count),
          backgroundColor: [
            '#52c41a', // Approved
            '#faad14', // Pending
            '#ff4d4f', // Rejected
            '#722ed1', // Quarantine
            '#8c8c8c'  // Others
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                const percentage = ((value / this.totalRequests) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    };

    this.charts['status'] = new Chart(this.statusChartRef.nativeElement, config);
  }

  private createTrendsChart(): void {
    const trends = this.chartData.trends || [];
    
    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: trends.map((t: any) => this.formatDate(t.date)),
        datasets: [
          {
            label: 'Total',
            data: trends.map((t: any) => t.total),
            borderColor: '#1890ff',
            backgroundColor: 'rgba(24, 144, 255, 0.1)',
            tension: 0.4
          },
          {
            label: 'Approved',
            data: trends.map((t: any) => t.approved),
            borderColor: '#52c41a',
            backgroundColor: 'rgba(82, 196, 26, 0.1)',
            tension: 0.4
          },
          {
            label: 'Rejected',
            data: trends.map((t: any) => t.rejected),
            borderColor: '#ff4d4f',
            backgroundColor: 'rgba(255, 77, 79, 0.1)',
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { padding: 10 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0,0,0,0.05)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    };

    this.charts['trends'] = new Chart(this.trendsChartRef.nativeElement, config);
  }

  private createQualityChart(): void {
    const metrics = this.chartData.quality || {};
    
    const config: ChartConfiguration = {
      type: 'radar',
      data: {
        labels: [
          'Company Name',
          'Tax Number',
          'Email',
          'Address',
          'Contact Info'
        ],
        datasets: [{
          label: 'Data Completeness %',
          data: [
            metrics.name_completeness || 0,
            metrics.tax_completeness || 0,
            metrics.email_completeness || 0,
            metrics.address_completeness || 0,
            metrics.contact_completeness || 0
          ],
          borderColor: '#722ed1',
          backgroundColor: 'rgba(114, 46, 209, 0.2)',
          pointBackgroundColor: '#722ed1',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#722ed1'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 20
            },
            grid: {
              color: 'rgba(0,0,0,0.05)'
            }
          }
        }
      }
    };

    this.charts['quality'] = new Chart(this.qualityChartRef.nativeElement, config);
  }

  private createPerformanceChart(): void {
    const performance = this.chartData.performance || [];
    const topUsers = performance.slice(0, 5);
    
    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: topUsers.map((u: any) => u.user || 'Unknown'),
        datasets: [
          {
            label: 'Total Actions',
            data: topUsers.map((u: any) => u.total_actions),
            backgroundColor: '#1890ff'
          },
          {
            label: 'Approved',
            data: topUsers.map((u: any) => u.approved),
            backgroundColor: '#52c41a'
          },
          {
            label: 'Rejected',
            data: topUsers.map((u: any) => u.rejected),
            backgroundColor: '#ff4d4f'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0,0,0,0.05)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    };

    this.charts['performance'] = new Chart(this.performanceChartRef.nativeElement, config);
  }

  private createGeographicChart(): void {
    const geoData = this.chartData.geographic || [];
    const byCountry = this.aggregateByCountry(geoData);
    
    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: Object.keys(byCountry),
        datasets: [{
          label: 'Records by Country',
          data: Object.values(byCountry),
          backgroundColor: [
            '#1890ff',
            '#52c41a',
            '#faad14',
            '#722ed1',
            '#13c2c2'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0,0,0,0.05)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    };

    this.charts['geographic'] = new Chart(this.geographicChartRef.nativeElement, config);
  }

  private createBottleneckChart(): void {
    if (!this.bottlenecks.length) return;
    
    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: this.bottlenecks.map(b => b.stage),
        datasets: [{
          label: 'Days Stuck',
          data: this.bottlenecks.map(b => b.avg_days_stuck),
          backgroundColor: this.bottlenecks.map(b => 
            b.avg_days_stuck > 5 ? '#ff4d4f' : 
            b.avg_days_stuck > 3 ? '#faad14' : '#52c41a'
          )
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const b = this.bottlenecks[context.dataIndex];
                return `${b.stuck_count} records stuck for avg ${b.avg_days_stuck.toFixed(1)} days`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0,0,0,0.05)'
            }
          },
          y: {
            grid: {
              display: false
            }
          }
        }
      }
    };

    this.charts['bottleneck'] = new Chart(this.bottleneckChartRef.nativeElement, config);
  }

  // Utility Functions
  private calculateChange(current: number, previous?: number): number {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  private getChangeType(current: number, previous?: number): 'increase' | 'decrease' | 'stable' {
    if (!previous) return 'stable';
    if (current > previous) return 'increase';
    if (current < previous) return 'decrease';
    return 'stable';
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return formatDate(date, 'MMM dd', 'en-US');
  }

  private aggregateByCountry(geoData: any[]): { [key: string]: number } {
    const result: { [key: string]: number } = {};
    geoData.forEach(item => {
      if (!result[item.country]) {
        result[item.country] = 0;
      }
      result[item.country] += item.count;
    });
    return result;
  }

  // Auto Refresh
  private setupAutoRefresh(): void {
    if (this.autoRefresh) {
      this.refreshSubscription = interval(this.refreshInterval).subscribe(() => {
        this.refreshDashboard();
      });
    }
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.setupAutoRefresh();
      this.message.success('Auto-refresh enabled');
    } else {
      if (this.refreshSubscription) {
        this.refreshSubscription.unsubscribe();
      }
      this.message.info('Auto-refresh disabled');
    }
  }

  async refreshDashboard(): Promise<void> {
    await this.loadAllData();
    
    // Update charts
    Object.keys(this.charts).forEach(key => {
      this.updateChart(key);
    });
    
    this.message.success('Dashboard refreshed');
  }

  private updateChart(chartKey: string): void {
    const chart = this.charts[chartKey];
    if (!chart) return;

    // Update chart data based on type
    switch (chartKey) {
      case 'trends':
        this.updateTrendsChart(chart);
        break;
      // Add other chart update methods as needed
    }
  }

  private updateTrendsChart(chart: Chart): void {
    const trends = this.chartData.trends || [];
    chart.data.labels = trends.map((t: any) => this.formatDate(t.date));
    chart.data.datasets[0].data = trends.map((t: any) => t.total);
    chart.data.datasets[1].data = trends.map((t: any) => t.approved);
    chart.data.datasets[2].data = trends.map((t: any) => t.rejected);
    chart.update();
  }

  // View Controls
  switchView(view: 'executive' | 'operational' | 'technical'): void {
    this.viewMode = view;
    this.loadAllData();
  }

  // Filters
  onDateRangeChange(dates: [Date, Date]): void {
    this.dateRange = dates;
    this.loadAllData();
  }

  onPeriodChange(period: '7days' | '30days' | '90days'): void {
    this.selectedPeriod = period;
    this.loadAllData();
  }

  // Export Functions
  exportToPDF(): void {
    this.message.info('Exporting executive dashboard to CSV...');
    this.exportExecutiveDashboard();
  }

  exportToExcel(): void {
    this.message.info('Exporting executive dashboard to CSV...');
    this.exportExecutiveDashboard();
  }

  private exportExecutiveDashboard(): void {
    // Prepare executive dashboard data for export
    const dashboardData = {
      summary: {
        exportDate: new Date().toLocaleString('en-US'),
        exportType: 'Executive Dashboard',
        period: this.selectedPeriod
      },
      kpiMetrics: this.kpiCards.map(kpi => ({
        Metric: kpi.title,
        Value: kpi.value,
        Change: kpi.change,
        Target: kpi.target || 'N/A'
      })),
      activityFeed: this.activityFeed.slice(0, 10).map((activity: any) => ({
        Time: activity.time,
        Action: activity.action,
        User: activity.user,
        Status: activity.status
      })),
      alerts: this.alerts.map((alert: any) => ({
        Type: alert.type,
        Title: alert.title,
        Message: alert.message,
        Time: alert.time
      }))
    };

    // Create comprehensive CSV content
    let csvContent = '';
    
    // Add Header
    csvContent += 'EXECUTIVE DASHBOARD EXPORT\n';
    csvContent += `Export Date: ${dashboardData.summary.exportDate}\n`;
    csvContent += `Period: ${dashboardData.summary.period}\n\n`;
    
    // Add KPI Metrics Section
    csvContent += 'KEY PERFORMANCE INDICATORS\n';
    csvContent += 'Metric,Value,Change,Target\n';
    dashboardData.kpiMetrics.forEach(kpi => {
      csvContent += `"${kpi.Metric}","${kpi.Value}","${kpi.Change}","${kpi.Target}"\n`;
    });
    csvContent += '\n';
    
    // Add Activity Feed Section
    csvContent += 'RECENT ACTIVITY FEED\n';
    csvContent += 'Time,Action,User,Status\n';
    dashboardData.activityFeed.forEach((activity: any) => {
      csvContent += `"${activity.Time}","${activity.Action}","${activity.User}","${activity.Status}"\n`;
    });
    csvContent += '\n';
    
    // Add Alerts Section
    csvContent += 'SYSTEM ALERTS\n';
    csvContent += 'Type,Title,Message,Time\n';
    dashboardData.alerts.forEach((alert: any) => {
      csvContent += `"${alert.Type}","${alert.Title}","${alert.Message}","${alert.Time}"\n`;
    });
    csvContent += '\n';
    
    // Add Performance Summary
    const totalActiveRecords = this.kpiCards.find(k => k.title.includes('Active'))?.value || 0;
    const qualityScore = this.kpiCards.find(k => k.title.includes('Quality'))?.value || 0;
    const complianceRate = this.kpiCards.find(k => k.title.includes('Compliance'))?.value || 0;
    
    csvContent += 'PERFORMANCE SUMMARY\n';
    csvContent += `Total Active Golden Records: ${totalActiveRecords}\n`;
    csvContent += `Data Quality Score: ${qualityScore}%\n`;
    csvContent += `Compliance Rate: ${complianceRate}%\n`;
    csvContent += `System Health: ${this.alerts.length === 0 ? 'Excellent' : this.alerts.length < 3 ? 'Good' : 'Needs Attention'}\n`;

    // Download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `executive-dashboard-${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.message.success('Executive dashboard exported successfully!');
  }

  // Activity Feed Helpers
  getActivityIcon(action: string): string {
    const iconMap: any = {
      'CREATE': 'plus-circle',
      'UPDATE': 'edit',
      'APPROVE': 'check-circle',
      'REJECT': 'close-circle',
      'COMPLIANCE_APPROVE': 'safety-certificate',
      'COMPLIANCE_BLOCK': 'stop',
      'MERGED': 'merge',
      'MASTER_BUILT': 'build'
    };
    return iconMap[action] || 'info-circle';
  }

  getActivityColor(action: string): string {
    const colorMap: any = {
      'CREATE': '#1890ff',
      'APPROVE': '#52c41a',
      'REJECT': '#ff4d4f',
      'COMPLIANCE_APPROVE': '#52c41a',
      'COMPLIANCE_BLOCK': '#ff4d4f'
    };
    return colorMap[action] || '#8c8c8c';
  }

  formatTimeAgo(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  // Bottleneck Actions
  resolveBottleneck(bottleneck: BottleneckItem): void {
    this.message.info(`Resolving bottleneck in ${bottleneck.stage}...`);
    // Navigate to appropriate page or trigger action
  }

  // Generate Sample Data (for testing)
  async generateSampleData(): Promise<void> {
    const loading = this.message.loading('Generating sample data...', { nzDuration: 0 });
    
    try {
      await this.http.post(`${this.apiBase}/requests/admin/generate-quarantine`, {}).toPromise();
      await this.http.post(`${this.apiBase}/requests/admin/generate-duplicates`, {}).toPromise();
      
      this.message.success('Sample data generated successfully');
      await this.refreshDashboard();
    } catch (error) {
      this.message.error('Failed to generate sample data');
    } finally {
      this.message.remove(loading.messageId);
    }
  }

  // Navigation helper
  navigateToDetail(metric: string): void {
    console.log('Navigating to detail view for:', metric);
    // Implement navigation logic
  }

  // Math helper for template
  Math = Math;

  // Progress helper
  getProgressPercent(value: string | number): number {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return numValue > 100 ? 100 : numValue;
  }
}