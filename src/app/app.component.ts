
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Component, OnInit, ViewEncapsulation, Inject, PLATFORM_ID } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent {
  title = 'master-data-mangment';
  constructor(@Inject(PLATFORM_ID) private platformId: Object, private router: Router ,
    private translate: TranslateService
  ) {}

  

   onActivate(event: any): void {
     if (isPlatformBrowser(this.platformId)) {
    window.scroll(0, 0);
    document.body.scrollTop = 0;
    }
  }
  ngOnInit(): void {
     if (isPlatformBrowser(this.platformId)) {
      // Start with English as default
      document.body.classList.add("ltr");
      document.body.classList.remove("rtl");
    }
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


