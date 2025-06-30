import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DuplicateRecordsComponent } from './duplicate-records.component';

const routes: Routes = [{ path: '', component: DuplicateRecordsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DuplicateRecordsRoutingModule { }
