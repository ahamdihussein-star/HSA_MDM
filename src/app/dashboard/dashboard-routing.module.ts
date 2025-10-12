// src/app/dashboard/dashboard-routing.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { PdfBulkGeneratorComponent } from '../pdf-bulk-generator/pdf-bulk-generator.component';
import { GoldenSummaryComponent } from './golden-summary/golden-summary.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    children: [
      // الصفحة الافتراضية داخل الداشبورد
      { path: '', pathMatch: 'full', redirectTo: 'golden-requests' },

      // Golden Summary (standalone داخل نفس الموديول)
      { path: 'golden-summary', component: GoldenSummaryComponent },
      { path: 'golden-summary/:id', component: GoldenSummaryComponent },

      // === Data Management (للـ Admin) ===
      {
        path: 'data-management',
        loadChildren: () =>
          import('../admin-data-management/admin-data-management.module')
            .then(m => m.AdminDataManagementModule)
      },

      // === Golden Records / Requests (aliasين لنفس الموديول) ===
      {
        path: 'golden-requests',
        loadChildren: () =>
          import('../golden-requests/golden-requests.module')
            .then(m => m.GoldenRequestsModule)
      },
      {
        path: 'golden-records',
        loadChildren: () =>
          import('../golden-requests/golden-requests.module')
            .then(m => m.GoldenRequestsModule)
      },

      // === Quarantine (الجديدة) ===
      {
        path: 'quarantine',
        loadChildren: () =>
          import('../quarantine/quarantine.module')
            .then(m => m.QuarantineModule)
      },

      // === My Task List (3 aliases للتوافق) ===
      {
        path: 'my-task',
        loadChildren: () =>
          import('../my-task-list/my-task-list.module')
            .then(m => m.MyTaskListModule)
      },
      {
        path: 'my-tasks',
        loadChildren: () =>
          import('../my-task-list/my-task-list.module')
            .then(m => m.MyTaskListModule)
      },
      {
        path: 'my-task-list',  // المسار المطلوب الذي يستخدم في HTML
        loadChildren: () =>
          import('../my-task-list/my-task-list.module')
            .then(m => m.MyTaskListModule)
      },

      // === Compliance Task List (aliasين) ===
      {
        path: 'compliance-task-list',
        loadChildren: () =>
          import('../compliance/compliance.module')
            .then(m => m.ComplianceModule)
      },
      {
        path: 'compliance-tasks',
        loadChildren: () =>
          import('../compliance/compliance.module')
            .then(m => m.ComplianceModule)
      },

      // === Duplicate (3 aliases للتوافق) ===
      {
        path: 'duplicate-records',  // المسار المستخدم في HTML
        loadChildren: () =>
          import('../duplicate-records/duplicate-records.module')
            .then(m => m.DuplicateRecordsModule)
      },
      {
        path: 'duplicate-requests',
        loadChildren: () =>
          import('../duplicate-records/duplicate-records.module')
            .then(m => m.DuplicateRecordsModule)
      },
      {
        path: 'duplicate-customer',
        loadChildren: () =>
          import('../duplicate-customer/duplicate-customer.module')
            .then(m => m.DuplicateCustomerModule)
      },

      // === Home ===
      {
        path: 'home',
        loadChildren: () =>
          import('../home/home.module')
            .then(m => m.HomeModule)
      },

      // === New Request (مع ID parameter) ===
      {
        path: 'new-request',
        loadChildren: () =>
          import('../new-request/new-request.module')
            .then(m => m.NewRequestModule)
      },
      {
        path: 'new-request/:id',
        loadChildren: () =>
          import('../new-request/new-request.module')
            .then(m => m.NewRequestModule)
      },

      // === Admin Task List ===
      {
        path: 'admin-task-list',
        loadChildren: () =>
          import('../admin-task-list/admin-task-list.module')
            .then(m => m.AdminTaskListModule)
      },

      // === Rejected ===
      {
        path: 'rejected',
        loadChildren: () =>
          import('../rejected/rejected.module')
            .then(m => m.RejectedModule)
      },

      // === Data Lineage ===
      {
        path: 'data-lineage',
        loadChildren: () =>
          import('../data-lineage/data-lineage.module')
            .then(m => m.DataLineageModule)
      },

      // === Executive Dashboard ===
      {
        path: 'executive',
        loadChildren: () =>
          import('../executive-dashboard/executive-dashboard.module')
            .then(m => m.ExecutiveDashboardModule)
      },

      // === Technical Dashboard ===
      {
        path: 'technical',
        loadChildren: () =>
          import('../technical-dashboard/technical-dashboard.module')
            .then(m => m.TechnicalDashboardModule)
      },

      // === Business Dashboard ===
      {
        path: 'business',
        loadChildren: () =>
          import('../business-dashboard/business-dashboard.module')
            .then(m => m.BusinessDashboardModule)
      },

      // === Sync Golden Records ===
      {
        path: 'sync-golden-records',
        loadChildren: () =>
          import('../sync-golden-records/sync-golden-records.module')
            .then(m => m.SyncGoldenRecordsModule)
      },

      // === User Management ===
      {
        path: 'user-management',
        loadChildren: () =>
          import('../user-management/user-management.module')
            .then(m => m.UserManagementModule)
      },

      // === User Profile ===
      {
        path: 'profile',
        loadChildren: () =>
          import('../user-profile/user-profile.module')
            .then(m => m.UserProfileModule)
      },

      // === PDF Bulk Generator ===
      { path: 'pdf-bulk-generator', component: PdfBulkGeneratorComponent },

      // === Compliance Agent ===
      {
        path: 'compliance-agent',
        loadChildren: () =>
          import('../compliance-agent/compliance-agent.module')
            .then(m => m.ComplianceAgentModule)
      },

      
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }