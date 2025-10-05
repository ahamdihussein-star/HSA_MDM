// src/app/dashboard/dashboard.module.ts

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard.component';

import { HeaderModule } from '../header/header.module';
import { GoldenRequestsModule } from '../golden-requests/golden-requests.module';
import { HomeModule } from '../home/home.module';
import { AiAssistantModule } from '../ai-assistant/ai-assistant.module';
import { DataEntryAgentModule } from '../data-entry-agent/data-entry-agent.module';

import { TranslateModule } from '@ngx-translate/core';
import { NewRequestModule } from '../new-request/new-request.module';
import { MyTaskListModule } from '../my-task-list/my-task-list.module';
import { DuplicateRecordsModule } from '../duplicate-records/duplicate-records.module';
import { DuplicateCustomerModule } from '../duplicate-customer/duplicate-customer.module';

import { AdminTaskListModule } from '../admin-task-list/admin-task-list.module';
import { DataLineageModule } from '../data-lineage/data-lineage.module';

import { RejectedModule } from '../rejected/rejected.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { QuarantineModule } from '../quarantine/quarantine.module';
// import { PdfBulkGeneratorModule } from '../pdf-bulk-generator/pdf-bulk-generator.module';

// ng-zorro modules
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

// GoldenSummaryComponent - يجب التعامل معه كـ regular component
import { GoldenSummaryComponent } from './golden-summary/golden-summary.component';

@NgModule({
  declarations: [
    DashboardComponent,
    GoldenSummaryComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    RouterModule,        // ✅ مضاف للـ routerLink و router-outlet
    DashboardRoutingModule,
    HeaderModule,
    TranslateModule,
    
    // ng-zorro modules
    NzSpinModule,
    NzButtonModule,
    NzIconModule,
    
    // Feature modules
    GoldenRequestsModule,
    NewRequestModule,
    HomeModule,
    AiAssistantModule,
    DataEntryAgentModule,
    MyTaskListModule,
    AdminTaskListModule,
    DuplicateRecordsModule,
    DuplicateCustomerModule,
    RejectedModule,
    DataLineageModule,
    ComplianceModule,
    QuarantineModule
    // PdfBulkGeneratorModule
  ]
})
export class DashboardModule {
    constructor() {
    }
}