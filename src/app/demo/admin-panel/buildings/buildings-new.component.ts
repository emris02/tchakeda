import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { BuildingsService } from './buildings.service';
import { OwnersService } from '../owners/owners.service';
import { MatDialog } from '@angular/material/dialog';
import { OwnerFormComponent } from '../owners/components/owner-form.component';


@Component({
  selector: 'app-buildings-new',
  templateUrl: './buildings-new.component.html',
  styleUrls: ['./buildings-new.component.scss'],
  standalone: false
})
export class BuildingsNewComponent {
  form: {
    name: string;
    type: string;
    customType: string;
    floors: number;
    apartments: number;
    address: string;
    city: string;
    region: string;
    constructionDate: string;
    ownerId: number | null;
    [key: string]: any;
  } = {
    name: '',
    type: '',
    customType: '',
    floors: 1,
    apartments: 1,
    address: '',
    city: '',
    region: '',
    constructionDate: '',
    ownerId: null
  };

  errors: any = {};
  get hasErrors(): boolean { return Object.keys(this.errors || {}).length > 0; }
  owners: any[] = [];
  isCustomType = false;

  constructor(
    private buildingsService: BuildingsService,
    private ownersService: OwnersService,
    private router: Router,
    private dialog: MatDialog
  ) {
    this.owners = this.ownersService.getOwners();
    // Sélection automatique du propriétaire créé si présent
    const urlParams = new URLSearchParams(window.location.search);
    const newOwnerId = urlParams.get('newOwnerId');
    if (newOwnerId) {
      this.form.ownerId = Number(newOwnerId);
      ['fullName','email','phone','country','adress','profession','buildingId'].forEach(k => {
        const v = urlParams.get(k);
        if (v) (this.form as any)[k] = v;
      });
    }
  }

  openOwnerDialog() {
    const dialogRef = this.dialog.open(OwnerFormComponent, {
      width: '600px',
      disableClose: true,
      data: {}
    });
  dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.owners.push(result);
        this.form.ownerId = result.id;
      }
    });
  }

  onTypeChange(event: any) {
    this.isCustomType = event.target.value === 'autre';
    if (!this.isCustomType) this.form.customType = '';
  }

  validate() {
    this.errors = {};
  if (!this.form.name) this.errors.name = 'Nom du bâtiment requis';
  if (!this.form.type) this.errors.type = 'Type de bâtiment requis';
  if (this.isCustomType && !this.form.customType) this.errors.customType = 'Veuillez saisir un type';
  if (!this.form.floors || this.form.floors < 1) this.errors.floors = 'Nombre d\'étages requis';
  if (!this.form.apartments || this.form.apartments < 1) this.errors.apartments = 'Nombre d\'appartements requis';
  if (!this.form.address) this.errors.address = 'Adresse requise';
  if (!this.form.city) this.errors.city = 'Ville requise';
  if (!this.form.region) this.errors.region = 'Région requise';
  if (!this.form.constructionDate) this.errors.constructionDate = 'Date de construction requise';
  if (!this.form.ownerId) this.errors.ownerId = 'Propriétaire requis';
    const valid = Object.keys(this.errors).length === 0;
    if (!valid) {
      const firstKey = Object.keys(this.errors)[0];
      setTimeout(() => {
        const el = document.querySelector(`[name="${firstKey}"]`) as HTMLElement | null;
        if (el && typeof (el as any).focus === 'function') (el as any).focus();
      }, 0);
    }
    return valid;
  }

  create(formRef?: NgForm) {
    if (formRef && formRef.form) formRef.form.markAllAsTouched();
    if (!this.validate()) return;

    if (this.isCustomType) {
      this.form.type = this.form.customType; // utiliser le type personnalisé
    }

    const newBuilding = this.buildingsService.createBuilding(this.form); // créer le bâtiment

    // Vérifie si retour demandé vers apartments-new
    const urlParams = new URLSearchParams(window.location.search);
    const returnTo = urlParams.get('returnTo');
    if (returnTo === 'apartments-new') {
      this.router.navigate(['demo/admin-panel/apartments/new'], {
        queryParams: { newBuildingId: newBuilding.id }
      });
    } else {
      this.router.navigate(['demo/admin-panel/buildings']);
    }
  }

  cancel() {
    this.router.navigate(['demo/admin-panel/buildings']);
  }

  goToNewOwner() {
    this.router.navigate(['demo/admin-panel/owners/new'], {
      queryParams: { returnTo: 'buildings-new', ...this.form }
    });
  }
}
