import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TenantsService, Tenant } from './tenants.service';
import { RentalsService, Rental } from '../rentals/rentals.service';
import { SearchFilterComponent } from 'src/app/shared/search-filter/search-filter.component';
import { PaginationComponent } from 'src/app/theme/shared/components/pagination/pagination.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tenants',
  templateUrl: './tenants.component.html',
  styleUrls: ['./tenants.component.scss'],
  standalone: true,
  imports: [
    CommonModule,          // pour les pipes comme date ou currency
    SearchFilterComponent, // composant de filtre
    PaginationComponent    // composant de pagination
  ]
})
export class TenantsComponent implements OnInit {
  tenants: Tenant[] = [];
  filteredTenants: Tenant[] = [];
  filterName: string = '';
  filterCity: string = '';
  cityOptions: string[] = [];
  rentalsMap: { [tenantId: number]: Rental | undefined } = {};
  // pagination
  page = 1;
  pageSize = 10;
  total = 0;
  displayedTenants: Tenant[] = [];

  constructor(
    private tenantsService: TenantsService,
    private rentalsService: RentalsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.tenants = this.tenantsService.getTenants();
    this.tenants.forEach(tenant => {
      const rentals = this.rentalsService.getRentalsByTenant(tenant.id);
      this.rentalsMap[tenant.id] = rentals.length > 0 ? rentals[0] : undefined;
    });
    this.cityOptions = Array.from(
      new Set(this.tenants.map(t => (t.city || '').toString()).filter(Boolean))
    );
    this.filteredTenants = [...this.tenants];
    this.applyFilters();
  }

  
  /** Chargement initial des données */
  private loadData(): void {
    this.tenants = this.tenantsService.getTenants();

    // Récupère toutes les villes uniques pour le filtre
    this.cityOptions = Array.from(new Set(
      this.tenants
        .map(b => (b.city || '').trim())
        .filter(Boolean)
    ));

    this.filteredTenants = [...this.tenants];
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

  updateDisplayed() {
    this.total = this.filteredTenants.length;
    const start = (this.page - 1) * this.pageSize;
    this.displayedTenants = this.filteredTenants.slice(start, start + this.pageSize);
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

  getTenantRent(tenant: Tenant): string {
    const rental = this.rentalsMap[tenant.id];
    return rental && rental.price ? rental.price + ' FCFA' : '-';
  }

  getTenantStartDate(tenant: Tenant): string {
    const rental = this.rentalsMap[tenant.id];
    return rental && rental.startDate ? rental.startDate : '-';
  }

  goToDetail(tenant: Tenant) {
    this.router.navigate(['demo/admin-panel/tenants', tenant.id]);
  }

  goToNew() {
    this.router.navigate(['demo/admin-panel/tenants/new']);
  }

  applyFilters() {
    const name = (this.filterName || '').toLowerCase();
    const city = (this.filterCity || '').toLowerCase();
    this.filteredTenants = this.tenants.filter(t => {
      const fullName = (t.fullName || '').toString();
      const email = (t.email || '').toString();
      const cityVal = (t.city || '').toString();
      const matchName =
        !name ||
        fullName.toLowerCase().includes(name) ||
        email.toLowerCase().includes(name);
      const matchCity = !city || cityVal.toLowerCase() === city;
      return matchName && matchCity;
    });
    this.page = 1;
    this.updateDisplayed();
  }
}
