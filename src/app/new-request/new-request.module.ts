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
    NzFormModule
  ],
  exports: [NewRequestComponent]
})
export class NewRequestModule { }
