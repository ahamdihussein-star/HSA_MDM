import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AdminTaskListRoutingModule } from './admin-task-list-routing.module';
import { AdminTaskListComponent } from './admin-task-list.component';

import { TranslateModule } from '@ngx-translate/core';
import { HeaderModule } from '../header/header.module';

// Core Ant Design modules (existing)
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzNotificationModule } from 'ng-zorro-antd/notification';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';

// Additional Ant Design modules (fixed and added)
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';


@NgModule({
  declarations: [
    AdminTaskListComponent
  ],
  imports: [
    CommonModule,
    AdminTaskListRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,

    // Shared modules
    TranslateModule,
    HeaderModule,

    // Core Ant Design modules
    NzTableModule,
    NzButtonModule,
    NzCheckboxModule,
    NzModalModule,
    NzInputModule,
    NzSelectModule,
    NzMessageModule,
    NzNotificationModule,
    NzTagModule,
    NzSpinModule,
    NzAlertModule,
    NzEmptyModule,
    NzIconModule,
    NzDropDownModule,
    
    // Additional modules
    NzToolTipModule,
    NzStatisticModule
  ]
})
export class AdminTaskListModule { }