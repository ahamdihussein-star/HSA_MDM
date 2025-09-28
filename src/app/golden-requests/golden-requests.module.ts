import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { GoldenRequestsRoutingModule } from './golden-requests-routing.module';
import { GoldenRequestsComponent } from './golden-requests.component';

import { TranslateModule } from '@ngx-translate/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMenuModule } from 'ng-zorro-antd/menu';

@NgModule({
  declarations: [
    GoldenRequestsComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule, // 🔄 Added for API calls
    FormsModule, // 🔄 Added for ngModel
    GoldenRequestsRoutingModule,
    TranslateModule,
    NzTableModule,
    NzTabsModule,
    NzDropDownModule,
    NzSpinModule, // 🔄 Added for loading indicator
    NzButtonModule, // 🔄 Added for buttons
    NzIconModule, // 🔄 Added for icons
    NzMenuModule // 🔄 Added for dropdown menu
  ],
  exports: [
    GoldenRequestsComponent
  ]
})
export class GoldenRequestsModule {
  constructor() {
  }
}