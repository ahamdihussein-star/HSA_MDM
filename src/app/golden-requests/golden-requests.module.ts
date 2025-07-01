import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { GoldenRequestsRoutingModule } from './golden-requests-routing.module';
import { GoldenRequestsComponent } from './golden-requests.component';

import { TranslateModule } from '@ngx-translate/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';

@NgModule({
  declarations: [
    GoldenRequestsComponent
  ],
  imports: [
    CommonModule,
    GoldenRequestsRoutingModule,
    TranslateModule,
    NzTableModule,
    NzTabsModule,
    NzDropDownModule
  ],
  exports: [
    GoldenRequestsComponent
  ]
})
export class GoldenRequestsModule { }
