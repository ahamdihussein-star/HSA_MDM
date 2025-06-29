import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

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
    DuplicateRecordsRoutingModule,
    TranslateModule,
    NzTableModule,
    NzTabsModule
  ],
  exports: [
    DuplicateRecordsComponent
  ],
})
export class DuplicateRecordsModule { }
