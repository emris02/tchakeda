import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface PaymentRecordDto {
  id?: number;
  rentalId?: number;
  tenantId?: number;
  collectorId?: number;
  recoveryId?: number;
  period: string;
  amount: number; // montant payé
  dueAmount?: number; // montant dû pour la période
  paidAmount?: number; // alias optionnel si UI préfère paidAmountc
  status?: 'paid' | 'pending' | 'late';
  paymentMethod: string;
  paymentDate: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly endpoint = '/api/payments';
  private storageKey = 'demo_payments_v1';

  constructor(private http: HttpClient) {}

  /**
   * Liste tous les paiements (backend si dispo, sinon localStorage fallback).
   */
  getPayments(): Observable<PaymentRecordDto[]> {
    return this.http.get<PaymentRecordDto[]>(this.endpoint).pipe(
      catchError(() => {
        // fallback to localStorage
        return of(this.fallbackGet());
      })
    );
  }

  /**
   * Récupère les paiements pour une location donnée.
   */
  getPaymentsByRental(rentalId: number): Observable<PaymentRecordDto[]> {
    return this.getPayments().pipe(
      map(list => list.filter(p => Number(p.rentalId) === Number(rentalId)))
    );
  }

  /**
   * Récupère les paiements d'un collecteur (via collectorId sur PaymentRecordDto).
   */
  getPaymentsByCollector(collectorId: number): Observable<PaymentRecordDto[]> {
    return this.getPayments().pipe(
      map(list => list.filter(p => Number(p.collectorId) === Number(collectorId)))
    );
  }

  /**
   * Agrège les paiements d'une location pour retourner total payé, dû, et solde.
   */
  getTotalsByRental(rentalId: number): Observable<{ paid: number; due: number; balance: number }> {
    return this.getPaymentsByRental(rentalId).pipe(
      map(list => {
        const paid = list.reduce((s, p) => s + Number(p.paidAmount ?? p.amount ?? 0), 0);
        const due = list.reduce((s, p) => s + Number(p.dueAmount ?? 0), 0);
        const balance = Math.max(due - paid, 0);
        return { paid, due, balance };
      })
    );
  }

  /**
   * Statistiques d'un collecteur: nombre et montants paid/pending.
   */
  getCollectorStats(collectorId: number): Observable<{
    recoveredCount: number; recoveredAmount: number;
    pendingCount: number; pendingAmount: number;
  }> {
    return this.getPaymentsByCollector(collectorId).pipe(
      map(list => {
        const recovered = list.filter(p => (p.status || '').toLowerCase() === 'paid');
        const pending = list.filter(p => (p.status || '').toLowerCase() === 'pending');
        const recoveredAmount = recovered.reduce((s, p) => s + Number(p.paidAmount ?? p.amount ?? 0), 0);
        const pendingAmount = pending.reduce((s, p) => s + Math.max(Number(p.dueAmount ?? 0) - Number(p.paidAmount ?? p.amount ?? 0), 0), 0);
        return {
          recoveredCount: recovered.length,
          recoveredAmount,
          pendingCount: pending.length,
          pendingAmount
        };
      })
    );
  }

  /**
   * Crée un paiement lié à une location (ou met à jour si id fourni).
   */
  createPayment(record: Omit<PaymentRecordDto, 'id' | 'paymentDate'>): Observable<PaymentRecordDto> {
    const payload: PaymentRecordDto = { ...record, paymentDate: new Date().toISOString() };
    return this.createOrUpdatePayment(payload);
  }

  createOrUpdatePayment(record: PaymentRecordDto): Observable<PaymentRecordDto> {
    // If backend exists, POST/PUT accordingly. Otherwise save to localStorage.
    if (record.id) {
      return this.http.put<PaymentRecordDto>(`${this.endpoint}/${record.id}`, record).pipe(
        catchError(() => {
          return of(this.fallbackSave(record));
        })
      );
    }
    return this.http.post<PaymentRecordDto>(this.endpoint, record).pipe(
      catchError(() => {
        return of(this.fallbackSave(record));
      })
    );
  }

  // localStorage fallback: simple array store
  fallbackGet(): PaymentRecordDto[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      return JSON.parse(raw) as PaymentRecordDto[];
    } catch (e) {
      return [];
    }
  }

  fallbackSave(r: PaymentRecordDto): PaymentRecordDto {
    const all = this.fallbackGet();
    const now = new Date().toISOString();
    if (!r.id) r.id = Date.now();
    r.paymentDate = r.paymentDate || now;
    const idx = all.findIndex(x => x.id === r.id);
    if (idx >= 0) all[idx] = r;
    else all.unshift(r);
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(all));
    } catch (e) {
      // ignore
    }
    return r;
  }
}
