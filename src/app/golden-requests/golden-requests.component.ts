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
  constructor() {}


deleteRecodr(index: number): void {
    // This method will delete a record from the quarantined requests
    this.goldenRequests.splice(index, 1);
    this.goldenRequests = [...this.goldenRequests]; // Trigger change detection
   

}

  ngOnInit(): void {
    // Initialization logic can go here
  }
}
