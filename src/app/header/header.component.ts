

import { TranslateService } from "@ngx-translate/core";
import { Router } from '@angular/router';
import { Inject, PLATFORM_ID, Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser } from "@angular/common";
import { NotificationService } from '../services/notification.service';
import { Observable, Subscription, fromEvent, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: "app-header",
  templateUrl: "./header.component.html",
  styleUrl: "./header.component.scss",
})
export class HeaderComponent implements OnInit, OnDestroy {
  lang: string = "";
  user: string = "";
  unreadCount: number = 0;
  userAvatarUrl: string | null = null;
  currentUser: any = null;
  private subscriptions: Subscription[] = [];
  private apiBase = 'http://localhost:3001/api';

  constructor(
    private translate: TranslateService, 
    @Inject(PLATFORM_ID) private platformId: Object, 
    private router: Router,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  switchLang(lang: string) {
    console.log(`🌐 [Header] Switching language to: ${lang}`);
    
    if (lang == "en") {
      this.translate.use("en");
      this.lang = "en";
      document.body.classList.add("ltr");
      document.body.classList.remove("rtl");
      document.documentElement.setAttribute("dir", "ltr");
      document.body.setAttribute("dir", "ltr");
      // Save to sessionStorage
      sessionStorage.setItem("language", "en");
      console.log(`✅ [Header] Switched to English`);
    } else if (lang == "ar") {
      this.translate.use("ar");
      this.lang = "ar";
      document.body.classList.add("rtl");
      document.body.classList.remove("ltr");
      document.documentElement.setAttribute("dir", "rtl");
      document.body.setAttribute("dir", "rtl");
      // Save to sessionStorage
      sessionStorage.setItem("language", "ar");
      console.log(`✅ [Header] Switched to Arabic`);
      
      // Test translation
      this.translate.get('Profile').subscribe((translation: string) => {
        console.log(`🔍 [Header] Profile translation: ${translation}`);
      });
    }
  }

  async ngOnInit(): Promise<void> {
    // Check sessionStorage first, then default to English
    const savedLang = sessionStorage.getItem("language");
    if (savedLang === "ar") {
      this.lang = "ar";
      this.translate.use("ar");
      document.body.classList.add("rtl");
      document.body.classList.remove("ltr");
      document.documentElement.setAttribute("dir", "rtl");
      document.body.setAttribute("dir", "rtl");
    } else {
      // Default to English
      this.lang = "en";
      this.translate.use("en");
      document.body.classList.add("ltr");
      document.body.classList.remove("rtl");
      document.documentElement.setAttribute("dir", "ltr");
      document.body.setAttribute("dir", "ltr");
      // Save default to sessionStorage
      sessionStorage.setItem("language", "en");
    }
    
    // Reload notifications for current user
    console.log(`📱 [Header] Loading notifications for current user: ${this.user}`);
    this.notificationService.reloadNotifications();
    this.user = localStorage.getItem("user") || "2";

    // Load current user data with avatar
    await this.loadCurrentUser();

    // Listen to runtime avatar updates
    if (isPlatformBrowser(this.platformId)) {
      const sub = fromEvent<CustomEvent>(window, 'userAvatarUpdated').subscribe((e: any) => {
        try {
          this.userAvatarUrl = e?.detail?.avatarUrl || this.userAvatarUrl;
          if (this.currentUser) {
            this.currentUser.avatarUrl = e?.detail?.avatarUrl || this.currentUser.avatarUrl;
          }
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        } catch {}
      });
      this.subscriptions.push(sub);
    }

    // Subscribe to notification count
    this.subscriptions.push(
      this.notificationService.getUnreadCount().subscribe(count => {
        this.unreadCount = count;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private async loadCurrentUser(): Promise<void> {
    try {
      const username = sessionStorage.getItem('username');
      
      if (username) {
        console.log('🔄 Header: Loading user data for:', username);
        
        // Get user data with avatar from API
        this.currentUser = await firstValueFrom(
          this.http.get(`${this.apiBase}/auth/me?username=${username}`)
        );
        
        // Ensure absolute URL for avatar
        if (this.currentUser?.avatarUrl && !this.currentUser.avatarUrl.startsWith('http')) {
          this.currentUser.avatarUrl = `http://localhost:3001${this.currentUser.avatarUrl}`;
        }
        
        // Set userAvatarUrl for backward compatibility
        this.userAvatarUrl = this.currentUser?.avatarUrl || null;
        
        console.log('✅ Header: User loaded with avatar:', this.currentUser?.avatarUrl);
      }
    } catch (error) {
      console.error('❌ Header: Error loading user:', error);
    }
  }

  onImageError(event: any): void {
    console.error('❌ Header: Image failed to load:', event.target.src);
    console.error('❌ Header: Current user avatarUrl:', this.currentUser?.avatarUrl);
  }

  onImageLoad(event: any): void {
    console.log('✅ Header: Image loaded successfully:', event.target.src);
  }


  /** ====== AUTO-ADDED NAV HELPERS ====== */
  private getRowId(row: any): string {
    return ((row?.requestId ?? row?.id ?? row?.key ?? row?.RequestId ?? '') + '');
  }

  /** Open details page; editable=true opens edit mode, false opens view */
  viewOrEditRequest(row: any, editable: boolean): void {
    const id = this.getRowId(row);
    if (!id) return;
    this.router?.navigate(['/new-request', id], {
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

}
