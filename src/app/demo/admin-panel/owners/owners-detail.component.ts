import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OwnersService, Owner } from './owners.service';
import { BuildingsService, Building } from '../buildings/buildings.service';
import { ApartmentsService, Apartment } from '../apartments/apartments.service';
import { RentalsService, Rental } from '../rentals/rentals.service';
import { TenantsService, Tenant } from '../tenants/tenants.service';
import { CollectorsService, Collector } from '../collectors/collectors.service';
import { RecoveriesService, Recovery } from '../recoveries/recoveries.service';

@Component({
  selector: 'app-owners-detail',
  templateUrl: './owners-detail.component.html',
  styleUrls: ['./owners-detail.component.scss'],
  standalone: false
})
export class OwnersDetailComponent implements OnInit {
  tenants: Tenant[] = [];
  collectors: Collector[] = [];
  recoveries: Recovery[] = [];

  // Récupère le nom complet du locataire pour un appartement
  getTenantFullName(apt: Apartment): string {
    // If apartment already stores a string name, return it
    if (typeof apt.tenant === 'string' && apt.tenant.trim()) return apt.tenant;

    // If apt.tenant is an object with a fullName or name field
    if (apt.tenant && typeof apt.tenant === 'object') {
      const t = apt.tenant as any;
      if (t.fullName) return t.fullName;
      if (t.name) return t.name;
      if (t.nom || t.prenom) return `${t.nom || ''} ${t.prenom || ''}`.trim();
    }

    // Otherwise try to resolve by tenant id stored in related rentals
    try {
      // Find a rental that references this apartment to get tenantId
      const rental = this.rentalsService.getRentals().find((r: Rental) => r.apartmentId === apt.id);
      const tenantId = rental ? (rental.tenantId as number | undefined) : undefined;
      if (tenantId !== undefined && tenantId !== null) {
        const tenant = this.tenants.find(t => t.id === Number(tenantId));
        if (tenant) return tenant.fullName || `${(tenant as any).nom || ''} ${(tenant as any).prenom || ''}`.trim() || String(tenantId);
      }
    } catch (e) {
      // ignore and fallback
    }

    return 'Non attribué';
  }

  // Helper method to safely get tenant full name from apartment (handles undefined)
  getTenantFullNameSafe(apt: Apartment | undefined): string {
    if (!apt) return '-';
    return this.getTenantFullName(apt);
  }

  // Récupère le loyer mensuel
  getMonthlyRent(apt: Apartment): number | null {
    return apt.mention ? Number(apt.mention) : null;
  }

  // Récupère la date de paiement pour un appartement via recoveries ou rental
  getPaymentDate(apt: Apartment): string | null {
    try {
      // find rental for apartment
      const rental = this.rentalsService.getRentals().find((r: Rental) => r.apartmentId === apt.id);
      if (rental) {
        // try recoveries first
        const rec = this.recoveries.find(r => Number(r.rentalId) === Number(rental.id));
        if (rec && rec.date) return (new Date(rec.date)).toLocaleDateString();
        // fallback to rental endDate or paymentDate fields if present
        if ((rental as any).paymentDate) return (new Date((rental as any).paymentDate)).toLocaleDateString();
        if (rental.endDate) return (new Date(rental.endDate)).toLocaleDateString();
      }
    } catch {
      // ignore
    }
    return '-';
  }

  // Récupère le nom du collecteur assigné à l'appartement via la location
  getCollector(apt: Apartment): string {
    try {
      const rental = this.rentalsService.getRentals().find((r: Rental) => r.apartmentId === apt.id);
      if (rental && rental.collectorId) {
        const col = this.collectors.find(c => Number(c.id) === Number(rental.collectorId));
        if (col) return col.fullName || (col as any).name || '-';
        return String(rental.collectorId);
      }
    } catch {
      // ignore
    }
    return '-';
  }

  // Récupère le statut de l'appartement
  getStatus(apt: Apartment): string {
    if (apt.tenant) return 'Occupé';
    return 'Libre';
  }
  showDeleteConfirm = false;
  confirmDeleteOwner() {
    this.showDeleteConfirm = true;
  }
  deleteOwner() {
    if (this.owner) {
      this.ownersService.deleteOwner(this.owner.id);
      this.router.navigate(['demo/admin-panel/owners']);
    }
  }
  owner: Owner | undefined;
  editMode = false;
  form: any = {};
  errors: any = {};
  buildings: Building[] = [];
  selectedBuilding: Building | null = null;
  activeTab: 'appartements' | 'factures' = 'appartements';
  selectedBuildingApartments: Apartment[] = [];
  selectedBuildingFactures: any[] = [];
  filteredInvoices: any[] = [];
  // Eviction modal
  showEvictionModal = false;
  evictionReason = '';
  acceptEvictionConditions = false;
  selectedApartmentForEviction: Apartment | undefined;
  // Invoice status filter
  invoiceStatusFilter = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ownersService: OwnersService,
    private buildingsService: BuildingsService,
    private apartmentsService: ApartmentsService,
    private rentalsService: RentalsService,
    private tenantsService: TenantsService,
    private collectorsService: CollectorsService,
    private recoveriesService: RecoveriesService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.owner = this.ownersService.getOwnerById(id);
    // Charger les locataires en cache local pour résolution des noms
    try {
      this.tenants = this.tenantsService.getTenants();
    } catch {
      this.tenants = [];
    }
    // Charger les collecteurs et recoveries en cache local
    try {
      this.collectors = (this.collectorsService && typeof this.collectorsService.getCollectors === 'function') ? this.collectorsService.getCollectors() : [];
    } catch {
      this.collectors = [];
    }
    try {
      this.recoveries = (this.recoveriesService && typeof this.recoveriesService.getRecoveries === 'function') ? this.recoveriesService.getRecoveries() : [];
    } catch {
      this.recoveries = [];
    }
    if (this.owner) {
      this.form = { ...this.owner };
      this.buildings = this.buildingsService.getBuildings().filter((b: Building) => b.ownerId === this.owner?.id);
      // Sélectionne le premier bâtiment par défaut
      if (this.buildings.length > 0) {
        this.selectBuilding(this.buildings[0]);
      }
    }
  }

  selectBuilding(building: Building) {
    this.selectedBuilding = building;
    // Récupère les appartements du bâtiment sélectionné
    this.selectedBuildingApartments = this.apartmentsService.getApartments().filter((a: Apartment) => a.buildingId === building.id);
    // Récupère les locations/factures liées à ces appartements
    const rentals = this.rentalsService.getRentals().filter((r: Rental) => this.selectedBuildingApartments.some((a: Apartment) => a.id === r.apartmentId));
    // Pour chaque location, on génère une facture professionnelle
    this.selectedBuildingFactures = rentals.map((r: Rental, idx: number) => {
      const apartment = this.selectedBuildingApartments.find((a: Apartment) => a.id === r.apartmentId);
      let tenantName = '';
      let observations = '';
      let status = 'En attente';
      let paymentDate: string | null = null;
      // Simule le statut et la date de paiement (à adapter selon ta logique réelle)
      if (Math.random() > 0.7) {
        status = 'Payée';
        paymentDate = r.endDate;
      } else if (Math.random() < 0.2) {
        status = 'Impayée';
        observations = 'Retard de paiement';
      }
      try {
        const tenantsList = this.tenants && this.tenants.length ? this.tenants : this.tenantsService.getTenants();
        const tenant = tenantsList.find((t: any) => t.id === r.tenantId);
        if (tenant) {
          tenantName = tenant.fullName || `${(tenant as any).nom || ''} ${(tenant as any).prenom || ''}`.trim();
        } else {
          tenantName = r.tenantId ? String(r.tenantId) : 'Non attribué';
        }
      } catch {
        tenantName = r.tenantId ? String(r.tenantId) : 'Non attribué';
      }
      // Génère un numéro de facture unique (ex: ANNEE-MOIS-BATIMENT-ID)
      const invoiceNumber = `F-${r.startDate?.slice(0,7).replace('-','')}-${building.id}-${r.id}`;
      // Période lisible
      const period = r.startDate && r.endDate ? `${new Date(r.startDate).toLocaleDateString()} - ${new Date(r.endDate).toLocaleDateString()}` : '';
      return {
        invoiceNumber,
        apartmentName: apartment?.name || '',
        tenantName,
        period,
        price: r.price,
        status,
        paymentDate,
        observations
      };
    });
    // Initialiser les factures filtrées
    this.applyInvoiceFilters();
  }

  /**
   * Applique les filtres de statut aux factures
   */
  applyInvoiceFilters(): void {
    if (!this.invoiceStatusFilter || this.invoiceStatusFilter === '') {
      this.filteredInvoices = this.selectedBuildingFactures.slice();
    } else {
      this.filteredInvoices = this.selectedBuildingFactures.filter(f => f.status === this.invoiceStatusFilter);
    }
  }

  enableEdit() {
    this.editMode = true;
  }

  cancelEdit() {
    this.editMode = false;
    this.form = { ...this.owner };
    this.errors = {};
  }

  validate() {
    this.errors = {};
    if (!this.form.name) this.errors.name = 'Nom requis';
    if (!this.form.email) this.errors.email = 'Email requis';
    if (!this.form.phone) this.errors.phone = 'Téléphone requis';
    if (!this.form.city) this.errors.city = 'Ville requise';
    return Object.keys(this.errors).length === 0;
  }

  save() {
    if (!this.validate()) return;
    this.ownersService.updateOwner(this.form);
    this.owner = { ...this.form };
    this.editMode = false;
  }

  back() {
    this.router.navigate(['demo/admin-panel/owners']);
  }

  // ==================== Gestion de l'expulsion de locataire ====================
  
  /**
   * Ouvre la modale d'expulsion de locataire
   */
  openEvictionModal(apartment: Apartment): void {
    if (!this.owner) return;
    if (!apartment.tenant) {
      alert('Erreur: Cet appartement n\'a pas de locataire.');
      return;
    }
    // Vérifier que le propriétaire est bien le propriétaire du bâtiment
    const building = this.buildingsService.getBuildingById(apartment.buildingId);
    if (!building || building.ownerId !== this.owner.id) {
      alert('Erreur: Vous n\'êtes pas autorisé à expulser ce locataire.');
      return;
    }
    // Vérifier qu'il y a une location active
    const activeRental = this.getActiveRentalForApartment(apartment.id);
    if (!activeRental) {
      alert('Erreur: Aucune location active pour cet appartement.');
      return;
    }
    if (activeRental.status === 'cancelled') {
      alert('Cette location est déjà annulée.');
      return;
    }
    this.selectedApartmentForEviction = apartment;
    this.evictionReason = '';
    this.acceptEvictionConditions = false;
    this.errors = {};
    this.showEvictionModal = true;
  }

  /**
   * Ferme la modale d'expulsion
   */
  closeEvictionModal(): void {
    this.showEvictionModal = false;
    this.selectedApartmentForEviction = undefined;
    this.evictionReason = '';
    this.acceptEvictionConditions = false;
    this.errors = {};
  }

  /**
   * Confirme l'expulsion du locataire
   */
  confirmEviction(): void {
    if (!this.selectedApartmentForEviction || !this.owner) return;
    
    // Validation
    this.errors = {};
    if (!this.evictionReason || !this.evictionReason.trim()) {
      this.errors.evictionReason = 'La raison de l\'expulsion est requise.';
      return;
    }
    if (!this.acceptEvictionConditions) {
      this.errors.evictionConditions = 'Vous devez accepter les conditions d\'expulsion.';
      return;
    }

    // Récupérer la location active
    const activeRental = this.getActiveRentalForApartment(this.selectedApartmentForEviction.id);
    if (!activeRental) {
      alert('Erreur: Aucune location active pour cet appartement.');
      return;
    }

    // Appeler le service pour annuler la location par expulsion
    this.rentalsService.cancelRentalByOwnerEviction(
      activeRental.id,
      this.evictionReason.trim(),
      this.owner.id
    ).subscribe({
      next: () => {
        alert('Le locataire a été expulsé avec succès.');
        this.closeEvictionModal();
        // Recharger les données
        if (this.selectedBuilding) {
          this.selectBuilding(this.selectedBuilding);
        }
      },
      error: (err: any) => {
        alert('Erreur lors de l\'expulsion: ' + (err.message || 'Erreur inconnue'));
      }
    });
  }

  /**
   * Récupère la location active pour un appartement
   */
  getActiveRentalForApartment(apartmentId: number): Rental | undefined {
    return this.rentalsService.getActiveRental(apartmentId);
  }

  /**
   * Récupère le nom d'un bâtiment
   */
  getBuildingName(buildingId: number | undefined): string {
    if (!buildingId) return '-';
    const building = this.buildingsService.getBuildingById(buildingId);
    return building ? building.name : '-';
  }
}
