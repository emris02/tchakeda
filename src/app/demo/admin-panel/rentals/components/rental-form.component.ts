import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { OwnersService } from '../../owners/owners.service';
import { BuildingsService } from '../../buildings/buildings.service';
import { ApartmentsService } from '../../apartments/apartments.service';
import { TenantsService } from '../../tenants/tenants.service';
import { OwnerFormComponent } from '../../owners/components/owner-form.component';
import { BuildingFormComponent } from '../../buildings/components/building-form.component';
import { ApartmentFormComponent } from '../../apartments/components/apartment-form.component';
import { TenantFormComponent } from '../../tenants/components/tenant-form.component';

import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-rental-form',
  templateUrl: './rental-form.component.html',
  styleUrls: ['./rental-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule
  ]
})
export class RentalFormComponent {
  form: FormGroup;
  owners: any[] = [];
  buildings: any[] = [];
  apartments: any[] = [];
  tenants: any[] = [];
  filteredBuildings: any[] = [];
  filteredApartments: any[] = [];

  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<RentalFormComponent>,
    private ownersService: OwnersService,
    private buildingsService: BuildingsService,
    private apartmentsService: ApartmentsService,
    private tenantsService: TenantsService,
    private dialog: MatDialog
  ) {
    this.owners = this.ownersService.getOwners();
    this.buildings = this.buildingsService.getBuildings();
    this.apartments = this.apartmentsService.getApartments();
    this.tenants = this.tenantsService.getTenants();
    this.form = this.fb.group({
      ownerId: [data?.ownerId || 0, Validators.required],
      buildingId: [data?.buildingId || 0, Validators.required],
      apartmentId: [data?.apartmentId || 0, Validators.required],
      tenantId: [data?.tenantId || 0, Validators.required],
      startDate: [data?.startDate || '', Validators.required],
      endDate: [data?.endDate || ''],
      price: [data?.price || 1000, [Validators.required, Validators.min(1000)]],
      deposit: [data?.deposit || 0, [Validators.min(0)]]
    });

    // Filtrer les bâtiments selon le propriétaire sélectionné (utile si édition)
    if (this.form.value.ownerId && this.form.value.ownerId !== 0) {
      this.filteredBuildings = this.buildings.filter(b => b.ownerId === this.form.value.ownerId);
    } else {
      this.filteredBuildings = this.buildings;
    }

    // Filtrer les appartements selon le bâtiment sélectionné (utile si édition)
    if (this.form.value.buildingId && this.form.value.buildingId !== 0) {
      this.filteredApartments = this.apartments.filter(a => a.buildingId === this.form.value.buildingId);
    } else {
      this.filteredApartments = [];
    }
  }

  onOwnerChange() {
    this.filteredBuildings = this.buildings.filter(b => b.ownerId === this.form.value.ownerId);
    this.form.patchValue({ buildingId: 0, apartmentId: 0 });
    this.filteredApartments = [];
  }

  onBuildingChange() {
    this.filteredApartments = this.apartments.filter(a => a.buildingId === this.form.value.buildingId);
    this.form.patchValue({ apartmentId: 0 });
  }

  openOwnerDialog() {
    const dialogRef = this.dialog.open(OwnerFormComponent, {
      width: '500px',
      data: {}
    });
  dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.owners = this.ownersService.getOwners();
        this.form.patchValue({ ownerId: result.id });
        this.onOwnerChange();
      }
    });
  }
  openBuildingDialog() {
    const dialogRef = this.dialog.open(BuildingFormComponent, {
      width: '600px',
      data: {}
    });
  dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.buildings = this.buildingsService.getBuildings();
        this.filteredBuildings = this.buildings.filter(b => b.ownerId === this.form.value.ownerId);
        this.form.patchValue({ buildingId: result.id });
        this.onBuildingChange();
      }
    });
  }
  openApartmentDialog() {
    const dialogRef = this.dialog.open(ApartmentFormComponent, {
      width: '600px',
      data: { buildingId: this.form.value.buildingId }
    });
  dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.apartments = this.apartmentsService.getApartments();
        this.filteredApartments = this.apartments.filter(a => a.buildingId === this.form.value.buildingId);
        this.form.patchValue({ apartmentId: result.id });
      }
    });
  }
  openTenantDialog() {
    const dialogRef = this.dialog.open(TenantFormComponent, {
      width: '500px',
      data: {}
    });
  dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.tenants = this.tenantsService.getTenants();
        this.form.patchValue({ tenantId: result.id });
      }
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
  onCancel() {
    this.dialogRef.close();
  }
}
