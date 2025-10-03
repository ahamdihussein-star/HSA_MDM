// src/app/pdf-bulk-generator/pdf-bulk-generator.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PdfBulkGeneratorRoutingModule } from './pdf-bulk-generator-routing.module';
import { PdfBulkGeneratorComponent } from './pdf-bulk-generator.component';

@NgModule({
  declarations: [PdfBulkGeneratorComponent],
  imports: [
    CommonModule,
    PdfBulkGeneratorRoutingModule
  ]
})
export class PdfBulkGeneratorModule { }