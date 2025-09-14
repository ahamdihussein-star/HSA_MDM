import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { MyTaskListRoutingModule } from './my-task-list-routing.module';
import { MyTaskListComponent } from './my-task-list.component';

import { TranslateModule } from '@ngx-translate/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';

// Import ApiRepo
import { ApiRepo } from '../Core/api.repo';

@NgModule({
  declarations: [MyTaskListComponent],
  imports: [
    CommonModule,
    HttpClientModule,      // مهم لـ HTTP calls
    MyTaskListRoutingModule,
    TranslateModule,
    FormsModule,
    NzTableModule,
    NzTabsModule,
    NzButtonModule,
    NzTagModule,
    NzEmptyModule,
    NzDropDownModule,
    NzIconModule          // للأيقونات
  ],
  providers: [
    ApiRepo  // توفير ApiRepo
  ],
  exports: [MyTaskListComponent]
})
export class MyTaskListModule {
  constructor() {
  }
}