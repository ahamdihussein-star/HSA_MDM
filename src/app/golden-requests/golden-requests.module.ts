import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { GoldenRequestsRoutingModule } from './golden-requests-routing.module';
import { GoldenRequestsComponent } from './golden-requests.component';

import { TranslateModule } from '@ngx-translate/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzSpinModule } from 'ng-zorro-antd/spin';

@NgModule({
  declarations: [
    GoldenRequestsComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule, // 🔄 Added for API calls
    GoldenRequestsRoutingModule,
    TranslateModule,
    NzTableModule,
    NzTabsModule,
    NzDropDownModule,
    NzSpinModule // 🔄 Added for loading indicator
  ],
  exports: [
    GoldenRequestsComponent
  ]
})
export class GoldenRequestsModule {
  constructor() {
  }
}