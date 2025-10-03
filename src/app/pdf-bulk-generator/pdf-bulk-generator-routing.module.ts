// src/app/pdf-bulk-generator/pdf-bulk-generator-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PdfBulkGeneratorComponent } from './pdf-bulk-generator.component';

const routes: Routes = [
  { path: '', component: PdfBulkGeneratorComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PdfBulkGeneratorRoutingModule { }