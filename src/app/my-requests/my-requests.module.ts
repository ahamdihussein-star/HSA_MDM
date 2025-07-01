import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MyRequestsRoutingModule } from './my-requests-routing.module';
import { MyRequestsComponent } from './my-requests.component';

import { TranslateModule } from '@ngx-translate/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';

import { NzDropDownModule } from 'ng-zorro-antd/dropdown';

@NgModule({
  declarations: [
    MyRequestsComponent
  ],
  imports: [
    CommonModule,
    MyRequestsRoutingModule,
    TranslateModule,
    NzTableModule,
    NzTabsModule,
    NzDropDownModule
  ],
  exports: [
    MyRequestsComponent
  ]
})
export class MyRequestsModule { }
