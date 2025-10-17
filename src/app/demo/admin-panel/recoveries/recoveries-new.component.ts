import { Component } from '@angular/core';
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
    return Object.keys(this.errors).length === 0;
  }

  create() {
    if (!this.validate()) return;
    this.isSubmitting = true;
    // Récupère le nom du recouvreur sélectionné
    const collector = this.collectors.find(c => c.id === this.form.collectorId);
    const rental = this.rentals.find(r => r.id === this.form.rentalId);
    this.recoveriesService.createRecovery({
      ...this.form,
      name: collector ? collector.fullName : '',
      rentalId: rental ? rental.id : 0,
      amount: this.form.amount ? this.form.amount : 0
    });
    this.router.navigate(['demo/admin-panel/recoveries']);
  }

  cancel() {
    this.router.navigate(['demo/admin-panel/recoveries']);
  }
}
