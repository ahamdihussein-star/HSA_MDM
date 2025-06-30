import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RejectedRoutingModule } from './rejected-routing.module';
import { RejectedComponent } from './rejected.component';
import { TranslateModule } from '@ngx-translate/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';

@NgModule({
  declarations: [
    RejectedComponent
  ],
  imports: [
    CommonModule,
    RejectedRoutingModule,
    TranslateModule,
    NzTableModule,
    NzTabsModule
  ],
  exports: [
    RejectedComponent
  ]
})
export class RejectedModule { }
