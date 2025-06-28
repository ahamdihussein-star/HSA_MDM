import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NewRequestRoutingModule } from './new-request-routing.module';
import { NewRequestComponent } from './new-request.component';
import { TranslateModule } from '@ngx-translate/core';
import { HeaderModule } from '../header/header.module';
import { SidebarModule } from '../sidebar/sidebar.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSelectModule } from 'ng-zorro-antd/select';
@NgModule({
  declarations: [
    NewRequestComponent
  ],
  imports: [
    CommonModule,
    NewRequestRoutingModule,
    TranslateModule,
    HeaderModule,
    SidebarModule,
    FormsModule,
    ReactiveFormsModule,
    NzInputModule,
    NzFormModule,
    NzDatePickerModule,
    NzSelectModule
  ],
  exports: [NewRequestComponent]
})
export class NewRequestModule { }
