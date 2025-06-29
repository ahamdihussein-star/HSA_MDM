import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DuplicateCustomerRoutingModule } from './duplicate-customer-routing.module';
import { DuplicateCustomerComponent } from './duplicate-customer.component';

import { TranslateModule } from '@ngx-translate/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';

@NgModule({
  declarations: [
    DuplicateCustomerComponent
  ],
  imports: [
    CommonModule,
    DuplicateCustomerRoutingModule,
    TranslateModule,
    NzTableModule,
    NzTabsModule
  ],
  exports: [
    DuplicateCustomerComponent
  ],
})
export class DuplicateCustomerModule { }
