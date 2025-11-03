import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TenantsService } from './tenants.service';
import { ApartmentsService, Apartment } from '../apartments/apartments.service';
import { BuildingsService, Building } from '../buildings/buildings.service';

@Component({
  selector: 'app-tenants-new',
  templateUrl: './tenants-new.component.html',
  styleUrls: ['./tenants-new.component.scss'],
  standalone: false
})
export class TenantsNewComponent {
  buildings: Building[] = [];
  availableApartments: Apartment[] = [];
  filteredApartments: Apartment[] = [];
  showAffiliated = false;
  imagePreview: string | null = null;
  isSubmitting = false;

  // template compatibility aliases
  get previewImage(): string | null {
    return this.imagePreview;
  }

  onImageSelect(event: Event) {
    this.onFileSelected(event);
  }
  form: {
    buildingId?: number;
    fullName: string;
    email: string;
    phone: string;
    city: string;
    maritalStatus: string;
    emergencyContact: string;
    rentalType: string;
    country: string;
    address: string;
    profession: string;
    identityImage: string;
    identityType: string;
    identityNumber: string;
    affiliatedPerson: {
      fullName: string;
      relation: string;
      phone: string;
      address: string;
      email: string;
      profession: string;
    };
    apartments: number[];
    locations: any[];
    [key: string]: any;
  } = {
    fullName: '',
    email: '',
    phone: '',
    city: '',
    maritalStatus: '',
    emergencyContact: '',
    rentalType: '',
    country: 'Mali',
    address: '',
    profession: '',
    identityImage: '',
    identityType: '',
    identityNumber: '',
    affiliatedPerson: {
      fullName: '',
      relation: '',
      phone: '',
      address: '',
      email: '',
      profession: ''
    },
    apartments: [],
    locations: []
  };
  errors: any = {};

  constructor(
    private tenantsService: TenantsService,
    private router: Router,
    private apartmentsService: ApartmentsService,
    private buildingsService: BuildingsService
  ) {
    this.buildings = this.buildingsService.getBuildings();
    // Sélection automatique de l'appartement créé si présent
    const urlParams = new URLSearchParams(window.location.search);
    const newApartmentId = urlParams.get('newApartmentId');
    if (newApartmentId) {
      this.form.apartments = [Number(newApartmentId)];
      // Pré-remplissage des autres champs si transmis
      ['fullName','email','phone','city','maritalStatus','emergencyContact','rentalType','country','address','profession','identityImage','identityType','identityNumber'].forEach(k => {
        const v = urlParams.get(k);
        if (v) (this.form as any)[k] = v;
      });
    }
    // Charge les appartements libres (sans locataire)
    this.availableApartments = this.apartmentsService.getApartments().filter(a => !a.tenant);
    this.filteredApartments = [];
  }

  onBuildingChange() {
    this.filteredApartments = this.availableApartments.filter(a => a.buildingId === Number(this.form.buildingId));
    this.form.apartments = [];
  }

  validate() {
    this.errors = {};
    if (!this.form.fullName) this.errors.fullName = 'Nom Complet requis';
    if (!this.form.country) this.errors.country = 'Pays requis';
    if (!this.form.email) this.errors.email = 'Email requis';
    if (!this.form.phone) this.errors.phone = 'Téléphone requis';
    if (!this.form.address) this.errors.address = 'Adresse requise';
    if (!this.form.rentalType) this.errors.rentalType = 'Type de location requise';
    if (!this.form.maritalStatus) this.errors.maritalStatus = 'État civil requis';
    if (!this.form.emergencyContact) this.errors.emergencyContact = "Contact d'urgence requis";
    // if (!this.form.identityImage) this.errors.identityImage = 'Photo d\'identité requise';
    // if (!this.form.identityType) this.errors.identityType = 'Type d\'identité requis';
    // if (!this.form.identityNumber) this.errors.identityNumber = 'Numéro d\'identité requis';
    if (this.showAffiliated) {
      if (!this.form.affiliatedPerson.relation) this.errors.affiliatedPersonRelation = 'Type de relation requis';
      if (!this.form.affiliatedPerson.fullName) this.errors.affiliatedPersonFullName = 'Prénom et nom requis';
      if (!this.form.affiliatedPerson.phone) this.errors.affiliatedPersonPhone = 'Téléphone requis';
      if (!this.form.affiliatedPerson.address) this.errors.affiliatedPersonAddress = 'Adresse requise';
    }
    return Object.keys(this.errors).length === 0;
  }

  create() {
    if (!this.validate()) return;
    this.isSubmitting = true;
    try {
      this.tenantsService.createTenant(this.form);
      this.router.navigate(['demo/admin-panel/tenants']);
    } finally {
      this.isSubmitting = false;
    }
  }

  cancel() {
    this.router.navigate(['demo/admin-panel/tenants']);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
      this.form.identityImage = this.imagePreview;
    };
    reader.readAsDataURL(file);
  }

  removeImage() {
    this.imagePreview = null;
    this.form.identityImage = '';
    const fileInput = document.getElementById('identityImage') as HTMLInputElement | null;
    if (fileInput) fileInput.value = '';
  }
}
