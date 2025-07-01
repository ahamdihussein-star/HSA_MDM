import { Component } from '@angular/core';
import { Router } from "@angular/router";

@Component({
  selector: 'app-my-task-list',
  templateUrl: './my-task-list.component.html',
  styleUrl: './my-task-list.component.scss'
})
export class MyTaskListComponent {
  taskList: any[] = [
    {
      id: 1,
      requestId: "CR-2023-0456",
      RequestType: "suppliers",
      IssueDescription: "Pepsi",
      RecordIdentifier: "Missing phone number",
    },
    {
      id: 2,
      requestId: "CR-2023-0456",
      RequestType: "customer",
      IssueDescription: "Marzoq & his sons",
      RecordIdentifier: "Address Not Complete",
    },
    {
      id: 3,
      requestId: "CR-2023-0456",
      RequestType: "suppliers",
      IssueDescription: "Pepsi",
      RecordIdentifier: "Address Not Complete",
    },
    {
      id: 4,
      requestId: "CR-2023-0456",
      RequestType: "customer",
      IssueDescription: "Marzoq & his sons",
      RecordIdentifier: "Missing phone number",
    },
    {
      id: 5,
      requestId: "CR-2023-0456",
      RequestType: "customer",
      IssueDescription: "Pepsi",
      RecordIdentifier: "Address Not Complete",
    },
    {
      id: 6,
      requestId: "CR-2023-0456",
      RequestType: "suppliers",
      IssueDescription: "Marzoq & his sons",
      RecordIdentifier: "Missing phone number",
    },
    {
      id: 7,
      requestId: "CR-2023-0456",
      RequestType: "customer",
      IssueDescription: "Pepsi",
      RecordIdentifier: "Address Not Complete",
    },
    {
      id: 8,
      requestId: "CR-2023-0456",
      RequestType: "suppliers",
      IssueDescription: "Marzoq & his sons",
      RecordIdentifier: "Missing phone number",
    },
    {
      id: 9,
      requestId: "CR-2023-0456",
      RequestType: "customer",
      IssueDescription: "Pepsi",
      RecordIdentifier: "Address Not Complete",
    },
  ]; // This will hold the quarantined requests data
  constructor(private router: Router) { }


  deleteRecodr(index: number): void {
    // This method will delete a record from the quarantined requests
    this.taskList.splice(index, 1);
    this.taskList = [...this.taskList]; // Trigger change detection
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
