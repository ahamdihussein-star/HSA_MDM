import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { SyncGoldenRecordsRoutingModule } from './sync-golden-records-routing.module';
import { SyncGoldenRecordsComponent } from './sync-golden-records.component';

// Translation
import { TranslateModule } from '@ngx-translate/core';

// Ant Design Modules
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzNotificationModule } from 'ng-zorro-antd/notification';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';

@NgModule({
  declarations: [
    SyncGoldenRecordsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    SyncGoldenRecordsRoutingModule,
    TranslateModule,
    
    // Ant Design
    NzCardModule,
    NzStatisticModule,
    NzGridModule,
    NzButtonModule,
    NzIconModule,
    NzTagModule,
    NzTableModule,
    NzModalModule,
    NzSpinModule,
    NzMessageModule,
    NzSelectModule,
    NzInputModule,
    NzProgressModule,
    NzDescriptionsModule,
    NzDropDownModule,
    NzMenuModule,
    NzToolTipModule,
    NzAlertModule,
    NzEmptyModule,
    NzFormModule,
    NzRadioModule,
    NzCheckboxModule,
    NzInputNumberModule,
    NzDividerModule,
    NzSwitchModule,
    NzTabsModule,
    NzNotificationModule,
    NzSliderModule,
    NzBadgeModule,
    NzTimelineModule,
    NzCollapseModule
  ]
})
export class SyncGoldenRecordsModule { }