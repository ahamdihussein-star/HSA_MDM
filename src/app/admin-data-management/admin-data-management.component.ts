import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { NzModalService } from 'ng-zorro-antd/modal';

interface DataStats {
  duplicateRecords: number;
  quarantineRecords: number;
  goldenRecords: number;
  totalRequests: number;
  pendingRequests: number;
}

@Component({
  selector: 'app-admin-data-management',
  templateUrl: './admin-data-management.component.html',
  styleUrls: ['./admin-data-management.component.scss']
})
export class AdminDataManagementComponent implements OnInit {
  
  private apiBase = environment.apiBaseUrl || 'http://localhost:3001/api';
  
  stats: DataStats = {
    duplicateRecords: 0,
    quarantineRecords: 0,
    goldenRecords: 0,
    totalRequests: 0,
    pendingRequests: 0
  };
  
  loading = false;
  showConfirmModal = false;
  confirmPassword = '';
  
  constructor(
    private http: HttpClient,
    private router: Router,
    private modal: NzModalService
  ) {}
  
  ngOnInit(): void {
    this.loadStats();
  }
  
  async loadStats(): Promise<void> {
    this.loading = true;
    try {
      const response = await firstValueFrom(
        this.http.get<any>(`${this.apiBase}/requests/admin/data-stats`)
      );
      
      if (response.success) {
        this.stats = response.stats;
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      // Use mock data if API fails
      this.stats = {
        duplicateRecords: 0,
        quarantineRecords: 0,
        goldenRecords: 0,
        totalRequests: 0,
        pendingRequests: 0
      };
    } finally {
      this.loading = false;
    }
  }
  
  openConfirmModal(): void {
    this.modal.confirm({
      nzTitle: '⚠️ Confirm Data Deletion',
      nzContent: `
        <div style="color: #ff4d4f; margin-bottom: 10px;">
          <strong>This will permanently delete ALL data!</strong>
        </div>
        <ul style="margin: 10px 0;">
          <li>All duplicate records (${this.stats.duplicateRecords})</li>
          <li>All quarantine records (${this.stats.quarantineRecords})</li>
          <li>All golden records (${this.stats.goldenRecords})</li>
          <li>All requests (${this.stats.totalRequests})</li>
        </ul>
        <p style="color: #8c8c8c;">Users will NOT be deleted.</p>
        <p style="margin-top: 15px;"><strong>Type "DELETE ALL" to confirm:</strong></p>
      `,
      nzOkText: 'Delete All Data',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'Cancel',
      nzOnOk: () => this.confirmClearAll()
    });
  }
  
  async confirmClearAll(): Promise<void> {
    const confirmText = prompt('Type "DELETE ALL" to confirm deletion of all data:');
    
    if (confirmText !== 'DELETE ALL') {
      this.modal.warning({
        nzTitle: 'Operation Cancelled',
        nzContent: 'Confirmation text does not match.'
      });
      return;
    }
    
    this.loading = true;
    
    try {
      const response = await firstValueFrom(
        this.http.delete<any>(`${this.apiBase}/requests/admin/clear-all`)
      );
      
      if (response.success) {
        this.modal.success({
          nzTitle: 'Success',
          nzContent: 'All data has been cleared successfully!'
        });
        await this.loadStats();
      }
    } catch (error) {
      console.error('Error clearing data:', error);
      this.modal.error({
        nzTitle: 'Error',
        nzContent: 'Failed to clear data. Please try again.'
      });
    } finally {
      this.loading = false;
    }
  }
  
  async clearSpecificData(dataType: string): Promise<void> {
    const typeLabels: any = {
      'duplicates': 'Duplicate Records',
      'quarantine': 'Quarantine Records',
      'golden': 'Golden Records',
      'requests': 'All Requests'
    };
    
    this.modal.confirm({
      nzTitle: `Clear ${typeLabels[dataType]}?`,
      nzContent: `This will permanently delete all ${typeLabels[dataType].toLowerCase()}.`,
      nzOkText: 'Delete',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'Cancel',
      nzOnOk: async () => {
        this.loading = true;
        try {
          const response = await firstValueFrom(
            this.http.delete<any>(`${this.apiBase}/requests/admin/clear-${dataType}`)
          );
          
          if (response.success) {
            this.modal.success({
              nzTitle: 'Success',
              nzContent: `${typeLabels[dataType]} cleared successfully!`
            });
            await this.loadStats();
          }
        } catch (error) {
          console.error(`Error clearing ${dataType}:`, error);
          this.modal.error({
            nzTitle: 'Error',
            nzContent: `Failed to clear ${typeLabels[dataType]}.`
          });
        } finally {
          this.loading = false;
        }
      }
    });
  }
  
  // Method جديدة لإنشاء بيانات Quarantine
  async generateQuarantineData(): Promise<void> {
    this.loading = true;
    try {
      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiBase}/requests/admin/generate-quarantine`, {})
      );
      
      if (response.success) {
        this.modal.success({
          nzTitle: 'Success',
          nzContent: `Generated ${response.recordIds.length} quarantine records`
        });
        await this.loadStats();
      }
    } catch (error) {
      console.error('Error generating quarantine data:', error);
      this.modal.error({
        nzTitle: 'Error',
        nzContent: 'Failed to generate quarantine data'
      });
    } finally {
      this.loading = false;
    }
  }

  // Method جديدة لإنشاء بيانات Duplicate
  async generateDuplicateData(): Promise<void> {
    this.loading = true;
    try {
      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiBase}/requests/admin/generate-duplicates`, {})
      );
      
      if (response.success) {
        this.modal.success({
          nzTitle: 'Success',
          nzContent: `Generated ${response.recordIds.length} duplicate records in ${response.groups} groups`
        });
        await this.loadStats();
      }
    } catch (error) {
      console.error('Error generating duplicate data:', error);
      this.modal.error({
        nzTitle: 'Error',
        nzContent: 'Failed to generate duplicate data'
      });
    } finally {
      this.loading = false;
    }
  }
  
  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  // Helper methods for professional display
  formatNumber(num: number): string {
    if (num === 0) return '0';
    return num.toLocaleString();
  }

  getFormattedTime(): string {
    return new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusClass(count: number): string {
    if (count === 0) return 'status-empty';
    if (count < 10) return 'status-low';
    if (count < 50) return 'status-medium';
    return 'status-high';
  }

  getStatusText(count: number, type: string): string {
    if (count === 0) return 'No records';
    
    const statusMap: { [key: string]: string } = {
      'duplicates': count === 1 ? '1 duplicate found' : `${count} duplicates found`,
      'quarantine': count === 1 ? '1 record in quarantine' : `${count} records in quarantine`,
      'golden': count === 1 ? '1 golden record' : `${count} golden records`,
      'requests': count === 1 ? '1 request total' : `${count} requests total`,
      'pending': count === 1 ? '1 request pending' : `${count} requests pending`
    };
    
    return statusMap[type] || `${count} records`;
  }

  getPendingPercentage(): number {
    if (this.stats.totalRequests === 0) return 0;
    return Math.round((this.stats.pendingRequests / this.stats.totalRequests) * 100);
  }
}