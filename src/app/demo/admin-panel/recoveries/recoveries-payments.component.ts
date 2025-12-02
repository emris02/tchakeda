import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Location } from '@angular/common';
import { PaymentsService } from 'src/app/demo/admin-panel/recoveries/payments.service';
import { Router } from '@angular/router';
import { RentalsService, Rental } from 'src/app/demo/admin-panel/rentals/rentals.service';
import { TenantsService, Tenant } from 'src/app/demo/admin-panel/tenants/tenants.service';
import { CollectorsService, Collector } from 'src/app/demo/admin-panel/collectors/collectors.service';
import { ApartmentsService, Apartment } from 'src/app/demo/admin-panel/apartments/apartments.service';
import { OwnersService, Owner } from 'src/app/demo/admin-panel/owners/owners.service';
import { BuildingsService, Building } from 'src/app/demo/admin-panel/buildings/buildings.service';

interface PaymentRecord {
  id?: number;
  rentalId?: number;
  tenantId?: number;
  collectorId?: number;
  recoveryId?: number;
  ownerId?: number;
  buildingId?: number;
  apartmentId?: number;
  period: string; // YYYY-MM
  amount: number;
  paymentMethod: string;
  paymentDate: string; // ISO
  commissionRecouvreur?: number;
  netProprietaire?: number;
  commissionRate?: number;
  occupied?: boolean;
  status?: 'paid' | 'late' | 'pending';
  daysLate?: number;
  receiptSentToTenant?: boolean;
  receiptSentToOwner?: boolean;
  receiptSentToTenantAt?: string | null;
  receiptSentToOwnerAt?: string | null;
}

@Component({
  selector: 'app-recoveries-payments',
  templateUrl: './recoveries-payments.component.html',
  styleUrls: ['./recoveries-payments.component.scss'],
  standalone: false
})
export class RecoveriePaymentsComponent implements OnInit {
  paymentForm: Partial<PaymentRecord> = {
    period: '',
    amount: 0,
    paymentMethod: '',
    paymentDate: new Date().toISOString().split('T')[0],
    commissionRate: 8
  };

  progressSteps = [
    { id: 1, title: 'Sélection du locataire', caption: 'Propriétaire → Bâtiment → Appartement → Locataire' },
    { id: 2, title: 'Détails du paiement', caption: 'Période, montant, mode et validations' },
    { id: 3, title: 'Confirmation', caption: 'Contrôles finaux & quittance' }
  ];
  currentStep = 1;
  stepErrors: Record<number, string[]> = { 1: [], 2: [], 3: [] };
  touchedSteps = new Set<number>([1]);
  finalAcknowledgement = false;
  forceDuplicateSubmission = false;

  payments: PaymentRecord[] = [];
  filteredPayments: PaymentRecord[] = [];
  searchTerm = '';
  selectedPeriod = '';
  periods: string[] = [];

  historyFilters = { period: '', status: '', search: '', collector: '' };
  statusOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'paid', label: 'Payés' },
    { value: 'pending', label: 'En attente' },
    { value: 'late', label: 'En retard' }
  ];

  historyTabs: Array<{ id: 'history' | 'contract' | 'actions'; label: string }> = [
    { id: 'history', label: 'Historique' },
    { id: 'contract', label: 'Contrat' },
    { id: 'actions', label: 'Actions rapides' }
  ];
  activeTab: 'history' | 'contract' | 'actions' = 'history';

  // summaries
  totalPaymentsThisMonth = 0;
  totalCommissions = 0;
  totalNetOwners = 0;
  totalLateAmount = 0;
  latePayments: PaymentRecord[] = [];
  dashboardCards: Array<{ label: string; value: string; subLabel: string; accent: 'primary' | 'success' | 'warning' | 'danger'; trend?: string }> = [];

  // simple UI state
  saving = false;
  toastMessage = '';
  showToast = false;

  // receipt preview state
  showReceiptPreview = false;
  previewHtml: string | null = null;
  previewPayment: PaymentRecord | null = null;

  @ViewChild('receiptIframe') receiptIframe?: ElementRef<HTMLIFrameElement>;
  
  // Dans recoveries-payments.component.ts
loadReceiptInIframe() {
  if (this.receiptIframe && this.receiptIframe.nativeElement && this.previewHtml) {
    try {
      const iframe = this.receiptIframe.nativeElement;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(this.previewHtml);
        iframeDoc.close();
        
        // Ajuster la hauteur de l'iframe après le chargement
        setTimeout(() => {
          iframe.style.height = iframeDoc.body.scrollHeight + 'px';
        }, 100);
      }
    } catch (e) {
      console.error('Erreur lors du chargement de la quittance:', e);
    }
  }
}

  // contract modals
  showExtendModal = false;
  showEditContractModal = false;
  // viewing contract separate from editing
  showViewContractModal = false;
  extendDate: string = '';

  // contract view state
  contractView: {
    id?: number;
    locataire?: string;
    apartment?: string;
    buildingName?: string;
    price?: number;
    priceDisplay?: string;
    startDate?: string;
    endDate?: string;
    collector?: string;
    owner?: string;
    ownerName?: string;
    ownerAddress?: string;
    ownerPhone?: string;
    ownerEmail?: string;
    tenantAddress?: string;
    tenantPhone?: string;
    tenantEmail?: string;
    tenantCni?: string;
    surface?: number;
    cautionAmount?: number;
  } | null = null;
  // current rental context
  currentRental: Rental | null = null;
  // editable copy for the edit modal
  editRental: Rental | null = null;
  apartments: Apartment[] = [];
  owners: Owner[] = [];
  buildingsForOwner: Building[] = [];
  apartmentsForBuilding: Apartment[] = [];
  tenantsForApartment: Tenant[] = [];

  // collectors cache
  collectors: Collector[] = [];

  // tenants cache used by init modal
  tenants: Tenant[] = [];

  // init payment modal state
  showInitPaymentModal = false;
  initPaymentForm: Partial<PaymentRecord> = { tenantId: undefined, period: '', amount: 0, paymentMethod: '' };

  liveCalculations = {
    commissionRate: 8,
    commission: 0,
    net: 0,
    duplicate: null as PaymentRecord | null,
    late: false,
    lateDays: 0
  };

  timelinePayments: PaymentRecord[] = [];

  contractSnapshot: {
    tenant?: string;
    apartment?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    price?: string;
    collector?: string;
  } | null = null;

  // today for contract signature
  today: Date = new Date();

  // UI toggle for showing the payment form (hidden by default)
  showPaymentForm: boolean = false;

  // minimum extend date (defaults to tomorrow)
  minExtendDate: string = new Date().toISOString().split('T')[0];

  constructor(
    private router: Router,
    private paymentsService: PaymentsService,
    private rentalsService: RentalsService,
    private tenantsService: TenantsService,
    private collectorsService: CollectorsService,
    private apartmentsService: ApartmentsService,
    private buildingsService: BuildingsService,
    private ownersService: OwnersService,
    private location: Location
  ) {}

  // MÉTHODES AJOUTÉES POUR CORRIGER LES ERREURS
  refreshPayments(): void {
    console.log('Rafraîchissement des paiements...');
    this.loadPayments();
    this.showTemporaryToast('Liste des paiements rafraîchie');
  }

  // Compatibility alias used by some templates / shared components
  onRefreshClick(): void {
    this.refreshPayments();
  }

  // Compatibility alias for print button handlers
  onPrint(): void {
    this.printPayments();
  }

  // Some templates bind to `searchText` instead of `searchTerm` — keep both in sync
  get searchText(): string {
    return this.searchTerm;
  }
  set searchText(v: string) {
    this.searchTerm = v || '';
    this.historyFilters.search = this.searchTerm;
    this.applyFilters();
  }

  printPayments(): void {
    console.log('Impression des paiements...');
    window.print();
  }

  goBack(): void {
    this.location.back();
  }

  openPaymentForm() {
    this.showPaymentForm = true;
    // reset stepper and form state when opening
    this.currentStep = 1;
    this.paymentForm = { period: '', amount: 0, paymentMethod: '', paymentDate: new Date().toISOString().split('T')[0], commissionRate: 8 };
    this.buildingsForOwner = [];
    this.apartmentsForBuilding = [];
    this.tenantsForApartment = [];
    this.currentRental = null;
    this.updateContractSnapshot(null);
    this.stepErrors = { 1: [], 2: [], 3: [] };
    this.touchedSteps = new Set<number>([1]);
  }

  private prefillOwnerFromBuilding(buildingId?: number) {
    if (!buildingId) return;
    try {
      const building = (this.buildingsService as any).getBuildingById ? (this.buildingsService as any).getBuildingById(Number(buildingId)) : null;
      if (building?.ownerId) {
        this.paymentForm.ownerId = Number(building.ownerId);
      }
    } catch {
      // ignore
    }
  }

  ngOnInit(): void {
    this.collectors = this.collectorsService.getCollectors ? this.collectorsService.getCollectors() : [];
    // TenantsService exposes `getTenants()`; use that directly (fallback to empty array)
    this.tenants = (this.tenantsService && (this.tenantsService as any).getTenants) ? (this.tenantsService as any).getTenants() : [];
    // load apartments & buildings caches for quick lookup in the table
    this.apartments = this.apartmentsService.getApartments ? this.apartmentsService.getApartments() : [];
    // load owners list
    try { this.owners = (this.ownersService && (this.ownersService as any).getOwners) ? (this.ownersService as any).getOwners() : []; } catch (e) { this.owners = []; }
    // buildingsService may offer a getBuildings list
    try {
      if ((this.buildingsService as any).getBuildings) {
        // store locally by calling service if needed (we don't keep separate list field)
        // but methods below will call buildingsService.getBuildingById when necessary
      }
    } catch (e) { /* ignore */ }
    this.loadPayments();
    this.updateCalculations();
  }

  onOwnerChange(ownerId?: number) {
    this.paymentForm.ownerId = ownerId;
    if (!ownerId) {
      this.buildingsForOwner = [];
      this.apartmentsForBuilding = [];
      this.paymentForm.buildingId = undefined;
      this.paymentForm.apartmentId = undefined;
      this.paymentForm.tenantId = undefined;
      this.tenantsForApartment = [];
      this.currentRental = null;
      this.updateContractSnapshot(null);
      this.validateStep(1, true);
      this.stepErrors = { 1: [], 2: [], 3: [] };
      this.touchedSteps = new Set<number>([1]);
      return;
    }
    this.buildingsForOwner = (this.buildingsService && (this.buildingsService as any).getBuildingsByOwner) ? (this.buildingsService as any).getBuildingsByOwner(Number(ownerId)) : [];
    // reset apartment/building selection in form
    if (!this.buildingsForOwner.some(b => b.id === this.paymentForm.buildingId)) {
      this.paymentForm.buildingId = undefined;
      this.apartmentsForBuilding = [];
      this.paymentForm.apartmentId = undefined;
      this.paymentForm.tenantId = undefined;
      this.tenantsForApartment = [];
      this.currentRental = null;
      this.updateContractSnapshot(null);
    }
    if (this.buildingsForOwner.length === 1 && !this.paymentForm.buildingId) {
      this.paymentForm.buildingId = this.buildingsForOwner[0].id;
      this.onBuildingChange(this.paymentForm.buildingId);
    }
    this.validateStep(1, true);
  }

  onBuildingChange(buildingId?: number) {
    this.paymentForm.buildingId = buildingId;
    if (!buildingId) { this.apartmentsForBuilding = []; this.paymentForm.apartmentId = undefined; this.paymentForm.tenantId = undefined; this.validateStep(1, true); return; }
    this.apartmentsForBuilding = this.apartmentsService.getApartments().filter(a => Number(a.buildingId) === Number(buildingId));
    if (this.apartmentsForBuilding.length === 1 && !this.paymentForm.apartmentId) {
      this.paymentForm.apartmentId = this.apartmentsForBuilding[0].id;
      this.onApartmentChange(this.paymentForm.apartmentId);
    } else {
      if (!this.apartmentsForBuilding.some(a => a.id === this.paymentForm.apartmentId)) {
        this.paymentForm.apartmentId = undefined;
        this.paymentForm.tenantId = undefined;
      }
    }
    this.prefillOwnerFromBuilding(buildingId);
    this.validateStep(1, true);
  }

    onApartmentChange(apartmentId?: number) {
    // Réinitialisation du formulaire et des listes
    this.paymentForm.apartmentId = apartmentId;
    this.tenantsForApartment = [];
    this.currentRental = null;
    this.paymentForm.tenantId = undefined;
    this.paymentForm.rentalId = undefined;
    this.paymentForm.collectorId = undefined;
    this.paymentForm.buildingId = undefined;
    this.updateContractSnapshot(null);

    if (!apartmentId) {
      this.updateCalculations();
      this.validateStep(1, true);
      return;
    }

    // 1️⃣ Chercher un rental actif pour l'appartement
    const rental = this.rentalsService.getActiveRental(Number(apartmentId));
    if (rental) {
      this.currentRental = rental;
      this.paymentForm.rentalId = rental.id;
      this.paymentForm.tenantId = rental.tenantId;
      this.paymentForm.collectorId = rental.collectorId;
      this.paymentForm.buildingId = rental.buildingId;
      this.prefillOwnerFromBuilding(rental.buildingId);
      this.updateContractSnapshot(rental);
    } else {
      // Pas de rental actif
      const apartment = this.apartmentsService.getApartmentById(Number(apartmentId));
      if (apartment?.tenantId) {
        const tenant = this.tenantsService.getTenantById(Number(apartment.tenantId));
        if (tenant) {
          this.paymentForm.tenantId = tenant.id;
        }
      }
    }

    // 2️⃣ Construire la liste des locataires pour l'appartement
    this.tenantsForApartment = this.tenants.filter(t => (t.apartments || []).includes(Number(apartmentId)));

    // Ajouter le locataire prérempli s'il n'est pas dans la liste
    if (this.paymentForm.tenantId) {
      const tenant = this.tenantsService.getTenantById(Number(this.paymentForm.tenantId));
      if (tenant && !this.tenantsForApartment.some(t => t.id === tenant.id)) {
        this.tenantsForApartment.push(tenant);
      }
    }

    // 3️⃣ Si un seul locataire possible, le sélectionner automatiquement
    if (!this.paymentForm.tenantId && this.tenantsForApartment.length === 1) {
      this.paymentForm.tenantId = this.tenantsForApartment[0].id;
    }

    // 🔄 Calculs et validation
    this.updateCalculations();
    this.validateStep(1, true);
  }


  loadPayments() {
    this.paymentsService.getPayments().subscribe({
      next: (data: PaymentRecord[]|any) => {
        this.payments = (data || []).map((p: any) => this.normalizePaymentRecord(p))
          .sort((a: PaymentRecord, b: PaymentRecord) => (b.paymentDate || '').localeCompare(a.paymentDate || ''));
        this.periods = Array.from(new Set(this.payments.map(p => p.period))).sort().reverse();
        this.computeSummaries();
        this.applyFilters();
        this.updateTimeline();
      },
      error: (err: any) => {
        console.error(err);
        // fallback to local data in service if provided
        this.payments = (this.paymentsService.fallbackGet ? this.paymentsService.fallbackGet() : [])
          .map(p => this.normalizePaymentRecord(p));
        this.periods = Array.from(new Set(this.payments.map(p => p.period))).sort().reverse();
        this.computeSummaries();
        this.applyFilters();
        this.updateTimeline();
      }
    });
  }

  normalizePaymentRecord(p: any): PaymentRecord {
    const rec: PaymentRecord = {
      id: p.id,
      rentalId: p.rentalId,
      tenantId: p.tenantId,
      collectorId: p.collectorId,
      recoveryId: p.recoveryId,
      ownerId: p.ownerId,
      buildingId: p.buildingId || (p.building ? p.building.id : undefined),
      apartmentId: p.apartmentId,
      period: p.period,
      amount: Number(p.amount) || 0,
      paymentMethod: p.paymentMethod || '',
      paymentDate: p.paymentDate || new Date().toISOString(),
      commissionRecouvreur: p.commissionRecouvreur ?? 0,
      netProprietaire: p.netProprietaire ?? (Number(p.amount) || 0) - (p.commissionRecouvreur ?? 0),
      commissionRate: p.commissionRate ?? this.liveCalculations.commissionRate,
      status: p.status ?? 'paid',
      daysLate: p.daysLate ?? 0,
      receiptSentToTenant: !!p.receiptSentToTenant,
      receiptSentToOwner: !!p.receiptSentToOwner,
      receiptSentToTenantAt: p.receiptSentToTenantAt || null,
      receiptSentToOwnerAt: p.receiptSentToOwnerAt || null
    };

    // Attempt to resolve tenant information from various sources
    if (!rec.tenantId) {
      // 1) payment payload may include a nested tenant object or tenantId
      const nestedTenantId = (p && (p.tenant && (p.tenant.id || p.tenantId)) ) || p.tenantId || (p.rental && p.rental.tenantId) || undefined;
      if (nestedTenantId) {
        rec.tenantId = Number(nestedTenantId);
      }

      // 2) If still missing, try resolving from rental record
      if (!rec.tenantId && rec.rentalId && (this.rentalsService as any).getRentalById) {
        try {
          const r = (this.rentalsService as any).getRentalById(Number(rec.rentalId));
          if (r && r.tenantId) rec.tenantId = Number(r.tenantId);
        } catch {}
      }

      // 3) If still missing, attempt to get tenant from apartment record
      if (!rec.tenantId && rec.apartmentId && (this.apartmentsService as any).getApartmentById) {
        try {
          const a = (this.apartmentsService as any).getApartmentById(Number(rec.apartmentId));
          if (a && a.tenantId) rec.tenantId = Number(a.tenantId);
        } catch {}
      }
    }

    // If the payload contains a nested tenant object, cache it locally for lookups
    try {
      if (p && p.tenant && (p.tenant.id || p.tenantId)) {
        const nid = Number(p.tenant.id ?? p.tenantId);
        if (!this.tenants.find(t => t.id === nid)) {
          // push as any to avoid strict shape issues
          (this.tenants as any).push(p.tenant);
        }
      }
    } catch {}

    // recompute commission/net/status if missing or inconsistent
    const collector = this.collectors.find(c => c.id === Number(rec.collectorId));
    // collectors might store commission under different property names depending on data source
    const rate = collector ? Number((collector as any).commissionRate ?? (collector as any).commissionPercent ?? (collector as any).commission ?? 0) : 0;
    const calc = this.computeCommissionAndNet(rec.amount, rate);
    rec.commissionRecouvreur = calc.commission;
    rec.netProprietaire = calc.net;
    rec.commissionRate = rate || rec.commissionRate || this.liveCalculations.commissionRate;

    // compute late info
    const lateInfo = this.computeLateInfo(rec.period, rec.paymentDate);
    rec.status = lateInfo.isLate ? 'late' : 'paid';
    rec.daysLate = lateInfo.daysLate;

    return rec;
  }

  setActiveTab(tab: 'history' | 'contract' | 'actions') {
    this.activeTab = tab;
    if (tab === 'contract' && !this.contractSnapshot && this.currentRental) {
      this.updateContractSnapshot(this.currentRental);
    }
  }

  getStepStatus(step: number): 'complete' | 'current' | 'upcoming' | 'error' {
    if (this.currentStep === step) {
      return this.stepErrors[step]?.length ? 'error' : 'current';
    }
    if (step < this.currentStep) {
      return this.stepErrors[step]?.length ? 'error' : 'complete';
    }
    return 'upcoming';
  }

  goToStep(step: number) {
    if (step === this.currentStep) return;
    const direction = step > this.currentStep ? 1 : -1;
    if (direction > 0) {
      for (let idx = this.currentStep; idx < step; idx++) {
        if (!this.validateStep(idx, true)) {
          this.currentStep = idx;
          return;
        }
      }
    }
    this.currentStep = step;
    this.touchedSteps.add(step);
  }

  handleContinue() {
    if (!this.validateStep(this.currentStep, true)) return;
    if (this.currentStep < this.progressSteps.length) {
      this.currentStep += 1;
      this.touchedSteps.add(this.currentStep);
      return;
    }
    this.savePayment();
  }

  handleBack() {
    if (this.currentStep === 1) return;
    this.currentStep -= 1;
  }

  validateStep(step: number, markTouched = false): boolean {
    const errors: string[] = [];
    switch (step) {
      case 1:
        if (!this.paymentForm.ownerId) errors.push('Sélectionnez un propriétaire');
        if (!this.paymentForm.buildingId) errors.push('Choisissez un bâtiment');
        if (!this.paymentForm.apartmentId) errors.push('Sélectionnez un appartement');
        if (!this.paymentForm.tenantId) errors.push('Associez un locataire');
        break;
      case 2:
        if (!this.paymentForm.period) errors.push('Mois de paiement obligatoire');
        if (!this.paymentForm.paymentDate) errors.push('Date de paiement obligatoire');
        if (!this.paymentForm.amount || Number(this.paymentForm.amount) <= 0) errors.push('Le montant doit être supérieur à 0');
        if (!this.paymentForm.paymentMethod) errors.push('Sélectionnez le mode de paiement');
        if (this.paymentForm.commissionRate === undefined || this.paymentForm.commissionRate < 0) {
          errors.push('La commission doit être positive');
        }
        if (this.liveCalculations.duplicate && !this.forceDuplicateSubmission) {
          errors.push('Un paiement existe déjà pour ce mois/appartement');
        }
        break;
      case 3:
        if (!this.finalAcknowledgement) {
          errors.push('Confirmez la vérification du récapitulatif');
        }
        if (this.liveCalculations.duplicate && !this.forceDuplicateSubmission) {
          errors.push('Confirmez que ce paiement remplace le précédent');
        }
        break;
    }
    this.stepErrors[step] = errors;
    if (markTouched) this.touchedSteps.add(step);
    return errors.length === 0;
  }

  private updateCalculations() {
    const amount = Number(this.paymentForm.amount) || 0;
    const rate = this.paymentForm.commissionRate ?? this.liveCalculations.commissionRate ?? 8;
    const { commission, net } = this.computeCommissionAndNet(amount, rate);
    const duplicate = this.checkDuplicatePayment(this.paymentForm.period, this.paymentForm.apartmentId);
    const paymentDateIso = this.paymentForm.paymentDate ? new Date(this.paymentForm.paymentDate).toISOString() : undefined;
    const lateInfo = this.computeLateInfo(this.paymentForm.period, paymentDateIso);
    this.liveCalculations = {
      commissionRate: rate,
      commission,
      net,
      duplicate,
      late: lateInfo.isLate,
      lateDays: lateInfo.daysLate
    };
    this.stepErrors[2] = (this.stepErrors[2] || []).filter(err => !err.toLowerCase().includes('paiement existe déjà'));
    this.stepErrors[3] = (this.stepErrors[3] || []).filter(err => !err.toLowerCase().includes('paiement existe déjà'));
    if (duplicate && !this.forceDuplicateSubmission) {
      this.stepErrors[2].push('Un paiement existe déjà pour ce mois/appartement');
    }
  }

  private checkDuplicatePayment(period?: string, apartmentId?: number): PaymentRecord | null {
    if (!period || !apartmentId) return null;
    return this.payments.find(p => p.period === period && Number(p.apartmentId) === Number(apartmentId)) || null;
  }

  setHistoryFilter(key: 'period' | 'status' | 'search' | 'collector', value: string) {
    this.historyFilters = { ...this.historyFilters, [key]: value };
    this.searchTerm = this.historyFilters.search;
    this.selectedPeriod = this.historyFilters.period;
    this.applyFilters();
  }

  resetHistoryFilters() {
    this.historyFilters = { period: '', status: '', search: '', collector: '' };
    this.searchTerm = '';
    this.selectedPeriod = '';
    this.applyFilters();
  }

  private updateTimeline() {
    this.timelinePayments = this.payments.slice(0, 4);
  }

  private updateContractSnapshot(rental: Rental | null) {
    if (!rental) {
      this.contractSnapshot = null;
      return;
    }
    this.contractSnapshot = {
      tenant: this.getTenantName(rental.tenantId),
      apartment: this.getApartmentName(rental.apartmentId),
      status: rental.status || 'active',
      startDate: rental.startDate ? new Date(rental.startDate).toLocaleDateString('fr-FR') : '-',
      endDate: rental.endDate ? new Date(rental.endDate).toLocaleDateString('fr-FR') : '-',
      price: rental.price ? `${Number(rental.price).toLocaleString('fr-FR')} XOF` : '-',
      collector: this.getCollectorName(rental.collectorId)
    };
  }

  toggleDuplicateOverride(checked: boolean) {
    this.forceDuplicateSubmission = checked;
    this.validateStep(2);
    this.validateStep(3);
  }

  acknowledgeSummary(checked: boolean) {
    this.finalAcknowledgement = checked;
    this.validateStep(3);
  }

  onFormValueChange() {
    this.updateCalculations();
    if (this.currentStep >= 2) {
      this.validateStep(2);
    }
  }

  updateCommissionRate(value: number | string) {
    const numeric = Number(value);
    this.paymentForm.commissionRate = isNaN(numeric) ? 0 : numeric;
    this.onFormValueChange();
  }

  applyFilters() {
    const term = (this.historyFilters.search || '').trim().toLowerCase();
    this.filteredPayments = this.payments.filter(p => {
      if (this.historyFilters.period && p.period !== this.historyFilters.period) return false;
      if (this.historyFilters.status && p.status !== this.historyFilters.status) return false;
      if (this.historyFilters.collector && String(p.collectorId) !== this.historyFilters.collector) return false;
      if (!term) return true;

      const tenantName = this.getTenantName(p.tenantId).toLowerCase();
      const amountStr = (p.amount || '').toString();
      const dateStr = (p.paymentDate || '').toLowerCase();
      const method = (p.paymentMethod || '').toLowerCase();
      const building = this.getBuildingNameFromApartment(p.apartmentId).toLowerCase();
      const apartment = this.getApartmentName(p.apartmentId).toLowerCase();

      return tenantName.includes(term)
        || amountStr.includes(term)
        || dateStr.includes(term)
        || method.includes(term)
        || building.includes(term)
        || apartment.includes(term);
    });
    this.timelinePayments = this.filteredPayments.slice(0, 4);
  }

  savePayment() {
    const steps = [1, 2, 3];
    for (const step of steps) {
      if (!this.validateStep(step, true)) {
        this.currentStep = step;
        this.showTemporaryToast('Veuillez corriger les erreurs avant de continuer');
        return;
      }
    }

    // Determine collectorId: prefer form value, else current rental collector
    const collectorId = this.paymentForm.collectorId
      || (this.currentRental ? (this.currentRental.collectorId as any) : undefined)
      || undefined;

    // Find collector to compute commission rate
    const collector = this.collectors.find(c => c.id === Number(collectorId));
    const collectorRate = collector ? Number((collector as any).commissionRate ?? (collector as any).commissionPercent ?? (collector as any).commission ?? 0) : 0;
    const effectiveRate = this.paymentForm.commissionRate ?? collectorRate ?? this.liveCalculations.commissionRate ?? 8;

    this.saving = true;

    const nowIso = new Date().toISOString();
    const newId = this.generateId();

    const record: PaymentRecord = {
      id: newId,
      rentalId: this.paymentForm.rentalId,
      tenantId: this.paymentForm.tenantId,
      collectorId: collectorId,
      ownerId: this.paymentForm.ownerId,
      buildingId: this.paymentForm.buildingId,
      apartmentId: this.paymentForm.apartmentId,
      period: this.paymentForm.period as string,
      amount: Number(this.paymentForm.amount),
      paymentMethod: this.paymentForm.paymentMethod as string,
      paymentDate: this.paymentForm.paymentDate ? new Date(this.paymentForm.paymentDate).toISOString() : nowIso,
      commissionRate: effectiveRate
    };

    // compute commission & net
    const { commission, net } = this.computeCommissionAndNet(record.amount, effectiveRate);
    record.commissionRecouvreur = commission;
    record.netProprietaire = net;

    // compute status/daysLate
    const lateInfo = this.computeLateInfo(record.period, record.paymentDate);
    record.status = lateInfo.isLate ? 'late' : 'paid';
    record.daysLate = lateInfo.daysLate;

    // persist via service
    this.paymentsService.createOrUpdatePayment(record).subscribe({
      next: (saved: PaymentRecord|any) => {
        const normalized = this.normalizePaymentRecord(saved || record);
        const idx = this.payments.findIndex(p => p.id === normalized.id || (p.period === normalized.period && p.tenantId === normalized.tenantId));
        if (idx >= 0) this.payments[idx] = normalized;
        else this.payments.unshift(normalized);

        this.periods = Array.from(new Set(this.payments.map(p => p.period)));
        this.computeSummaries();
        this.applyFilters();

        const retainedContext = {
          ownerId: this.paymentForm.ownerId,
          buildingId: this.paymentForm.buildingId,
          apartmentId: this.paymentForm.apartmentId,
          tenantId: this.paymentForm.tenantId,
          collectorId: this.paymentForm.collectorId,
          rentalId: this.paymentForm.rentalId
        };
        this.paymentForm = {
          ...retainedContext,
          period: '',
          amount: 0,
          paymentMethod: '',
          paymentDate: new Date().toISOString().split('T')[0],
          commissionRate: effectiveRate
        };
        this.finalAcknowledgement = false;
        this.forceDuplicateSubmission = false;
        this.currentStep = 1;
        this.touchedSteps = new Set<number>([1]);
        this.stepErrors = { 1: [], 2: [], 3: [] };
        this.updateCalculations();
        this.saving = false;
        this.showTemporaryToast('Paiement enregistré avec succès');
      },
      error: (err: any) => {
        console.error(err);
        // optimistic fallback: push locally
        const normalized = this.normalizePaymentRecord(record);
        this.payments.unshift(normalized);
        this.periods = Array.from(new Set(this.payments.map(p => p.period)));
        this.computeSummaries();
        this.applyFilters();

        this.saving = false;
        this.showTemporaryToast('Paiement sauvegardé localement (service indisponible)');
      }
    });
  }

  /**
   * Cancel the current payment flow: reset form and hide the payment panel
   */
  cancelPayment() {
    this.resetForm();
    this.showPaymentForm = false;
  }

  // Confirm payment (used by recouvreur to mark payment as received)
  confirmPayment(payment: PaymentRecord) {
    if (!payment) return;
    // if already paid, nothing to do
    if (payment.status === 'paid') {
      this.showTemporaryToast('Paiement déjà confirmé');
      return;
    }

    const nowIso = new Date().toISOString();
    payment.paymentDate = nowIso;
    payment.status = 'paid';

    // recompute commission/net using collector if available
    const collector = this.collectors.find(c => c.id === Number(payment.collectorId));
    const commissionRate = collector ? Number((collector as any).commissionRate ?? (collector as any).commissionPercent ?? (collector as any).commission ?? 0) : 0;
    const { commission, net } = this.computeCommissionAndNet(Number(payment.amount || 0), commissionRate);
    payment.commissionRecouvreur = commission;
    payment.netProprietaire = net;

    // recompute late info
    const lateInfo = this.computeLateInfo(payment.period, payment.paymentDate);
    payment.daysLate = lateInfo.daysLate;

    // persist
    this.paymentsService.createOrUpdatePayment(payment).subscribe({
      next: (saved: PaymentRecord|any) => {
        const normalized = this.normalizePaymentRecord(saved || payment);
        const idx = this.payments.findIndex(p => p.id === normalized.id || (p.period === normalized.period && p.tenantId === normalized.tenantId));
        if (idx >= 0) this.payments[idx] = normalized;
        else this.payments.unshift(normalized);

        this.computeSummaries();
        this.applyFilters();
        this.showTemporaryToast('Paiement confirmé');
      },
      error: (err: any) => {
        console.error(err);
        // optimistic local update
        const idx = this.payments.findIndex(p => p.id === payment.id);
        if (idx >= 0) this.payments[idx] = payment;
        this.computeSummaries();
        this.applyFilters();
        this.showTemporaryToast('Paiement confirmé localement (service indisponible)');
      }
    });
  }

  // compute commission and net owner
  computeCommissionAndNet(amount: number = 0, commissionRatePercent: number = 0) {
    const rate = Number(commissionRatePercent) || 0;
    const commission = Math.round((amount * rate) / 100);
    const net = Number(amount) - commission;
    return { commission, net };
  }

  // compute if payment is late using period (YYYY-MM) and paymentDate (ISO)
  computeLateInfo(period: string | undefined, paymentDateIso: string | undefined) {
    if (!period || !paymentDateIso) return { isLate: false, daysLate: 0 };

    // last day of the period month
    const [y, m] = period.split('-').map(x => Number(x));
    if (!y || !m) return { isLate: false, daysLate: 0 };

    // last day time: set to end of month
    const lastDay = new Date(y, m, 0, 23, 59, 59); // month is 1-based for period, Date wants 0-based month index so pass m
    // Note: new Date(y, m, 0) gives last day of month m (since month param is next month)
    const paymentDate = new Date(paymentDateIso);

    const diffMs = paymentDate.getTime() - lastDay.getTime();
    const daysLate = diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
    const isLate = daysLate > 0;

    return { isLate, daysLate };
  }

  // compute totals and late summary
  computeSummaries() {
    // reset
    this.totalPaymentsThisMonth = 0;
    this.totalCommissions = 0;
    this.totalNetOwners = 0;
    this.totalLateAmount = 0;
    this.latePayments = [];

    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}`;

    let monthNet = 0;
    let monthCommission = 0;
    this.payments.forEach(p => {
      this.totalCommissions += Number(p.commissionRecouvreur || 0);
      this.totalNetOwners += Number(p.netProprietaire || 0);

      // payments for current month
      if (p.period === currentPeriod) {
        this.totalPaymentsThisMonth += Number(p.amount || 0);
        monthNet += Number(p.netProprietaire || 0);
        monthCommission += Number(p.commissionRecouvreur || 0);
      }

      if (p.status === 'late') {
        this.totalLateAmount += Number(p.amount || 0);
        this.latePayments.push(p);
      }
    });
    this.dashboardCards = [
      {
        label: 'Paiements du mois',
        value: `${this.totalPaymentsThisMonth.toLocaleString('fr-FR')} XOF`,
        subLabel: currentPeriod,
        accent: 'primary',
        trend: monthNet ? `Net: ${monthNet.toLocaleString('fr-FR')} XOF` : undefined
      },
      {
        label: 'Net propriétaires',
        value: `${this.totalNetOwners.toLocaleString('fr-FR')} XOF`,
        subLabel: 'Après commission',
        accent: 'success'
      },
      {
        label: 'Commissions collectées',
        value: `${this.totalCommissions.toLocaleString('fr-FR')} XOF`,
        subLabel: `${monthCommission.toLocaleString('fr-FR')} XOF ce mois`,
        accent: 'warning'
      },
      {
        label: 'Montants en retard',
        value: `${this.totalLateAmount.toLocaleString('fr-FR')} XOF`,
        subLabel: `${this.latePayments.length} dossiers`,
        accent: this.totalLateAmount ? 'danger' : 'success'
      }
    ];
  }

  showTemporaryToast(msg: string) {
    this.toastMessage = msg;
    this.showToast = true;
    setTimeout(() => (this.showToast = false), 3500);
  }

  openExtendModal() {
    this.showExtendModal = true;
    this.extendDate = '';
  }

  confirmExtend() {
    if (!this.extendDate) {
      this.showTemporaryToast('Veuillez sélectionner une nouvelle date de fin');
      return;
    }

    this.showExtendModal = false;

    if (!this.currentRental) {
      this.showTemporaryToast("Aucun contrat actif à étendre");
      return;
    }

    // update rental and persist via rental service
    try {
      this.currentRental.endDate = new Date(this.extendDate).toISOString();
      this.rentalsService.updateRental(this.currentRental);
      this.showTemporaryToast("Contrat étendu jusqu'à " + new Date(this.extendDate).toLocaleDateString('fr-FR'));
      this.updateContractSnapshot(this.currentRental);
    } catch (err) {
      console.error(err);
      this.showTemporaryToast("Erreur lors de l'extension du contrat");
    }
  }

  openViewContract() {
    // open a read-only view modal for the contract
    const rentalId = (this.paymentForm as any)?.rentalId || this.payments?.[0]?.rentalId;
    if (!rentalId) {
      this.showTemporaryToast('Aucun contrat sélectionné');
      return;
    }

    const rental: Rental | undefined = this.rentalsService.getRentalById(Number(rentalId));
    if (!rental) {
      this.showTemporaryToast('Contrat introuvable');
      return;
    }

    this.currentRental = rental;
    this.updateContractSnapshot(rental);
    this.apartments = this.apartmentsService.getApartments ? this.apartmentsService.getApartments() : [];
    const tenant: Tenant | undefined = this.tenantsService.getTenantById(Number(rental.tenantId));
    const tenantName = tenant?.fullName || (rental as any).tenantName || '-';

    const collector: Collector | undefined = this.collectors.find(c => c.id === Number((rental as any).collectorId));
    const collectorName = collector?.fullName || (rental as any).collectorName || '-';
    const ownerId = (rental as any).ownerId;
    const ownerName = ownerId ? (((this.rentalsService as any).getOwnerName) ? (this.rentalsService as any).getOwnerName(ownerId) : ('Propriétaire ' + ownerId)) : '-';

    // attempt to fetch owner details if the rentals service exposes a lookup
    const ownerObj = (this.rentalsService as any).getOwnerById ? (this.rentalsService as any).getOwnerById(ownerId) : null;
    const ownerAddress = ownerObj ? (ownerObj.address || ownerObj.location || '') : '';
    const ownerPhone = ownerObj ? (ownerObj.phone || ownerObj.mobile || '') : '';
    const ownerEmail = ownerObj ? (ownerObj.email || '') : '';

    // attempt to fetch apartment and building details
    const aptObj = this.apartmentsService.getApartmentById ? this.apartmentsService.getApartmentById(Number((rental as any).apartmentId)) : null;
    const apartmentDisplay = aptObj ? (aptObj.name || aptObj.address || ('Apt. ' + (aptObj.id || ''))) : (rental.apartmentName || ('Apt. ' + (rental.apartmentId || '')));
    const buildingObj = (this.buildingsService as any).getBuildingById ? (this.buildingsService as any).getBuildingById(aptObj ? aptObj.buildingId : (rental as any).buildingId) : null;
    const buildingName = buildingObj ? (buildingObj.name || '') : ((aptObj && (aptObj as any).buildingId) ? ('Bât. ' + (aptObj as any).buildingId) : '');

    this.contractView = {
      id: (rental as any).id,
      locataire: tenantName,
      apartment: apartmentDisplay,
      buildingName: buildingName,
      price: Number((rental as any).price) || 0,
      priceDisplay: (Number((rental as any).price) || 0).toLocaleString('fr-FR') + ' Fcfa',
      startDate: rental.startDate ? rental.startDate : undefined,
      endDate: rental.endDate ? rental.endDate : undefined,
      collector: collectorName,
      owner: ownerName,
      ownerName: ownerName,
      ownerAddress: ownerAddress,
      ownerPhone: ownerPhone,
      ownerEmail: ownerEmail,
      tenantAddress: tenant ? ((tenant as any).address || (tenant as any).location || '') : '',
      tenantPhone: tenant ? ((tenant as any).phone || (tenant as any).mobile || '') : '',
      tenantEmail: tenant ? ((tenant as any).email || '') : '',
      tenantCni: tenant ? ((tenant as any).cni || (tenant as any).idNumber || '') : '',
      surface: (rental as any).surface || undefined,
      cautionAmount: (Number((rental as any).price) || 0) * 2
    };

    this.showViewContractModal = true;
  }

  openEditContract() {
    const rental = this.currentRental || (this.payments?.[0] && this.rentalsService.getRentalById(this.payments[0].rentalId || 0));
    if (!rental) {
      this.showTemporaryToast('Aucun contrat sélectionné pour modification');
      return;
    }

    // copy and normalize
    this.editRental = { ...rental } as Rental;
    if (this.editRental.endDate) this.editRental.endDate = this.editRental.endDate.split('T')[0];
    if (this.editRental.startDate) this.editRental.startDate = this.editRental.startDate.split('T')[0];

    this.apartments = this.apartmentsService.getApartments ? this.apartmentsService.getApartments() : [];
    this.showEditContractModal = true;
  }

  openInitPaymentModal() {
    this.initPaymentForm = { tenantId: undefined, period: '', amount: 0, paymentMethod: '' };
    this.showInitPaymentModal = true;
  }

  confirmInitPayment() {
    // copy init form into paymentForm and reuse savePayment flow
    this.paymentForm = { ...(this.initPaymentForm as any) };
    this.showInitPaymentModal = false;
    // small delay to allow modal close animation
    setTimeout(() => this.savePayment(), 80);
  }

  printContract() {
    if (!this.contractView) {
      this.showTemporaryToast('Aucun contrat à imprimer');
      return;
    }

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Contrat - ${this.contractView.apartment || ''}</title>
          <style>
            body{ font-family: Inter, Arial, sans-serif; padding:20px; color:#222 }
            .header{ text-align:center; margin-bottom:16px }
            .section{ margin-bottom:12px }
            .muted{ color:#6b7280; font-size:13px }
            table{ width:100%; border-collapse:collapse }
            td{ padding:6px; vertical-align:top }
            .signature{ margin-top:28px; display:flex; justify-content:space-between }
          </style>
        </head>
        <body>
          <div class="header"><h2>CONTRAT DE LOCATION</h2></div>
          <div class="section"><strong>Référence:</strong> ${this.contractView.id || ''}</div>
          <div class="section"><strong>Bailleur:</strong> ${this.contractView.ownerName || this.contractView.owner || 'N/A'}</div>
          <div class="section"><strong>Locataire:</strong> ${this.contractView.locataire || 'N/A'}</div>
          <div class="section"><strong>Appartement:</strong> ${this.contractView.apartment || 'N/A'}</div>
          <div class="section"><strong>Loyer mensuel:</strong> ${(this.contractView.price || 0).toLocaleString('fr-FR')} FCFA</div>
          <div class="signature">
            <div>Le Bailleur<br/><br/>__________________</div>
            <div>Le Locataire<br/><br/>__________________</div>
          </div>
          <script>window.print()</script>
        </body>
      </html>
    `;

    const w = window.open('', '_blank', 'noopener');
    if (!w) { this.showTemporaryToast('Impossible d\'ouvrir l\'aperçu du contrat'); return; }
    w.document.write(html);
    w.document.close();
  }

  calculateExtensionPeriod() {
    if (!this.extendDate || !this.contractView?.endDate) return '';
    const currentEnd = new Date(this.contractView.endDate);
    const newEnd = new Date(this.extendDate);
    if (isNaN(currentEnd.getTime()) || isNaN(newEnd.getTime())) return '';
    const diffMs = newEnd.getTime() - currentEnd.getTime();
    const months = Math.round(diffMs / (1000 * 60 * 60 * 24 * 30));
    return `${months} mois (de ${new Date(this.contractView.endDate).toLocaleDateString('fr-FR')} à ${newEnd.toLocaleDateString('fr-FR')})`;
  }

  confirmEditContract(updated: any) {
    if (!this.editRental) {
      this.showTemporaryToast('Aucune modification à sauvegarder');
      return;
    }

    if (this.editRental.endDate) {
      const start = new Date(this.editRental.startDate || '');
      const end = new Date(this.editRental.endDate || '');
      if (isNaN(end.getTime()) || end <= start) {
        this.showTemporaryToast('La nouvelle date de fin doit être supérieure à la date de début');
        return;
      }
    }

    try {
      if (this.editRental.endDate) this.editRental.endDate = new Date(this.editRental.endDate).toISOString();
      if (this.editRental.startDate) this.editRental.startDate = new Date(this.editRental.startDate).toISOString();

      const apt = this.apartments.find(a => a.id === (this.editRental as any).apartmentId);
      if (apt) (this.editRental as any).apartmentName = apt.name;

      this.rentalsService.updateRental(this.editRental);
      this.currentRental = { ...this.editRental } as Rental;

      // update contractView to reflect changes
      this.contractView = {
        locataire: this.contractView?.locataire || '',
        apartment: this.currentRental.apartmentName || ('Apt. ' + this.currentRental.apartmentId),
        price: Number((this.currentRental as any).price) || 0,
        priceDisplay: (Number((this.currentRental as any).price) || 0).toLocaleString('fr-FR') + ' Fcfa',
        startDate: this.currentRental.startDate ? new Date(this.currentRental.startDate).toLocaleDateString('fr-FR') : '-',
        endDate: this.currentRental.endDate ? new Date(this.currentRental.endDate).toLocaleDateString('fr-FR') : '-',
        collector: this.contractView?.collector || ''
      };

      this.updateContractSnapshot(this.currentRental);
      this.showEditContractModal = false;
      this.showTemporaryToast('Contrat modifié');
    } catch (err) {
      console.error(err);
      this.showTemporaryToast('Erreur lors de la sauvegarde du contrat');
    }
  }

  getTenantName(tenantId?: number) : string {
    if (!tenantId) return '-';
    const t = (this.tenantsService && (this.tenantsService as any).getTenantById) ? (this.tenantsService as any).getTenantById(Number(tenantId)) : undefined;
    if (t) return ((t as any).fullName || (t as any).name || '-');

    // fallback to local cache populated from payloads
    const local = this.tenants.find(x => Number((x as any).id) === Number(tenantId));
    if (local) return ((local as any).fullName || (local as any).name || '-');

    // try to find a payment containing tenant info
    const fromPayment = this.payments.find(p => Number(p.tenantId) === Number(tenantId));
    if (fromPayment && (fromPayment as any).tenantName) return (fromPayment as any).tenantName;

    return '-';
  }

  getInitials(value?: string | null) {
    if (!value) return '?';
    return value
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  }

  getCollectorName(collectorId?: number): string {
    if (!collectorId) return '-';
    const c = this.collectors.find(x => x.id === Number(collectorId));
    return c ? ((c as any).fullName || (c as any).name || '-') : ('Collecteur ' + String(collectorId));
  }

  getCollectorDisplayName(collector?: Collector | null): string {
    if (!collector) return '-';
    return (collector as any).fullName || (collector as any).name || (collector as any).firstName
      ? `${(collector as any).fullName || (collector as any).name || (collector as any).firstName}`
      : `Collecteur ${collector.id}`;
  }

  getApartmentName(apartmentId?: number): string {
    if (!apartmentId) return '-';
    const a = this.apartments.find(x => x.id === Number(apartmentId));
    return a ? ((a as any).name || (a as any).address || ('Apt. ' + String(apartmentId))) : ('Apt. ' + String(apartmentId));
  }

  getBuildingNameFromApartment(apartmentId?: number): string {
    if (!apartmentId) return '-';
    const a = this.apartments.find(x => x.id === Number(apartmentId));
    const buildingId = a ? ((a as any).buildingId || (a as any).batimentId) : undefined;
    if (!buildingId) return '-';
    try {
      const b = (this.buildingsService as any).getBuildingById ? (this.buildingsService as any).getBuildingById(Number(buildingId)) : null;
      return b ? (b.name || ('Bât. ' + String(buildingId))) : ('Bât. ' + String(buildingId));
    } catch (e) {
      return 'Bât. ' + String(buildingId);
    }
  }

  // generate a printable receipt and open it in a new tab (front-only)
  sendReceipt(payment: PaymentRecord, to: 'tenant' | 'owner' | 'both' = 'both') {
    if (!payment) {
      this.showTemporaryToast('Paiement introuvable pour la quittance');
      return;
    }

  const tenant = this.tenantsService.getTenantById ? this.tenantsService.getTenantById(Number(payment.tenantId)) : null;
  const ownerName = payment.ownerId ? (((this.rentalsService as any).getOwnerName) ? (this.rentalsService as any).getOwnerName(payment.ownerId) : ('Owner ' + payment.ownerId)) : '-';
    const collector = this.collectors.find(c => c.id === Number(payment.collectorId));

    const html = this.buildReceiptHtml(payment, tenant, ownerName, collector);

    // open new window and write the receipt for printing
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) {
      this.showTemporaryToast('Impossible d\'ouvrir une nouvelle fenêtre pour la quittance');
      return;
    }
    w.document.write(html);
    w.document.close();

    // mark receipt sent flags and persist update with timestamps
    const nowIso = new Date().toISOString();
    if (to === 'tenant' || to === 'both') {
      payment.receiptSentToTenant = true;
      payment.receiptSentToTenantAt = nowIso;
    }
    if (to === 'owner' || to === 'both') {
      payment.receiptSentToOwner = true;
      payment.receiptSentToOwnerAt = nowIso;
    }

    // persist change in payment record
    this.paymentsService.createOrUpdatePayment(payment).subscribe({
      next: () => {
        this.showTemporaryToast('Quittance générée et marquée comme envoyée');
        this.computeSummaries();
      },
      error: (err) => {
        console.error(err);
        this.showTemporaryToast('Quittance générée (mais la mise à jour locale a échoué)');
      }
    });
  }
  back() {
    this.router.navigate(['demo/admin-panel/recoveries']);
  }

  // open an in-app preview modal for the quittance
  previewReceipt(payment: PaymentRecord) {
    const tenant = this.tenantsService.getTenantById ? this.tenantsService.getTenantById(Number(payment.tenantId)) : null;
    const ownerName = payment.ownerId ? (((this.rentalsService as any).getOwnerName) ? (this.rentalsService as any).getOwnerName(payment.ownerId) : ('Owner ' + payment.ownerId)) : '-';
    const collector = this.collectors.find(c => c.id === Number(payment.collectorId));
    // Build full HTML doc for print/preview
    const html = this.buildReceiptHtml(payment, tenant, ownerName, collector);
    this.previewHtml = html;
    this.previewPayment = payment;
    this.showReceiptPreview = true;

    // set iframe srcdoc after view updates
    setTimeout(() => {
      try {
        if (this.receiptIframe && this.receiptIframe.nativeElement) {
          this.receiptIframe.nativeElement.srcdoc = html;
        }
      } catch (e) { /* ignore */ }
    }, 50);
  }

  previewDraftPayment() {
    if (!this.paymentForm.apartmentId || !this.paymentForm.period || !this.paymentForm.amount) {
      this.showTemporaryToast('Complétez les informations du paiement avant de prévisualiser');
      return;
    }
    const tenant = this.paymentForm.tenantId ? this.tenantsService.getTenantById(Number(this.paymentForm.tenantId)) : null;
    const ownerName = this.paymentForm.ownerId
      ? (((this.rentalsService as any).getOwnerName) ? (this.rentalsService as any).getOwnerName(this.paymentForm.ownerId) : ('Owner ' + this.paymentForm.ownerId))
      : '-';
    const collector = this.collectors.find(c => c.id === Number(this.paymentForm.collectorId));
    const draft: PaymentRecord = {
      id: undefined,
      rentalId: this.paymentForm.rentalId,
      tenantId: this.paymentForm.tenantId,
      collectorId: this.paymentForm.collectorId,
      ownerId: this.paymentForm.ownerId,
      buildingId: this.paymentForm.buildingId,
      apartmentId: this.paymentForm.apartmentId,
      period: this.paymentForm.period,
      amount: Number(this.paymentForm.amount),
      paymentMethod: this.paymentForm.paymentMethod || '',
      paymentDate: this.paymentForm.paymentDate ? new Date(this.paymentForm.paymentDate).toISOString() : new Date().toISOString(),
      commissionRecouvreur: this.liveCalculations.commission,
      netProprietaire: this.liveCalculations.net,
      status: this.liveCalculations.late ? 'late' : 'pending',
      daysLate: this.liveCalculations.lateDays
    };
    const html = this.buildReceiptHtml(draft, tenant, ownerName, collector);
    this.previewHtml = html;
    this.previewPayment = draft;
    this.showReceiptPreview = true;
    setTimeout(() => {
      try {
        if (this.receiptIframe && this.receiptIframe.nativeElement) {
          this.receiptIframe.nativeElement.srcdoc = html;
        }
      } catch {}
    }, 50);
  }

  closePreview() {
    this.showReceiptPreview = false;
    this.previewHtml = null;
    this.previewPayment = null;
  }

  printPreview() {
    // prefer printing the iframe content if present
    try {
      const iframe = this.receiptIframe && this.receiptIframe.nativeElement;
      const doc = iframe && iframe.contentDocument ? iframe.contentDocument : null;
      const html = doc ? doc.documentElement.outerHTML : this.previewHtml;
      if (!html) { this.showTemporaryToast('Aucune quittance à imprimer'); return; }
      const w = window.open('', '_blank', 'noopener,noreferrer');
      if (!w) { this.showTemporaryToast('Impossible d\'ouvrir la fenêtre d\'impression'); return; }
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 300);
    } catch (e) {
      this.showTemporaryToast('Erreur lors de la préparation de l\'impression');
    }
  }

  sendFromPreview(to: 'tenant'|'owner'|'both') {
    if (!this.previewPayment) return;
    this.sendReceipt(this.previewPayment, to);
    this.closePreview();
  }

  private buildReceiptHtml(payment: PaymentRecord, tenant: Tenant | null | undefined, ownerName: string, collector?: Collector) {
    // Use current date/time for the issued timestamp
    const date = new Date().toLocaleString('fr-FR');
    const tenantLine = tenant ? `${(tenant as any).fullName || (tenant as any).name || '-'}` : 'Locataire inconnu';

    // Resolve apartment display (name or address) from cache or service
    let apartmentLine = '-';
    try {
      const apt = (this.apartmentsService && (this.apartmentsService as any).getApartmentById)
        ? (this.apartmentsService as any).getApartmentById(Number(payment.apartmentId))
        : this.apartments.find(a => Number((a as any).id) === Number(payment.apartmentId));
      if (apt) apartmentLine = (apt as any).name || (apt as any).address || (`Appartement ${apt.id}`);
      else if (payment.apartmentId) apartmentLine = `Appartement ${payment.apartmentId}`;
    } catch (e) {
      if (payment.apartmentId) apartmentLine = `Appartement ${payment.apartmentId}`;
    }

    // Resolve owner name: prefer provided ownerName, otherwise try ownersService or owners cache
    let ownerResolved = ownerName || '-';
    try {
      if (!ownerResolved || ownerResolved.startsWith('Owner') || ownerResolved === '-') {
        const ownerObj = (this.ownersService && (this.ownersService as any).getOwnerById)
          ? (this.ownersService as any).getOwnerById(Number(payment.ownerId))
          : this.owners.find(o => Number((o as any).id) === Number(payment.ownerId));
        if (ownerObj) ownerResolved = (ownerObj as any).name || (ownerObj as any).fullName || (ownerObj as any).ownerName || `Propriétaire ${ownerObj.id}`;
      }
    } catch {}

    // Resolve collector display
    let collectorLine = 'Collecteur inconnu';
    try {
      const col = collector || this.collectors.find(c => Number((c as any).id) === Number(payment.collectorId));
      if (col) collectorLine = (col as any).fullName || (col as any).name || `Collecteur ${col.id}`;
    } catch {}

    const amountStr = Number(payment.amount || 0).toLocaleString('fr-FR') + ' XOF';
    const commissionStr = Number(payment.commissionRecouvreur || 0).toLocaleString('fr-FR') + ' XOF';
    const netStr = Number(payment.netProprietaire || 0).toLocaleString('fr-FR') + ' XOF';
    const receiptNumber = this.generateReceiptNumber(payment);

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Quittance - ${payment.period}</title>
          <style>
            body{ font-family: 'Inter', Arial, Helvetica, sans-serif; padding:24px; color:#222; background:#f7fafc }
            .container{ max-width:760px; margin:0 auto; background:#fff; padding:20px; border-radius:8px; box-shadow:0 8px 30px rgba(2,6,23,0.06) }
            .company { display:flex; justify-content:space-between; align-items:center; gap:12px }
            .company .brand { font-weight:800; font-size:18px; color:#0f172a }
            .company .address { font-size:12px; color:#6b7280 }
            .meta { font-size:12px; color:#6b7280 }
            .receipt-meta { text-align:right }
            .box{ border:1px solid #eef2f7; padding:16px; border-radius:6px; margin-bottom:12px; background:#ffffff }
            table{ width:100%; border-collapse:collapse; margin-top:8px }
            td, th{ padding:10px; border-bottom:1px dashed #eef2f7; text-align:left; font-size:13px }
            th{ background:#fafafa; font-weight:700; color:#374151 }
            .right{ text-align:right }
            .muted{ color:#6b7280; font-size:12px }
            .actions{ margin-top:20px; display:flex; gap:8px }
            .signature { margin-top:28px; display:flex; justify-content:space-between; gap:16px }
            .sig-box { width:45%; border-top:1px solid #e5e7eb; padding-top:8px; text-align:center; color:#374151 }
            @media print { .no-print { display:none } .container{ box-shadow:none } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="company">
              <div>
                <div class="brand">Tchak Immobilier</div>
                <div class="address">BP 12345, Bamako • +223 77 00 00 00 • contact@tchak.example</div>
              </div>
              <div class="receipt-meta">
                <div><strong>Quittance N°</strong> ${receiptNumber}</div>
                <div class="meta">Émise le: ${date}</div>
                <div class="meta">Période: ${payment.period}</div>
              </div>
            </div>

            <div class="box">
              <strong>Locataire:</strong> ${tenantLine} <br/>
              <strong>Appartement:</strong> ${apartmentLine} <br/>
              <strong>Propriétaire:</strong> ${ownerResolved} <br/>
              <strong>Recouvreur:</strong> ${collectorLine}
            </div>

            <div class="box">
              <table>
                <tr>
                  <th>Désignation</th>
                  <th class="right">Montant</th>
                </tr>
                <tr>
                  <td>Mensualité (${payment.period})</td>
                  <td class="right">${amountStr}</td>
                </tr>
                <tr>
                  <td>Commission collecteur</td>
                  <td class="right">${commissionStr}</td>
                </tr>
                <tr>
                  <td><strong>Net propriétaire</strong></td>
                  <td class="right"><strong>${netStr}</strong></td>
                </tr>
              </table>
            </div>

            <div class="muted">Statut: ${payment.status || 'paid'} • Retard (jours): ${payment.daysLate || 0}</div>

            <div class="signature">
              <div class="sig-box">Reçu par / Nom & signature</div>
              <div class="sig-box">Pour le propriétaire / Nom & signature</div>
            </div>
          </div>
        </body>
      </html>
    `;
    return html;
  }

  private generateReceiptNumber(payment: PaymentRecord) {
    const dt = new Date(payment.paymentDate || new Date());
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const id = payment.id ? String(payment.id).padStart(4, '0') : String(Math.floor(Math.random() * 9000) + 1000);
    return `QUIT-${y}${m}-${id}`;
  }

  // helper to produce unique id when service doesn't return one
  private generateId(): number {
    const max = this.payments.reduce((acc, p) => Math.max(acc, Number(p.id || 0)), 0);
    return max + 1;
  }

  // Méthodes pour la navigation dans les étapes
  nextStep() {
    if (this.currentStep < 3) {
      if (this.validateStep(this.currentStep, true)) {
        this.currentStep++;
        this.touchedSteps.add(this.currentStep);
      }
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  getCommissionAmount(amount: number = 0): number {
    const rate = this.paymentForm.commissionRate ?? 8;
    return Math.round((amount * rate) / 100);
  }

  getNetAmount(amount: number = 0): number {
    return amount - this.getCommissionAmount(amount);
  }

  getRentalPrice(rental: Rental | null): number {
    if (!rental) return 0;
    return Number(rental.price) || 0;
  }

  get recentPayments(): PaymentRecord[] {
    return this.payments.slice(0, 5);
  }

  get minPaymentMonth(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 12);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  get maxPaymentMonth(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  get todayISO(): string {
    return new Date().toISOString().split('T')[0];
  }

  onAmountChange() {
    this.updateCalculations();
    if (this.currentStep >= 2) {
      this.validateStep(2);
    }
  }

  resetForm() {
    this.paymentForm = {
      period: '',
      amount: 0,
      paymentMethod: '',
      paymentDate: new Date().toISOString().split('T')[0],
      commissionRate: 8
    };
    this.currentStep = 1;
    this.buildingsForOwner = [];
    this.apartmentsForBuilding = [];
    this.tenantsForApartment = [];
    this.currentRental = null;
    this.contractSnapshot = null;
    this.stepErrors = { 1: [], 2: [], 3: [] };
    this.touchedSteps = new Set([1]);
    this.finalAcknowledgement = false;
    this.forceDuplicateSubmission = false;
  }

  filterPayments(): void {
    this.applyFilters();
  }
}