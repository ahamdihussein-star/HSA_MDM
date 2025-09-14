

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DataLineageComponent } from './data-lineage.component';
import { Router } from "@angular/router";

const routes: Routes = [{ path: '', component: DataLineageComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DataLineageRoutingModule {
    constructor() {
    }
 }
