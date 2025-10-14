import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ExecutiveDashboardComponent } from './executive-dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: ExecutiveDashboardComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ExecutiveDashboardRoutingModule { }
