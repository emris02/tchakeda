import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { BuildingsService, Building } from '../admin-panel/buildings/buildings.service';

export interface SearchCriteria {
  q?: string;
  category?: string;
  city?: string;
}

export interface FilterOptions {
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class BuildingSearchService {
  constructor(private buildingsService: BuildingsService) {}

  searchBuildings(criteria: SearchCriteria): Observable<Building[]> {
    // Simple client-side search using existing BuildingsService data
    const items = this.buildingsService.getBuildings();
    const q = (criteria.q || '').toLowerCase();
    const city = (criteria.city || '').toLowerCase();
    const filtered = items.filter(b => {
      const matchQ = !q || ((b.name || '') + ' ' + (b.address || '')).toLowerCase().includes(q);
      const matchCity = !city || (b.city || '').toLowerCase() === city;
      return matchQ && matchCity;
    });
    return of(filtered);
  }

  filterBuildings(filters: FilterOptions): Observable<Building[]> {
    return this.searchBuildings({ q: filters.q, city: filters.city });
  }
}
