
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { DataLineageRoutingModule } from './data-lineage-routing.module';
import { DataLineageComponent } from './data-lineage.component';

import { TranslateModule } from '@ngx-translate/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { FormsModule } from '@angular/forms';
import { Router } from "@angular/router";

@NgModule({
  declarations: [
    DataLineageComponent
  ],
  imports: [
    CommonModule,
    DataLineageRoutingModule,
    TranslateModule,
    NzTableModule,
    FormsModule            // ✅ ضروري علشان [(ngModel)]
  ],
  exports: [
    DataLineageComponent
  ],
})
export class DataLineageModule {
    constructor() {
    }
 }