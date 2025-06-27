import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GoldenRequestsComponent } from './golden-requests.component';

const routes: Routes = [{ path: '', component: GoldenRequestsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GoldenRequestsRoutingModule { }
