import { Component } from '@angular/core';

@Component({
  selector: 'app-duplicate-records',
  templateUrl: './duplicate-records.component.html',
  styleUrl: './duplicate-records.component.scss'
})
export class DuplicateRecordsComponent {
 duplicateRecords: any[] = [
    {
      id: 1,
      requestId: "CR-2023-0456",
      NumOfDuplicates: "4",
      submittedBy: "User A",
      date: "14Dec, 2024",
    },
    {
      id: 2,
      requestId: "CR-2023-0456",
      NumOfDuplicates: "3",
      submittedBy: "User A",
      date: "14Dec, 2024",
    },
    {
      id: 3,
      requestId: "CR-2023-0456",
      NumOfDuplicates: "2",
      submittedBy: "User A",
      date: "14Dec, 2024",
    },
    {
      id: 4,
      requestId: "CR-2023-0456",
      NumOfDuplicates: "3",
      submittedBy: "User A",
      date: "14Dec, 2024",
    },
    {
      id: 5,
      requestId: "CR-2023-0456",
      NumOfDuplicates: "3",
      submittedBy: "User A",
      date: "14Dec, 2024",
    },
    {
      id: 6,
      requestId: "CR-2023-0456",
      NumOfDuplicates: "3",
      submittedBy: "User A",
      date: "14Dec, 2024",
    },
    {
      id: 7,
      requestId: "CR-2023-0456",
      NumOfDuplicates: "3",
      submittedBy: "User A",
      date: "14Dec, 2024",
    },
    {
      id: 8,
      requestId: "CR-2023-0456",
      NumOfDuplicates: "3",
      submittedBy: "User A",
      date: "14Dec, 2024",
    },
    {
      id: 9,
      requestId: "CR-2023-0456",
      NumOfDuplicates: "3",
      submittedBy: "User A",
      date: "14Dec, 2024",
    },
  ]; 
  constructor() {}




  ngOnInit(): void {
    // Initialization logic can go here
  }
}
