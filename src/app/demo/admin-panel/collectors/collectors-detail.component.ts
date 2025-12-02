import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CollectorsService, Collector } from './collectors.service';
import { PaymentsService, Payment } from '../payments/payments.service';
import { PaymentsService as RecoveriesPaymentsService } from '../recoveries/payments.service';
import { RecoveriesService, Recovery } from '../recoveries/recoveries.service';
import { RentalsService, Rental } from '../rentals/rentals.service';
import { BuildingsService, Building } from '../buildings/buildings.service';
import { ApartmentsService, Apartment } from '../apartments/apartments.service';
import { OwnersService, Owner } from '../owners/owners.service';
import { ContractService } from '../contracts/contract.service';
import { ContractPreviewService } from 'src/app/shared/contracts/contract-preview.service';

import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-collectors-detail',
  templateUrl: './collectors-detail.component.html',
  styleUrls: ['./collectors-detail.component.scss'],
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule]
})
export class CollectorsDetailComponent implements OnInit {
  // Payments (from API)
  payments: Payment[] = [];
  loadingPayments = false;
  paymentsError: string | null = null;
  totalCollected: number = 0; // somme status=paid
  totalPending: number = 0; // somme status=pending
  currentMonthPayments: number = 0; // somme paiements du mois courant
  // Aggregated stats from local payments (with collectorId & status)
  recoveredCount: number = 0;
  recoveredAmount: number = 0;
  pendingCount: number = 0;
  pendingAmount: number = 0;

  // Collector entity
  collector: Collector | undefined;
  id: number | undefined;
  form: any = {};
  editMode = false;
  showDeleteConfirm = false;

  // Legacy / derived lists from recoveries
  collectorPayments: any[] = [];
  filteredPayments: any[] = [];
  completedPayments: number = 0;
  pendingPayments: number = 0;
  successRate: number = 0;
  currentMonthCollection: number = 0;
  averageCollectionTime: number = 0;

  // UI / filters / pagination
  statusFilter: string = '';
  periodFilter: string = '';
  searchTerm: string = '';
  hasActiveFilters: boolean = false;
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;

  errors: any = {};
  assignedZones: any[] = [];
  // Cancellation modal
  showCancellationModal = false;
  cancellationReason = '';
  acceptCancellationConditions = false;
  selectedRentalForCancellation: Rental | undefined;

  // Affiliation manager
  showAffiliationsModal: boolean = false;
  affiliatedBuildingIds: number[] = [];
  affiliatedApartmentIds: number[] = [];
  allBuildings: Building[] = [];
  allApartments: Apartment[] = [];
  selectedBuildingToAdd: number | null = null;
  selectedApartmentToAdd: number | null = null;

  // handle identity image selection from template
  onIdentityImageSelected(event: Event) {
    const input = event.target as HTMLInputElement | null;
    if (!input || !input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.form = this.form || {};
      this.form.identityImage = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private collectorsService: CollectorsService,
    private paymentsService: PaymentsService,
    private rcvPaymentsService: RecoveriesPaymentsService,
    private recoveriesService: RecoveriesService,
    private rentalsService: RentalsService,
    private buildingsService: BuildingsService,
    private apartmentsService: ApartmentsService,
    private ownersService: OwnersService,
    private contractService: ContractService,
    private contractPreviewService: ContractPreviewService
  ) {}

  goToBuildingDetail(buildingId: number) {
    if (!this.collector) return;
    this.router.navigate(['demo/admin-panel/buildings', buildingId], { queryParams: { collectorId: this.collector.id } });
  }

  goToApartmentDetail(apartmentId: number) {
    if (!this.collector) return;
    this.router.navigate(['demo/admin-panel/apartments', apartmentId], { queryParams: { collectorId: this.collector.id } });
  }

  ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.collector = this.collectorsService.getCollectors().find(c => c.id === this.id);
    if (!this.collector) {
      this.router.navigate(['/demo/admin-panel/collectors']);
      return;
    }
    this.form = { ...this.collector };
    // load both sources: recoveries (legacy) and API payments (preferred)
    this.loadCollectorPayments();
    this.fetchPayments();
    // Stats via local payments (collectorId/status)
    this.fetchCollectorStats();
    // load affiliation data and available buildings/apartments
    this.allBuildings = this.buildingsService.getBuildings();
    this.allApartments = this.apartmentsService.getApartments();
    this.loadAffiliations();
    // load contracts for this collector
    try {
      const data = this.contractService.getContractsForCollector(this.collector.id);
      this.collectorOwnerCollectorContracts = data.ownerCollectorContracts || [];
    } catch (e) { this.collectorOwnerCollectorContracts = []; }
  }

  private fetchCollectorStats() {
    if (!this.collector) return;
    this.rcvPaymentsService.getCollectorStats(this.collector.id).subscribe({
      next: (s) => {
        this.recoveredCount = s.recoveredCount;
        this.recoveredAmount = s.recoveredAmount;
        this.pendingCount = s.pendingCount;
        this.pendingAmount = s.pendingAmount;
      },
      error: () => {}
    });
  }

  /** Calcul dynamique du nombre de maisons/locations assignées */
  get assignedHouseCount(): number {
    if (!this.collector) return 0;
    const rentals = typeof this.rentalsService.getRentals === 'function' ? this.rentalsService.getRentals() : [];
    const rentalApts = rentals.filter((r: any) => Number(r.collectorId) === Number(this.collector?.id)).map((r: any) => Number(r.apartmentId));
    // affiliated apartments
    const affiliatedApts = this.affiliatedApartmentIds.slice();
    // apartments inside affiliated buildings
    const aptsInBuildings = this.allApartments.filter(a => this.affiliatedBuildingIds.includes(Number(a.buildingId))).map(a => Number(a.id));
    const set = new Set<number>([...rentalApts, ...affiliatedApts, ...aptsInBuildings]);
    return set.size;
  }

  /* -------------------- Payments API integration -------------------- */
  fetchPayments(): void {
    if (!this.collector) return;
    this.loadingPayments = true;
    this.paymentsError = null;
    this.paymentsService.getCollectorPayments(this.collector.id).subscribe({
      next: (payments: Payment[]) => {
        this.payments = payments || [];
        this.calculatePaymentStats();
        this.loadingPayments = false;
      },
      error: (err: any) => {
        console.error('Erreur fetching payments', err);
        this.paymentsError = 'Erreur lors du chargement des paiements.';
        this.loadingPayments = false;
      }
    });
  }

  calculatePaymentStats(): void {
    const now = new Date();
    this.totalCollected = this.payments
      .filter(p => p && (p.status || '').toString().toLowerCase() === 'paid')
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    this.totalPending = this.payments
      .filter(p => p && (p.status || '').toString().toLowerCase() === 'pending')
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    this.currentMonthPayments = this.payments
      .filter(p => {
        if (!p || !p.paymentDate) return false;
        const d = new Date(p.paymentDate);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, p) => s + Number(p.amount || 0), 0);
  }

  /* -------------------- Legacy recoveries-based logic (kept) -------------------- */
  private loadCollectorPayments() {
    this.collectorPayments = [];
    this.totalCollected = 0;
    this.totalPending = 0;
    if (!this.collector) return;
    // helper: formatPeriodFromRental depends on formatDateShort
    const all = this.recoveriesService.getRecoveries();
    const related = all.filter((r: any) => {
      const collId = (r as any).collectorId;
      if (collId !== undefined && collId !== null) return Number(collId) === Number(this.collector?.id);
      return (r.name || '').toString() === this.collector?.fullName;
    });
    for (const rec of related) {
      const rental = this.rentalsService.getRentalById(Number(rec.rentalId || 0));
      const entry = {
        period: this.formatPeriodFromRental(rental),
        amount: rec.amount,
        dueDate: (rec as any).dueDate || (rental ? rental.endDate : undefined) || undefined,
        paymentDate: rec.date || undefined,
        method: (rec as any).paymentMethod || '-',
        status: (rec.status || '-').toString(),
        collector: rec.name || this.collector!.fullName,
        apartment: rental ? rental.apartmentName : (rec as any).apartmentName || '-',
        tenant: rental ? rental.tenantName : (rec as any).tenantName || '-',
        tenantPhone: (rec as any).tenantPhone || undefined,
        reference: (rec as any).reference || undefined,
        raw: rec,
        rentalId: rec.rentalId || (rental ? rental.id : undefined) // Ajouter rentalId directement pour faciliter l'accès
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
      .filter((p: any) => p.paymentDate && (new Date(p.paymentDate)).getMonth() === now.getMonth() && (new Date(p.paymentDate)).getFullYear() === now.getFullYear())
      .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    this.currentMonthPayments = this.collectorPayments
      .filter((p: any) => p.paymentDate && (new Date(p.paymentDate)).getMonth() === now.getMonth() && (new Date(p.paymentDate)).getFullYear() === now.getFullYear())
      .length;
    this.successRate = this.collectorPayments.length ? Math.round((this.completedPayments / this.collectorPayments.length) * 100) : 0;
    // average collection time
    const durations: number[] = [];
    for (const p of this.collectorPayments) {
      const rental = this.rentalsService.getRentals().find((r: any) => r.apartmentName === p.apartment) as Rental | undefined;
      if (rental && p.paymentDate && rental.startDate) {
        const d = Math.round((new Date(p.paymentDate).getTime() - new Date(rental.startDate).getTime()) / (1000 * 60 * 60 * 24));
        if (!isNaN(d)) durations.push(d);
      }
    }
    this.averageCollectionTime = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    this.applyFilters();
  }

  applyFilters() {
    let list = this.collectorPayments.slice();
    this.hasActiveFilters = !!(this.statusFilter || this.periodFilter || (this.searchTerm && this.searchTerm.trim()));
    if (this.statusFilter) {
      const sf = this.statusFilter.toLowerCase();
      if (sf === 'paid') {
        list = list.filter(p => p.status && p.status.toLowerCase().includes('pay'));
      } else if (sf === 'pending') {
        list = list.filter(p => !(p.status && p.status.toLowerCase().includes('pay')) && !this.isPaymentOverdue(p));
      } else if (sf === 'overdue') {
        list = list.filter(p => this.isPaymentOverdue(p));
      } else if (sf === 'active') {
        // En cours : paiements en attente avec une location active
        list = list.filter(p => {
          const rentalId = p.rentalId || p.raw?.rentalId;
          return !(p.status && p.status.toLowerCase().includes('pay')) && 
                 rentalId && 
                 this.isRentalActiveForCancellation(rentalId);
        });
      }
    }
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
    if (this.searchTerm && this.searchTerm.trim()) {
      const q = this.searchTerm.trim().toLowerCase();
      list = list.filter(p => (p.apartment && p.apartment.toLowerCase().includes(q)) || (p.tenant && p.tenant.toLowerCase().includes(q)));
    }
    this.totalPages = Math.max(1, Math.ceil(list.length / this.pageSize));
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    const start = (this.currentPage - 1) * this.pageSize;
    this.filteredPayments = list.slice(start, start + this.pageSize);
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

  // helpers
  isPaymentOverdue(payment: any): boolean {
    if (!payment || !payment.dueDate) return false;
    const due = new Date(payment.dueDate);
    const today = new Date();
    return due < today && !(payment.status && payment.status.toLowerCase().includes('pay'));
  }

  getDaysUntilDue(payment: any): number {
    if (!payment || !payment.dueDate) return 0;
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

  // ---------------- Affiliation management ----------------

  closeAffiliations() {
    this.showAffiliationsModal = false;
  }

  loadAffiliations() {
    if (!this.collector) return;
    const aff = this.collectorsService.getAffiliations(this.collector.id);
    this.affiliatedBuildingIds = aff.buildings ? aff.buildings.map(Number) : [];
    this.affiliatedApartmentIds = aff.apartments ? aff.apartments.map(Number) : [];
  }

  /* -------------------- Dependent selects: Owner -> Building -> Apartment -------------------- */
  owners: Owner[] = [];
  selectedOwnerId: number | null = null;
  filteredBuildings: Building[] = [];
  filteredApartmentsByBuilding: Apartment[] = [];

  private refreshOwnersAndFilters() {
    this.owners = this.ownersService.getOwners();
    // preserve selected building if still under selected owner
    this.onOwnerChange(this.selectedOwnerId);
  }

  // Contracts related to this collector
  collectorOwnerCollectorContracts: any[] = [];

  openContractPreview(contract: any) {
    if (!contract) return;
    this.contractPreviewService.open(contract);
  }

  onOwnerChange(ownerId: number | null) {
    this.selectedOwnerId = ownerId;
    const allB = this.buildingsService.getBuildings();
    this.filteredBuildings = ownerId ? allB.filter(b => Number(b.ownerId) === Number(ownerId)) : allB;
    // reset building selection if not in filtered
    if (this.selectedBuildingToAdd && !this.filteredBuildings.find(b => Number(b.id) === Number(this.selectedBuildingToAdd))) {
      this.selectedBuildingToAdd = null;
    }
    this.onBuildingChange(this.selectedBuildingToAdd);
  }

  onBuildingChange(buildingId: number | null) {
    const allA = this.apartmentsService.getApartments();
    if (buildingId) {
      this.filteredApartmentsByBuilding = allA.filter(a => Number(a.buildingId) === Number(buildingId));
    } else {
      this.filteredApartmentsByBuilding = [];
    }
    // reset apartment selection if not in filtered
    if (this.selectedApartmentToAdd && !this.filteredApartmentsByBuilding.find(a => Number(a.id) === Number(this.selectedApartmentToAdd))) {
      this.selectedApartmentToAdd = null;
    }
  }

  // ensure data ready when opening modal
  openAffiliations() {
    this.loadAffiliations();
    this.allBuildings = this.buildingsService.getBuildings();
    this.allApartments = this.apartmentsService.getApartments();
    this.refreshOwnersAndFilters();
    this.showAffiliationsModal = true;
  }

  addBuildingAffiliation() {
    if (!this.collector || !this.selectedBuildingToAdd) return;
    const bId = Number(this.selectedBuildingToAdd);
    this.collectorsService.addBuildingToCollector(this.collector.id, bId);
    if (!this.affiliatedBuildingIds.includes(bId)) this.affiliatedBuildingIds.push(bId);
    // update cached apartments list and assigned count
    this.allApartments = this.apartmentsService.getApartments();
    this.selectedBuildingToAdd = null;
  }

  removeBuildingAffiliation(buildingId: number) {
    if (!this.collector) return;
    this.collectorsService.removeBuildingFromCollector(this.collector.id, buildingId);
    this.affiliatedBuildingIds = this.affiliatedBuildingIds.filter(b => Number(b) !== Number(buildingId));
  }

  addApartmentAffiliation() {
    if (!this.collector || !this.selectedApartmentToAdd) return;
    const aId = Number(this.selectedApartmentToAdd);
    this.collectorsService.addApartmentToCollector(this.collector.id, aId);
    if (!this.affiliatedApartmentIds.includes(aId)) this.affiliatedApartmentIds.push(aId);
    this.selectedApartmentToAdd = null;
  }

  removeApartmentAffiliation(apartmentId: number) {
    if (!this.collector) return;
    this.collectorsService.removeApartmentFromCollector(this.collector.id, apartmentId);
    this.affiliatedApartmentIds = this.affiliatedApartmentIds.filter(a => Number(a) !== Number(apartmentId));
  }

  isBuildingAffiliated(buildingId: number) {
    return this.affiliatedBuildingIds.includes(Number(buildingId));
  }

  isApartmentAffiliated(apartmentId: number) {
    return this.affiliatedApartmentIds.includes(Number(apartmentId));
  }

  isCollectorActive(): boolean {
    if (!this.collector) return false;
    return !!(this.assignedHouseCount && Number(this.assignedHouseCount) > 0);
  }

  // Actions
  markAsPaid(payment: any) {
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

  // helpers to resolve names
  getBuildingName(buildingId: number | undefined): string {
    if (!buildingId) return '-';
    const building = this.buildingsService.getBuildingById(buildingId);
    return building ? building.name : '-';
  }

  getApartmentName(apartmentId: number | undefined): string {
    if (!apartmentId) return '-';
    const apartment = this.apartmentsService.getApartmentById(apartmentId);
    if (!apartment) return `ID: ${apartmentId}`;
    return apartment.name || `ID: ${apartmentId}`;
  }

  // ==================== Gestion de l'annulation de location (Recouvreur) ====================
  
  /**
   * Vérifie si une location est active et peut être annulée
   * Une location est active si :
   * 1. Elle n'a pas de statut (compatibilité avec les anciennes données) OU son statut est 'active'
   * 2. ET elle n'est pas 'cancelled' ou 'ended'
   * 3. ET la date de fin est dans le futur ou aujourd'hui
   */
  isRentalActiveForCancellation(rentalId: number | undefined): boolean {
    if (!rentalId) return false;
    const rental = this.rentalsService.getRentalById(rentalId);
    if (!rental) return false;
    
    // Si la location est annulée, elle n'est pas active
    if (rental.status === 'cancelled') return false;
    
    // Si la location est terminée, elle n'est pas active
    if (rental.status === 'ended') return false;
    
    // Si la location n'a pas de statut ou est 'active', vérifier la date
    // (compatibilité : les anciennes locations sans statut sont considérées comme actives si la date est valide)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(rental.endDate);
    endDate.setHours(0, 0, 0, 0);
    
    // La location est active si la date de fin est dans le futur ou aujourd'hui
    return endDate >= today;
  }

  /**
   * Ouvre la modale d'annulation de location
   */
  openCancellationModal(rentalId: number | undefined): void {
    if (!this.collector || !rentalId) return;
    const rental = this.rentalsService.getRentalById(rentalId);
    if (!rental) {
      alert('Erreur: Location introuvable.');
      return;
    }
    // Vérifier que la location n'est pas déjà annulée ou terminée
    if (rental.status === 'cancelled') {
      alert('Cette location est déjà annulée.');
      return;
    }
    if (rental.status === 'ended') {
      alert('Cette location est déjà terminée.');
      return;
    }
    // Vérifier que la location est toujours active (même si pas de statut défini)
    if (!this.isRentalActiveForCancellation(rentalId)) {
      alert('Cette location n\'est plus active.');
      return;
    }
    // Vérifier que le recouvreur est bien associé à cette location
    // Si collectorId n'est pas défini (anciennes données), on vérifie l'affiliation
    if (rental.collectorId && rental.collectorId !== this.collector.id) {
      // Vérifier si le recouvreur est affilié à l'appartement ou au bâtiment
      const apt = this.apartmentsService.getApartmentById(rental.apartmentId);
      if (!apt) {
        alert('Erreur: Appartement introuvable.');
        return;
      }
      const isAffiliated = this.collectorsService.isApartmentAffiliated(this.collector.id, apt.id) ||
                          this.collectorsService.isBuildingAffiliated(this.collector.id, apt.buildingId);
      if (!isAffiliated) {
        alert('Erreur: Vous n\'êtes pas autorisé à annuler cette location.');
        return;
      }
    } else if (!rental.collectorId) {
      // Si pas de collectorId, vérifier l'affiliation
      const apt = this.apartmentsService.getApartmentById(rental.apartmentId);
      if (apt) {
        const isAffiliated = this.collectorsService.isApartmentAffiliated(this.collector.id, apt.id) ||
                            this.collectorsService.isBuildingAffiliated(this.collector.id, apt.buildingId);
        if (!isAffiliated) {
          alert('Erreur: Vous n\'êtes pas autorisé à annuler cette location.');
          return;
        }
      }
    }
    this.selectedRentalForCancellation = rental;
    this.cancellationReason = '';
    this.acceptCancellationConditions = false;
    this.errors = {};
    this.showCancellationModal = true;
  }

  /**
   * Ferme la modale d'annulation
   */
  closeCancellationModal(): void {
    this.showCancellationModal = false;
    this.selectedRentalForCancellation = undefined;
    this.cancellationReason = '';
    this.acceptCancellationConditions = false;
    this.errors = {};
  }

  /**
   * Confirme l'annulation de location
   */
  confirmCancellation(): void {
    if (!this.selectedRentalForCancellation || !this.collector) return;
    
    // Validation
    this.errors = {};
    if (!this.cancellationReason || !this.cancellationReason.trim()) {
      this.errors.cancellationReason = 'La raison de l\'annulation est requise.';
      return;
    }
    if (!this.acceptCancellationConditions) {
      this.errors.cancellationConditions = 'Vous devez accepter les conditions d\'annulation.';
      return;
    }

    // Appeler le service pour annuler la location par le recouvreur
    this.rentalsService.cancelRentalByCollector(
      this.selectedRentalForCancellation.id,
      this.cancellationReason.trim(),
      this.collector.id
    ).subscribe({
      next: () => {
        alert('La location a été annulée avec succès.');
        this.closeCancellationModal();
        // Recharger les données
        this.loadCollectorPayments();
        this.fetchCollectorStats();
      },
      error: (err: any) => {
        alert('Erreur lors de l\'annulation de la location: ' + (err.message || 'Erreur inconnue'));
      }
    });
  }

}

