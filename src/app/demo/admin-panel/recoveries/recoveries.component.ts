  // ...existing code...
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RecoveriesService, Recovery } from './recoveries.service';
import { RentalsService } from '../rentals/rentals.service';

@Component({
  selector: 'app-recoveries',
  templateUrl: './recoveries.component.html',
  styleUrls: ['./recoveries.component.scss'],
  standalone: false
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

  constructor(private recoveriesService: RecoveriesService, private rentalsService: RentalsService, private router: Router) {}

  ngOnInit(): void {
    this.recoveries = this.recoveriesService.getRecoveries();
    // Derive location options from related rentals (building names) when available
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
      const matchName = !name || (r.name || '').toLowerCase().includes(name) || tenantName.toLowerCase().includes(name) || apartmentName.toLowerCase().includes(name);
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
