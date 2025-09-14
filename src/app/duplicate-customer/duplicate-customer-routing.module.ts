

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DuplicateCustomerComponent } from './duplicate-customer.component';
import { Router } from "@angular/router";

const routes: Routes = [{ path: '', component: DuplicateCustomerComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DuplicateCustomerRoutingModule {
    constructor() {
    }
 }
