import { NgModule } from '@angular/core';
import { CommonModule, TitleCasePipe, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ApartmentsComponent } from './apartments.component';
import { ApartmentsNewComponent } from './apartments-new.component';
import { ApartmentsDetailComponent } from './apartments-detail.component';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from 'src/app/theme/shared/shared.module';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

const routes: Routes = [
  { path: '', component: ApartmentsComponent },
  { path: 'new', component: ApartmentsNewComponent },
  { path: ':id', component: ApartmentsDetailComponent }
];

@NgModule({
  declarations: [
    ApartmentsComponent,
    ApartmentsDetailComponent,
    ApartmentsNewComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    RouterModule.forChild(routes)
  ],
  providers: [TitleCasePipe, DecimalPipe, DatePipe],
  exports: [
    ApartmentsComponent,
    ApartmentsDetailComponent,
    ApartmentsNewComponent
  ]
})
export class ApartmentsModule {}
