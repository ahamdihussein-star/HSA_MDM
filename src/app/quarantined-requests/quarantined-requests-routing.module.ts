import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuarantinedRequestsComponent } from './quarantined-requests.component';

const routes: Routes = [{ path: '', component: QuarantinedRequestsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class QuarantinedRequestsRoutingModule { }
