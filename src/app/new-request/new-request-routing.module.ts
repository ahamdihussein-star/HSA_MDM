// src/app/new-request/new-request-routing.module.ts


import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NewRequestComponent } from './new-request.component';
import { Router } from "@angular/router";

const routes: Routes = [
  // إنشاء جديد بدون ID
  { path: '', component: NewRequestComponent },

  // فتح سجل موجود بالـ ID
  { path: ':id', component: NewRequestComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NewRequestRoutingModule {
    constructor() {
    }
}