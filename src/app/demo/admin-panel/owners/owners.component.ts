import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { OwnersService, Owner } from './owners.service';
import { BuildingsService } from '../buildings/buildings.service';

import { SearchFilterComponent } from 'src/app/shared/search-filter/search-filter.component';
import { PaginationComponent } from 'src/app/theme/shared/components/pagination/pagination.component';

@Component({
  selector: 'app-owners',
  templateUrl: './owners.component.html',
  styleUrls: ['./owners.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    SearchFilterComponent,
    PaginationComponent
  ]
})
export class OwnersComponent implements OnInit {

  owners: Owner[] = [];
  filteredOwners: Owner[] = [];
  displayedOwners: Owner[] = [];

  // Filtres
  searchValue: string = '';
  filterValue: string = '';

  // pagination
  page = 1;
  pageSize = 10;
  total = 0;

  constructor(
    private ownersService: OwnersService,
    private buildingsService: BuildingsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.owners = this.ownersService.getOwners();
    this.filteredOwners = [...this.owners];      // Important !
    this.updateDisplayed();                      // Important !
  }

  /** Pagination */
  updateDisplayed() {
    this.total = this.filteredOwners.length;
    const start = (this.page - 1) * this.pageSize;
    this.displayedOwners = this.filteredOwners.slice(start, start + this.pageSize);
  }

  onPageChange(p: number) {
    this.page = p;
    this.updateDisplayed();
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.page = 1;
    this.updateDisplayed();
  }

  /** Filtres */
  onSearch(value: string) {
    this.searchValue = value.toLowerCase();
    this.applyFilters();
  }

  onFilter(value: string) {
    this.filterValue = value.toLowerCase();
    this.applyFilters();
  }

  applyFilters() {
    this.filteredOwners = this.owners.filter(o => {
      const matchSearch =
        !this.searchValue ||
        o.name.toLowerCase().includes(this.searchValue) ||
        o.adress.toLowerCase().includes(this.searchValue) ||
        o.country.toLowerCase().includes(this.searchValue);

      const matchFilter =
        !this.filterValue ||
        o.country.toLowerCase() === this.filterValue;

      return matchSearch && matchFilter;
    });

    this.page = 1;
    this.updateDisplayed();
  }

  /** Compte des bâtiments d’un propriétaire */
  getBuildingCount(ownerId: number): number {
    return this.buildingsService.getBuildingsByOwner(ownerId).length;
  }

  goToDetail(owner: Owner) {
    this.router.navigate(['demo/admin-panel/owners', owner.id]);
  }

  onAddNewClicked() {
    this.router.navigate(['demo/admin-panel/owners/new']);
  }

  onRefreshClicked() {
    this.ngOnInit(); // recharge
  }

  onPrintClicked() {
    window.print();
  }
}
