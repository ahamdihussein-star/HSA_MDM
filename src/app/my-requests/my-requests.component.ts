import { Component } from "@angular/core";
import { Router } from "@angular/router";

@Component({
  selector: "app-my-requests",
  templateUrl: "./my-requests.component.html",
  styleUrl: "./my-requests.component.scss",
})
export class MyRequestsComponent {
 // This will hold the quarantined requests data

   CustomerRequests: any[] = [
    {
      id: 1,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Pending",
      RecordIdentifier: "Pepsi",
    },
    {
      id: 2,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Approved",
      RecordIdentifier: "Marzoq & his sons",
    },
    {
      id: 3,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Rejected",
      RecordIdentifier: "Pepsi",
    },
    {
      id: 4,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Approved",
      RecordIdentifier: "Marzoq & his sons",
    },
    {
      id: 5,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Rejected",
      RecordIdentifier: "Pepsi",
    },
    {
      id: 6,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Pending",
      RecordIdentifier: "Marzoq & his sons",
    },
    {
      id: 7,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Approved",
      RecordIdentifier: "Pepsi",
    },
    {
      id: 8,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Rejected",
      RecordIdentifier: "Marzoq & his sons",
    },
    {
      id: 9,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Approved",
      RecordIdentifier: "Pepsi",
    },
  ]; //
   ProductRequests: any[] = [
    {
      id: 1,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Pending",
      RecordIdentifier: "Pepsi",
    },
    {
      id: 2,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Approved",
      RecordIdentifier: "Marzoq & his sons",
    },
    {
      id: 3,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Rejected",
      RecordIdentifier: "Pepsi",
    },
    {
      id: 4,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Pending",
      RecordIdentifier: "Marzoq & his sons",
    },
    {
      id: 5,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Quarantined",
      RecordIdentifier: "Pepsi",
    },
    {
      id: 6,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Pending",
      RecordIdentifier: "Marzoq & his sons",
    },
    {
      id: 7,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Approved",
      RecordIdentifier: "Pepsi",
    },
    {
      id: 8,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Rejected",
      RecordIdentifier: "Marzoq & his sons",
    },
    {
      id: 9,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Approved",
      RecordIdentifier: "Pepsi",
    },
  ]; //
   SupplierRequests: any[] = [
    {
      id: 1,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Pending",
      RecordIdentifier: "Pepsi",
    },
    {
      id: 2,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Approved",
      RecordIdentifier: "Marzoq & his sons",
    },
    {
      id: 3,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Rejected",
      RecordIdentifier: "Pepsi",
    },
    {
      id: 4,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Pending",
      RecordIdentifier: "Marzoq & his sons",
    },
    {
      id: 5,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Quarantined",
      RecordIdentifier: "Pepsi",
    },
    {
      id: 6,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Pending",
      RecordIdentifier: "Marzoq & his sons",
    },
    {
      id: 7,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Approved",
      RecordIdentifier: "Pepsi",
    },
    {
      id: 8,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Rejected",
      RecordIdentifier: "Marzoq & his sons",
    },
    {
      id: 9,
      requestId: "CR-2023-0456",
      name: "Salma Mustafa",
      submittedBy: "User A",
      status: "Approved",
      RecordIdentifier: "Pepsi",
    },
  ]; //

  AllRequests: any[]= [
     ...this.CustomerRequests,
    ...this.ProductRequests,
    ...this.SupplierRequests,
  ]


 setOfCheckedIds: Record<string, Set<number>> = {
  all: new Set<number>(),
  customer: new Set<number>(),
  product: new Set<number>(),
  supplier: new Set<number>()
};

checkedStates: Record<string, boolean> = {
  all: false,
  customer: false,
  product: false,
  supplier: false
};

indeterminateStates: Record<string, boolean> = {
  all: false,
  customer: false,
  product: false,
  supplier: false
};
setOfCheckedId = new Set<number>();

statusCount: Record<string, number> = {};
 selectedIndex = 1;

  constructor(private router: Router) { }

  mixedStatuses() {
    return this.statusCount['Pending'] || this.statusCount['Quarantined'] || this.statusCount['Rejected'] || this.statusCount['Approved'];
  }

 deleteRecodr(index: number): void {
    // This method will delete a record from the quarantined requests
    if (this.selectedIndex === 0) {
      this.AllRequests.splice(index, 1);
      this.AllRequests = [...this.AllRequests]; // Trigger change detection
    } else if (this.selectedIndex === 1) {
      this.CustomerRequests.splice(index, 1);
      this.CustomerRequests = [...this.CustomerRequests]; // Trigger change detection
    } else if (this.selectedIndex === 2) {
      this.ProductRequests.splice(index, 1);
      this.ProductRequests = [...this.ProductRequests]; // Trigger change detection
    } else if (this.selectedIndex === 3) {
      this.SupplierRequests.splice(index, 1);
      this.SupplierRequests = [...this.SupplierRequests]; // Trigger change detection
    }
  }

  getCurrentTabKey(): string {
  return ['all', 'customer', 'product', 'supplier'][this.selectedIndex];
}

getCurrentTableData(): any[] {
  switch (this.selectedIndex) {
    case 0: return this.AllRequests;
    case 1: return this.CustomerRequests;
    case 2: return this.ProductRequests;
    case 3: return this.SupplierRequests;
    default: return [];
  }
}
  onAllChecked(value: boolean): void {
  const tabKey = this.getCurrentTabKey();
  const data = this.getCurrentTableData();
  const set = this.setOfCheckedIds[tabKey];

  data.forEach(item => {
    if (value) {
      set.add(item.id);
    } else {
      set.delete(item.id);
    }
  });

  this.refreshCheckedStatus();
}


refreshCheckedStatus(): void {
  const tabKey = this.getCurrentTabKey();
  const data = this.getCurrentTableData();
  const set = this.setOfCheckedIds[tabKey];

  const allChecked = data.every(item => set.has(item.id));
  const someChecked = data.some(item => set.has(item.id));

  this.checkedStates[tabKey] = allChecked;
  this.indeterminateStates[tabKey] = someChecked && !allChecked;

  // Update status count
  const selectedItems = data.filter(item => set.has(item.id));
  this.statusCount = selectedItems.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}


 onItemChecked(id: number, status: string, checked: boolean): void {
  const tabKey = this.getCurrentTabKey();
  const set = this.setOfCheckedIds[tabKey];

  if (checked) {
    set.add(id);
  } else {
    set.delete(id);
  }

  this.refreshCheckedStatus();
}


 updateCheckedSet(id: number, status: string, checked: boolean): void {
  // Add or remove the ID from the selected set
  if (checked) {
    this.setOfCheckedId.add(id);
  } else {
    this.setOfCheckedId.delete(id);
  }

  // Get current list of requests based on selected tab
  const selectedRequests = this.getCurrentTableData();

  // Filter the selected items for the current tab
  const selectedItems = selectedRequests.filter(item =>
    this.setOfCheckedId.has(item.id)
  );

  // Rebuild the status count object
  this.statusCount = selectedItems.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(this.statusCount);
}
  onTabChange(index: number): void {
    this.selectedIndex = index;
      this.refreshCheckedStatus();

  }


    viewOrEditRequest(id: number, status: string, canEdit: Boolean): void {
    this.router.navigate(["/dashboard/new-request", id], {
      queryParams: { edit: canEdit, status }
    });
  }
  ngOnInit(): void {
    // Initialization logic can go here
  }
}
