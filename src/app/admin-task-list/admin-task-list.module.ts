import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminTaskListRoutingModule } from './admin-task-list-routing.module';
import { AdminTaskListComponent } from './admin-task-list.component';

import { TranslateModule } from '@ngx-translate/core';
import { NzTableModule } from 'ng-zorro-antd/table';

import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
@NgModule({
  declarations: [
    AdminTaskListComponent
  ],
  imports: [
    CommonModule,
    AdminTaskListRoutingModule,
    TranslateModule,
    NzTableModule,
    NzDropDownModule,
    NzModalModule,
    NzCheckboxModule,
    FormsModule,
    NzInputModule,
    NzSelectModule,
  ],
  exports: [
    AdminTaskListComponent
  ]
})
export class AdminTaskListModule { }
