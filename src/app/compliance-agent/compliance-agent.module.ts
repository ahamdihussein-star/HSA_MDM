import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

// Ant Design Components
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';

// Components
import { ComplianceAgentComponent } from './compliance-agent.component';

// Services
import { ComplianceService } from './services/compliance.service';

const routes = [
  {
    path: '',
    component: ComplianceAgentComponent
  }
];

@NgModule({
  declarations: [
    ComplianceAgentComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    RouterModule.forChild(routes),
    
    // Ant Design Modules
    NzCardModule,
    NzButtonModule,
    NzInputModule,
    NzSelectModule,
    NzFormModule,
    NzTableModule,
    NzTagModule,
    NzAlertModule,
    NzSpinModule,
    NzModalModule,
    NzTabsModule,
    NzProgressModule,
    NzToolTipModule,
    NzDividerModule,
    NzIconModule,
    NzEmptyModule,
    NzCheckboxModule
  ],
  providers: [
    ComplianceService
  ]
})
export class ComplianceAgentModule { }
