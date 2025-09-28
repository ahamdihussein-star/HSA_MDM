import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { DuplicateRecordsRoutingModule } from './duplicate-records-routing.module';
import { DuplicateRecordsComponent } from './duplicate-records.component';

import { TranslateModule } from '@ngx-translate/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';

@NgModule({
  declarations: [
    DuplicateRecordsComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    DuplicateRecordsRoutingModule,
    TranslateModule,
    NzTableModule,
    NzTabsModule
  ],
  exports: [
    DuplicateRecordsComponent
  ],
})
export class DuplicateRecordsModule {
  constructor() {
  }
}