import { Component } from '@angular/core';

@Component({
  selector: 'app-rejected',
  templateUrl: './rejected.component.html',
  styleUrl: './rejected.component.scss'
})
export class RejectedComponent {
   selectedIndex = 1;
  CustomerRecords: any[] = [
  { id: 1, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 2, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 3, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 4, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 5, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 6, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 7, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 8, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 9, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" }
];

 ProductRecords: any[] = [
  { id: 1, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 2, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 3, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 4, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 5, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 6, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 7, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 8, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 9, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" }
];
 SupplierRecords: any[] = [
  { id: 1, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 2, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 3, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 4, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 5, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 6, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 7, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 8, requestId: "CR-2023-0456", name: "Ahmed", submittedBy: "User A", date: "14Dec, 2024" },
  { id: 9, requestId: "CR-2023-0456", name: "Salma", submittedBy: "User A", date: "14Dec, 2024" }
];
AllRecords:any[]=[
   ...this.CustomerRecords,
    ...this.ProductRecords,
    ...this.SupplierRecords,
]



  onTabChange(index: number): void {
    this.selectedIndex = index;

  }
}
