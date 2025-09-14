
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home.component';
import { NgApexchartsModule } from 'ng-apexcharts';
import { NzTableModule } from 'ng-zorro-antd/table';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from "@angular/router";

@NgModule({
  declarations: [
    HomeComponent
  ],
  imports: [
    CommonModule,
    HomeRoutingModule,
    NgApexchartsModule,
    NzTableModule,
    TranslateModule
  ],
  exports: [
    HomeComponent
  ]
})
export class HomeModule {
    constructor() {
    }
 }
