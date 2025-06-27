import { Component } from '@angular/core';

@Component({
  selector: 'app-quarantined-requests',
  templateUrl: './quarantined-requests.component.html',
  styleUrl: './quarantined-requests.component.scss'
})
export class QuarantinedRequestsComponent {
  quarantinedRequests: any[] = 
  [
    {
      id: 1,
      requestId: 'CR-2023-0456',
      customerName: 'Salma Mustafa',
      submittedBy: 'User A',
      date: '14Dec, 2024',
    
    },
    {
      id: 2,
      requestId: 'CR-2023-0456',
      customerName: 'Salma Mustafa',
      submittedBy: 'User A',
      date: '14Dec, 2024',
    },
    {
      id: 3,
       requestId: 'CR-2023-0456',
      customerName: 'Salma Mustafa',
      submittedBy: 'User A',
      date: '14Dec, 2024',
    }
  ]; // This will hold the quarantined requests data
  constructor() { }

  ngOnInit(): void {
    // Initialization logic can go here
  }
}
