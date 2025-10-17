import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RentalsComponent } from './rentals.component';
import { RentalsNewComponent } from './rentals-new.component';
import { RentalsDetailComponent } from './rentals-detail.component';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from 'src/app/theme/shared/shared.module';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

const routes: Routes = [
  { path: '', component: RentalsComponent },
  { path: 'new', component: RentalsNewComponent },
  { path: ':id', component: RentalsDetailComponent }
];

@NgModule({
  declarations: [
    RentalsComponent,
    RentalsNewComponent,
    RentalsDetailComponent
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
    RentalsComponent,
    RentalsNewComponent,
    RentalsDetailComponent
  ]
})
export class RentalsModule {}
