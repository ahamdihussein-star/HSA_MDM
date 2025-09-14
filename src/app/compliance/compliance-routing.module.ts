

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ComplianceTaskListComponent } from './compliance-task-list/compliance-task-list.component';
import { Router } from "@angular/router";

const routes: Routes = [
  {
    path: '',
    component: ComplianceTaskListComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ComplianceRoutingModule {
    constructor() {
    }
}