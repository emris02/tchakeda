import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RecoveriesService, Recovery } from './recoveries.service';

@Component({
  selector: 'app-recoveries-detail',
  templateUrl: './recoveries-detail.component.html',
  styleUrls: ['./recoveries-detail.component.scss'],
  standalone: false
})
export class RecoveriesDetailComponent implements OnInit {
  recovery: Recovery | undefined;
  editMode = false;
  form: any = {};
  errors: any = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recoveriesService: RecoveriesService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.recovery = this.recoveriesService.getRecoveryById(id);
    if (this.recovery) {
      this.form = { ...this.recovery };
    }
  }

  enableEdit() {
    this.editMode = true;
  }

  cancelEdit() {
    this.editMode = false;
    this.form = { ...this.recovery };
    this.errors = {};
  }

  validate() {
    this.errors = {};
    if (!this.form.rentalId) this.errors.rentalId = 'Location requise';
    if (!this.form.amount || this.form.amount < 1) this.errors.amount = 'Montant requis';
    if (!this.form.date) this.errors.date = 'Date requise';
    if (!this.form.status) this.errors.status = 'Statut requis';
    if (!this.form.name) this.errors.name = 'Nom requis';
    return Object.keys(this.errors).length === 0;
  }

  save() {
    if (!this.validate()) return;
    this.recoveriesService.updateRecovery(this.form);
    this.recovery = { ...this.form };
    this.editMode = false;
  }

  back() {
    this.router.navigate(['demo/admin-panel/recoveries']);
  }
}
