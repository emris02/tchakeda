import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OwnersComponent } from './owners.component';
import { OwnersNewComponent } from './owners-new.component';
import { OwnersDetailComponent } from './owners-detail.component';
import { OwnersPaymentsComponent } from './owners-payments.component';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from 'src/app/theme/shared/shared.module';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

const routes: Routes = [
  { path: '', component: OwnersComponent },
  { path: 'new', component: OwnersNewComponent },
  { path: 'payments', component: OwnersPaymentsComponent },
  { path: ':id', component: OwnersDetailComponent }
];

@NgModule({
  declarations: [
    OwnersNewComponent,
    OwnersDetailComponent,
    OwnersPaymentsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    RouterModule.forChild(routes)
  ],
  exports: [
    OwnersNewComponent,
    OwnersDetailComponent,
    OwnersPaymentsComponent
  ]
})
export class OwnersModule {}
