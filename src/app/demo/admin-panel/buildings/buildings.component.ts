import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CollectorsService } from '../collectors/collectors.service';
import { BuildingsService, Building } from './buildings.service';
// Keep header navigation for building creation
import { OwnersService, Owner } from '../owners/owners.service';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from 'src/app/theme/shared/components/pagination/pagination.component';
import { SearchFilterComponent } from 'src/app/shared/search-filter/search-filter.component';

@Component({
  selector: 'app-buildings',
  templateUrl: './buildings.component.html',
  styleUrls: ['./buildings.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, SearchFilterComponent]
})
export class BuildingsComponent implements OnInit {
  buildings: Building[] = [];
  filteredBuildings: Building[] = [];
  owners: Owner[] = [];
  filterName: string = '';
  filterCity: string = '';
  cityOptions: string[] = [];
  collectorContextId: number | null = null;
  // pagination
  page = 1;
  pageSize = 10;
  total = 0;
  displayedBuildings: Building[] = [];

  constructor(
    private buildingsService: BuildingsService,
    private ownersService: OwnersService,
    private router: Router,
    private route: ActivatedRoute,
    public collectorsService: CollectorsService
  ) {}

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
    this.buildings = this.buildingsService.getBuildings();
    this.cityOptions = Array.from(new Set(this.buildings.map(b => (b.city || '').toString()).filter(Boolean)));
    this.applyFilters();
  }

  onPrintClicked() {
    // print current filtered view
    window.print();
  }

  onAddNewClicked() {
    this.goToNew();
  }

  ngOnInit(): void {
    this.buildings = this.buildingsService.getBuildings();
    this.owners = this.ownersService.getOwners();
    // prepare city options for the header select
    this.cityOptions = Array.from(new Set(this.buildings.map(b => (b.city || '').toString()).filter(Boolean)));
    this.filteredBuildings = [...this.buildings];
    this.applyFilters();
    // read optional collector context from query params (when navigated from a collector detail)
    const q = this.route.snapshot.queryParamMap.get('collectorId');
    this.collectorContextId = q ? Number(q) : null;
    // also subscribe to updates
    this.route.queryParamMap.subscribe(m => {
      const qq = m.get('collectorId');
      this.collectorContextId = qq ? Number(qq) : null;
    });
  }

  getOwnerName(ownerId: number | null | undefined): string {
    if (!ownerId) return '';
    const owner = this.owners.find(o => o.id === ownerId);
    return owner ? owner.name : '';
  }

  goToDetail(building: Building) {
    const extras: any = {};
    if (this.collectorContextId) extras.queryParams = { collectorId: this.collectorContextId };
    this.router.navigate(['demo/admin-panel/buildings', building.id], extras);
  }

  goToNew() {
    this.router.navigate(['demo/admin-panel/buildings/new']);
  }

  updateDisplayed() {
    this.total = this.filteredBuildings.length;
    const start = (this.page - 1) * this.pageSize;
    this.displayedBuildings = this.filteredBuildings.slice(start, start + this.pageSize);
  }

  applyFilters() {
    const name = (this.filterName || '').toLowerCase();
    const city = (this.filterCity || '').toLowerCase();
    this.filteredBuildings = this.buildings.filter(b => {
      const matchName = !name || (b.name || '').toLowerCase().includes(name) || (b.address || '').toLowerCase().includes(name);
      const matchCity = !city || (b.city || '').toLowerCase() === city;
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
