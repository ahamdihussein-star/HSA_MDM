import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { QuarantinedRequestsRoutingModule } from './quarantined-requests-routing.module';
import { QuarantinedRequestsComponent } from './quarantined-requests.component';

import { TranslateModule } from '@ngx-translate/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';


@NgModule({
  declarations: [
    QuarantinedRequestsComponent
  ],
  imports: [
    CommonModule,
    QuarantinedRequestsRoutingModule,
    TranslateModule,
    NzTableModule,
    NzTabsModule
  ],
  exports: [
    QuarantinedRequestsComponent
  ]
})
export class QuarantinedRequestsModule { }
