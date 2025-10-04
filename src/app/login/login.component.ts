import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NzMessageService } from 'ng-zorro-antd/message';
import { environment } from '../../environments/environment';

import { RoleService } from '../Core/role.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  private apiBase = environment.apiBaseUrl || 'http://localhost:3000/api';

  constructor(
    private fb: FormBuilder, 
    private route: ActivatedRoute, 
    public router: Router, 
    private roles: RoleService,
    private http: HttpClient,
    private message: NzMessageService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      username: [null, [Validators.required]],
      password: ['', Validators.required]
    });

    this.clearSession();
  }

  private clearSession(): void {
    // Clear both localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
  }

  private isDemoAdmin(username: string): boolean {
    const u = (username || '').trim().toLowerCase();
    const demoAdminUsernames = ['demo-admin', 'demoadmin', 'demo_admin', 'admin'];
    return demoAdminUsernames.includes(u);
  }

  async onSubmit(): Promise<void> {
    if (!this.loginForm.valid) {
      Object.values(this.loginForm.controls).forEach(c => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    const username = (this.loginForm.value.username || '').trim();
    const password = this.loginForm.value.password;

    // Check for demo admin first (offline mode)
    if (this.isDemoAdmin(username) && password === 'admin123') {
      sessionStorage.setItem('username', 'admin');
      sessionStorage.setItem('user', '4');  // رقم مختلف عن 1,2,3
      sessionStorage.setItem('userRole', 'admin');
      sessionStorage.setItem('isDemoAdmin', '1');
      sessionStorage.setItem('loginEmail', 'admin@system.com');
      sessionStorage.setItem('userFullName', 'System Administrator');
      
      this.message.success('Welcome System Administrator!');
      
      // ✅ Reload notifications for admin user
      console.log(`🔐 [Login] Demo Admin logged in successfully, reloading notifications`);
      this.notificationService.reloadNotifications();
      
      await this.router.navigateByUrl('/dashboard/data-management');
      return;
    }

    // Real API login
    this.loading = true;
    
    try {
      const response = await this.http.post<{
        success?: boolean;
        user: {
          id: number;
          username: string;
          role: string;
          fullName: string;
          email: string;
        };
        token: string;
        redirectTo?: string;
      }>(`${this.apiBase}/login`, { username, password }).toPromise();

      if (response && response.user) {
        // Store everything in sessionStorage for current session
        sessionStorage.setItem('userId', response.user.id.toString());
        sessionStorage.setItem('username', response.user.username);
        sessionStorage.setItem('userRole', response.user.role);
        sessionStorage.setItem('userFullName', response.user.fullName);
        sessionStorage.setItem('loginEmail', response.user.email);
        sessionStorage.setItem('authToken', response.token);

        // ===== Avatar handling =====
        try {
          // 1) If login API returned avatarUrl, use it
          let avatarUrl: string | null = (response as any).avatarUrl || (response.user as any).avatarUrl || null;
          if (!avatarUrl) {
            // 2) Fallback: fetch from local MDM API to get avatarUrl
            const mdmApi = 'http://localhost:3001/api';
            const me: any = await this.http
              .get(`${mdmApi}/auth/me`, { params: { username: response.user.username } })
              .toPromise();
            avatarUrl = me?.avatarUrl || null;
          }
          if (avatarUrl) {
            const absolute = avatarUrl.startsWith('http') ? avatarUrl : `http://localhost:3001${avatarUrl}`;
            sessionStorage.setItem('userAvatarUrl', absolute);
            // Notify header to refresh instantly
            window.dispatchEvent(new CustomEvent('userAvatarUpdated', { detail: { avatarUrl: absolute } }));
            console.log('✅ Login: Saved avatar to session:', absolute);
          }
        } catch (e) {
          console.warn('Avatar resolve skipped:', e);
        }

        // Map API roles to legacy user codes for backward compatibility
        let userCode = '1';
        let roleEnum = 'DATA_ENTRY';
        let targetRoute = '/dashboard/my-task';

        // Special case for manager user (stored as admin role but different username)
        if (response.user.username === 'manager') {
          sessionStorage.setItem('user', '5');
          sessionStorage.setItem('userRole', 'manager');
          sessionStorage.setItem('username', 'manager');
          this.message.success(`Welcome ${response.user.fullName}!`);
          
          // ✅ Reload notifications for manager user
          this.notificationService.reloadNotifications();
          
          await this.router.navigateByUrl('/dashboard/business');
          return;
        }

        switch (response.user.role) {
          case 'data_entry':
          case '1':
            userCode = '1';
            roleEnum = 'DATA_ENTRY';
            targetRoute = '/dashboard/my-task';
            break;
          case 'reviewer':
          case '2':
            userCode = '2';
            roleEnum = 'MASTER';
            targetRoute = '/dashboard/admin-task-list';
            break;
          case 'compliance':
          case '3':
            userCode = '3';
            roleEnum = 'COMPLIANCE';
            targetRoute = '/dashboard/compliance-task-list';
            break;
          case 'admin':
            // Admin منفصل تماماً - لا يستخدم RoleService
            sessionStorage.setItem('user', '4');
            sessionStorage.setItem('userRole', 'admin');
            this.message.success(`Welcome ${response.user.fullName}!`);
            
            // ✅ Reload notifications for admin user
            this.notificationService.reloadNotifications();
            
            await this.router.navigateByUrl('/dashboard/data-management');
            return;  // نخرج مباشرة بدون استخدام RoleService
          case 'manager':
            // Manager منفصل - يروح للـ Business Dashboard
            sessionStorage.setItem('user', '5');
            sessionStorage.setItem('userRole', 'manager');
            sessionStorage.setItem('username', 'manager');
            this.message.success(`Welcome ${response.user.fullName}!`);
            
            // ✅ Reload notifications for manager user
            this.notificationService.reloadNotifications();
            
            await this.router.navigateByUrl('/dashboard/business');
            return;  // نخرج مباشرة بدون استخدام RoleService
          default:
            console.warn('Unknown role:', response.user.role);
            userCode = '1';
            roleEnum = 'DATA_ENTRY';
            targetRoute = '/dashboard/my-task';
        }

        // Use API redirectTo if provided (for non-admin users)
        if (response.redirectTo) {
          targetRoute = response.redirectTo;
        }

        // Store the user code for backward compatibility (non-admin users only)
        sessionStorage.setItem('user', userCode);
        this.roles.setRole(roleEnum as any);

        this.message.success(`Welcome ${response.user.fullName}!`);
        
        // ✅ Reload notifications for new user
        console.log(`🔐 [Login] User logged in successfully, reloading notifications for user: ${userCode}`);
        this.notificationService.reloadNotifications();
        
        // Navigate to appropriate dashboard
        const navigationSuccess = await this.router.navigateByUrl(targetRoute);
        
        if (!navigationSuccess) {
          // Fallback to dashboard root
          await this.router.navigateByUrl('/dashboard');
        }
        
      } else {
        this.message.error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.status === 401) {
        this.message.error('Invalid username or password');
      } else if (error.status === 0) {
        this.message.error('Cannot connect to server. Please make sure the API server is running.');
      } else {
        this.message.error('Login failed. Please try again.');
      }
    } finally {
      this.loading = false;
    }
  }
}