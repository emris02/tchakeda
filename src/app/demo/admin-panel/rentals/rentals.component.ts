import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RentalsService, Rental } from './rentals.service';
// import { MatDialog } from '@angular/material/dialog';
// import { RentalFormComponent } from './components/rental-form.component';

@Component({
  selector: 'app-rentals',
  templateUrl: './rentals.component.html',
  styleUrls: ['./rentals.component.scss'],
  standalone: false
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
    // Rentals do not have a `city` field directly; use `buildingName` as the location selector
    this.cityOptions = Array.from(new Set(this.rentals.map(r => (r.buildingName || '').toString()).filter(Boolean)));
    this.filteredRentals = [...this.rentals];
    this.applyFilters();
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
      const matchName = !name || tenantName.toLowerCase().includes(name) || apartmentName.toLowerCase().includes(name);
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
