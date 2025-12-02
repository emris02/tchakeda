import { NgModule } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecoveriesComponent } from './recoveries.component';
import { RecoveriesNewComponent } from './recoveries-new.component';
import { RecoveriesDetailComponent } from './recoveries-detail.component';
import { RecoveriePaymentsComponent } from './recoveries-payments.component';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from 'src/app/theme/shared/shared.module';

const routes: Routes = [
  { path: '', component: RecoveriesComponent },
  { path: 'new', component: RecoveriesNewComponent },
  { path: 'payments', component: RecoveriePaymentsComponent },
  { path: ':id', component: RecoveriesDetailComponent }
];

@NgModule({
  declarations: [
    RecoveriesNewComponent,
    RecoveriesDetailComponent,
    RecoveriePaymentsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    RouterModule.forChild(routes),
    CurrencyPipe
  ],
  exports: [
    RecoveriesNewComponent,
    RecoveriesDetailComponent,
    RecoveriePaymentsComponent
  ]
})
export class RecoveriesModule {}
