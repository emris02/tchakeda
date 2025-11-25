import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { OwnersService } from './owners.service';
import { BuildingsService } from '../buildings/buildings.service';
import { MatDialog } from '@angular/material/dialog';
import { BuildingFormComponent } from '../buildings/components/building-form.component';

@Component({
  selector: 'app-owners-new',
  templateUrl: './owners-new.component.html',
  styleUrls: ['./owners-new.component.scss'],
  standalone: false
})
export class OwnersNewComponent {

  // Formulaire mis à jour avec les nouveaux champs
  form = {
    fullName: '',
    email: '',
    phone: '',
    country: '',
    address: '',
    profession: '',
    notes: '',
    buildingId: 0
  };

  errors: any = {};
  get hasErrors(): boolean { return Object.keys(this.errors || {}).length > 0; }
  buildings: any[] = [];
  newOwner: any = null;
  selectedBuilding: any = null;
  notes: string = '';
  showSuccessModal: boolean = false;

  constructor(
    private ownersService: OwnersService,
    private router: Router,
    private buildingsService: BuildingsService,
    private dialog: MatDialog
  ) {
    // Récupération des bâtiments disponibles
    this.buildings = this.buildingsService.getBuildings();
  }

  // Validation des champs
  validate() {
    this.errors = {};

    if (!this.form.fullName) this.errors.fullName = 'Nom complet requis';
    if (!this.form.email) this.errors.email = 'Email requis';
    if (!this.form.phone) this.errors.phone = 'Téléphone requis';
    if (!this.form.country) this.errors.country = 'Pays requis';
  if (!this.form.address) this.errors.address = 'Adresse requise';

    return Object.keys(this.errors).length === 0;
  }

  // Création du propriétaire
  create(formRef?: NgForm) {
    if (formRef && formRef.form) formRef.form.markAllAsTouched();
    if (!this.validate()) return;

    // Ajout des champs requis pour Owner
    const ownerData = {
      ...this.form,
      name: this.form.fullName,
      city: this.form.country,
      // owners service expects 'adress' (typo) in Owner interface
      adress: this.form.address
    };
    const newOwner = this.ownersService.createOwner(ownerData);

    // Vérifie si retour demandé vers buildings-new
    const urlParams = new URLSearchParams(window.location.search);
    const returnTo = urlParams.get('returnTo');
    if (returnTo === 'buildings-new') {
      // On repasse les données pré-saisies via queryParams
  const prefill: Record<string, any> = {};
  Object.keys(this.form).forEach((k: string) => { prefill[k] = (this.form as any)[k]; });
      this.router.navigate(['demo/admin-panel/buildings/new'], {
        queryParams: { newOwnerId: newOwner.id, ...prefill }
      });
    } else {
      // show success modal
      this.showSuccessModal = true;
      this.newOwner = newOwner;
    }
  }

  // Annuler et revenir à la liste
  cancel() {
    this.router.navigate(['demo/admin-panel/owners']);
  }

  goToOwnersList() {
    this.router.navigate(['demo/admin-panel/owners']);
  }

  createAnother() {
    this.form = { fullName: '', email: '', phone: '', country: '', address: '', profession: '', notes: '', buildingId: 0 };
    this.notes = '';
    this.showSuccessModal = false;
  }

  // Fonction pour créer un nouveau bâtiment (ouvre une modale)
  goToNewBuilding() {
    const dialogRef = this.dialog.open(BuildingFormComponent, {
      width: '600px',
      data: {}
    });
  dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        // Ajoute le nouveau bâtiment à la liste et le sélectionne
        this.buildings = this.buildingsService.getBuildings();
        this.form.buildingId = result.id;
      }
    });
  }
}
