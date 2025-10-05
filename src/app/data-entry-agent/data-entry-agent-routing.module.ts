import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DataEntryAgentComponent } from './data-entry-agent.component';

const routes: Routes = [
  {
    path: '',
    component: DataEntryAgentComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DataEntryAgentRoutingModule { }
