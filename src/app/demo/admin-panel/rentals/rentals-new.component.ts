import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { OwnerFormComponent } from '../owners/components/owner-form.component';
import { BuildingFormComponent } from '../buildings/components/building-form.component';
import { ApartmentFormComponent } from '../apartments/components/apartment-form.component';
import { TenantFormComponent } from '../tenants/components/tenant-form.component';
import { RentalsService } from './rentals.service';
import { ApartmentsService } from '../apartments/apartments.service';
import { TenantsService } from '../tenants/tenants.service';
import { OwnersService } from '../owners/owners.service';
import { BuildingsService } from '../buildings/buildings.service';
import { CollectorsService } from '../collectors/collectors.service';
import { CollectorsFormComponent } from '../collectors/components/collectors-form.component';

@Component({
  selector: 'app-rentals-new',
  templateUrl: './rentals-new.component.html',
  styleUrls: ['./rentals-new.component.scss'],
  standalone: false
})
export class RentalsNewComponent implements OnInit {

  // --- Formulaire ---
  form = {
    ownerId: 0,
    buildingId: 0,
    apartmentId: 0,
    collectorId: 0,
    tenantId: 0,
    startDate: '',
    owenerName: '',
    tenantName: '',
    collectorName: '',
    apartmentName: '',
    buildingName: '',
    endDate: '',
    price: 1000,
    deposit: 0
  };

  // --- Erreurs validation ---
  errors: Record<string, string> = {};

  // --- Collections principales ---
  owners: any[] = [];
  buildings: any[] = [];
  apartments: any[] = [];
  tenants: any[] = [];
  collectors: any[] = [];

  // --- Collections filtrées (en fonction des choix précédents) ---
  filteredBuildings: any[] = [];
  filteredApartments: any[] = [];

  constructor(
    private rentalsService: RentalsService,
    private router: Router,
    private apartmentsService: ApartmentsService,
    private tenantsService: TenantsService,
    private ownersService: OwnersService,
    private buildingsService: BuildingsService,
    private collectorsService: CollectorsService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.owners = this.ownersService.getOwners();
    this.buildings = this.buildingsService.getBuildings();
    this.apartments = this.apartmentsService.getApartments();
    this.tenants = this.tenantsService.getTenants();
    this.collectors = this.collectorsService.getCollectors();
  }

  // --- Navigation création ---
  goToNewOwner() {
    const dialogRef = this.dialog.open(OwnerFormComponent, {
      width: '500px',
      data: {}
    });
  dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.owners = this.ownersService.getOwners();
        this.form.ownerId = result.id;
        this.onOwnerChange();
      }
    });
  }

  goToNewBuilding() {
    const dialogRef = this.dialog.open(BuildingFormComponent, {
      width: '600px',
      data: {}
    });
  dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.buildings = this.buildingsService.getBuildings();
        this.filteredBuildings = this.buildings.filter(b => b.ownerId === this.form.ownerId);
        this.form.buildingId = result.id;
        this.onBuildingChange();
      }
    });
  }

  goToNewApartment() {
    const dialogRef = this.dialog.open(ApartmentFormComponent, {
      width: '600px',
      data: { buildingId: this.form.buildingId }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.apartments = this.apartmentsService.getApartments();
        this.filteredApartments = this.apartments.filter(a => a.buildingId === this.form.buildingId);
        this.form.apartmentId = result.id;
      }
    });
  }

  goToNewTenant() {
    const dialogRef = this.dialog.open(TenantFormComponent, {
      width: '500px',
      data: {}
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.tenants = this.tenantsService.getTenants();
        this.form.tenantId = result.id;
      }
    });
  }

  openTenantDialog() {
    this.goToNewTenant();
  }

  openNewCollectorDialog() {
  const dialogRef = this.dialog.open(CollectorsFormComponent, {
      width: '700px',
      data: {}
    });
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.collectors = this.collectorsService.getCollectors();
        this.form.collectorId = result.id;
      }
    });
  }

  // --- Hiérarchie ---
  onOwnerChange() {
    this.filteredBuildings = this.buildings.filter(b => b.ownerId === this.form.ownerId);
    this.form.buildingId = 0;
    this.filteredApartments = [];
    this.form.apartmentId = 0;
  }

  onBuildingChange() {
    this.filteredApartments = this.apartments.filter(a => a.buildingId === this.form.buildingId);
    this.form.apartmentId = 0;
  }

  // --- Gestion prix ---
  incrementPrice() {
    this.form.price += 1000;
  }

  decrementPrice() {
    if (this.form.price > 1000) {
      this.form.price -= 1000;
    }
  }

  // --- Validation ---
  validate(): boolean {
  this.errors = {};

  if (!this.form.ownerId) this.errors['ownerId'] = 'Propriétaire requis';
  if (!this.form.collectorId) this.errors['collectorId'] = 'Recouvreur requis';
  if (!this.form.buildingId) this.errors['buildingId'] = 'Bâtiment requis';
  if (!this.form.apartmentId) this.errors['apartmentId'] = 'Appartement requis';
  if (!this.form.tenantId) this.errors['tenantId'] = 'Locataire requis';
  if (!this.form.startDate) this.errors['startDate'] = 'Date début requise';
  if (!this.form.price) this.errors['price'] = 'Mensualité requise';
  if (!this.form.price || this.form.price < 1000) this.errors['price'] = 'Prix requis (≥ 1000)';
  if (this.form.deposit < 0) this.errors['deposit'] = 'Caution invalide';

  return Object.keys(this.errors).length === 0;
  }

  // --- Création ---
  create() {
    if (!this.validate()) return;
    this.rentalsService.createRental({ ...this.form });
    this.router.navigate(['demo/admin-panel/rentals']);
  }

  // --- Annuler ---
  cancel() {
    this.router.navigate(['demo/admin-panel/rentals']);
  }
}
