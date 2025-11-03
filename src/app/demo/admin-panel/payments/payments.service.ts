import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Payment {
  id: number;
  collectorId: number;
  amount: number;
  status: 'paid' | 'pending' | string;
  paymentDate?: string;
  dueDate?: string;
  // ... other fields as needed
}

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private apiUrl = '/api/payments';

  constructor(private http: HttpClient) {}

  getCollectorPayments(collectorId: number): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.apiUrl}/collector/${collectorId}`);
  }
}
