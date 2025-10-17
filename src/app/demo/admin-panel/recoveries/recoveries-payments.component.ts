import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface Payment {
  recoveryName: string;
  amount: number;
  date: string;
  status: string;
  name: string;
}

@Component({
  selector: 'app-recoveries-payments',
  templateUrl: './recoveries-payments.component.html',
  styleUrls: ['./recoveries-payments.component.scss'],
  standalone: false
})
export class RecoveriePaymentsComponent {
  payments: Payment[] = [];

  constructor(private router: Router) {}

  goToNew() {
    // Logic for adding a new payment
  }
}
