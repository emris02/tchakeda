import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Standalone components (importer, pas déclarer)
import { BreadcrumbComponent } from './components/breadcrumb/breadcrumb.component';
import { CardComponent } from './components/card/card.component';
import { PaginationComponent } from './components/pagination/pagination.component';
import { SearchFilterComponent } from '../../shared/search-filter/search-filter.component';
import { ContractsPanelComponent } from '../../shared/contracts/contracts-panel.component';
import { ContractPreviewComponent } from '../../shared/contracts/contract-preview.component';

// Third-party
import { NgScrollbarModule } from 'ngx-scrollbar';
import 'hammerjs';
import 'mousetrap';

// Bootstrap
import { NgbDropdownModule, NgbNavModule, NgbModule } from '@ng-bootstrap/ng-bootstrap';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    BreadcrumbComponent,     // <-- standalone components doivent être importés ici
    CardComponent,
    PaginationComponent,
    SearchFilterComponent,
    ContractsPanelComponent,
    ContractPreviewComponent,
    NgbDropdownModule,
    NgbNavModule,
    NgbModule,
    NgScrollbarModule
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    BreadcrumbComponent,
    CardComponent,
    PaginationComponent,
    SearchFilterComponent,
    ContractsPanelComponent,
    ContractPreviewComponent,
    NgbModule,
    NgbDropdownModule,
    NgbNavModule,
    NgScrollbarModule
  ]
})
export class SharedModule {}
