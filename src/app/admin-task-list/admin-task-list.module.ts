import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminTaskListRoutingModule } from './admin-task-list-routing.module';
import { AdminTaskListComponent } from './admin-task-list.component';

import { TranslateModule } from '@ngx-translate/core';
import { NzTableModule } from 'ng-zorro-antd/table';

@NgModule({
  declarations: [
    AdminTaskListComponent
  ],
  imports: [
    CommonModule,
    AdminTaskListRoutingModule,
    TranslateModule,
    NzTableModule
  ],
    exports: [
      AdminTaskListComponent
    ]
})
export class AdminTaskListModule { }
