import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DataLineageRoutingModule } from './data-lineage-routing.module';
import { DataLineageComponent } from './data-lineage.component';


@NgModule({
  declarations: [
    DataLineageComponent
  ],
  imports: [
    CommonModule,
    DataLineageRoutingModule
  ]
})
export class DataLineageModule { }
