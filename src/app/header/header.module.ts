
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { HeaderRoutingModule } from './header-routing.module';
import { HeaderComponent } from './header.component';

import { TranslateModule } from "@ngx-translate/core";
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { Router } from "@angular/router";

@NgModule({
  declarations: [
    HeaderComponent
  ],
  imports: [
    CommonModule,
    HeaderRoutingModule,
    TranslateModule,
    NzDropDownModule
  ],
  exports: [HeaderComponent],
})
export class HeaderModule {
    constructor() {
    }
 }
