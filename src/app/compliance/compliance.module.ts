import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';

import { ComplianceRoutingModule } from './compliance-routing.module';
import { ComplianceTaskListComponent } from './compliance-task-list/compliance-task-list.component';
import { ApiRepo } from '../Core/api.repo';

@NgModule({
  declarations: [
    ComplianceTaskListComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,  // مهم لـ HTTP calls
    FormsModule,
    TranslateModule,
    NzTableModule,
    NzEmptyModule,
    NzButtonModule,
    NzModalModule,    // للـ modals
    NzInputModule,     // للـ input fields في modals
    NzTagModule,      // للـ tags
    NzIconModule,     // للـ icons
    NzStatisticModule, // للـ statistics
    ComplianceRoutingModule
  ],
  providers: [
    ApiRepo  // توفير ApiRepo service
  ],
  exports: [ComplianceTaskListComponent]
})
export class ComplianceModule {
  constructor() {
  }
}