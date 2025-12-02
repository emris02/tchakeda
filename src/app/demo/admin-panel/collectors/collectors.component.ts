
import { Component } from '@angular/core';
import { Router } from '@angular/router';
// Import corrigé pour éviter les erreurs de module introuvable
import { CollectorsService, Collector } from './collectors.service'; // force refresh

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from 'src/app/theme/shared/components/pagination/pagination.component';
import { SearchFilterComponent } from 'src/app/shared/search-filter/search-filter.component';

// Keep header navigation for collectors creation
@Component({
  selector: 'app-collectors',
  templateUrl: './collectors.component.html',
  styleUrls: ['./collectors.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, SearchFilterComponent]
})
export class CollectorsComponent {
  collectors: Collector[] = [];
  filteredCollectors: Collector[] = [];
  filterName: string = '';
  filterCity: string = '';
  cityOptions: string[] = [];
  // pagination
  page = 1;
  pageSize = 10;
  total = 0;
  displayedCollectors: Collector[] = [];

  constructor(private collectorsService: CollectorsService, private router: Router) {
    this.collectors = this.collectorsService.getCollectors();
    // Collectors don't have a `city` field in the domain model — use `country` as the location selector when available
    this.cityOptions = Array.from(new Set(this.collectors.map(c => (c.country || '').toString()).filter(Boolean)));
    this.filteredCollectors = [...this.collectors];
    this.applyFilters();
  }
  onSearch(term: string) {
    this.filterName = term || '';
    this.applyFilters();
  }

  onFilter(filters: any) {
    if (!filters) return;
    if (filters.category) {
      // no category on building model by default, keep for future
    }
    if (filters.city !== undefined) {
      this.filterCity = filters.city || '';
    }
    if (filters.q !== undefined) {
      this.filterName = filters.q || '';
    }
    this.applyFilters();
  }

  onRefreshClicked() {
    // re-fetch data from service and reapply filters
    this.collectors = this.collectorsService.getCollectors();
    this.cityOptions = Array.from(new Set(this.collectors.map(c => (c.country || '').toString()).filter(Boolean)));
    this.applyFilters();
  }

  onPrintClicked() {
    // print current filtered view
    window.print();
  }

  onAddNewClicked() {
    this.goToNewCollector();
  }

  goToNewCollector() {
    this.router.navigate(['demo/admin-panel/collectors/new']);
  }

  editCollector(collector: Collector) {
    // Redirige vers la page de détail pour édition inline
    this.router.navigate(['demo/admin-panel/collectors', collector.id]);
  }

  deleteCollector(collector: Collector) {
    if (confirm('Supprimer ce recouvreur ?')) {
      this.collectorsService.deleteCollector(collector.id);
      this.collectors = this.collectorsService.getCollectors();
      this.updateDisplayed();
    }
  }

  updateDisplayed() {
    this.total = this.filteredCollectors.length;
    const start = (this.page - 1) * this.pageSize;
    this.displayedCollectors = this.filteredCollectors.slice(start, start + this.pageSize);
  }

  applyFilters() {
    const name = (this.filterName || '').toLowerCase();
    const city = (this.filterCity || '').toLowerCase();
    this.filteredCollectors = this.collectors.filter(c => {
      const fullName = (c.fullName || '').toString();
      const email = (c.email || '').toString();
      const phone = (c.phone || '').toString();
      const address = (c.address || '').toString();
      const country = (c.country || '').toString();
      const matchName = !name || fullName.toLowerCase().includes(name) || email.toLowerCase().includes(name) || phone.toLowerCase().includes(name) || address.toLowerCase().includes(name);
      const matchCity = !city || country.toLowerCase() === city;
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

