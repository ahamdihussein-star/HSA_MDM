

import { TranslateService } from "@ngx-translate/core";
import { Router } from '@angular/router';
import { Inject, PLATFORM_ID, Component, OnInit, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from "@angular/common";
import { NotificationService } from '../services/notification.service';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: "app-header",
  templateUrl: "./header.component.html",
  styleUrl: "./header.component.scss",
})
export class HeaderComponent implements OnInit, OnDestroy {
  lang: string = "";
  user: string = "";
  unreadCount: number = 0;
  private subscriptions: Subscription[] = [];

  constructor(
    private translate: TranslateService, 
    @Inject(PLATFORM_ID) private platformId: Object, 
    private router: Router,
    private notificationService: NotificationService
  ) {}

  switchLang(lang: string) {
    if (lang == "en") {
      this.translate.use("en");
      this.lang = "en";
      document.body.classList.add("ltr");
      document.body.classList.remove("rtl");
      document.documentElement.setAttribute("dir", "ltr");
      document.body.setAttribute("dir", "ltr");
      // Save to sessionStorage
      sessionStorage.setItem("language", "en");
    } else if (lang == "ar") {
      this.translate.use("ar");
      this.lang = "ar";
      document.body.classList.add("rtl");
      document.body.classList.remove("ltr");
      document.documentElement.setAttribute("dir", "rtl");
      document.body.setAttribute("dir", "rtl");
      // Save to sessionStorage
      sessionStorage.setItem("language", "ar");
    }
  }

  ngOnInit(): void {
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
    this.notificationService.reloadNotifications();
    this.user = localStorage.getItem("user") || "2";

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
