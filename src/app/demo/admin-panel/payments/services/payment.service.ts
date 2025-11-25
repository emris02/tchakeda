import { Injectable } from '@angular/core';
import { Payment } from '../models/payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private storageKey = 'payments';

  getAll(): Payment[] {
    return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
  }

  add(payment: Payment): void {
    const payments = this.getAll();
    payments.push(payment);
    localStorage.setItem(this.storageKey, JSON.stringify(payments));
  }

  update(payment: Payment): void {
    const payments = this.getAll().map(p => p.id === payment.id ? payment : p);
    localStorage.setItem(this.storageKey, JSON.stringify(payments));
  }

  delete(id: string): void {
    const payments = this.getAll().filter(p => p.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(payments));
  }
}
