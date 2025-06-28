import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard.component';

import {HeaderModule} from '../header/header.module';
import { QuarantinedRequestsModule } from '../quarantined-requests/quarantined-requests.module';
import { GoldenRequestsModule } from '../golden-requests/golden-requests.module';
import { MyRequestsModule } from '../my-requests/my-requests.module';
import { AiAssistantModule } from '../ai-assistant/ai-assistant.module';

import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [
    DashboardComponent
  ],
  imports: [
    CommonModule,
    DashboardRoutingModule,
    HeaderModule,
    TranslateModule,
    QuarantinedRequestsModule,
    GoldenRequestsModule,
    MyRequestsModule, 
    AiAssistantModule
  ]
})
export class DashboardModule { }
