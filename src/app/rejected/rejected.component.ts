

import { Component } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-rejected',
  templateUrl: './rejected.component.html',
  styleUrl: './rejected.component.scss'
})
export class RejectedComponent {
   selectedIndex = 1;
  CustomerRecords: any[] = [
  { id: 1, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024", status:'Pending' },
  { id: 2, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024" , status:'Updated'},
  { id: 3, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024" , status:'Pending'},
  { id: 4, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" , status:'Updated'},
  { id: 5, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" , status:'Updated'},
  { id: 6, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024" , status:'Pending'},
  { id: 7, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" , status:'Pending'},
  { id: 8, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024" , status:'Updated'},
  { id: 9, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" , status:'Pending'}
];

 ProductRecords: any[] = [
  { id: 1, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" , status:'Pending'},
  { id: 2, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024" , status:'Updated'},
  { id: 3, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024" , status:'Pending'},
  { id: 4, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" , status:'Updated'},
  { id: 5, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" , status:'Updated'},
  { id: 6, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024" , status:'Pending'},
  { id: 7, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" , status:'Pending'},
  { id: 8, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024" , status:'Updated'},
  { id: 9, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" , status:'Pending'}
];
 SupplierRecords: any[] = [
  { id: 1, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" , status:'Updated'},
  { id: 2, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024" , status:'Pending'},
  { id: 3, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024", status:'Updated' },
  { id: 4, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" , status:'Updated'},
  { id: 5, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" , status:'Pending'},
  { id: 6, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024", status:'Pending'},
  { id: 7, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" , status:'Updated'},
  { id: 8, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024" , status:'Pending'},
  { id: 9, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" , status:'Pending'}
];
AllRecords:any[]=[
   ...this.CustomerRecords,
    ...this.ProductRecords,
    ...this.SupplierRecords,
]

user:any= ''

constructor(public router: Router){

}

  onTabChange(index: number): void {
    this.selectedIndex = index;

  }

     viewOrEditRequest(id: number, status: string, canEdit: Boolean): void {
    this.router.navigate(["/dashboard/new-request", id], {
      queryParams: { edit: canEdit, status }
    });
  }
   ngOnInit(): void {
    this.user = localStorage.getItem("user") || "2";
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
