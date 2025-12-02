import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { PaymentsService, PaymentRecordDto } from '../recoveries/payments.service';
import { RentalsService, Rental } from '../rentals/rentals.service';
import { TenantsService, Tenant } from '../tenants/tenants.service';
import { CollectorsService, Collector } from '../collectors/collectors.service';
import { ApartmentsService, Apartment } from '../apartments/apartments.service';
import { BuildingsService, Building } from '../buildings/buildings.service';
import { OwnersService, Owner } from './owners.service';

// Étendre l'interface PaymentRecordDto pour inclure les propriétés manquantes
interface ExtendedPaymentRecord extends PaymentRecordDto {
  commissionRecouvreur?: number;
  netProprietaire?: number;
  tenantName?: string;
  collectorName?: string;
  apartmentName?: string;
  buildingName?: string;
  ownerId?: number;
  ownerName?: string;
}

interface EnrichedPayment extends ExtendedPaymentRecord {
  tenantName: string;
  collectorName: string;
  apartmentName: string;
  buildingName: string;
  ownerId: number;
  ownerName: string;
  rental?: Rental;
  building?: Building;
  apartment?: Apartment;
  tenant?: Tenant;
  collector?: Collector;
  statusText: string;
  statusClass: string;
}

interface OwnerSummary {
  totalCollected: number;
  paymentsCount: number;
  averagePayment: number;
  lastPaymentDate?: string;
  commissionTotal: number;
  netAmount: number;
  pendingAmount: number;
  lateAmount: number;
}

interface PaymentMethodBreakdown {
  method: string;
  amount: number;
  count: number;
  percentage: number;
}

interface PeriodSummary {
  period: string;
  amount: number;
  paymentCount: number;
  commission: number;
  netAmount: number;
}

interface DashboardCard {
  label: string;
  value: string;
  subLabel: string;
  trend?: string;
  accent: string;
}

@Component({
  selector: 'app-owners-payments',
  templateUrl: './owners-payments.component.html',
  styleUrls: ['./owners-payments.component.scss'],
  standalone: false
})
export class OwnersPaymentsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // Données principales
  payments: EnrichedPayment[] = [];
  filteredPayments: EnrichedPayment[] = [];
  owners: Owner[] = [];
  selectedOwner?: Owner;
  selectedOwnerId?: number;
  
  // Filtres et recherche
  searchTerm = '';
  periods: string[] = [];
  selectedPeriod = '';
  statusFilter = '';
  paymentMethodFilter = '';

  // Résumés et statistiques
  summary: OwnerSummary = {
    totalCollected: 0,
    paymentsCount: 0,
    averagePayment: 0,
    commissionTotal: 0,
    netAmount: 0,
    pendingAmount: 0,
    lateAmount: 0
  };
  
  methodBreakdown: PaymentMethodBreakdown[] = [];
  periodTotals: PeriodSummary[] = [];
  recentPayments: EnrichedPayment[] = [];
  dashboardCards: DashboardCard[] = [];

  // États d'interface
  loading = false;
  hasData = false;
  errorMessage = '';
  showToast = false;
  toastMessage = '';
  toastType = 'info';

  // Options de filtre
  statusOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'paid', label: 'Payés' },
    { value: 'pending', label: 'En attente' },
    { value: 'late', label: 'En retard' }
  ];

  paymentMethodOptions = [
    { value: '', label: 'Tous les modes' },
    { value: 'Espèce', label: 'Espèces' },
    { value: 'Virement', label: 'Virement' },
    { value: 'Mobile Money', label: 'Mobile Money' },
    { value: 'Chèque', label: 'Chèque' }
  ];

  // Tri
  sortField = 'paymentDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  constructor(
    private router: Router,
    private paymentsService: PaymentsService,
    private rentalsService: RentalsService,
    private tenantsService: TenantsService,
    private collectorsService: CollectorsService,
    private apartmentsService: ApartmentsService,
    private buildingsService: BuildingsService,
    private ownersService: OwnersService
  ) {}

  ngOnInit(): void {
    this.setupSearchDebounce();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.searchTerm = searchTerm;
      this.applyFilters();
    });
  }

  private loadInitialData(): void {
    this.loading = true;
    this.errorMessage = '';
    
    try {
      // Charger les propriétaires d'abord
      this.owners = this.ownersService.getOwners();
      
      if (this.owners.length > 0) {
        this.selectedOwner = this.owners[0];
        this.selectedOwnerId = this.selectedOwner.id;
        this.loadPaymentsForOwner(this.selectedOwner);
      } else {
        this.loading = false;
        this.hasData = false;
        this.errorMessage = 'Aucun propriétaire trouvé';
      }
    } catch (error) {
      console.error('Erreur lors du chargement des propriétaires:', error);
      this.loading = false;
      this.errorMessage = 'Erreur lors du chargement des propriétaires';
    }
  }

  private loadPaymentsForOwner(owner: Owner): void {
    this.loading = true;
    this.errorMessage = '';
    
    this.paymentsService.getPayments().subscribe({
      next: (data: PaymentRecordDto[] | any) => {
        try {
          const rawPayments: PaymentRecordDto[] = data || [];
          
          // Enrichir tous les paiements
          const allPayments = rawPayments.map(p => this.enrichPayment(p));
          
          // Filtrer par propriétaire si sélectionné
          if (owner) {
            this.payments = allPayments
              .filter(p => p.ownerId === owner.id)
              .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
          } else {
            this.payments = allPayments
              .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
          }

          this.prepareFilterData();
          this.applyFilters();
          this.updateDashboardCards();
          this.loading = false;
          this.hasData = this.payments.length > 0;
          
          if (!this.hasData) {
            this.errorMessage = owner ? `Aucun paiement trouvé pour ${owner.name}` : 'Aucun paiement trouvé';
          }
        } catch (error) {
          console.error('Erreur lors du traitement des paiements:', error);
          this.loading = false;
          this.errorMessage = 'Erreur lors du traitement des paiements';
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des paiements:', error);
        this.loading = false;
        this.hasData = false;
        this.errorMessage = 'Erreur lors du chargement des paiements';
      }
    });
  }

  private enrichPayment(p: PaymentRecordDto): EnrichedPayment {
    // Obtenir le contrat lié
    const rental = this.getRentalForPayment(p);
    
    // Obtenir les entités liées
    const tenant = this.getTenantForPayment(p, rental);
    const collector = this.getCollectorForPayment(p);
    const apartment = this.getApartmentForPayment(p, rental);
    const building = this.getBuildingForPayment(p, rental, apartment);
    const owner = this.getOwnerForPayment(building);

    const statusInfo = this.getStatusInfo(p.status);

    // Calculer les valeurs manquantes si nécessaire
    // Utiliser l'opérateur de coalescence nulle et l'accès sécurisé
    const extendedP = p as ExtendedPaymentRecord;
    const commissionRecouvreur = extendedP.commissionRecouvreur || (p.amount ? p.amount * 0.08 : 0);
    const netProprietaire = extendedP.netProprietaire || (p.amount ? p.amount - commissionRecouvreur : 0);

    return {
      ...p,
      commissionRecouvreur,
      netProprietaire,
      tenantName: tenant?.fullName || 'Locataire inconnu',
      collectorName: collector?.fullName || 'Collecteur inconnu',
      apartmentName: apartment?.name || `Appartement ${apartment?.id || 'N/A'}`,
      buildingName: building?.name || `Bâtiment ${building?.id || 'N/A'}`,
      ownerId: owner?.id || 0,
      ownerName: owner?.name || 'Propriétaire inconnu',
      rental,
      building,
      apartment,
      tenant,
      collector,
      statusText: statusInfo.text,
      statusClass: statusInfo.class
    };
  }

  private getRentalForPayment(p: PaymentRecordDto): Rental | undefined {
    if (!p.rentalId) return undefined;
    
    try {
      return this.rentalsService.getRentalById(Number(p.rentalId));
    } catch {
      return undefined;
    }
  }

  private getTenantForPayment(p: PaymentRecordDto, rental?: Rental): Tenant | undefined {
    // Priorité: tenantId direct > rental.tenantId > données nested
    const tenantId = p.tenantId || rental?.tenantId;
    
    if (tenantId) {
      try {
        return this.tenantsService.getTenantById(Number(tenantId));
      } catch {
        // Continuer avec les autres méthodes
      }
    }

    // Fallback: données nested
    const extendedP = p as ExtendedPaymentRecord;
    if (extendedP.tenantName) {
      // Créer un objet tenant basique si le nom est disponible
      return { id: Number(tenantId || 0), fullName: extendedP.tenantName } as Tenant;
    }

    return undefined;
  }

  private getCollectorForPayment(p: PaymentRecordDto): Collector | undefined {
    if (p.collectorId) {
      try {
        const collectors = this.collectorsService.getCollectors();
        return collectors.find(c => c.id === Number(p.collectorId));
      } catch {
        // Continuer avec les autres méthodes
      }
    }

    // Fallback: données nested
    const extendedP = p as ExtendedPaymentRecord;
    if (extendedP.collectorName) {
      // Créer un objet collector basique si le nom est disponible
      return { id: Number(p.collectorId || 0), fullName: extendedP.collectorName } as Collector;
    }

    return undefined;
  }

  private getApartmentForPayment(p: PaymentRecordDto, rental?: Rental): Apartment | undefined {
    const apartmentId = (p as any).apartmentId || rental?.apartmentId;
    
    if (apartmentId) {
      try {
        return this.apartmentsService.getApartmentById(Number(apartmentId));
      } catch {
        // Continuer avec les autres méthodes
      }
    }

    // Fallback: données nested
    const extendedP = p as ExtendedPaymentRecord;
    if (extendedP.apartmentName) {
      // Créer un objet apartment basique si le nom est disponible
      return { id: Number(apartmentId || 0), name: extendedP.apartmentName } as Apartment;
    }

    return undefined;
  }

  private getBuildingForPayment(p: PaymentRecordDto, rental?: Rental, apartment?: Apartment): Building | undefined {
    // Priorité: buildingId direct > apartment.buildingId > rental.buildingId
    const buildingId = (p as any).buildingId || apartment?.buildingId || rental?.buildingId;
    
    if (buildingId) {
      try {
        return this.buildingsService.getBuildingById(Number(buildingId));
      } catch {
        // Continuer avec les autres méthodes
      }
    }

    // Fallback: données nested
    const extendedP = p as ExtendedPaymentRecord;
    if (extendedP.buildingName) {
      // Créer un objet building basique si le nom est disponible
      return { id: Number(buildingId || 0), name: extendedP.buildingName, ownerId: extendedP.ownerId } as Building;
    }

    return undefined;
  }

  private getOwnerForPayment(building?: Building): Owner | undefined {
    if (!building?.ownerId) {
      // Essayer de trouver l'owner via d'autres méthodes
      return undefined;
    }

    try {
      // Vérifier si la méthode getOwnerById existe
      if (typeof this.ownersService.getOwnerById === 'function') {
        return this.ownersService.getOwnerById(building.ownerId);
      } else {
        // Fallback: chercher dans la liste des propriétaires
        return this.owners.find(owner => owner.id === building.ownerId);
      }
    } catch {
      return undefined;
    }
  }

  private getStatusInfo(status?: string): { text: string; class: string } {
    switch (status) {
      case 'paid':
        return { text: 'Payé', class: 'status-paid' };
      case 'pending':
        return { text: 'En attente', class: 'status-pending' };
      case 'late':
        return { text: 'En retard', class: 'status-late' };
      default:
        return { text: 'Inconnu', class: 'status-unknown' };
    }
  }

  private prepareFilterData(): void {
    // Extraire les périodes uniques
    this.periods = [...new Set(this.payments.map(p => p.period))].sort().reverse();
  }

  private updateDashboardCards(): void {
    const paidPayments = this.payments.filter(p => p.status === 'paid');
    const pendingPayments = this.payments.filter(p => p.status === 'pending');
    const latePayments = this.payments.filter(p => p.status === 'late');

    this.dashboardCards = [
      {
        label: 'Total encaissé',
        value: this.formatCurrency(this.summary.totalCollected),
        subLabel: `${this.summary.paymentsCount} paiements`,
        accent: 'primary'
      },
      {
        label: 'Net propriétaire',
        value: this.formatCurrency(this.summary.netAmount),
        subLabel: `Après commissions`,
        accent: 'success'
      },
      {
        label: 'Commission totale',
        value: this.formatCurrency(this.summary.commissionTotal),
        subLabel: `${this.calculateCommissionRate()}% en moyenne`,
        accent: 'warning'
      },
      {
        label: 'En attente',
        value: this.formatCurrency(this.summary.pendingAmount),
        subLabel: `${pendingPayments.length} paiements`,
        accent: 'info'
      },
      {
        label: 'En retard',
        value: this.formatCurrency(this.summary.lateAmount),
        subLabel: `${latePayments.length} paiements`,
        accent: 'danger'
      },
      {
        label: 'Dernier paiement',
        value: this.summary.lastPaymentDate ? this.formatDate(this.summary.lastPaymentDate) : 'Aucun',
        subLabel: 'Date du dernier encaissement',
        accent: 'secondary'
      }
    ];
  }

  private calculateCommissionRate(): number {
    if (this.summary.totalCollected === 0) return 0;
    return Math.round((this.summary.commissionTotal / this.summary.totalCollected) * 100);
  }

  // Gestion des sélections et filtres
  onOwnerChange(ownerId: number | undefined): void {
    if (ownerId) {
      const owner = this.owners.find(o => o.id === ownerId);
      if (owner) {
        this.selectedOwner = owner;
        this.selectedOwnerId = ownerId;
        this.resetFilters();
        this.loadPaymentsForOwner(owner);
      }
    } else {
      // Tous les propriétaires
      this.selectedOwner = undefined;
      this.selectedOwnerId = undefined;
      this.resetFilters();
      this.loadAllPayments();
    }
  }

  private loadAllPayments(): void {
    this.loading = true;
    this.paymentsService.getPayments().subscribe({
      next: (data: PaymentRecordDto[] | any) => {
        const rawPayments: PaymentRecordDto[] = data || [];
        this.payments = rawPayments.map(p => this.enrichPayment(p))
          .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
        
        this.prepareFilterData();
        this.applyFilters();
        this.loading = false;
        this.hasData = this.payments.length > 0;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des paiements:', error);
        this.loading = false;
        this.hasData = false;
      }
    });
  }

  onSearchChange(term: string): void {
    this.searchSubject.next(term);
  }

  onPeriodChange(period: string): void {
    this.selectedPeriod = period;
    this.applyFilters();
  }

  onStatusChange(status: string): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  onPaymentMethodChange(method: string): void {
    this.paymentMethodFilter = method;
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedPeriod = '';
    this.statusFilter = '';
    this.paymentMethodFilter = '';
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = this.payments;

    // Filtre par période
    if (this.selectedPeriod) {
      filtered = filtered.filter(p => p.period === this.selectedPeriod);
    }

    // Filtre par statut
    if (this.statusFilter) {
      filtered = filtered.filter(p => p.status === this.statusFilter);
    }

    // Filtre par mode de paiement
    if (this.paymentMethodFilter) {
      filtered = filtered.filter(p => p.paymentMethod === this.paymentMethodFilter);
    }

    // Filtre par recherche texte
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.tenantName.toLowerCase().includes(term) ||
        p.apartmentName.toLowerCase().includes(term) ||
        p.buildingName.toLowerCase().includes(term) ||
        p.collectorName.toLowerCase().includes(term) ||
        p.paymentMethod.toLowerCase().includes(term) ||
        p.amount.toString().includes(term)
      );
    }

    this.filteredPayments = filtered;
    this.computeSummary();
    this.computeBreakdowns();
    this.updateDashboardCards();
  }

  private computeSummary(): void {
    const payments = this.filteredPayments;
    const paidPayments = payments.filter(p => p.status === 'paid');
    const pendingPayments = payments.filter(p => p.status === 'pending');
    const latePayments = payments.filter(p => p.status === 'late');
    
    this.summary = {
      totalCollected: paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      paymentsCount: payments.length,
      averagePayment: paidPayments.length > 0 ? 
        paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0) / paidPayments.length : 0,
      lastPaymentDate: paidPayments.length > 0 ? 
        paidPayments[0].paymentDate : undefined,
      commissionTotal: paidPayments.reduce((sum, p) => sum + (p.commissionRecouvreur || 0), 0),
      netAmount: paidPayments.reduce((sum, p) => sum + (p.netProprietaire || 0), 0),
      pendingAmount: pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      lateAmount: latePayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    };

    // Paiements récents (5 derniers payés)
    this.recentPayments = paidPayments.slice(0, 5);
  }

  private computeBreakdowns(): void {
    const payments = this.filteredPayments.filter(p => p.status === 'paid');
    const totalAmount = this.summary.totalCollected;

    // Breakdown par méthode de paiement
    const methodMap = new Map<string, { amount: number; count: number }>();
    
    payments.forEach(p => {
      const method = p.paymentMethod || 'Non spécifié';
      const current = methodMap.get(method) || { amount: 0, count: 0 };
      current.amount += p.amount || 0;
      current.count += 1;
      methodMap.set(method, current);
    });

    this.methodBreakdown = Array.from(methodMap.entries()).map(([method, data]) => ({
      method,
      amount: data.amount,
      count: data.count,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);

    // Breakdown par période
    const periodMap = new Map<string, { amount: number; count: number; commission: number }>();
    
    payments.forEach(p => {
      const period = p.period;
      const current = periodMap.get(period) || { amount: 0, count: 0, commission: 0 };
      current.amount += p.amount || 0;
      current.count += 1;
      current.commission += p.commissionRecouvreur || 0;
      periodMap.set(period, current);
    });

    this.periodTotals = Array.from(periodMap.entries())
      .map(([period, data]) => ({
        period,
        amount: data.amount,
        paymentCount: data.count,
        commission: data.commission,
        netAmount: data.amount - data.commission
      }))
      .sort((a, b) => b.period.localeCompare(a.period)); // Plus récent en premier
  }

  // Tri des paiements
  sortPayments(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }

    this.filteredPayments.sort((a, b) => {
      let aValue: any = a[field as keyof EnrichedPayment];
      let bValue: any = b[field as keyof EnrichedPayment];

      // Gestion des dates
      if (field === 'paymentDate') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // Gestion des valeurs nulles
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Méthodes utilitaires pour le template
  getStatusBadgeClass(status: string): string {
    return this.getStatusInfo(status).class;
  }

  getStatusText(status: string): string {
    return this.getStatusInfo(status).text;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(amount) + ' XOF';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  formatTime(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  formatPercentage(value: number): string {
    return value.toFixed(1) + '%';
  }

  getInitials(name: string): string {
    if (!name || name === 'Locataire inconnu') return '??';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  // Navigation et actions
  back(): void {
    this.router.navigate(['/admin/owners']);
  }

  viewPaymentDetails(payment: EnrichedPayment): void {
    // Implémenter la navigation vers les détails du paiement
    console.log('Voir détails du paiement:', payment);
    // this.router.navigate(['/admin/payments', payment.id]);
  }

  viewOwnerDetails(): void {
    if (this.selectedOwner) {
      this.router.navigate(['/admin/owners', this.selectedOwner.id]);
    }
  }

  exportPayments(): void {
    // Implémenter l'export des paiements
    this.showToastMessage('Export en cours...', 'info');
    console.log('Exporter les paiements pour:', this.selectedOwner?.name);
  }

  refreshData(): void {
    if (this.selectedOwner) {
      this.loadPaymentsForOwner(this.selectedOwner);
    } else {
      this.loadAllPayments();
    }
  }

  private showToastMessage(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }

  // Méthodes pour le template - accès aux données
  get paidPaymentsCount(): number {
    return this.filteredPayments.filter(p => p.status === 'paid').length;
  }

  get pendingPaymentsCount(): number {
    return this.filteredPayments.filter(p => p.status === 'pending').length;
  }

  get latePaymentsCount(): number {
    return this.filteredPayments.filter(p => p.status === 'late').length;
  }

  get hasActiveFilters(): boolean {
    return !!this.selectedPeriod || !!this.statusFilter || !!this.paymentMethodFilter || !!this.searchTerm;
  }
}