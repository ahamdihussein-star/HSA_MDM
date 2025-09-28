import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SyncGoldenRecordsComponent } from './sync-golden-records.component';

const routes: Routes = [
  { path: '', component: SyncGoldenRecordsComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SyncGoldenRecordsRoutingModule { }