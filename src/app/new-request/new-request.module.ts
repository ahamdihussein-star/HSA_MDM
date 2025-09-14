import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { NewRequestRoutingModule } from './new-request-routing.module';
import { NewRequestComponent } from './new-request.component';

import { TranslateModule } from '@ngx-translate/core';
import { HeaderModule } from '../header/header.module';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule, NZ_ICONS } from 'ng-zorro-antd/icon';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzNotificationModule } from 'ng-zorro-antd/notification';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTypographyModule } from 'ng-zorro-antd/typography';

import {
  FilePdfOutline,
  FileImageOutline,
  FileTextOutline,
  UploadOutline,
  DownloadOutline,
  DeleteOutline,
  PlusOutline,
  EditOutline,
  InboxOutline,
  PaperClipOutline,
  LoadingOutline
} from '@ant-design/icons-angular/icons';

const icons = [
  FilePdfOutline,
  FileImageOutline,
  FileTextOutline,
  UploadOutline,
  DownloadOutline,
  DeleteOutline,
  PlusOutline,
  EditOutline,
  InboxOutline,
  PaperClipOutline,
  LoadingOutline
];

@NgModule({
  declarations: [NewRequestComponent],
  imports: [
    CommonModule,
    HttpClientModule,  // Added for API calls
    NewRequestRoutingModule,

    // shared
    TranslateModule,
    HeaderModule,

    // forms
    FormsModule,
    ReactiveFormsModule,

    // ng-zorro used in the template
    NzInputModule,
    NzFormModule,
    NzDatePickerModule,
    NzSelectModule,
    NzModalModule,
    NzAlertModule,
    NzCheckboxModule,
    NzUploadModule,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzMessageModule,
    NzNotificationModule,
    NzSpinModule,  // Added for loading states

    // documents section extras
    NzTagModule,
    NzEmptyModule,
    NzToolTipModule,
    NzPopconfirmModule,
    NzTypographyModule
  ],
  providers: [{ provide: NZ_ICONS, useValue: icons }],
  exports: [NewRequestComponent]
})
export class NewRequestModule {
  constructor() {}
}