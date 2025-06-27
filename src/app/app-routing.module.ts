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
  
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
