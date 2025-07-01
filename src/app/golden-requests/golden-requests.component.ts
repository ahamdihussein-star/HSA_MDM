import { Component } from '@angular/core';

@Component({
  selector: 'app-golden-requests',
  templateUrl: './golden-requests.component.html',
  styleUrl: './golden-requests.component.scss'
})
export class GoldenRequestsComponent {
  goldenRequests: any[] = [
    {
      id: 1,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      date: "14Dec, 2024",
    },
    {
      id: 2,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      date: "14Dec, 2024",
    },
    {
      id: 3,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      date: "14Dec, 2024",
    },
    {
      id: 4,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      date: "14Dec, 2024",
    },
    {
      id: 5,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      date: "14Dec, 2024",
    },
    {
      id: 6,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      date: "14Dec, 2024",
    },
    {
      id: 7,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      date: "14Dec, 2024",
    },
    {
      id: 8,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      date: "14Dec, 2024",
    },
    {
      id: 9,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      date: "14Dec, 2024",
    },
  ];

  setOfCheckedId = new Set<number>();
  checked = false;
  indeterminate = false;
  statusCount: Record<string, number> = {};

  user =''
  constructor() { }
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
mixedStatuses() {
  return Object.values(this.statusCount).some(value => value);
}

  deleteRecodr(index: number): void {
    // This method will delete a record from the quarantined requests
    this.goldenRequests.splice(index, 1);
    this.goldenRequests = [...this.goldenRequests]; // Trigger change detection


  }

  onAllChecked(value: boolean): void {
    this.goldenRequests.forEach(item => this.updateCheckedSet(item.id, item.status, value));
    this.refreshCheckedStatus();
  }

  refreshCheckedStatus(): void {
    this.checked = this.goldenRequests.every(item => this.setOfCheckedId.has(item.id));
    this.indeterminate = this.goldenRequests.some(item => this.setOfCheckedId.has(item.id)) && !this.checked;
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
    const selectedItems = this.goldenRequests.filter(item =>
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
    this.user = localStorage.getItem('user') || '2';
  }
}
