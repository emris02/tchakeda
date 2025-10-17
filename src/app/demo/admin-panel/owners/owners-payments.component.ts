import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface Payment {
  ownerName: string;
  amount: number;
  date: string;
  status: string;
}

@Component({
  selector: 'app-owners-payments',
  templateUrl: './owners-payments.component.html',
  styleUrls: ['./owners-payments.component.scss'],
  standalone: false
})
export class OwnersPaymentsComponent {
  payments: Payment[] = [];

  constructor(private router: Router) {}

  goToNew() {
    // Logic for adding a new payment
  }
}
