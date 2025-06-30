import { Component } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-data-lineage',
  templateUrl: './data-lineage.component.html',
  styleUrl: './data-lineage.component.scss'
})
export class DataLineageComponent {

   dataLineage: any[] = [
    {
      id: 1,
      Field: "Customer Name",
      OldValue: "Salma Mustafa",
      NewValue: "Salma Ahmed",
      UpdatedBy: "Merolla Safwat",
      UpdatedDate: "14Dec, 2024",
      ApprovedBy: "Ahmed Ali",
    },
    {
      id: 2,
      Field: "Billing Address",
      OldValue: "Old St 12, Cairo",
      NewValue: "New St 34, Cairo",
      UpdatedBy: "Fatma Adel",
      UpdatedDate: "14Dec, 2024",
      ApprovedBy: "Ahmed Ali",
    },
    {
      id: 3,
      Field: "Phone Number",
      OldValue: "01054566665",
      NewValue: "01054566666",
      UpdatedBy: "Merolla Safwat",
      UpdatedDate: "14Dec, 2024",
      ApprovedBy: "Ahmed Ali",
    },
    {
      id: 4,
      Field: "Tax Number",
      OldValue: "123456789",
      NewValue: "987654321",
      UpdatedBy: "Merolla Safwat",
      UpdatedDate: "14Dec, 2024",
      ApprovedBy: "Ahmed Ali",
    },
    
   
  ]; 
  constructor(private location: Location) {}

  goBack(): void {
    this.location.back();
  }

  ngOnInit(): void {
    
  }
}
