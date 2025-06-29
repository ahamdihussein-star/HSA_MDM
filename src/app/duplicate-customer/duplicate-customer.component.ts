import { Component } from '@angular/core';
import { Location } from "@angular/common";
import { TranslateService } from "@ngx-translate/core";
import { NzI18nService, en_US } from "ng-zorro-antd/i18n";
import { NzNotificationService } from "ng-zorro-antd/notification";
import { ActivatedRoute, Router } from "@angular/router";

@Component({
  selector: 'app-duplicate-customer',
  templateUrl: './duplicate-customer.component.html',
  styleUrl: './duplicate-customer.component.scss'
})
export class DuplicateCustomerComponent {

  constructor(private location: Location, 
    private route: ActivatedRoute,
    private notification: NzNotificationService,
    private translate: TranslateService,
    private router: Router,) {}
   goBack(): void {
    this.location.back();
  }

  listOfData=[
    {
      id: 1,
      name: 'Ahmed Mohammed',
      email: 'Ahmed@gmail.com',
      phone: '01054566665',
      date: '14Dec, 2024'
    },
    {
      id: 2,
      name: 'Ahmed Mohammed',
      email: 'Ahmed@gmail.com',
      phone: '01054566675',
      date: '14Dec, 2024'
    },
    {
      id: 3,
      name: 'Ahmed Mohammed',
      email: 'Ahmed@gmail.com',
      phone: '01054566665',
      date: '14Dec, 2024'
    },
    {
      id: 4,
      name: 'Ahmed Mohammed',
      email: 'Ahmed@gmail.com',
      phone: '01054566665',
      date: '14Dec, 2024'
    },
  ]
 
  checked = false;
  indeterminate = false;

  setOfCheckedId = new Set<number>();

  updateCheckedSet(id: number, checked: boolean): void {
    if (checked) {
      this.setOfCheckedId.add(id);
    } else {
      this.setOfCheckedId.delete(id);
    }
    console.log(this.setOfCheckedId.size);
  }

  onItemChecked(id: number, checked: boolean): void {
    this.updateCheckedSet(id, checked);
    this.refreshCheckedStatus();
  }

  onAllChecked(value: boolean): void {
    this.listOfData.forEach(item => this.updateCheckedSet(item.id, value));
    this.refreshCheckedStatus();
  }

  

  refreshCheckedStatus(): void {
    this.checked = this.listOfData.every(item => this.setOfCheckedId.has(item.id));
    this.indeterminate = this.listOfData.some(item => this.setOfCheckedId.has(item.id)) && !this.checked;
  }


  merge(): void {
    
      
      
      let  toastMessage = "The record is merged successfully";
      
      this.translate.get(toastMessage).subscribe((message: string) => {
        this.notification.create("success", message, "", {
          nzClass: "success-notification",
          nzDuration: 5000,
        });
        this.router.navigate(["/dashboard/duplicate-requests"]);
      });
    }
  

  ngOnInit(): void {
  
  }
}
