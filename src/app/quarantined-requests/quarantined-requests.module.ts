import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { QuarantinedRequestsRoutingModule } from './quarantined-requests-routing.module';
import { QuarantinedRequestsComponent } from './quarantined-requests.component';

import { TranslateModule } from '@ngx-translate/core';
import { NzTableModule } from 'ng-zorro-antd/table';


@NgModule({
  declarations: [
    QuarantinedRequestsComponent
  ],
  imports: [
    CommonModule,
    QuarantinedRequestsRoutingModule,
    TranslateModule,
    NzTableModule
  ],
  exports: [
    QuarantinedRequestsComponent
  ]
})
export class QuarantinedRequestsModule { }
