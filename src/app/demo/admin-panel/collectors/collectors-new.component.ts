import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { CollectorsService } from './collectors.service';
import { BuildingsService, Building } from '../buildings/buildings.service';
import { ApartmentsService, Apartment } from '../apartments/apartments.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-collectors-new',
  templateUrl: './collectors-new.component.html',
  styleUrls: ['./collectors-new.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class CollectorsNewComponent {
  showAffiliated = false;
  form = {
    fullName: '',
    country: 'Mali',
    address: '',
    buildingId: null,
    apartmentIds: [] as number[],
    phone: '',
    email: '',
    identityImage: '',
    identityType: '',
    identityNumber: '',
    affiliatedPerson: {
      fullName: '',
      relation: '',
      phone: '',
      address: '',
      email: ''
    }
  } as any;
  isSubmitting = false;
  errors: any = {};
  get hasErrors(): boolean { return Object.keys(this.errors || {}).length > 0; }
  buildings: Building[] = [];
  apartments: Apartment[] = [];
  filteredApartments: Apartment[] = [];
  // UI helpers for modal/preview
  showSuccessModal: boolean = false;
  newCollector: any = null;

  constructor(
    private collectorsService: CollectorsService,
    private router: Router,
    private buildingsService: BuildingsService,
    private apartmentsService: ApartmentsService
  ) {
    this.buildings = this.buildingsService.getBuildings();
    this.apartments = this.apartmentsService.getApartments();
    // prefill from URL params if present (useful when redirecting after creating an apartment)
    const urlParams = new URLSearchParams(window.location.search);
    const newApartmentId = urlParams.get('newApartmentId');
    if (newApartmentId) {
      this.form.apartmentIds = [Number(newApartmentId)];
      ['fullName','email','phone','country','address','identityImage','identityType','identityNumber'].forEach(k => {
        const v = urlParams.get(k);
        if (v) (this.form as any)[k] = v;
      });
    }
  }

  onBuildingChange() {
    this.filteredApartments = this.apartments.filter(a => a.buildingId === Number(this.form.buildingId));
    this.form.apartmentIds = [];
  }

  validate() {
    this.errors = {};
    if (!this.form.fullName) this.errors.fullName = 'Nom requis';
    if (!this.form.country) this.errors.country = 'Pays requis';
    if (!this.form.address) this.errors.address = 'Adresse requise';
    if (!this.form.buildingId) this.errors.buildingId = 'Bâtiment requis';
  if (!this.form.apartmentIds || this.form.apartmentIds.length === 0) this.errors.apartmentId = 'Sélectionnez au moins une propriété';
    if (!this.form.phone) this.errors.phone = 'Téléphone requis';
    if (!this.form.email) this.errors.email = 'Email requis';
    if (this.showAffiliated) {
      if (!this.form.affiliatedPerson.relation) this.errors.affiliatedPersonRelation = 'Relation requise';
      if (!this.form.affiliatedPerson.fullName) this.errors.affiliatedPersonFullName = 'Nom du proche requis';
      if (!this.form.affiliatedPerson.phone) this.errors.affiliatedPersonPhone = 'Téléphone du proche requis';
    }
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
    // mark all controls as touched so required messages appear for template-driven forms
    if (formRef && formRef.form) {
      formRef.form.markAllAsTouched();
    }
    if (!this.validate()) return;
    this.isSubmitting = true;
    const created = this.collectorsService.createCollector({
      ...this.form,
      houseCount: this.form.apartmentIds ? this.form.apartmentIds.length : 0
    });
    // show success modal with summary instead of immediate navigation
    this.newCollector = created;
    this.showSuccessModal = true;
    this.isSubmitting = false;
  }

  cancel() {
  this.router.navigate(['/demo/admin-panel/collectors']);
  }

  onIdentitySelected(event: any) {
    const file: File = event.target.files && event.target.files[0];
    if (!file) return;
    const allowed = ['image/jpeg','image/png','image/webp'];
    if (!allowed.includes(file.type)) {
      alert('Format d\'image non supporté.');
      event.target.value = '';
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert('L\'image doit être inférieure à 3Mo.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.form.identityImage = e.target.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  // helper used by template
  getTotalRent(): number {
    if (!this.form.apartmentIds || !this.apartments) return 0;
    return this.form.apartmentIds.reduce((sum: number, id: number) => {
      const a = this.apartments.find(x => Number(x.id) === Number(id));
      if (!a) return sum;
      const value = (a.mention && !isNaN(Number(a.mention))) ? Number(a.mention) : 0;
      return sum + value;
    }, 0);
  }

  getApartmentName(apartmentId: number): string {
    const a = this.apartments.find(x => Number(x.id) === Number(apartmentId));
    return a ? a.name : '-';
  }

  removeApartment(apartmentId: number) {
    if (!this.form.apartmentIds) return;
    this.form.apartmentIds = this.form.apartmentIds.filter((id: number) => Number(id) !== Number(apartmentId));
  }

  goToCollectorsList() {
    this.router.navigate(['/demo/admin-panel/collectors']);
  }

  createAnother() {
    // reset form keeping country default
    this.form = {
      fullName: '', country: this.form.country || 'Mali', address: '', buildingId: null,
      apartmentIds: [], phone: '', email: '', identityImage: '', identityType: '', identityNumber: '',
      affiliatedPerson: { fullName: '', relation: '', phone: '', address: '', email: '' }
    };
    this.showAffiliated = false;
    this.showSuccessModal = false;
    this.newCollector = null;
  }
}
