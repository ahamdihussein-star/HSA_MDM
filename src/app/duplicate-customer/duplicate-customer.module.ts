import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router'; // ← ناقص

import { DuplicateCustomerRoutingModule } from './duplicate-customer-routing.module';
import { DuplicateCustomerComponent } from './duplicate-customer.component';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzNotificationModule } from 'ng-zorro-antd/notification';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

// الاضافات الجديدة
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzProgressModule } from 'ng-zorro-antd/progress'; // ← ناقص
import { NzStepsModule } from 'ng-zorro-antd/steps'; // ← ناقص
import { NzAlertModule } from 'ng-zorro-antd/alert'; // ← ناقص

@NgModule({
  declarations: [
    DuplicateCustomerComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule, // ← ضروري للـ Router و ActivatedRoute
    DuplicateCustomerRoutingModule,
    TranslateModule,
    NzTableModule,
    NzTabsModule,
    NzSelectModule,
    NzCheckboxModule,
    FormsModule,
    NzRadioModule,
    ReactiveFormsModule,
    NzNotificationModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzUploadModule,
    NzIconModule,
    NzPopconfirmModule,
    
    // الاضافات الجديدة
    NzTagModule,
    NzToolTipModule,
    NzMessageModule,
    NzSpinModule,
    NzProgressModule, // ← للـ progress bar
    NzStepsModule,    // ← للـ steps component
    NzAlertModule     // ← للـ alert messages
  ],
  exports: [
    DuplicateCustomerComponent
  ],
})
export class DuplicateCustomerModule {
  constructor() {
  }
}