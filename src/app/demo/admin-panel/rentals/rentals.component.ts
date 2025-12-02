import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RentalsService, Rental } from './rentals.service';
import { SearchFilterComponent } from 'src/app/shared/search-filter/search-filter.component';
import { PaginationComponent } from 'src/app/theme/shared/components/pagination/pagination.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rentals',
  templateUrl: './rentals.component.html',
  styleUrls: ['./rentals.component.scss'],
  standalone: true,
  imports: [
    CommonModule,           // pour pipes | date ou | currency
    SearchFilterComponent,  // filtre de recherche
    PaginationComponent     // pagination
  ]
})
export class RentalsComponent implements OnInit {
  rentals: Rental[] = [];
  filteredRentals: Rental[] = [];
  filterName: string = '';
  filterCity: string = '';
  cityOptions: string[] = [];
  // pagination
  page = 1;
  pageSize = 10;
  total = 0;
  displayedRentals: Rental[] = [];

  constructor(private rentalsService: RentalsService, private router: Router) {}

  ngOnInit(): void {
    this.rentals = this.rentalsService.getRentals();
    this.cityOptions = Array.from(
      new Set(this.rentals.map(r => (r.buildingName || '').toString()).filter(Boolean))
    );
    this.filteredRentals = [...this.rentals];
    this.applyFilters();
  }

  /** Chargement initial des données */
  private loadData(): void {
    this.rentals = this.rentalsService.getRentals();

    // Récupère toutes les villes uniques pour le filtre
    this.cityOptions = Array.from(new Set(
      this.rentals
        .map(b => (b.buildingName || '').trim())
        .filter(Boolean)
    ));

    this.filteredRentals = [...this.rentals];
    this.applyFilters();
  }
/** Recherche globale par nom */
  onSearch(term: string): void {
    this.filterName = term || '';
    this.applyFilters();
  }

  /** Filtrage dynamique depuis SearchFilterComponent */
  onFilter(filters: any): void {
    if (!filters) return;

    if (filters.city !== undefined) {
      this.filterCity = filters.city || '';
    }

    if (filters.q !== undefined) {
      this.filterName = filters.q || '';
    }

    this.applyFilters();
  }

  /** Recharger la liste */
  onRefreshClicked(): void {
    this.loadData();
  }

  /** Imprimer la vue courante */
  onPrintClicked(): void {
    window.print();
  }

  /** Navigation vers le formulaire de création */
  onAddNewClicked(): void {
    this.goToNew();
  }
  
  goToDetail(rental: Rental) {
    this.router.navigate(['demo/admin-panel/rentals', rental.id]);
  }

  goToNew() {
    this.router.navigate(['demo/admin-panel/rentals/new']);
  }

  updateDisplayed() {
    this.total = this.filteredRentals.length;
    const start = (this.page - 1) * this.pageSize;
    this.displayedRentals = this.filteredRentals.slice(start, start + this.pageSize);
  }

  applyFilters() {
    const name = (this.filterName || '').toLowerCase();
    const city = (this.filterCity || '').toLowerCase();
    this.filteredRentals = this.rentals.filter(r => {
      const tenantName = (r.tenantName || '').toString();
      const apartmentName = (r.apartmentName || '').toString();
      const buildingName = (r.buildingName || '').toString();
      const matchName =
        !name ||
        tenantName.toLowerCase().includes(name) ||
        apartmentName.toLowerCase().includes(name);
      const matchCity = !city || buildingName.toLowerCase() === city;
      return matchName && matchCity;
    });
    this.page = 1;
    this.updateDisplayed();
  }

  onPageChange(p: number) {
    this.page = p;
    this.updateDisplayed();
  }

  onPageSizeChange(s: number) {
    this.pageSize = s;
    this.page = 1;
    this.updateDisplayed();
  }
}
