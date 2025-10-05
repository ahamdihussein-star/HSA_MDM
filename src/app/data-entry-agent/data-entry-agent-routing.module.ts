import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DataEntryChatWidgetComponent } from './data-entry-chat-widget.component';

const routes: Routes = [
  {
    path: '',
    component: DataEntryChatWidgetComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DataEntryAgentRoutingModule { }
