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

    listOfData=[
    {
      id: 1,
      field:'Duplicate 1',
      name: 'Ahmed Mohammed',
      email: 'Ahmed@gmail.com',
      phone: '01054566665',
      date: '14Dec, 2024'
    },
    {
      id: 2,
      field:'Duplicate 2',
      name: 'Ahmed Mohammed',
      email: 'Ahmed@gmail.com',
      phone: '01054566675',
      date: '14Dec, 2024'
    },
    {
      id: 3,
      field:'Duplicate 3',
      name: 'Ahmed Mohammed',
      email: 'Ahmed@gmail.com',
      phone: '01054566665',
      date: '14Dec, 2024'
    },
    {
      id: 4,
      field:'Duplicate 4',
      name: 'Ahmed Mohammed',
      email: 'Ahmed@gmail.com',
      phone: '01054566665',
      date: '14Dec, 2024'
    },
  ]
 
  checked = false;
  indeterminate = false;

  setOfCheckedId = new Set<number>();


  showSelect= false
  selectedOptions:any []= []
  selectedValue:any =null
  constructor(private location: Location, 
    private route: ActivatedRoute,
    private notification: NzNotificationService,
    private translate: TranslateService,
    private router: Router,) {}

    
   goBack(): void {
    this.location.back();
  }



  updateCheckedSet(id: number, checked: boolean): void {
    if (checked) {
      this.setOfCheckedId.add(id);
    } else {
      this.setOfCheckedId.delete(id);
    }
   this.refreshCheckedStatus()
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
    

    const selectedData = this.listOfData.filter(item => this.setOfCheckedId.has(item.id)).map(item => ({ id: item.id, field: item.field }));
    this.selectedOptions = selectedData
    console.log("this.selectedOptions",this.selectedOptions)
  }


  selecteChange(id:any){
    let x = this.selectedOptions.filter(item => item.id != id);
    console.log("x",x)

    const idsToRemove = new Set(x.map(item => item.id));

// Step 2: Filter out the matching items from listOfData
this.listOfData = this.listOfData.filter(item => !idsToRemove.has(item.id));
 this.listOfData = [...this.listOfData]

 this.updateCheckedSet(id, false)
 this.setOfCheckedId.clear();
    this.showSelect = false
    let  toastMessage = "The record is merged successfully";
      
      this.translate.get(toastMessage).subscribe((message: string) => {
        this.notification.create("success", message, "", {
          nzClass: "success-notification",
          nzDuration: 5000,
        });
        
      });
  }


  ignoreRows(){
    this.listOfData = this.listOfData.filter(item => !this.setOfCheckedId.has(item.id));
    this.listOfData = [...this.listOfData]
     this.setOfCheckedId.clear();
    this.refreshCheckedStatus()
  }
  merge(): void {
    this.showSelect = true
      
      
      // let  toastMessage = "The record is merged successfully";
      
      // this.translate.get(toastMessage).subscribe((message: string) => {
      //   this.notification.create("success", message, "", {
      //     nzClass: "success-notification",
      //     nzDuration: 5000,
      //   });
      //   this.router.navigate(["/dashboard/duplicate-requests"]);
      // });
    }
  

  ngOnInit(): void {
  
  }
}
