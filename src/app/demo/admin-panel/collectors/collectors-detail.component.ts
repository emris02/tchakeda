import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CollectorsService, Collector } from './collectors.service';
import { RecoveriesService, Recovery } from '../recoveries/recoveries.service';
import { RentalsService, Rental } from '../rentals/rentals.service';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-collectors-detail',
  templateUrl: './collectors-detail.component.html',
  styleUrls: ['./collectors-detail.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class CollectorsDetailComponent implements OnInit {
  collector: Collector | undefined;
  id: number | undefined;
  editMode = false;
  showDeleteConfirm = false;
  form: any = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private collectorsService: CollectorsService
    , private recoveriesService: RecoveriesService
    , private rentalsService: RentalsService
  ) {}

  ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.collector = this.collectorsService.getCollectors().find(c => c.id === this.id);
    if (!this.collector) {
      this.router.navigate(['/demo/admin-panel/collectors']);
    } else {
      this.form = { ...this.collector };
      // load payments related to this collector
      this.loadCollectorPayments();
    }
  }

  collectorPayments: any[] = [];
  totalCollected: number = 0;
  totalPending: number = 0;
  // UI / filters / pagination
  statusFilter: string = '';
  periodFilter: string = '';
  searchTerm: string = '';
  filteredPayments: any[] = [];
  hasActiveFilters: boolean = false;
  // pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  // summary values used in template
  currentMonthPayments: number = 0;
  completedPayments: number = 0;
  pendingPayments: number = 0;
  successRate: number = 0;
  currentMonthCollection: number = 0;
  averageCollectionTime: number = 0;
  errors: any = {};
  assignedZones: any[] = [];

  // handle identity image selection from template
  onIdentityImageSelected(event: Event) {
    const input = event.target as HTMLInputElement | null;
    if (!input || !input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.form = this.form || {};
      // store as data URL for preview; in real app you'd upload and save a path or blob
      this.form.identityImage = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  private formatDateShort(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString();
  }

  private formatPeriodFromRental(r?: Rental): string {
    if (!r) return '-';
    const s = r.startDate ? this.formatDateShort(r.startDate) : '';
    const e = r.endDate ? this.formatDateShort(r.endDate) : '';
    return s && e ? `${s} → ${e}` : (s || e || '-');
  }

  private loadCollectorPayments() {
    this.collectorPayments = [];
    this.totalCollected = 0;
    this.totalPending = 0;
    if (!this.collector) return;
    const all = this.recoveriesService.getRecoveries();
    const related = all.filter(r => {
      // prefer matching collectorId when available, otherwise fallback to name
      const collId = (r as any).collectorId;
      if (collId !== undefined && collId !== null) return Number(collId) === Number(this.collector?.id);
      return (r.name || '').toString() === this.collector?.fullName;
    });
    for (const rec of related) {
      const rental = this.rentalsService.getRentalById(Number(rec.rentalId || 0));
      const entry = {
        period: this.formatPeriodFromRental(rental),
        amount: rec.amount,
        // dueDate: optionally provided on recovery, otherwise fallback to rental endDate
        dueDate: (rec as any).dueDate || (rental ? rental.endDate : undefined) || undefined,
        // paymentDate is the recorded date of the recovery when available
        paymentDate: rec.date || undefined,
        method: (rec as any).paymentMethod || '-',
        status: (rec.status || '-').toString(),
        collector: rec.name || this.collector.fullName,
        apartment: rental ? rental.apartmentName : (rec as any).apartmentName || '-',
        tenant: rental ? rental.tenantName : (rec as any).tenantName || '-',
        tenantPhone: (rec as any).tenantPhone || undefined,
        reference: (rec as any).reference || undefined,
        raw: rec
      };
      this.collectorPayments.push(entry);
      if (entry.status && entry.status.toLowerCase().includes('pay')) {
        this.totalCollected += Number(entry.amount || 0);
        this.completedPayments += 1;
      } else {
        this.totalPending += Number(entry.amount || 0);
        this.pendingPayments += 1;
      }
    }
    // compute additional summaries
    const now = new Date();
    this.currentMonthCollection = this.collectorPayments
      .filter(p => p.paymentDate && (new Date(p.paymentDate)).getMonth() === now.getMonth() && (new Date(p.paymentDate)).getFullYear() === now.getFullYear())
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    this.currentMonthPayments = this.collectorPayments
      .filter(p => p.paymentDate && (new Date(p.paymentDate)).getMonth() === now.getMonth() && (new Date(p.paymentDate)).getFullYear() === now.getFullYear())
      .length;
    this.successRate = this.collectorPayments.length ? Math.round((this.completedPayments / this.collectorPayments.length) * 100) : 0;
    // average collection time: days between rental start and paymentDate when both available
    const durations: number[] = [];
    for (const p of this.collectorPayments) {
      const rental = this.rentalsService.getRentals().find(r => r.apartmentName === p.apartment) as Rental | undefined;
      if (rental && p.paymentDate && rental.startDate) {
        const d = Math.round((new Date(p.paymentDate).getTime() - new Date(rental.startDate).getTime()) / (1000 * 60 * 60 * 24));
        if (!isNaN(d)) durations.push(d);
      }
    }
    this.averageCollectionTime = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    // init filtered list and pagination
    this.applyFilters();
  }

  applyFilters() {
    // compute filteredPayments from collectorPayments
    let list = this.collectorPayments.slice();
    this.hasActiveFilters = !!(this.statusFilter || this.periodFilter || (this.searchTerm && this.searchTerm.trim()));
    // status filter
    if (this.statusFilter) {
      const sf = this.statusFilter.toLowerCase();
      if (sf === 'paid') list = list.filter(p => p.status && p.status.toLowerCase().includes('pay'));
      if (sf === 'pending') list = list.filter(p => !(p.status && p.status.toLowerCase().includes('pay')));
      if (sf === 'overdue') list = list.filter(p => this.isPaymentOverdue(p));
    }
    // period filter
    const now = new Date();
    if (this.periodFilter) {
      if (this.periodFilter === 'current-month') {
        list = list.filter(p => p.paymentDate && (new Date(p.paymentDate)).getMonth() === now.getMonth() && (new Date(p.paymentDate)).getFullYear() === now.getFullYear());
      } else if (this.periodFilter === 'last-month') {
        const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        list = list.filter(p => p.paymentDate && (new Date(p.paymentDate)).getMonth() === last.getMonth() && (new Date(p.paymentDate)).getFullYear() === last.getFullYear());
      } else if (this.periodFilter === 'current-year') {
        list = list.filter(p => p.paymentDate && (new Date(p.paymentDate)).getFullYear() === now.getFullYear());
      }
    }
    // search
    if (this.searchTerm && this.searchTerm.trim()) {
      const q = this.searchTerm.trim().toLowerCase();
      list = list.filter(p => (p.apartment && p.apartment.toLowerCase().includes(q)) || (p.tenant && p.tenant.toLowerCase().includes(q)));
    }

    // pagination
    this.totalPages = Math.max(1, Math.ceil(list.length / this.pageSize));
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    const start = (this.currentPage - 1) * this.pageSize;
    this.filteredPayments = list.slice(start, start + this.pageSize);
  }

  // helpers
  isPaymentOverdue(payment: any): boolean {
    if (!payment.dueDate) return false;
    const due = new Date(payment.dueDate);
    const today = new Date();
    return due < today && !(payment.status && payment.status.toLowerCase().includes('pay'));
  }

  getDaysUntilDue(payment: any): number {
    if (!payment.dueDate) return 0;
    const due = new Date(payment.dueDate);
    const diff = Math.ceil((due.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return isNaN(diff) ? 0 : diff;
  }

  getMethodIcon(method: string | undefined): string {
    if (!method) return 'fas fa-money-bill-wave';
    const m = method.toLowerCase();
    if (m.includes('cash') || m.includes('esp')) return 'fas fa-money-bill-wave';
    if (m.includes('card')) return 'fas fa-credit-card';
    if (m.includes('transfer') || m.includes('virement')) return 'fas fa-exchange-alt';
    return 'fas fa-wallet';
  }

  getStatusClass(status: string | undefined): string {
    if (!status) return 'status-pending';
    const s = status.toLowerCase();
    if (s.includes('pay')) return 'status-paid';
    if (s.includes('part')) return 'status-partial';
    if (s.includes('att') || s.includes('pending')) return 'status-pending';
    return 'status-unknown';
  }

  getStatusIcon(status: string | undefined): string {
    if (!status) return 'fas fa-clock';
    const s = status.toLowerCase();
    if (s.includes('pay')) return 'fas fa-check-circle';
    if (s.includes('part')) return 'fas fa-adjust';
    if (s.includes('att') || s.includes('pending')) return 'fas fa-hourglass-half';
    return 'fas fa-question-circle';
  }

  getStatusText(status: string | undefined): string {
    return status || '-';
  }

  /** Retourne true si le recouvreur est considéré comme actif (maisons assignées) */
  isCollectorActive(): boolean {
    if (!this.collector) return false;
    return !!(this.collector.houseCount && Number(this.collector.houseCount) > 0);
  }

  // Actions
  markAsPaid(payment: any) {
    // try to find underlying recovery and update it
    const all = this.recoveriesService.getRecoveries();
    const match = all.find(r => Number(r.amount) === Number(payment.amount) && (r.date === payment.paymentDate || r.date === payment.dueDate || r.name === payment.collector));
    if (match) {
      match.status = 'Payé';
      this.recoveriesService.updateRecovery(match as Recovery);
    }
    payment.status = 'paid';
    this.applyFilters();
  }

  viewPaymentDetails(payment: any) {
    alert('Détails paiement:\n' + JSON.stringify(payment, null, 2));
  }

  sendReminder(payment: any) {
    alert('Rappel envoyé pour le paiement : ' + (payment.reference || payment.apartment || ''));
  }

  exportPayments() {
    const rows = [ ['Période','Montant','Date échéance','Date paiement','Mode','Statut','Appartement','Locataire'] ];
    const list = this.collectorPayments;
    for (const p of list) {
      rows.push([p.period, String(p.amount), p.dueDate || '', p.paymentDate || '', p.method || '', p.status || '', p.apartment || '', p.tenant || '']);
    }
    const csv = rows.map(r => r.map(c => '"' + (c || '') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payments_collector_${this.collector?.id || 'export'}.csv`;
    link.click();
  }

  // pagination helpers
  getDisplayRange(): string {
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.collectorPayments.length);
    return `${start} - ${end} sur ${this.collectorPayments.length}`;
  }

  previousPage() { if (this.currentPage > 1) { this.currentPage--; this.applyFilters(); } }
  nextPage() { if (this.currentPage < this.totalPages) { this.currentPage++; this.applyFilters(); } }

  enableEdit() { this.editMode = true; }
  cancelEdit() { this.editMode = false; this.form = { ...(this.collector || {}) }; this.errors = {}; }

  save() {
    if (this.collector) {
      Object.assign(this.collector, this.form);
      this.collectorsService.updateCollector(this.collector);
      this.editMode = false;
      alert('Modifications enregistrées');
    }
  }

  delete() {
    if (this.id) {
      this.collectorsService.deleteCollector(this.id);
      this.router.navigate(['/demo/admin-panel/collectors']);
    }
  }

  back() {
    this.router.navigate(['/demo/admin-panel/collectors']);
  }
}
