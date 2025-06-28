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
      date: "14Dec, 2024",
    },
    {
      id: 2,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      status: "Approved",
      date: "14Dec, 2024",
    },
    {
      id: 3,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      status: "Rejected",
      date: "14Dec, 2024",
    },
    {
      id: 4,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      status: "Pending",
      date: "14Dec, 2024",
    },
    {
      id: 5,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      status: "Quarantined",
      date: "14Dec, 2024",
    },
    {
      id: 6,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      status: "Pending",
      date: "14Dec, 2024",
    },
    {
      id: 7,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      status: "Approved",
      date: "14Dec, 2024",
    },
    {
      id: 8,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      status: "Rejected",
      date: "14Dec, 2024",
    },
    {
      id: 9,
      requestId: "CR-2023-0456",
      customerName: "Salma Mustafa",
      submittedBy: "User A",
      status: "Approved",
      date: "14Dec, 2024",
    },
  ]; // This will hold the quarantined requests data
  constructor(private router: Router) {}

  deleteRecodr(index: number): void {
    // This method will delete a record from the quarantined requests
    this.myRequests.splice(index, 1);
    this.myRequests = [...this.myRequests];
  }

  viewOrEditRequest(id: number, status: string, canEdit: Boolean): void {
    this.router.navigate(["/dashboard/new-request", id], {
      queryParams: {edit: canEdit, status}
    });
  }

  ngOnInit(): void {
    // Initialization logic can go here
  }
}
