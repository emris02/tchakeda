import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CollectorsComponent } from './collectors.component';
import { CollectorsNewComponent } from './collectors-new.component';
import { CollectorsDetailComponent } from './collectors-detail.component';
import { FormsModule } from '@angular/forms';
import { CollectorsRoutingModule } from './collectors-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    CollectorsRoutingModule,
    CollectorsComponent,
    CollectorsNewComponent,
    CollectorsDetailComponent
  ]
})
export class CollectorsModule {}
