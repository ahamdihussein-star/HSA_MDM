

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MyTaskListComponent } from './my-task-list.component';
import { Router } from "@angular/router";

const routes: Routes = [{ path: '', component: MyTaskListComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MyTaskListRoutingModule {
    constructor() {
    }
 }
