import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DataLineageRoutingModule } from './data-lineage-routing.module';
import { DataLineageComponent } from './data-lineage.component';

import { TranslateModule } from '@ngx-translate/core';
import { NzTableModule } from 'ng-zorro-antd/table';

@NgModule({
  declarations: [
    DataLineageComponent
  ],
  imports: [
    CommonModule,
    DataLineageRoutingModule,
    TranslateModule,
    NzTableModule
  ],
  exports: [
    DataLineageComponent
  ],
})
export class DataLineageModule { }
