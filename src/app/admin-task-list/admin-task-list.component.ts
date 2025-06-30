import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-task-list',
  templateUrl: './admin-task-list.component.html',
  styleUrl: './admin-task-list.component.scss'
})
export class AdminTaskListComponent {
  taskList: any[] = [
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
  ]; // This will hold the quarantined requests data
  setOfCheckedId = new Set<number>();
  checked = false;
  indeterminate = false;

  constructor() { }


  onAllChecked(value: boolean): void {
    this.taskList.forEach(item => this.updateCheckedSet(item.id, value));
    this.refreshCheckedStatus();
  }

  refreshCheckedStatus(): void {
    this.checked = this.taskList.every(item => this.setOfCheckedId.has(item.id));
    this.indeterminate = this.taskList.some(item => this.setOfCheckedId.has(item.id)) && !this.checked;
  }

    onItemChecked(id: number, checked: boolean): void {
    this.updateCheckedSet(id, checked);
    this.refreshCheckedStatus();
  }
  
  updateCheckedSet(id: number, checked: boolean): void {
    if (checked) {
      this.setOfCheckedId.add(id);
    } else {
      this.setOfCheckedId.delete(id);
    }
    console.log(this.setOfCheckedId.size);
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
