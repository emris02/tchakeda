import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OwnersService, Owner } from './owners.service';
import { BuildingsService, Building } from '../buildings/buildings.service';
import { ApartmentsService, Apartment } from '../apartments/apartments.service';
import { RentalsService, Rental } from '../rentals/rentals.service';

@Component({
  selector: 'app-owners-detail',
  templateUrl: './owners-detail.component.html',
  styleUrls: ['./owners-detail.component.scss'],
  standalone: false
})
export class OwnersDetailComponent implements OnInit {
  // Récupère le nom du locataire pour un appartement
  getTenantName(apt: Apartment): string {
    // Si apt.tenant est un string (nom), retourne directement
    if (typeof apt.tenant === 'string') return apt.tenant;
    // Si apt.tenant est un objet, retourne la propriété name
    if (apt.tenant && typeof apt.tenant === 'object' && 'name' in apt.tenant) return (apt.tenant as any).name;
    return 'Non attribué';
  }

  // Récupère le loyer mensuel
  getMonthlyRent(apt: Apartment): number | null {
    return apt.mention ? Number(apt.mention) : null;
  }

  // Récupère la date de paiement (champ non présent dans Apartment)
  getPaymentDate(apt: Apartment): string | null {
    return '-';
  }

  // Récupère le nom du collecteur (champ non présent dans Apartment)
  getCollector(apt: Apartment): string {
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ownersService: OwnersService,
    private buildingsService: BuildingsService,
    private apartmentsService: ApartmentsService,
    private rentalsService: RentalsService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.owner = this.ownersService.getOwnerById(id);
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
        const tenants = (window as any).tenantsService ? (window as any).tenantsService.getTenants() : [];
        const tenant = tenants.find((t: any) => t.id === r.tenantId);
        tenantName = tenant ? tenant.fullName : String(r.tenantId);
      } catch {
        tenantName = String(r.tenantId);
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
}
