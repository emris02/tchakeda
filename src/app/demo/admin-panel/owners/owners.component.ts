import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OwnersService, Owner } from './owners.service';
import { BuildingsService, Building } from '../buildings/buildings.service';

@Component({
  selector: 'app-owners',
  templateUrl: './owners.component.html',
  styleUrls: ['./owners.component.scss'],
  standalone: false
})
export class OwnersComponent implements OnInit {
  owners: Owner[] = [];
  filteredOwners: Owner[] = [];
  filterName: string = '';
  filterCity: string = '';
  cityOptions: string[] = [];
  buildings: Building[] = [];
  // pagination
  page = 1;
  pageSize = 10;
  total = 0;
  displayedOwners: Owner[] = [];

  constructor(
    private ownersService: OwnersService,
    private buildingsService: BuildingsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.owners = this.ownersService.getOwners();
    this.buildings = this.buildingsService.getBuildings();
    this.cityOptions = Array.from(new Set(this.buildings.map(b => (b.city || '').toString()).filter(Boolean)));
    this.filteredOwners = [...this.owners];
    this.applyFilters();
  }

  getBuildingCount(ownerId: number): number {
    return this.buildings.filter(b => b.ownerId === ownerId).length;
  }

  goToDetail(owner: Owner) {
    this.router.navigate(['demo/admin-panel/owners', owner.id]);
  }

  goToNew() {
    this.router.navigate(['demo/admin-panel/owners/new']);
  }

  updateDisplayed() {
    this.total = this.filteredOwners.length;
    const start = (this.page - 1) * this.pageSize;
    this.displayedOwners = this.filteredOwners.slice(start, start + this.pageSize);
  }

  applyFilters() {
    const name = (this.filterName || '').toLowerCase();
    const city = (this.filterCity || '').toLowerCase();
    // owners don't have city directly; filter by buildings owned in the selected city
    const ownersInCity = city
      ? this.buildings.filter(b => (b.city || '').toLowerCase() === city).map(b => b.ownerId)
      : null;
    this.filteredOwners = this.owners.filter(o => {
      const matchName = !name || (o.name || '').toLowerCase().includes(name);
      const matchCity = !ownersInCity || ownersInCity.includes(o.id);
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
