import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MyTaskListRoutingModule } from './my-task-list-routing.module';
import { MyTaskListComponent } from './my-task-list.component';

import { TranslateModule } from '@ngx-translate/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';

@NgModule({
  declarations: [
    MyTaskListComponent
  ],
  imports: [
    CommonModule,
    MyTaskListRoutingModule,
    TranslateModule,
    NzTableModule,
    NzTabsModule
  ],
  exports: [
    MyTaskListComponent
  ]
})
export class MyTaskListModule { }
