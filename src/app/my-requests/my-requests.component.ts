import { Component } from "@angular/core";
import { Router } from "@angular/router";

@Component({
  selector: "app-my-requests",
  templateUrl: "./my-requests.component.html",
  styleUrl: "./my-requests.component.scss",
})
export class MyRequestsComponent {
  myRequests: any[] = [
    {
      id: 1,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      status: "Pending",
      RecordIdentifier: "Pepsi",
    },
    {
      id: 2,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      status: "Approved",
      RecordIdentifier: "Marzoq & his sons",
    },
    {
      id: 3,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      status: "Rejected",
      RecordIdentifier: "Pepsi",
    },
    {
      id: 4,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      status: "Pending",
      RecordIdentifier: "Marzoq & his sons",
    },
    {
      id: 5,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      status: "Quarantined",
      RecordIdentifier: "Pepsi",
    },
    {
      id: 6,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      status: "Pending",
      RecordIdentifier: "Marzoq & his sons",
    },
    {
      id: 7,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      status: "Approved",
      RecordIdentifier: "Pepsi",
    },
    {
      id: 8,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      status: "Rejected",
      RecordIdentifier: "Marzoq & his sons",
    },
    {
      id: 9,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      status: "Approved",
      RecordIdentifier: "Pepsi",
    },
  ]; // This will hold the quarantined requests data

  checked = false;
  indeterminate = false;
  setOfCheckedId = new Set<number>();
  statusCount: Record<string, number> = {};

  constructor(private router: Router) { }

  mixedStatuses() {
    return this.statusCount['Pending'] || this.statusCount['Quarantined'] || this.statusCount['Rejected'] || this.statusCount['Approved'];
  }

  deleteRecodr(index: number): void {
    // This method will delete a record from the quarantined requests
    this.myRequests.splice(index, 1);
    this.myRequests = [...this.myRequests];
  }

  viewOrEditRequest(id: number, status: string, canEdit: Boolean): void {
    this.router.navigate(["/dashboard/new-request", id], {
      queryParams: { edit: canEdit, status }
    });
  }

  onAllChecked(value: boolean): void {
    this.myRequests.forEach(item => this.updateCheckedSet(item.id, item.status, value));
    this.refreshCheckedStatus();
  }

  refreshCheckedStatus(): void {
    this.checked = this.myRequests.every(item => this.setOfCheckedId.has(item.id));
    this.indeterminate = this.myRequests.some(item => this.setOfCheckedId.has(item.id)) && !this.checked;
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
    const selectedItems = this.myRequests.filter(item =>
      this.setOfCheckedId.has(item.id)
    );

    // Build the count object
    this.statusCount = selectedItems.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(this.statusCount);

  }

  ngOnInit(): void {
    // Initialization logic can go here
  }
}
