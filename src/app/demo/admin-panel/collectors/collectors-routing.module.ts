import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CollectorsComponent } from './collectors.component';

const routes: Routes = [
  { path: '', component: CollectorsComponent },
  { path: 'new', loadComponent: () => import('./collectors-new.component').then(m => m.CollectorsNewComponent) },
  { path: ':id', loadComponent: () => import('./collectors-detail.component').then(m => m.CollectorsDetailComponent) }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CollectorsRoutingModule {}
