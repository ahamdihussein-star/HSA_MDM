import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

// Ng-Zorro imports
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { AdminDataManagementComponent } from './admin-data-management.component';

const routes: Routes = [
  { path: '', component: AdminDataManagementComponent }
];

@NgModule({
  declarations: [
    AdminDataManagementComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule.forChild(routes),
    // Ng-Zorro modules
    NzSpinModule,
    NzButtonModule,
    NzCardModule,
    NzGridModule,
    NzStatisticModule,
    NzModalModule,
    NzAlertModule,
    NzInputModule,
    NzIconModule
  ]
})
export class AdminDataManagementModule { }