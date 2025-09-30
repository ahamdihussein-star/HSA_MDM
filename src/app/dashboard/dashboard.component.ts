// src/app/dashboard/dashboard.component.ts

import { isPlatformBrowser } from "@angular/common";
import { Router } from '@angular/router';
import { Inject, PLATFORM_ID, Component, ViewEncapsulation, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Component({
  selector: "app-dashboard",
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class DashboardComponent implements OnInit {
  // API configuration
  private apiBase = environment.apiBaseUrl || 'http://localhost:3000/api';
  
  // User role - no localStorage dependency
  user: string = "1"; // Default to data_entry initially
  currentUser: any = null;
  isDemoAdmin: boolean = false;
  isAdmin: boolean = false; // للـ admin user الجديد
  isManager: boolean = false; // للـ manager user الجديد
  isLoading: boolean = false;
  
  // Dashboards section state
  dashboardsExpanded: boolean = false;
  
  // Historical Extracted Data section state
  historicalDataExpanded: boolean = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    public router: Router,
    private http: HttpClient
  ) {}

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    
    // Get current user from API or session
    await this.getCurrentUser();
  }

  private async getCurrentUser(): Promise<void> {
    try {
      this.isLoading = true;
      
      // احصل على البيانات من sessionStorage
      const username = sessionStorage.getItem('username');
      const userRole = sessionStorage.getItem('userRole');
      
      console.log('Session Data:', { username, userRole });
      
      // إذا كان manager user
      if (username === 'manager') {
        this.user = '5';
        this.isManager = true;
        this.isAdmin = false;
        this.currentUser = { username: 'manager', role: 'manager' };
        console.log('Set as Manager user');
        
        // Redirect manager to business dashboard if on default route
        if (this.router.url === '/dashboard' || this.router.url === '/dashboard/') {
          this.router.navigate(['/dashboard/business']);
        }
        return;
      }

      // إذا كان reviewer user
      if (username === 'reviewer') {
        this.user = '2';
        this.currentUser = { username: 'reviewer', role: 'reviewer' };
        console.log('Set as Reviewer user');
        
        // Redirect reviewer away from home dashboard
        if (this.router.url === '/dashboard/home') {
          this.router.navigate(['/dashboard/admin-task-list']);
        }
      }
      
      // إذا كان admin user
      if (userRole === 'admin' || username === 'admin') {
        this.user = '4';
        this.isAdmin = true;
        this.currentUser = { username: 'admin', role: 'admin' };
        console.log('Set as Admin user');
        return;
      }
      
      // إذا كان لدينا username، استخدمه مباشرة ولا تحتاج API
      if (username) {
        switch(username) {
          case 'compliance':
            this.user = '3';
            this.currentUser = { username: 'compliance', role: 'compliance' };
            console.log('Set as Compliance user');
            return;
            
          case 'reviewer':
            this.user = '2';
            this.currentUser = { username: 'reviewer', role: 'reviewer' };
            console.log('Set as Reviewer user');
            return;
            
          case 'data_entry':
            this.user = '1';
            this.currentUser = { username: 'data_entry', role: 'data_entry' };
            console.log('Set as Data Entry user');
            return;
            
          case 'admin':
            this.user = '4';
            this.isAdmin = true;
            this.currentUser = { username: 'admin', role: 'admin' };
            console.log('Set as Admin user');
            return;
            
          case 'manager':
            this.user = '5';
            this.isManager = true;
            this.isAdmin = false; // Manager is NOT admin
            this.currentUser = { username: 'manager', role: 'manager' };
            console.log('Set as Manager user');
            
            // Redirect manager to business dashboard if on default route
            if (this.router.url === '/dashboard' || this.router.url === '/dashboard/') {
              this.router.navigate(['/dashboard/business']);
            }
            return;
        }
      }
      
      // فقط إذا لم نجد username، حاول API
      const authToken = sessionStorage.getItem('authToken');
      let headers = new HttpHeaders();
      if (authToken) {
        headers = headers.set('Authorization', `Bearer ${authToken}`);
      }
      
      const url = username 
        ? `${this.apiBase}/auth/me?username=${username}`
        : `${this.apiBase}/auth/me`;
      
      try {
        const user = await firstValueFrom(
          this.http.get<any>(url, { headers })
        );
        
        if (user) {
          this.currentUser = user;
          this.mapUserRole(user.role);
        }
      } catch (apiError) {
        // API فشل، لكن لدينا username من sessionStorage
        console.log('API failed but we already set user from session');
      }
      
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      // فقط كـ last resort
      this.determineUserFromRoute();
    } finally {
      this.isLoading = false;
    }
  }

  private mapUserRole(role: string): void {
    // Map API role to dashboard role codes
    console.log('Mapping role:', role);
    
    if (role === 'data_entry' || role === '1') {
      this.user = '1';
    } else if (role === 'reviewer' || role === 'master' || role === '2') {
      this.user = '2';
      // Redirect reviewer away from home dashboard
      if (this.router.url === '/dashboard/home') {
        this.router.navigate(['/dashboard/admin-task-list']);
      }
    } else if (role === 'compliance' || role === '3') {
      this.user = '3';
    } else if (role === 'admin' || role === '4') {
      this.user = '4';
      this.isAdmin = true;
    } else if (role === 'demo-admin') {
      this.user = 'demo-admin';
      this.isDemoAdmin = true;
    } else {
      // Default based on what user logged in as
      const username = sessionStorage.getItem('username');
      if (username) {
        this.mapUsernameToRole(username);
      } else {
        this.user = '1'; // Default to data_entry
      }
    }
  }

  private mapUsernameToRole(username: string): void {
    // Map username to role directly
    console.log('Mapping username to role:', username);
    
    switch(username) {
      case 'data_entry':
        this.user = '1';
        this.currentUser = { username: 'data_entry', role: 'data_entry' };
        break;
      case 'reviewer':
        this.user = '2';
        this.currentUser = { username: 'reviewer', role: 'reviewer' };
        // Redirect reviewer away from home dashboard
        if (this.router.url === '/dashboard/home') {
          this.router.navigate(['/dashboard/admin-task-list']);
        }
        break;
      case 'compliance':
        this.user = '3';
        this.currentUser = { username: 'compliance', role: 'compliance' };
        break;
      case 'admin':
        this.user = '4';
        this.isAdmin = true;
        this.currentUser = { username: 'admin', role: 'admin' };
        break;
      case 'manager':
        this.user = '5';
        this.isManager = true;
        this.isAdmin = false;
        this.currentUser = { username: 'manager', role: 'manager' };
        // Redirect to business dashboard
        if (this.router.url === '/dashboard' || this.router.url === '/dashboard/') {
          this.router.navigate(['/dashboard/business']);
        }
        break;
      case 'demo-admin':
        this.user = 'demo-admin';
        this.isDemoAdmin = true;
        this.currentUser = { username: 'admin', role: 'admin' };
        break;
      default:
        // Try to guess from URL
        this.determineUserFromRoute();
    }
  }

  private determineUserFromRoute(): void {
    // Check if there's any context from route
    const url = this.router.url;
    console.log('Determining user from route:', url);
    
    if (url.includes('my-task-list')) {
      // my-task-list is for data_entry
      this.user = '1';
      this.currentUser = { role: 'data_entry' };
    } else if (url.includes('admin-task-list')) {
      // admin-task-list is for reviewer
      this.user = '2';
      this.currentUser = { role: 'reviewer' };
    } else if (url.includes('compliance-task-list')) {
      this.user = '3';
      this.currentUser = { role: 'compliance' };
    } else if (url.includes('data-management')) {
      this.user = '4';
      this.isAdmin = true;
      this.currentUser = { role: 'admin' };
    } else if (url.includes('demo-admin')) {
      this.user = 'demo-admin';
      this.isDemoAdmin = true;
      this.currentUser = { role: 'admin' };
    } else {
      // Default to data_entry
      this.user = '1';
      this.currentUser = { role: 'data_entry' };
    }
  }

  // Navigate to login page if needed
  navigateToLogin(): void {
    // Clear session data
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }

  // Logout method
  async logout(): Promise<void> {
    try {
      // Clear session data
      sessionStorage.clear();
      
      // Optional: Call logout API if exists
      // await firstValueFrom(this.http.post(`${this.apiBase}/logout`, {}));
      
      // Navigate to login
      this.navigateToLogin();
    } catch (error) {
      console.error('Logout error:', error);
      // Navigate to login anyway
      this.navigateToLogin();
    }
  }

  // Get user role for display
  getUserRoleName(): string {
    // Use currentUser if available, otherwise use role mapping
    if (this.currentUser?.role) {
      switch(this.currentUser.role) {
        case 'data_entry': return 'Data Entry';
        case 'reviewer': return 'Reviewer';
        case 'compliance': return 'Compliance';
        case 'admin': return 'System Administrator';
        case 'manager': return 'Business Manager';
      }
    }
    
    // Fallback to user code
    switch(this.user) {
      case '1': return 'Data Entry';
      case '2': return 'Reviewer';
      case '3': return 'Compliance';
      case '4': return 'System Administrator';
      case '5': return 'Business Manager';
      case 'demo-admin': return 'Demo Administrator';
      default: return 'User';
    }
  }

  // Check permissions
  canAccessDataEntry(): boolean {
    return this.user === '1' || this.user === 'demo-admin' || this.isAdmin;
  }

  canAccessReviewer(): boolean {
    return this.user === '2' || this.user === 'demo-admin' || this.isAdmin;
  }

  canAccessCompliance(): boolean {
    return this.user === '3' || this.user === 'demo-admin' || this.isAdmin;
  }

  canAccessAdmin(): boolean {
    return this.user === 'demo-admin' || this.isAdmin;
  }

  canAccessDataManagement(): boolean {
    return this.user === '4' || this.isAdmin || this.user === 'demo-admin';
  }

  /** ====== AUTO-ADDED NAV HELPERS ====== */
  private getRowId(row: any): string {
    return ((row?.requestId ?? row?.id ?? row?.key ?? row?.RequestId ?? '') + '');
  }

  /** Open details page with proper context based on user role */
  viewOrEditRequest(row: any, editable: boolean): void {
    const id = this.getRowId(row);
    if (!id) return;
    
    // Navigate with proper context
    this.router?.navigate(['/new-request', id], {
      queryParams: { 
        mode: editable ? 'edit' : 'view',
        userRole: this.getUserApiRole(),
        from: 'dashboard'
      },
    });
  }

  // Get API role format
  private getUserApiRole(): string {
    // Use currentUser if available
    if (this.currentUser?.role) {
      return this.currentUser.role;
    }
    
    // Fallback to mapping
    switch(this.user) {
      case '1': return 'data_entry';
      case '2': return 'reviewer';
      case '3': return 'compliance';
      case '4': return 'admin';
      case 'demo-admin': return 'admin';
      default: return 'data_entry';
    }
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
  onItemChecked(id: any, event: any): void {}

  // Toggle dashboards section
  toggleDashboardsSection(): void {
    this.dashboardsExpanded = !this.dashboardsExpanded;
  }

  toggleHistoricalDataSection(): void {
    this.historicalDataExpanded = !this.historicalDataExpanded;
  }
}