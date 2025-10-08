import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

// Ng-Zorro Modules
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { TranslateModule } from '@ngx-translate/core';

// Components
import { DataEntryAgentComponent } from './data-entry-agent.component';
import { DataEntryChatWidgetComponent } from './data-entry-chat-widget.component';
import { DataEntryReviewMessageComponent } from './data-entry-review-message/data-entry-review-message.component';

@NgModule({
  declarations: [
    DataEntryAgentComponent,
    DataEntryChatWidgetComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzFormModule,
    NzSelectModule,
    NzCardModule,
    NzToolTipModule,
    NzProgressModule,
    NzDividerModule,
    NzSpinModule,
    NzAlertModule,
    NzEmptyModule,
    TranslateModule,
    // Import standalone review component so it can be used in templates
    DataEntryReviewMessageComponent
  ],
  exports: [
    DataEntryAgentComponent,
    DataEntryChatWidgetComponent
  ]
})
export class DataEntryAgentModule { }
