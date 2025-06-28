import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home.component';
import { NgApexchartsModule } from 'ng-apexcharts';
import { NzTableModule } from 'ng-zorro-antd/table';
import { TranslateModule } from '@ngx-translate/core';


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
export class HomeModule { }
