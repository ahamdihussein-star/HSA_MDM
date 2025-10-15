// src/app/pdf-bulk-generator/pdf-bulk-generator.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfBulkGeneratorRoutingModule } from './pdf-bulk-generator-routing.module';
import { PdfBulkGeneratorComponent } from './pdf-bulk-generator.component';
import { DocumentImageGeneratorService } from '../services/document-image-generator.service';
import { DemoDataGeneratorService } from '../services/demo-data-generator.service';
import { RealisticDocumentGeneratorService } from '../services/realistic-document-generator.service';

// Ng-Zorro imports
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzRadioModule } from 'ng-zorro-antd/radio';

@NgModule({
  declarations: [PdfBulkGeneratorComponent],
  imports: [
    CommonModule,
    FormsModule,
    PdfBulkGeneratorRoutingModule,
    NzCardModule,
    NzCheckboxModule,
    NzButtonModule,
    NzProgressModule,
    NzStatisticModule,
    NzAlertModule,
    NzTagModule,
    NzDividerModule,
    NzIconModule,
    NzRadioModule
  ],
  providers: [
    DocumentImageGeneratorService,
    DemoDataGeneratorService,
    RealisticDocumentGeneratorService
  ]
})
export class PdfBulkGeneratorModule { }