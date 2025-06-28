import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard.component';

import {HeaderModule} from '../header/header.module';
import { QuarantinedRequestsModule } from '../quarantined-requests/quarantined-requests.module';
import { GoldenRequestsModule } from '../golden-requests/golden-requests.module';
import { MyRequestsModule } from '../my-requests/my-requests.module';

import { TranslateModule } from '@ngx-translate/core';
import { SidebarModule } from '../sidebar/sidebar.module';
import { NewRequestModule } from '../new-request/new-request.module';

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
    SidebarModule,
    NewRequestModule,
    MyRequestsModule
  ]
})
export class DashboardModule { }
