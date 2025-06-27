import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { GoldenRequestsRoutingModule } from './golden-requests-routing.module';
import { GoldenRequestsComponent } from './golden-requests.component';

import { TranslateModule } from '@ngx-translate/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';

@NgModule({
  declarations: [
    GoldenRequestsComponent
  ],
  imports: [
    CommonModule,
    GoldenRequestsRoutingModule,
    TranslateModule,
    NzTableModule,
    NzTabsModule
  ],
  exports: [
    GoldenRequestsComponent
  ]
})
export class GoldenRequestsModule { }
