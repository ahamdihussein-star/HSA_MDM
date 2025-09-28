import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Ant Design Components
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';

// ApexCharts (removed since we're using Chart.js)
// import { NgApexchartsModule } from 'ng-apexcharts';

// Components
import { ExecutiveDashboardComponent } from './executive-dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: ExecutiveDashboardComponent
  }
];

@NgModule({
  declarations: [
    ExecutiveDashboardComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    
    // Ant Design Modules
    NzCardModule,
    NzStatisticModule,
    NzGridModule,
    NzButtonModule,
    NzIconModule,
    NzSelectModule,
    NzDatePickerModule,
    NzSpinModule,
    NzAlertModule,
    NzBadgeModule,
    NzTagModule,
    NzTimelineModule,
    NzProgressModule,
    NzTableModule,
    NzToolTipModule,
    NzMessageModule,
    NzRadioModule,
    NzSwitchModule,
    NzDividerModule,
    NzTypographyModule,
    NzEmptyModule,
    NzDropDownModule,
    NzMenuModule
    
    // Charts - Using Chart.js directly
  ]
})
export class ExecutiveDashboardModule { }
