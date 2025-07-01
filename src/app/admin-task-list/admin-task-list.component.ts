import { Component, ViewEncapsulation, } from '@angular/core';
import { NzNotificationService } from "ng-zorro-antd/notification";
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: 'app-admin-task-list',
  templateUrl: './admin-task-list.component.html',
  styleUrl: './admin-task-list.component.scss',
  encapsulation: ViewEncapsulation.None,

})
export class AdminTaskListComponent {
  taskList: any[] = [
    {
      id: 1,
      requestId: "CR-2023-0456",
      date: "14Dec, 2024",
      status: "Pending",
      requestType: "product",
    },
    {
      id: 2,
      requestId: "CR-2023-0456",
      date: "14Dec, 2024",
      status: "Quarantined",
      requestType: "customer",
    },
    {
      id: 3,
      requestId: "CR-2023-0456",
      date: "14Dec, 2024",
      status: "Pending",
      requestType: "suppliers",
    },
    {
      id: 4,
      requestId: "CR-2023-0456",
      date: "14Dec, 2024",
      status: "Quarantined",
      requestType: "product",
    },
    {
      id: 5,
      requestId: "CR-2023-0456",
      date: "14Dec, 2024",
      status: "Pending",
      requestType: "customer",
    },
    {
      id: 6,
      requestId: "CR-2023-0456",
      date: "14Dec, 2024",
      status: "Pending",
      requestType: "suppliers",
    },
    {
      id: 7,
      requestId: "CR-2023-0456",
      date: "14Dec, 2024",
      status: "Quarantined",
      requestType: "product",
    },
    {
      id: 8,
      requestId: "CR-2023-0456",
      date: "14Dec, 2024",
      status: "Pending",
      requestType: "customer",
    },
    {
      id: 9,
      requestId: "CR-2023-0456",
      date: "14Dec, 2024",
      status: "Quarantined",
      requestType: "suppliers",
    },
  ];
  isRejectedConfirmVisible: any;
  // This will hold the quarantined requests data
  setOfCheckedId = new Set<number>();
  checked = false;
  indeterminate = false;
  isApprovedVisible = false;
  isRejectedVisible = false;
  approvedChecked = true;
  rejectedChecked = true;
  inputValue?: string;
  selectedStatuses: string[] = [];
  statusCount: Record<string, number> = {};

  constructor(
    private notification: NzNotificationService,
    private translate: TranslateService,

  ) { }


  handleAction(action: string, item: any): void {
    switch (action) {
      case 'view':
        console.log('View clicked', item);
        break;
      case 'edit':
        console.log('Edit clicked', item);
        break;
      case 'delete':
        console.log('Delete clicked', item);
        break;
    }
  }

  showApproveModal(): void {
    this.isApprovedVisible = true;
  }
  showRejectedModal(): void {
    this.isRejectedVisible = true;
  }

  handleOk(): void {
    console.log('Button ok clicked!');
    this.isApprovedVisible = false;
    this.isRejectedVisible = false;
    this.isRejectedConfirmVisible = false
    this.inputValue = '';

  }
  submitApprove() {
    this.isApprovedVisible = false;
    let toastMessage: string = "New Request is added successfully";
    this.translate.get(toastMessage).subscribe((message: string) => {
      this.notification.create("success", message, "", {
        nzClass: "success-notification",
        nzDuration: 5000,
      });
    });
  }
  rejectApprove() {
    this.isRejectedConfirmVisible = false;
    let toastMessage: string = "New Request is rejected successfully";
    this.translate.get(toastMessage).subscribe((message: string) => {
      this.notification.create("success", message, "", {
        nzClass: "success-notification",
        nzDuration: 5000,
      });
    });
  }
  handleCancel(): void {
    console.log('Button cancel clicked!');
    this.isApprovedVisible = false;
    this.isRejectedVisible = false;
    this.isRejectedConfirmVisible = false
    this.inputValue = '';

  }
  confirmReject(): void {
    this.isRejectedVisible = false
    this.isRejectedConfirmVisible = true;
    this.inputValue = '';
  }

  onAllChecked(value: boolean): void {
    this.taskList.forEach(item => this.updateCheckedSet(item.id, item.status, value));
    this.refreshCheckedStatus();
  }

  refreshCheckedStatus(): void {
    this.checked = this.taskList.every(item => this.setOfCheckedId.has(item.id));
    this.indeterminate = this.taskList.some(item => this.setOfCheckedId.has(item.id)) && !this.checked;
  }

  onItemChecked(id: number, status: any, checked: boolean): void {
    this.updateCheckedSet(id, status, checked);
    this.refreshCheckedStatus();
  }

  updateCheckedSet(id: number, status: string, checked: boolean): void {
    if (checked) {
      this.setOfCheckedId.add(id);
    } else {
      this.setOfCheckedId.delete(id);
    }

    // Filter selected items
    const selectedItems = this.taskList.filter(item =>
      this.setOfCheckedId.has(item.id)
    );

    // Build the count object
    this.statusCount = selectedItems.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(this.statusCount);

  }

  onlyPending() {
    return this.statusCount['Pending'] && !this.statusCount['Quarantined'];
  }

  onlyQuarantined() {
    return this.statusCount['Quarantined'] && !this.statusCount['Pending'];
  }

  mixedStatuses() {
    return this.statusCount['Pending'] && this.statusCount['Quarantined'];
  }




  deleteRecodr(index: number): void {
    // This method will delete a record from the quarantined requests
    this.taskList.splice(index, 1);
    this.taskList = [...this.taskList]; // Trigger change detection
  }

  ngOnInit(): void {
    // Initialization logic can go here
  }
}
