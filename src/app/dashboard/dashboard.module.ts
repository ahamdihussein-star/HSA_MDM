import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard.component';

import {HeaderModule} from '../header/header.module';
import { GoldenRequestsModule } from '../golden-requests/golden-requests.module';
import { MyRequestsModule } from '../my-requests/my-requests.module';
import { HomeModule } from '../home/home.module';
import { AiAssistantModule } from '../ai-assistant/ai-assistant.module';

import { TranslateModule } from '@ngx-translate/core';
import { SidebarModule } from '../sidebar/sidebar.module';
import { NewRequestModule } from '../new-request/new-request.module';
import { MyTaskListModule } from '../my-task-list/my-task-list.module';
import { DuplicateRecordsModule } from '../duplicate-records/duplicate-records.module';
import { DuplicateCustomerModule } from '../duplicate-customer/duplicate-customer.module';

import { AdminTaskListModule } from '../admin-task-list/admin-task-list.module';

@NgModule({
  declarations: [
    DashboardComponent
  ],
  imports: [
    CommonModule,
    DashboardRoutingModule,
    HeaderModule,
    TranslateModule,
    GoldenRequestsModule,
    SidebarModule,
    NewRequestModule,
    MyRequestsModule,
    HomeModule,
    MyRequestsModule, 
    AiAssistantModule,
    MyTaskListModule,
    AdminTaskListModule,
    DuplicateRecordsModule ,
    DuplicateCustomerModule,

  ]
})
export class DashboardModule { }
