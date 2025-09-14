

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GoldenRequestsComponent } from './golden-requests.component';
import { Router } from "@angular/router";

const routes: Routes = [{ path: '', component: GoldenRequestsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GoldenRequestsRoutingModule {
    constructor() {
    }
 }
