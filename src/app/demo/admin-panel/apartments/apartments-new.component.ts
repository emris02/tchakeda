

import { Component, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApartmentsService } from './apartments.service';
import { BuildingsService } from '../buildings/buildings.service';
import { RoomImagesService } from './room-images.service';
import { MatDialog } from '@angular/material/dialog';
import { BuildingFormComponent } from '../buildings/components/building-form.component';
import { TenantFormComponent } from '../tenants/components/tenant-form.component';
import { TenantsService, Tenant } from '../tenants/tenants.service';

@Component({
  selector: 'app-apartments-new',
  templateUrl: './apartments-new.component.html',
  styleUrls: ['./apartments-new.component.scss'],
  standalone: false
})
export class ApartmentsNewComponent {
  pendingImages: Array<{ dataUrl: string, label: string, description: string }> = [];
  // Sélection multiple d'images
  onNewImagesSelected(event: any) {
    const files: FileList = event.target.files;
    if (!files || !files.length) return;
    const maxToAdd = this.form.rooms - this.images.length - this.pendingImages.length;
    if (maxToAdd <= 0) {
      this.errors.roomImages = `Nombre maximum de pièces (${this.form.rooms}) atteint.`;
      event.target.value = '';
      return;
    }
    let added = 0;
    Array.from(files).forEach(file => {
      if (added >= maxToAdd) return;
      if (file.size > 2 * 1024 * 1024) return; // 2MB max
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.pendingImages.push({ dataUrl: e.target.result, label: '', description: '' });
      };
      reader.readAsDataURL(file);
      added++;
    });
    if (added < files.length) {
      this.errors.roomImages = `Seules ${maxToAdd} images peuvent être ajoutées.`;
    } else {
      this.errors.roomImages = '';
    }
    event.target.value = '';
  }

  // Retirer une image de la file d'attente
  removePendingImage(idx: number) {
    this.pendingImages.splice(idx, 1);
  }

  // Valider l'ajout d'une image avec nom et description
  confirmPendingImage(idx: number) {
    const img = this.pendingImages[idx];
    if (img && img.label) {
      this.images.push(img.dataUrl);
      this.roomLabels.push(img.label);
      this.roomDescriptions.push(img.description || '');
      this.pendingImages.splice(idx, 1);
    }
  }
  errors: any = {};
  buildings: any[] = [];
  images: string[] = [];
  roomLabels: string[] = [];
  roomDescriptions: string[] = [];
  availableRoomTypes: Array<{label: string, image: string}> = [];
  // Pour compatibilité template (ajout d'image pièce)
  isAddingRoom = false;
  tempRoomLabel: string = '';
  newRoomLabel: string = '';
  newRoomImage: string = '';
  newRoomDescription: string = '';
  isSubmitting = false;

  changeRoomImage(i: number) {}
  removeRoomImage(i: number) {
    if (this.images && this.images.length > i) {
      this.images.splice(i, 1);
      if (this.roomLabels) this.roomLabels.splice(i, 1);
      if (this.roomDescriptions) this.roomDescriptions.splice(i, 1);
    }
  }
  startAddingRoom() { this.isAddingRoom = true; }
  cancelAddingRoom() { this.isAddingRoom = false; this.tempRoomLabel = ''; this.newRoomLabel = ''; this.newRoomImage = ''; this.newRoomDescription = ''; }
  validateNewRoomLabel() {}
  confirmAddRoom() {
    if (this.newRoomLabel && this.newRoomImage) {
      this.images.push(this.newRoomImage);
      this.roomLabels.push(this.newRoomLabel);
      this.roomDescriptions.push(this.newRoomDescription || '');
      // Reset champs temporaires
      this.newRoomLabel = '';
      this.newRoomImage = '';
      this.newRoomDescription = '';
      this.tempRoomLabel = '';
      this.isAddingRoom = false;
    }
  }
  onNewImageSelected(event: any) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.newRoomImage = e.target.result;
    };
    reader.readAsDataURL(file);
    // Reset input value to allow re-selection of same file
    event.target.value = '';
  }
  backToNameStep() {}
  apartmentTypes: string[] = [];
  // Suppression du type personnalisé et des types inutilisés
  form = {
    name: '',
  type: '',
    rooms: 1,
    rent: 0,
    status: 'Libre',
    buildingId: 0,
    roomImages: [] as string[],
    description: '',
    tenantId: null as number | null
  };

  tenants: Tenant[] = [];
  selectedTenant: Tenant | null = null;

  constructor(
    private apartmentsService: ApartmentsService,
    private router: Router,
    private buildingsService: BuildingsService,
    private roomImagesService: RoomImagesService,
    private dialog: MatDialog,
  @Inject(TenantsService) private tenantsService: TenantsService
  ) {
    this.buildings = this.buildingsService.getBuildings();
    this.availableRoomTypes = this.roomImagesService.getAvailableRoomTypes();
    this.tenants = this.tenantsService.getTenants();
    // Charge les types depuis localStorage ou initialise
    const savedTypes = localStorage.getItem('apartmentTypes');
    if (savedTypes) {
      this.apartmentTypes = JSON.parse(savedTypes);
    } else {
      this.apartmentTypes = ['Résidentiel', 'Commercial', 'Mixte'];
      localStorage.setItem('apartmentTypes', JSON.stringify(this.apartmentTypes));
    }
    // Sélection automatique du bâtiment créé si présent
    const urlParams = new URLSearchParams(window.location.search);
    const newBuildingId = urlParams.get('newBuildingId');
    if (newBuildingId) {
      this.form.buildingId = Number(newBuildingId);
      ['name','address','city','region','roomImages'].forEach(k => {
        const v = urlParams.get(k);
        if (v) (this.form as any)[k] = v;
      });
    }
    // Si un locataire est déjà sélectionné (édition)
    if (this.form.tenantId) {
      this.selectedTenant = this.tenants.find(t => t.id === this.form.tenantId) || null;
    }
  }

  removeImage(index: number) {
    this.images.splice(index, 1);
    this.roomLabels.splice(index, 1);
    this.roomDescriptions.splice(index, 1);
    this.form.roomImages = this.images;
  }

  onTenantSelected(event: any) {
    const tenantId = +event.target.value;
    this.selectedTenant = this.tenants.find(t => t.id === tenantId) || null;
    this.form.tenantId = this.selectedTenant ? tenantId : null;
    this.form.status = this.selectedTenant ? 'Occupé' : 'Libre';
  }

  openTenantDialog() {
    const dialogRef = this.dialog.open(TenantFormComponent, {
      width: '500px',
      data: {}
    });
  dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.tenants.push(result);
        this.selectedTenant = result;
        this.form.tenantId = result.id;
        this.form.status = 'Occupé';
      }
    });
  }

  removeTenant() {
    this.selectedTenant = null;
    this.form.tenantId = null;
    this.form.status = 'Libre';
  }
  // Suppression du constructeur et des champs dupliqués : tout est géré dans le constructeur principal ci-dessus

  openBuildingDialog() {
    const dialogRef = this.dialog.open(BuildingFormComponent, {
      width: '600px',
      disableClose: true,
      data: {}
    });
  dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        // Ajoute le bâtiment à la liste et sélectionne automatiquement
        this.buildings.push(result);
        this.form.buildingId = result.id;
      }
    });
  }

  onImagesSelected(event: any) {
    const files: FileList = event.target.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        this.errors.roomImages = 'Format d\'image non autorisé.';
        continue;
      }
      if (file.size > 2 * 1024 * 1024) {
        this.errors.roomImages = 'La taille de l\'image doit être inférieure à 2Mo.';
        continue;
      }
      const reader = new FileReader();
      reader.onload = (e: any) => {
        if (this.images.length < 6) {
          this.images.push(e.target.result);
          // Synchronise roomLabels et roomDescriptions avec le nombre d'images
          while (this.roomLabels.length < this.images.length) this.roomLabels.push('');
          while (this.roomDescriptions.length < this.images.length) this.roomDescriptions.push('');
          this.form.roomImages = this.images;
        }
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  }

  validate() {
    this.errors = {};
    if (!this.form.name) this.errors.name = 'Nom requis';
  if (!this.form.type) this.errors.type = 'Type requis';
    if (!this.form.rooms || this.form.rooms < 1) this.errors.rooms = 'Nombre de pièces requis';
    if (!this.form.rent || this.form.rent < 1) this.errors.rent = 'Loyer requis';
    if (!this.form.buildingId) this.errors.buildingId = 'Bâtiment requis';
    return Object.keys(this.errors).length === 0;
  }

  create() {
    if (!this.validate()) return;
    // Enregistre le type automatiquement s'il n'existe pas déjà
    const typeToSave = this.form.type;
    if (typeToSave && !this.apartmentTypes.includes(typeToSave)) {
      this.apartmentTypes.push(typeToSave);
      localStorage.setItem('apartmentTypes', JSON.stringify(this.apartmentTypes));
    }
    // Pré-remplir les champs address, city, region selon le bâtiment sélectionné
    const selectedBuilding = this.buildings.find(b => b.id === this.form.buildingId);

    // Vérifier la capacité du bâtiment (nombre d'appartements autorisés)
    if (selectedBuilding) {
      const apartments = this.apartmentsService.getApartments();
      const currentCount = apartments.filter(a => a.buildingId === selectedBuilding.id).length;
      if (currentCount >= (selectedBuilding.apartments || 0)) {
        this.errors.buildingId = "Verifier le nombre d'appartement disponible dans votre batiment";
        return;
      }
    }
    // Harmonisation du statut
    let status: "free" | "sale" | "rent" | "construction" = "free";
    if (this.form.status) {
      const s = this.form.status.toLowerCase();
      if (s === "libre") status = "free";
      else if (s === "occupé") status = "rent";
      else if (s === "vente") status = "sale";
      else if (s === "construction") status = "construction";
      else if (["free","rent","sale","construction"].includes(s)) status = s as any;
    }
    // Renseigne le champ tenant si un locataire est sélectionné
    let tenantName = '';
    if (this.selectedTenant) tenantName = this.selectedTenant.fullName;
    // Synchronisation des tableaux images, labels et descriptions
    // Si un tableau est plus court, on le complète avec des valeurs vides
    while (this.roomLabels.length < this.images.length) this.roomLabels.push('');
    while (this.roomDescriptions.length < this.images.length) this.roomDescriptions.push('');
    while (this.images.length < this.roomLabels.length) this.images.push(this.roomImagesService.getDefaultApartmentImage());
    while (this.roomDescriptions.length < this.roomLabels.length) this.roomDescriptions.push('');

    const totalImages = this.images.length;
    const apartmentData = {
      ...this.form,
      type: typeToSave,
      rooms: totalImages > 0 ? totalImages : this.form.rooms,
      mention: String(this.form.rent),
      address: selectedBuilding ? selectedBuilding.address : '',
      city: selectedBuilding ? selectedBuilding.city : '',
      region: selectedBuilding ? selectedBuilding.region : '',
      images: this.images.length > 0 ? this.images : [this.roomImagesService.getDefaultApartmentImage()],
      roomLabels: this.roomLabels.length > 0 ? this.roomLabels : [],
      roomDescriptions: this.roomDescriptions.length > 0 ? this.roomDescriptions : [],
      status,
      tenant: tenantName
    };
    this.apartmentsService.createApartment(apartmentData);
    this.router.navigate(['demo/admin-panel/apartments']);
  }

  cancel() {
    this.router.navigate(['demo/admin-panel/apartments']);
  }

  /**
   * Retourne l'image appropriée pour un type de pièce donné
   */
  getRoomImage(roomLabel: string): string {
    return this.roomImagesService.getRoomImage(roomLabel);
  }

  /**
   * Retourne l'image par défaut pour l'appartement
   */
  getDefaultApartmentImage(): string {
    return this.roomImagesService.getDefaultApartmentImage();
  }

  /**
   * Retourne l'image à afficher pour une pièce
   */
  getDisplayImage(imagePath: string, roomLabel: string): string {
    if (imagePath && !this.roomImagesService.isDefaultImage(imagePath)) {
      return imagePath;
    }
    return this.getRoomImage(roomLabel);
  }
}
