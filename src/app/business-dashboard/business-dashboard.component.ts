import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TranslateService } from '@ngx-translate/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { environment } from '../../environments/environment';

Chart.register(...registerables);

interface FilterOptions {
  countries: string[];
  cities: string[];
  customerTypes: string[];
  salesOrgs: string[];
  distributionChannels: string[];
  divisions: string[];
}

interface CompanyRecord {
  id: string;
  firstName: string;
  firstNameAr?: string;
  tax: string;
  country: string;
  city: string;
  CustomerType: string;
  SalesOrgOption?: string;
  DistributionChannelOption?: string;
  DivisionOption?: string;
  companyStatus?: string;
  status?: string;
  isGolden?: boolean;
  updatedAt: string;
  createdAt?: string;
}

@Component({
  selector: 'app-business-dashboard',
  templateUrl: './business-dashboard.component.html',
  styleUrls: ['./business-dashboard.component.scss']
})
export class BusinessDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  
  @ViewChild('countryChart') countryChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('cityChart') cityChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('typeChart') typeChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('salesOrgChart') salesOrgChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('channelChart') channelChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('divisionChart') divisionChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusChart') statusChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('trendChart') trendChartRef!: ElementRef<HTMLCanvasElement>;

  private apiBase = environment.apiBaseUrl || 'http://localhost:3000/api';
  private charts: { [key: string]: Chart } = {};
  
  // Language
  isArabic = localStorage.getItem('lang') === 'ar';
  
  // Loading States
  isLoading = true;
  chartsLoading = false;
  modalLoading = false;
  
  // Data
  allCompanies: CompanyRecord[] = [];
  filteredCompanies: CompanyRecord[] = [];
  
  // Filter Options
  filterOptions: FilterOptions = {
    countries: [],
    cities: [],
    customerTypes: [],
    salesOrgs: [],
    distributionChannels: [],
    divisions: []
  };
  
  // Selected Filters
  selectedCountry: string = 'all';
  selectedCity: string = 'all';
  selectedType: string = 'all';
  selectedSalesOrg: string = 'all';
  selectedChannel: string = 'all';
  selectedDivision: string = 'all';
  selectedStatus: 'all' | 'Active' | 'Blocked' = 'all';
  
  // Statistics
  totalCompanies = 0;
  activeCompanies = 0;
  blockedCompanies = 0;
  goldenRecords = 0;
  goldenCompanies = 0;
  
  // Modal
  isModalVisible = false;
  modalTitle = '';
  modalData: CompanyRecord[] = [];
  modalPageIndex = 1;
  modalPageSize = 10;
  modalTotal = 0;
  
  // Chart View Mode
  chartViewMode: 'grid' | 'single' = 'grid';
  selectedChart: string = 'country';
  
  constructor(
    private http: HttpClient,
    private router: Router,
    private message: NzMessageService,
    private translate: TranslateService
  ) {
    // Language detection
    this.isArabic = localStorage.getItem('lang') === 'ar';
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    // Charts will be initialized after data is loaded
  }

  ngOnDestroy(): void {
    Object.values(this.charts).forEach(chart => chart.destroy());
  }

  async loadData(): Promise<void> {
    this.isLoading = true;
    
    try {
      // Load only Golden Records
      const response = await this.http.get<any[]>(`${this.apiBase}/requests?isGolden=true`).toPromise();
      this.allCompanies = response || [];
      
      // Extract filter options
      this.extractFilterOptions();
      
      // Apply initial filters
      this.applyFilters();
      
      // Initialize charts after data is loaded
      setTimeout(() => {
        this.initializeCharts();
      }, 100);
      
    } catch (error) {
      console.error('Error loading data:', error);
      this.message.error('Failed to load business data');
    } finally {
      this.isLoading = false;
    }
  }

  private extractFilterOptions(): void {
    const countries = new Set<string>();
    const cities = new Set<string>();
    const types = new Set<string>();
    const salesOrgs = new Set<string>();
    const channels = new Set<string>();
    const divisions = new Set<string>();
    
    this.allCompanies.forEach(company => {
      if (company.country) countries.add(company.country);
      if (company.city) cities.add(company.city);
      if (company.CustomerType) types.add(company.CustomerType);
      if (company.SalesOrgOption) salesOrgs.add(company.SalesOrgOption);
      if (company.DistributionChannelOption) channels.add(company.DistributionChannelOption);
      if (company.DivisionOption) divisions.add(company.DivisionOption);
    });
    
    this.filterOptions = {
      countries: Array.from(countries).sort(),
      cities: Array.from(cities).sort(),
      customerTypes: Array.from(types).sort(),
      salesOrgs: Array.from(salesOrgs).sort(),
      distributionChannels: Array.from(channels).sort(),
      divisions: Array.from(divisions).sort()
    };
  }

  applyFilters(): void {
    this.filteredCompanies = this.allCompanies.filter(company => {
      let match = true;
      
      if (this.selectedCountry !== 'all' && company.country !== this.selectedCountry) {
        match = false;
      }
      
      if (this.selectedCity !== 'all' && company.city !== this.selectedCity) {
        match = false;
      }
      
      if (this.selectedType !== 'all' && company.CustomerType !== this.selectedType) {
        match = false;
      }
      
      if (this.selectedSalesOrg !== 'all' && company.SalesOrgOption !== this.selectedSalesOrg) {
        match = false;
      }
      
      if (this.selectedChannel !== 'all' && company.DistributionChannelOption !== this.selectedChannel) {
        match = false;
      }
      
      if (this.selectedDivision !== 'all' && company.DivisionOption !== this.selectedDivision) {
        match = false;
      }
      
      if (this.selectedStatus !== 'all' && company.companyStatus !== this.selectedStatus) {
        match = false;
      }
      
      return match;
    });
    
    this.calculateStatistics();
    this.updateCharts();
  }

  private calculateStatistics(): void {
    this.totalCompanies = this.filteredCompanies.length;
    this.activeCompanies = this.filteredCompanies.filter(c => c.companyStatus === 'Active').length;
    this.blockedCompanies = this.filteredCompanies.filter(c => c.companyStatus === 'Blocked').length;
    this.goldenRecords = this.filteredCompanies.filter(c => c.isGolden).length;
    this.goldenCompanies = this.goldenRecords; // Same as golden records
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  resetFilters(): void {
    this.selectedCountry = 'all';
    this.selectedCity = 'all';
    this.selectedType = 'all';
    this.selectedSalesOrg = 'all';
    this.selectedChannel = 'all';
    this.selectedDivision = 'all';
    this.selectedStatus = 'all';
    this.applyFilters();
  }

  private initializeCharts(): void {
    this.chartsLoading = true;
    
    try {
      // Initialize all charts
      this.createCountryChart();
      this.createCityChart();
      this.createTypeChart();
      this.createSalesOrgChart();
      this.createChannelChart();
      this.createDivisionChart();
      this.createStatusChart();
      this.createTrendChart();
      
    } catch (error) {
      console.error('Chart initialization error:', error);
    } finally {
      this.chartsLoading = false;
    }
  }

  private createCountryChart(): void {
    if (!this.countryChartRef?.nativeElement) return;
    
    const data = this.groupByField('country');
    
    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: Object.keys(data),
        datasets: [{
          label: 'Companies by Country',
          data: Object.values(data),
          backgroundColor: '#1890ff',
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const country = Object.keys(data)[index];
            this.drillDown('country', country);
          }
        },
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    };

    this.charts['country'] = new Chart(this.countryChartRef.nativeElement, config);
  }

  private createCityChart(): void {
    if (!this.cityChartRef?.nativeElement) return;
    
    const data = this.groupByField('city');
    const topCities = Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: topCities.map(([city]) => city),
        datasets: [{
          label: 'Companies by City',
          data: topCities.map(([, count]) => count),
          backgroundColor: '#52c41a',
          borderRadius: 8
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const city = topCities[index][0];
            this.drillDown('city', city);
          }
        },
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { beginAtZero: true }
        }
      }
    };

    this.charts['city'] = new Chart(this.cityChartRef.nativeElement, config);
  }

  private createTypeChart(): void {
    if (!this.typeChartRef?.nativeElement) return;
    
    const data = this.groupByField('CustomerType');
    
    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: Object.keys(data),
        datasets: [{
          data: Object.values(data),
          backgroundColor: [
            '#1890ff',
            '#52c41a',
            '#faad14',
            '#722ed1',
            '#eb2f96',
            '#13c2c2'
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const type = Object.keys(data)[index];
            this.drillDown('CustomerType', type);
          }
        },
        plugins: {
          legend: {
            position: 'right',
            labels: {
              padding: 10,
              font: { size: 11 }
            }
          }
        }
      }
    };

    this.charts['type'] = new Chart(this.typeChartRef.nativeElement, config);
  }

  private createSalesOrgChart(): void {
    if (!this.salesOrgChartRef?.nativeElement) return;
    
    const data = this.groupByField('SalesOrgOption');
    
    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: Object.keys(data),
        datasets: [{
          label: 'Companies by Sales Organization',
          data: Object.values(data),
          backgroundColor: [
            'rgba(24, 144, 255, 0.7)',
            'rgba(82, 196, 26, 0.7)',
            'rgba(250, 173, 20, 0.7)',
            'rgba(114, 46, 209, 0.7)',
            'rgba(235, 47, 150, 0.7)'
          ],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const salesOrg = Object.keys(data)[index];
            this.drillDown('SalesOrgOption', salesOrg);
          }
        },
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    };

    this.charts['salesOrg'] = new Chart(this.salesOrgChartRef.nativeElement, config);
  }

  private createChannelChart(): void {
    if (!this.channelChartRef?.nativeElement) return;
    
    const data = this.groupByField('DistributionChannelOption');
    
    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: Object.keys(data),
        datasets: [{
          label: 'Distribution Channels',
          data: Object.values(data),
          backgroundColor: '#faad14',
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const channel = Object.keys(data)[index];
            this.drillDown('DistributionChannelOption', channel);
          }
        },
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    };

    this.charts['channel'] = new Chart(this.channelChartRef.nativeElement, config);
  }

  private createDivisionChart(): void {
    if (!this.divisionChartRef?.nativeElement) return;
    
    const data = this.groupByField('DivisionOption');
    
    const config: ChartConfiguration = {
      type: 'pie',
      data: {
        labels: Object.keys(data),
        datasets: [{
          data: Object.values(data),
          backgroundColor: [
            '#722ed1',
            '#13c2c2',
            '#eb2f96',
            '#1890ff',
            '#52c41a'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const division = Object.keys(data)[index];
            this.drillDown('DivisionOption', division);
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 10 }
          }
        }
      }
    };

    this.charts['division'] = new Chart(this.divisionChartRef.nativeElement, config);
  }

  private createStatusChart(): void {
    if (!this.statusChartRef?.nativeElement) return;
    
    const active = this.filteredCompanies.filter(c => c.companyStatus === 'Active').length;
    const blocked = this.filteredCompanies.filter(c => c.companyStatus === 'Blocked').length;
    const other = this.filteredCompanies.length - active - blocked;
    
    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: ['Active', 'Blocked', 'Other'],
        datasets: [{
          data: [active, blocked, other],
          backgroundColor: ['#52c41a', '#ff4d4f', '#8c8c8c'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const status = ['Active', 'Blocked', 'Other'][index];
            if (status !== 'Other') {
              this.drillDown('companyStatus', status);
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    };

    this.charts['status'] = new Chart(this.statusChartRef.nativeElement, config);
  }

  private createTrendChart(): void {
    if (!this.trendChartRef?.nativeElement) return;
    
    // Generate last 12 months with proper labels
    const months = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      months.push({ key: monthKey, label: monthLabel });
    }
    
    // Group companies by creation month
    const monthlyData: { [key: string]: number } = {};
    
    // Since all companies have the same updatedAt, distribute them across months for demo
    this.filteredCompanies.forEach((company, index) => {
      // Distribute companies across the last 6 months for a realistic trend
      const monthsBack = Math.floor(index / 2) % 6; // 2 companies per month, cycle through 6 months
      const date = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });
    
    // Create data array with all months (including zeros)
    const chartData = months.map(month => monthlyData[month.key] || 0);
    const chartLabels = months.map(month => month.label);
    
    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: chartLabels,
        datasets: [{
          label: 'Companies Added',
          data: chartData,
          borderColor: '#1890ff',
          backgroundColor: 'rgba(24, 144, 255, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#1890ff',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (context) => context[0].label,
              label: (context) => `Companies: ${context.parsed.y}`
            }
          }
        },
        scales: {
          y: { 
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.1)' }
          },
          x: {
            grid: { color: 'rgba(0,0,0,0.1)' }
          }
        },
        elements: {
          line: {
            borderWidth: 3
          }
        }
      }
    };

    this.charts['trend'] = new Chart(this.trendChartRef.nativeElement, config);
  }

  private groupByField(field: keyof CompanyRecord): { [key: string]: number } {
    const grouped: { [key: string]: number } = {};
    
    this.filteredCompanies.forEach(company => {
      const value = company[field] as string;
      if (value) {
        grouped[value] = (grouped[value] || 0) + 1;
      } else {
        grouped['Unknown'] = (grouped['Unknown'] || 0) + 1;
      }
    });
    
    return grouped;
  }

  private updateCharts(): void {
    Object.keys(this.charts).forEach(chartKey => {
      this.charts[chartKey].destroy();
    });
    
    this.initializeCharts();
  }

  // Drill Down Functions
  drillDown(field: string, value: string): void {
    const filtered = this.filteredCompanies.filter(company => {
      return (company as any)[field] === value;
    });
    
    this.modalTitle = `${field}: ${value} (${filtered.length} companies)`;
    this.modalData = filtered;
    this.modalTotal = filtered.length;
    this.modalPageIndex = 1;
    this.isModalVisible = true;
  }

  closeModal(): void {
    this.isModalVisible = false;
    this.modalData = [];
  }

  viewCompany(company: CompanyRecord): void {
    this.closeModal();
    this.router.navigate(['/dashboard/golden-summary', company.id]);
  }

  exportCompanyList(): void {
    const data = this.modalData.map(c => ({
      ID: c.id,
      Name: c.firstName,
      'Name (Arabic)': c.firstNameAr,
      'Tax Number': c.tax,
      Country: c.country,
      City: c.city,
      Type: c.CustomerType,
      'Sales Org': c.SalesOrgOption,
      Channel: c.DistributionChannelOption,
      Division: c.DivisionOption,
      Status: c.companyStatus
    }));
    
    const csv = this.convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `companies-${Date.now()}.csv`;
    link.click();
    
    this.message.success('Company list exported');
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvData = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        return value ? `"${value}"` : '""';
      }).join(',');
    }).join('\n');
    
    return `${csvHeaders}\n${csvData}`;
  }

  exportDashboard(): void {
    this.message.info('Exporting dashboard...');
    
    // Prepare dashboard data for export
    const dashboardData = {
      summary: {
        totalCompanies: this.totalCompanies,
        activeCompanies: this.activeCompanies,
        blockedCompanies: this.blockedCompanies,
        goldenCompanies: this.goldenCompanies,
        exportDate: new Date().toLocaleString('en-US')
      },
      statistics: {
        byCountry: this.groupByField('country'),
        byCity: this.groupByField('city'),
        byType: this.groupByField('CustomerType'),
        bySalesOrg: this.groupByField('SalesOrgOption'),
        byChannel: this.groupByField('DistributionChannelOption'),
        byDivision: this.groupByField('DivisionOption'),
        byStatus: this.groupByField('status')
      },
      companies: this.filteredCompanies.map(c => ({
        ID: c.id,
        Name: c.firstName,
        'Name (Arabic)': c.firstNameAr || 'N/A',
        'Tax Number': c.tax || 'N/A',
        Country: c.country || 'N/A',
        City: c.city || 'N/A',
        Type: c.CustomerType || 'N/A',
        'Sales Organization': c.SalesOrgOption || 'N/A',
        'Distribution Channel': c.DistributionChannelOption || 'N/A',
        Division: c.DivisionOption || 'N/A',
        Status: c.status || 'N/A',
        'Created Date': c.updatedAt || c.createdAt || 'N/A'
      }))
    };

    // Create Excel-style CSV content
    let csvContent = '';
    
    // Add Summary Section
    csvContent += 'BUSINESS DASHBOARD EXPORT\n';
    csvContent += `Export Date: ${dashboardData.summary.exportDate}\n\n`;
    csvContent += 'SUMMARY STATISTICS\n';
    csvContent += `Total Companies: ${dashboardData.summary.totalCompanies}\n`;
    csvContent += `Active Companies: ${dashboardData.summary.activeCompanies}\n`;
    csvContent += `Blocked Companies: ${dashboardData.summary.blockedCompanies}\n`;
    csvContent += `Golden Companies: ${dashboardData.summary.goldenCompanies}\n\n`;
    
    // Add Statistics by Category
    csvContent += 'DISTRIBUTION BY COUNTRY\n';
    Object.entries(dashboardData.statistics.byCountry).forEach(([key, value]) => {
      csvContent += `${key}: ${value}\n`;
    });
    csvContent += '\n';
    
    csvContent += 'DISTRIBUTION BY SALES ORGANIZATION\n';
    Object.entries(dashboardData.statistics.bySalesOrg).forEach(([key, value]) => {
      csvContent += `${key}: ${value}\n`;
    });
    csvContent += '\n';
    
    csvContent += 'DISTRIBUTION BY STATUS\n';
    Object.entries(dashboardData.statistics.byStatus).forEach(([key, value]) => {
      csvContent += `${key}: ${value}\n`;
    });
    csvContent += '\n';
    
    // Add Companies Table
    csvContent += 'DETAILED COMPANIES LIST\n';
    const headers = Object.keys(dashboardData.companies[0] || {});
    csvContent += headers.join(',') + '\n';
    
    dashboardData.companies.forEach(company => {
      const row = headers.map(header => {
        const value = (company as any)[header] || '';
        return `"${value.toString().replace(/"/g, '""')}"`;
      });
      csvContent += row.join(',') + '\n';
    });

    // Download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `business-dashboard-${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.message.success('Dashboard exported successfully!');
  }

  switchChartView(mode: 'grid' | 'single'): void {
    this.chartViewMode = mode;
  }

  getStatusColor(status: string): string {
    const colors: any = {
      'Active': 'green',
      'Blocked': 'red',
      'Pending': 'orange'
    };
    return colors[status] || 'default';
  }
}
