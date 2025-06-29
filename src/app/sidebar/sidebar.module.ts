import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SidebarRoutingModule } from './sidebar-routing.module';
import { SidebarComponent } from './sidebar.component';
import { TranslateModule } from '@ngx-translate/core';


@NgModule({
  declarations: [
    SidebarComponent
  ],
  imports: [
    CommonModule,
    SidebarRoutingModule,
    TranslateModule
  ],
  exports: [SidebarComponent]
})
export class SidebarModule { }
