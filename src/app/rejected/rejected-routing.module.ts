

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RejectedComponent } from './rejected.component';
import { Router } from "@angular/router";

const routes: Routes = [{ path: '', component: RejectedComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RejectedRoutingModule {
    constructor() {
    }
 }
