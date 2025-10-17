// Angular Import
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// project import
import { AdminComponent } from './theme/layout/admin/admin.component';
import { GuestComponent } from './theme/layout/guest/guest.component';

const routes: Routes = [
  {
    path: '',
    component: AdminComponent,
    children: [
      {
        path: '',
        redirectTo: '/analytics',
        pathMatch: 'full'
      },
      {
        path: 'analytics',
        loadComponent: () => import('./demo/dashboard/dash-analytics.component').then((c) => c.DashAnalyticsComponent)
      },
      {
        path: 'component',
        loadChildren: () => import('./demo/ui-element/ui-basic.module').then((m) => m.UiBasicModule)
      },
      {
        path: 'demo/admin-panel/buildings',
        loadChildren: () => import('./demo/admin-panel/buildings/buildings.module').then(m => m.BuildingsModule)
      },
      {
        path: 'demo/admin-panel/owners',
        loadChildren: () => import('./demo/admin-panel/owners/owners.module').then(m => m.OwnersModule)
      },
      {
        path: 'demo/admin-panel/owners/payments',
        loadComponent: () => import('./demo/admin-panel/owners/owners-payments.component').then(c => c.OwnersPaymentsComponent)
      },
      {
        path: 'demo/admin-panel/tenants',
        loadChildren: () => import('./demo/admin-panel/tenants/tenants.module').then(m => m.TenantsModule)
      },
      {
        path: 'demo/admin-panel/apartments',
        loadChildren: () => import('./demo/admin-panel/apartments/apartments.module').then(m => m.ApartmentsModule)
      },
      {
        path: 'demo/admin-panel/rentals',
        loadChildren: () => import('./demo/admin-panel/rentals/rentals.module').then(m => m.RentalsModule)
      },
      {
        path: 'demo/admin-panel/recoveries',
        loadChildren: () => import('./demo/admin-panel/recoveries/recoveries.module').then(m => m.RecoveriesModule)
      },
      {
        path: 'demo/admin-panel/recoveries/payments',
        loadComponent: () => import('./demo/admin-panel/recoveries/recoveries-payments.component').then(c => c.RecoveriePaymentsComponent)
      },
      {
        path: 'demo/admin-panel/collectors',
        loadChildren: () => import('./demo/admin-panel/collectors/collectors.module').then(m => m.CollectorsModule)
      },
    ]
  },
  {
    path: '',
    component: GuestComponent,
    children: [
      {
        path: 'login',
        loadComponent: () => import('./demo/pages/authentication/sign-up/sign-up.component').then((c) => c.SignUpComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./demo/pages/authentication/sign-in/sign-in.component').then((c) => c.SignInComponent)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
