import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { RecoveriesService } from './recoveries.service';
import { RentalsService, Rental } from '../rentals/rentals.service';
import { CollectorsService, Collector } from '../collectors/collectors.service';

@Component({
  selector: 'app-recoveries-new',
  templateUrl: './recoveries-new.component.html',
  styleUrls: ['./recoveries-new.component.scss'],
  standalone: false
})
export class RecoveriesNewComponent {
  form = {
    rentalId: null,
    amount: null,
    date: '',
    status: '',
    collectorId: null
  };
  errors: any = {};
  get hasErrors(): boolean { return Object.keys(this.errors || {}).length > 0; }
  rentals: Rental[] = [];
  collectors: Collector[] = [];
  isSubmitting = false;

  constructor(
    private recoveriesService: RecoveriesService,
    private router: Router,
    private rentalsService: RentalsService,
    private collectorsService: CollectorsService
  ) {
    this.rentals = this.rentalsService.getRentals();
    this.collectors = this.collectorsService.getCollectors();
  }

  validate() {
    this.errors = {};
    if (!this.form.rentalId) this.errors.rentalId = 'Location requise';
    if (!this.form.amount || this.form.amount < 1) this.errors.amount = 'Montant requis';
    if (!this.form.date) this.errors.date = 'Date requise';
    if (!this.form.status) this.errors.status = 'Statut requis';
    if (!this.form.collectorId) this.errors.collectorId = 'Recouvreur requis';
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
    this.isSubmitting = true;
    // Récupère le nom du recouvreur sélectionné
    const collector = this.collectors.find(c => c.id === this.form.collectorId);
    const rental = this.rentals.find(r => r.id === this.form.rentalId);
    const payload: any = {
      ...this.form,
      name: collector ? collector.fullName : '',
      rentalId: rental ? rental.id : 0,
      amount: this.form.amount ? this.form.amount : 0
    };
    // Normaliser collectorId: undefined au lieu de null pour matcher le type
    if (payload.collectorId === null) {
      delete payload.collectorId;
    }
    this.recoveriesService.createRecovery(payload);
    this.router.navigate(['demo/admin-panel/recoveries']);
  }

  cancel() {
    this.router.navigate(['demo/admin-panel/recoveries']);
  }
}
