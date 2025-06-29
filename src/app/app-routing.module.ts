import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

const routes: Routes = [
  {
    path: "",
    loadChildren: () =>
      import("./login/login.module").then((m) => m.LoginModule),
  },
  {
    path: "dashboard/:page",
    loadChildren: () =>
      import("./dashboard/dashboard.module").then((m) => m.DashboardModule),
  },
  { path: 'quarantined-requests', loadChildren: () => import('./quarantined-requests/quarantined-requests.module').then(m => m.QuarantinedRequestsModule) },
  { path: 'golden-requests', loadChildren: () => import('./golden-requests/golden-requests.module').then(m => m.GoldenRequestsModule) },
  { path: 'my-requests', loadChildren: () => import('./my-requests/my-requests.module').then(m => m.MyRequestsModule) },
  { path: 'home', loadChildren: () => import('./home/home.module').then(m => m.HomeModule) },
  { path: 'ai-assistant', loadChildren: () => import('./ai-assistant/ai-assistant.module').then(m => m.AiAssistantModule) },
  {
    path: "dashboard/new-request/:id",
    loadChildren: () =>
      import("./dashboard/dashboard.module").then((m) => m.DashboardModule),
  },
  { path: 'my-task-list', loadChildren: () => import('./my-task-list/my-task-list.module').then(m => m.MyTaskListModule) },
  { path: 'data-lineage', loadChildren: () => import('./data-lineage/data-lineage.module').then(m => m.DataLineageModule) },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
