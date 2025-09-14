// src/app/quarantine/quarantine.module.ts

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { QuarantineComponent } from './quarantine.component';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

// Define routes for this module
const routes: Routes = [
  { path: '', component: QuarantineComponent }
];

@NgModule({
  declarations: [QuarantineComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),  // ✅ مهم جداً - ده اللي كان ناقص
    TranslateModule,
    FormsModule,
    HttpClientModule,
    NzTableModule,      // للـ tables
    NzEmptyModule,      // للـ empty state
    NzTagModule,        // للـ tags
    NzStatisticModule,  // للـ statistics
    NzButtonModule,     // للـ buttons
    NzIconModule        // للـ icons
  ],
  exports: [QuarantineComponent]
})
export class QuarantineModule {
  constructor() {
  }
}