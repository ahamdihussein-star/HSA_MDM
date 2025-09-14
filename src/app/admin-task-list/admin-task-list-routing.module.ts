

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminTaskListComponent } from './admin-task-list.component';
import { Router } from "@angular/router";

const routes: Routes = [{ path: '', component: AdminTaskListComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminTaskListRoutingModule {
    constructor() {
    }
 }
