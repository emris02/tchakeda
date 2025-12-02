import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RecoveriesService, Recovery } from './recoveries.service';
import { RentalsService } from '../rentals/rentals.service';
import { SearchFilterComponent } from 'src/app/shared/search-filter/search-filter.component';
import { PaginationComponent } from 'src/app/theme/shared/components/pagination/pagination.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-recoveries',
  templateUrl: './recoveries.component.html',
  styleUrls: ['./recoveries.component.scss'],
  standalone: true, 
  imports: [
    SearchFilterComponent,
    PaginationComponent,
    CommonModule
  ]
})
export class RecoveriesComponent implements OnInit {
  recoveries: Recovery[] = [];
  filteredRecoveries: Recovery[] = [];
  filterName: string = '';
  filterCity: string = '';
  cityOptions: string[] = [];
  // pagination
  page = 1;
  pageSize = 10;
  total = 0;
  displayedRecoveries: Recovery[] = [];

  constructor(
    private recoveriesService: RecoveriesService,
    private rentalsService: RentalsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.recoveries = this.recoveriesService.getRecoveries();
    // Derive location options from related rentals
    const derivedLocations = this.recoveries
      .map(r => {
        const rental = this.rentalsService.getRentalById(r.rentalId);
        return rental ? (rental.buildingName || '') : '';
      })
      .filter(Boolean);
    this.cityOptions = Array.from(new Set(derivedLocations));
    this.filteredRecoveries = [...this.recoveries];
    this.applyFilters();
  }
  
  /** Chargement initial des données */
  private loadData(): void {
    this.recoveries = this.recoveriesService.getRecoveries();

    // Récupère toutes les villes uniques pour le filtre
    this.cityOptions = Array.from(new Set(
      this.recoveries
        .map(b => (b.name || '').trim())
        .filter(Boolean)
    ));

    this.filteredRecoveries = [...this.recoveries];
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
  goToDetail(recovery: Recovery) {
    this.router.navigate(['demo/admin-panel/recoveries', recovery.id]);
  }

  goToNew() {
    this.router.navigate(['demo/admin-panel/recoveries/new']);
  }

  goToNewCollector() {
    this.router.navigate(['demo/admin-panel/collectors/new']);
  }

  updateDisplayed() {
    this.total = this.filteredRecoveries.length;
    const start = (this.page - 1) * this.pageSize;
    this.displayedRecoveries = this.filteredRecoveries.slice(start, start + this.pageSize);
  }

  applyFilters() {
    const name = (this.filterName || '').toLowerCase();
    const city = (this.filterCity || '').toLowerCase();
    this.filteredRecoveries = this.recoveries.filter(r => {
      const rental = this.rentalsService.getRentalById(r.rentalId);
      const tenantName = rental ? (rental.tenantName || '') : '';
      const apartmentName = rental ? (rental.apartmentName || '') : '';
      const matchName = !name || (r.name || '').toLowerCase().includes(name) 
        || tenantName.toLowerCase().includes(name) 
        || apartmentName.toLowerCase().includes(name);
      const buildingName = rental ? (rental.buildingName || '') : '';
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
