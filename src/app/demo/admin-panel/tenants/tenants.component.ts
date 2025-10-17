import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TenantsService, Tenant } from './tenants.service';
import { RentalsService, Rental } from '../rentals/rentals.service';

@Component({
  selector: 'app-tenants',
  templateUrl: './tenants.component.html',
  styleUrls: ['./tenants.component.scss'],
  standalone: false
})
export class TenantsComponent implements OnInit {
  tenants: Tenant[] = [];
  rentalsMap: { [tenantId: number]: Rental | undefined } = {};

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
}
