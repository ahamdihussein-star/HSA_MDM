// src/app/app-routing.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  // Login (lazy)
  {
    path: "",
    loadChildren: () =>
      import("./login/login.module").then((m) => m.LoginModule),
  },

  // Dashboard shell + كل الصفحات الداخلية كـ children داخل DashboardRoutingModule
  {
    path: "dashboard",
    loadChildren: () =>
      import("./dashboard/dashboard.module").then((m) => m.DashboardModule),
  },

  // ====== Redirects قديمة إلى المسارات الجديدة تحت /dashboard ======
  { path: "my-task-list", redirectTo: "dashboard/my-task", pathMatch: "full" },
  { path: "admin-task-list", redirectTo: "dashboard/admin-task-list", pathMatch: "full" },
  { path: "golden-requests", redirectTo: "dashboard/golden-requests", pathMatch: "full" },
  { path: "my-requests", redirectTo: "dashboard/my-requests", pathMatch: "full" },
  { path: "data-lineage", redirectTo: "dashboard/data-lineage", pathMatch: "full" },
  { path: "duplicate-records", redirectTo: "dashboard/duplicate-records", pathMatch: "full" },
  { path: "duplicate-customer", redirectTo: "dashboard/duplicate-customer", pathMatch: "full" },
  { path: "rejected", redirectTo: "dashboard/rejected", pathMatch: "full" },

  // Fallback
  { path: "**", redirectTo: "" }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}