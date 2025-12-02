import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TenantsService, Tenant, TenantDocument } from './tenants.service';
import { RentalsService, Rental } from '../rentals/rentals.service';
import { ApartmentsService, Apartment } from '../apartments/apartments.service';
import { OwnersService, Owner } from '../owners/owners.service';
import { BuildingsService, Building } from '../buildings/buildings.service';
import { ContractService } from '../contracts/contract.service';
import { ContractPreviewService } from 'src/app/shared/contracts/contract-preview.service';

interface RentalDetail {
  rental?: Rental;
  apartment?: Apartment;
  owner?: Owner;
  recoveredAmount?: number;
  rentalContract?: any;
}

@Component({
  selector: 'app-tenants-detail',
  templateUrl: './tenants-detail.component.html',
  styleUrls: ['./tenants-detail.component.scss'],
  standalone: false
})
export class TenantsDetailComponent implements OnInit {
  buildings: Building[] = [];
  filteredApartments: Apartment[] = [];
  showDeleteConfirm = false;
  tenant: Tenant | undefined;
  rentalDetails: RentalDetail[] = [];
  editMode = false;
  form: any = {
    affiliatedPerson: {}
  };
  showAffiliated = false;
  errors: any = {};
  apartments: Apartment[] = [];
  tenants: Tenant[] = [];
  rental: Rental | undefined;
  paymentHistory: any[] = [];
  // Abandonment modal
  showAbandonmentModal = false;
  abandonmentReason = '';
  acceptAbandonmentConditions = false;
  selectedRentalForAbandonment: Rental | undefined;
  // Documents management
  tenantDocuments: TenantDocument[] = [];
  showDocumentUploadModal = false;
  selectedDocumentType = '';
  documentFile: File | null = null;
  documentName = '';
  documentNotes = '';
  uploadingDocument = false;
  selectedDocumentBeingEdited: TenantDocument | null = null;
  requiredDocuments = [
    { type: 'identity', label: 'Copie de la carte d\'identité', required: true, icon: 'fa-id-card' },
    { type: 'rent_receipt', label: 'Dernières quittances de loyer', required: false, icon: 'fa-receipt' },
    { type: 'electricity_bill', label: 'Dernière facture d\'électricité ou de téléphone', required: false, icon: 'fa-bolt' },
    { type: 'tax_notice', label: 'Dernier avis d\'impôts sur le revenu', required: false, icon: 'fa-file-invoice-dollar' },
    { type: 'pay_slip', label: 'Les trois derniers bulletins de salaire', required: false, icon: 'fa-money-check' },
    { type: 'employment_certificate', label: 'Attestation de l\'employeur ou contrat de travail', required: false, icon: 'fa-briefcase' },
    { type: 'deposit', label: 'Dépôt de garantie d\'un mois', required: false, icon: 'fa-money-bill-wave' },
    { type: 'guarantor', label: 'Garants si besoin', required: false, icon: 'fa-user-shield' },
    { type: 'activity_report', label: 'Pour les non salariés : 2 derniers bilans d\'activité', required: false, icon: 'fa-chart-line' },
    { type: 'contract', label: 'Contrat de location', required: false, icon: 'fa-file-contract' },
    { type: 'edl', label: 'État des lieux (EDL)', required: false, icon: 'fa-clipboard-check' },
    { type: 'quittance', label: 'Quittances de loyer', required: false, icon: 'fa-file-alt' }
  ];

  // Dropdown menu state for document actions
  documentMenuOpenId: number | null = null;

  toggleDocumentMenu(document: any): void {
    this.documentMenuOpenId = this.documentMenuOpenId === document.id ? null : document.id;
  }

  isDocumentMenuOpen(document: any): boolean {
    return this.documentMenuOpenId === document.id;
  }

  closeDocumentMenu(): void {
    this.documentMenuOpenId = null;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tenantsService: TenantsService,
    private rentalsService: RentalsService,
    private apartmentsService: ApartmentsService,
    private ownersService: OwnersService,
    private buildingsService: BuildingsService
    , private contractService: ContractService
    , private contractPreviewService: ContractPreviewService
  ) {
    this.buildings = this.buildingsService.getBuildings();
  }

  onBuildingChange(): void {
    if (this.form.buildingId) {
      this.filteredApartments = this.apartments.filter(a => a.buildingId === Number(this.form.buildingId));
      this.form.apartmentId = null;
    } else {
      this.filteredApartments = [];
    }
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    // Load apartments and tenants first so lookups and selects are ready
    this.loadBuildings();
    this.loadApartments();
    this.loadTenants();
    this.loadTenantData(id);
  }

  // Charger les données du locataire
  private loadTenantData(id: number): void {
    this.tenant = this.tenantsService.getTenantById(id);
    if (this.tenant) {
      // Initialize showAffiliated based on existing affiliatedPerson data
      this.showAffiliated = !!(this.tenant.affiliatedPerson && this.tenant.affiliatedPerson.fullName);

      this.form = {
        ...this.tenant,
        // Only include affiliatedPerson in the form when the toggle is active
        affiliatedPerson: this.showAffiliated ? (this.tenant.affiliatedPerson || {}) : undefined
      };
      // If the tenant has a current apartment, prefill buildingId and apartmentId for the edit form
      const currentAptId = this.getCurrentApartmentId(this.tenant);
      if (currentAptId) {
        const apt = this.apartmentsService.getApartmentById(currentAptId);
        if (apt) {
          this.form.buildingId = apt.buildingId;
          this.form.apartmentId = apt.id;
          // populate filteredApartments for the selected building so the select shows options
          this.filteredApartments = this.apartments.filter(a => a.buildingId === apt.buildingId);
        }
      }
      this.loadRentalDetails();
      this.loadTenantDocuments();
    }
  }

  openContractPreview(contract: any) {
    if (!contract) return;
    this.contractPreviewService.open(contract);
  }

  /**
   * Charge les documents du locataire
   */
  private loadTenantDocuments(): void {
    if (this.tenant) {
      this.tenantDocuments = this.tenantsService.getTenantDocuments(this.tenant.id);
    }
  }
    // Charger les locataires
  private loadBuildings(): void {
    this.buildings = this.buildingsService.getBuildings();
  }

  // Charger les appartements
  private loadApartments(): void {
    this.apartments = this.apartmentsService.getApartments();
  }

  // Charger les locataires
  private loadTenants(): void {
    this.tenants = this.tenantsService.getTenants();
  }

  // Charger les détails de location
  private loadRentalDetails(): void {
    this.rentalDetails = [];
    
    if (this.tenant) {
      // Si le locataire a un apartment actuel, l'ajouter aux détails
      const currentAptIdRaw = this.getCurrentApartmentId(this.tenant);
      const currentAptId = currentAptIdRaw !== undefined ? Number(currentAptIdRaw) : undefined;

      if (currentAptId) {
        let currentApartment = this.apartmentsService.getApartmentById(Number(currentAptId));
        // fallback: if apartment not found, try to find rental for this apartment and use its apartmentName
        const currentRental = this.rentalsService.getRentals().find(r => 
          Number(r.apartmentId) === Number(currentAptId) && Number(r.tenantId) === Number(this.tenant?.id)
        );

        if (!currentApartment && currentRental) {
          // build a minimal apartment object from rental fields (display purposes)
          const fallbackBuilding = currentRental.buildingId ? this.buildingsService.getBuildingById(Number(currentRental.buildingId)) : undefined;
          currentApartment = <any>{
            id: Number(currentAptId),
            name: currentRental.apartmentName || ('Appartement ' + currentAptId),
            address: fallbackBuilding ? fallbackBuilding.address : (currentRental.buildingName || '-'),
            buildingId: Number(currentRental.buildingId) || undefined
          };
        }

        if (currentApartment) {
          const building = this.buildingsService.getBuildingById(Number(currentApartment.buildingId));
          const owner = building && building.ownerId ? this.ownersService.getOwnerById(Number(building.ownerId)) : undefined;

          // attach any rental contract available
          const rentalContract = currentRental ? this.contractService.getRentalContracts().find(c => Number(c.tenantId) === Number(this.tenant?.id) && Number(c.assetId) === Number(currentApartment.id)) : undefined;

          this.rentalDetails.push({
            rental: currentRental,
            apartment: currentApartment,
            owner: owner,
            recoveredAmount: this.calculateRecoveredAmount(currentRental)
          });
          if (this.rentalDetails.length > 0 && rentalContract) {
            (this.rentalDetails[this.rentalDetails.length - 1] as any).rentalContract = rentalContract;
          }
        }
      }

      // Charger l'historique des locations depuis le service
      const tenantRentals = this.rentalsService.getRentals().filter(r => Number(r.tenantId) === Number(this.tenant?.id));

      tenantRentals.forEach(rental => {
        // Éviter les doublons avec la location actuelle
        if (Number(rental.apartmentId) !== Number(currentAptId)) {
          let apartment = this.apartmentsService.getApartmentById(Number(rental.apartmentId));
          // fallback: construct a minimal apartment object from rental when apartment missing
          if (!apartment) {
            const fallbackBuilding = rental.buildingId ? this.buildingsService.getBuildingById(Number(rental.buildingId)) : undefined;
            apartment = <any>{
              id: Number(rental.apartmentId),
              name: rental.apartmentName || ('Appartement ' + rental.apartmentId),
              address: fallbackBuilding ? fallbackBuilding.address : (rental.buildingName || '-'),
              buildingId: Number(rental.buildingId) || undefined
            };
          }

          let owner = undefined;
          if (apartment) {
            const building = this.buildingsService.getBuildingById(Number(apartment.buildingId));
            owner = building && building.ownerId ? this.ownersService.getOwnerById(Number(building.ownerId)) : undefined;
          }

          this.rentalDetails.push({
            rental: rental,
            apartment: apartment,
            owner: owner,
            recoveredAmount: this.calculateRecoveredAmount(rental)
          });
          // attach rental contract if present (guard apartment may be undefined)
          const rc = apartment
            ? this.contractService.getRentalContracts().find(c => Number(c.tenantId) === Number(this.tenant?.id) && Number(c.assetId) === Number(apartment.id))
            : undefined;
          if (rc) (this.rentalDetails[this.rentalDetails.length - 1] as any).rentalContract = rc;
        }
      });
    }
  }

  /**
   * Retourne l'id de l'appartement courant du locataire (premier élément de apartments[])
   */
  getCurrentApartmentId(t?: Tenant): number | undefined {
    if (!t) return undefined;
    if (t.apartments && t.apartments.length > 0) return t.apartments[0];
    return undefined;
  }

  /**
   * Retourne l'id du bâtiment de l'appartement courant du locataire
   */
  getCurrentBuildingId(t?: Tenant): number | undefined {
    const aptId = this.getCurrentApartmentId(t);
    if (!aptId) return undefined;
    const apt = this.apartmentsService.getApartmentById(aptId);
    return apt ? apt.buildingId : undefined;
  }

  // Calculer le montant recouvré pour une location
  private calculateRecoveredAmount(rental?: Rental): number {
    if (!rental) return 0;
    // Implémentez la logique de calcul du montant recouvré
    // Pour l'instant, retourner une valeur fictive
    return rental.price ? rental.price * 0.8 : 0;
  }

  // Vérifier si une location est active
  // Une location est active si :
  // 1. Elle n'a pas de statut (compatibilité avec les anciennes données) OU son statut est 'active'
  // 2. ET la date de fin est dans le futur ou aujourd'hui
  // 3. ET elle n'est pas annulée
  isRentalActive(rental?: Rental): boolean {
    if (!rental) return false;
    
    // Si la location est annulée, elle n'est pas active
    if (rental.status === 'cancelled') return false;
    
    // Si la location est terminée, elle n'est pas active
    if (rental.status === 'ended') return false;
    
    // Si la location n'a pas de statut ou est 'active', vérifier la date
    // (compatibilité : les anciennes locations sans statut sont considérées comme actives si la date est valide)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Réinitialiser les heures pour comparer uniquement les dates
    const endDate = new Date(rental.endDate);
    endDate.setHours(0, 0, 0, 0);
    
    // La location est active si la date de fin est dans le futur ou aujourd'hui
    // ET si le statut n'est pas 'ended' ou 'cancelled' (déjà vérifié ci-dessus)
    return endDate >= today;
  }

  // Vérifier si le formulaire a été modifié
  isFormChanged(): boolean {
    if (!this.tenant) return false;
    
    const original = {
      ...this.tenant,
      affiliatedPerson: this.tenant.affiliatedPerson || {}
    };
    
    return JSON.stringify(this.form) !== JSON.stringify(original);
  }

  // Sauvegarder ou annuler selon les modifications
  saveOrCancel(): void {
    if (this.isFormChanged()) {
      this.save();
    } else {
      this.cancelEdit();
    }
    
    if (this.tenant) {
      this.router.navigate(['demo/admin-panel/tenants', this.tenant.id]);
    } else {
      this.router.navigate(['demo/admin-panel/tenants']);
    }
  }

  // Confirmation de suppression
  confirmDeleteTenant(): void {
    this.showDeleteConfirm = true;
  }

  // Suppression du locataire
  deleteTenant(): void {
    if (this.tenant) {
      this.tenantsService.deleteTenant(this.tenant.id);
      this.router.navigate(['demo/admin-panel/tenants']);
    }
  }

  // Gestion de la sélection d'image d'identité
  onIdentityImageSelected(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;
    
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.errors.identityImage = 'Format d\'image non autorisé. Utilisez JPEG, PNG ou WebP.';
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      this.errors.identityImage = 'La taille de l\'image doit être inférieure à 2Mo.';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.form.identityImage = e.target.result;
      delete this.errors.identityImage;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  // Obtenir le nom d'un appartement
  getApartmentName(apartmentId: number | undefined): string {
    if (!apartmentId) return '-';
    const apartment = this.apartments.find(a => a.id === apartmentId);
    return apartment ? apartment.name : '-';
  }

  // Obtenir le nom d'un bâtiment
  getBuildingName(buildingId: number | undefined): string {
    if (!buildingId) return '-';
    const building = this.buildings.find(b => b.id === buildingId);
    return building ? building.name : '-';
  }
    // Obtenir le nom d'un bâtiment
  getBuildingAdress(buildingId: number | undefined): string {
    if (!buildingId) return '-';
    const building = this.buildings.find(b => b.id === buildingId);
    return building ? building.address : '-';
  }

    /**
     * Retourne les parts de localisation (bâtiment, appartement, adresse) pour l'affichage
     * Cherche d'abord l'appartement, puis retombe sur la location (rental) si l'appartement manque.
     */
    getCurrentLocationParts(t?: Tenant) {
      const empty = { buildingName: '-', apartmentName: '-', address: '-' };
      if (!t) return empty;
      const aptId = this.getCurrentApartmentId(t);
      if (!aptId) return empty;

      let apartment = this.apartmentsService.getApartmentById(aptId as number) as any;
      let rental = this.rentalsService.getRentals().find(r => Number(r.apartmentId) === Number(aptId) && Number(r.tenantId) === Number(t.id));

      // If apartment not found, try to build minimal from rental
      if (!apartment && rental) {
        const fallbackBuilding = rental.buildingId ? this.buildingsService.getBuildingById(Number(rental.buildingId)) : undefined;
        apartment = {
          id: Number(aptId),
          name: rental.apartmentName || ('Appartement ' + aptId),
          address: fallbackBuilding ? fallbackBuilding.address : (rental.buildingName || '-') ,
          buildingId: Number(rental.buildingId) || undefined
        } as any;
      }

      if (!apartment) return empty;

      const building = apartment.buildingId ? this.buildingsService.getBuildingById(Number(apartment.buildingId)) : undefined;
      const buildingName = building ? (building.name || ('Bâtiment ' + building.id)) : (apartment.buildingId ? ('Bâtiment ' + apartment.buildingId) : '-');
      const apartmentName = apartment.name || ('Appartement ' + apartment.id);
      const address = apartment.address || (building ? building.address : '-') || '-';

      return {
        buildingName,
        apartmentName,
        address
      };
    }

  // Obtenir le nom d'un locataire
  getTenantName(tenantId: number | undefined): string {
    if (!tenantId) return '-';
    const tenant = this.tenants.find(t => t.id === tenantId);
    return tenant ? tenant.fullName : '-';
  }
  
  // Activation du mode édition
  enableEdit(): void {
    this.editMode = true;
    // Ensure the affiliation toggle matches current tenant data when entering edit
    this.showAffiliated = !!(this.tenant?.affiliatedPerson && this.tenant?.affiliatedPerson.fullName);
    // Ensure filtered apartments are available when entering edit
    const currentAptId = this.getCurrentApartmentId(this.tenant);
    if (currentAptId) {
      const apt = this.apartmentsService.getApartmentById(currentAptId);
      if (apt) {
        this.filteredApartments = this.apartments.filter(a => a.buildingId === apt.buildingId);
      }
    }
  }

  // Annulation de l'édition
  cancelEdit(): void {
    this.editMode = false;
    if (this.tenant) {
      this.showAffiliated = !!(this.tenant?.affiliatedPerson && this.tenant?.affiliatedPerson.fullName);
      this.form = {
        ...this.tenant,
        affiliatedPerson: this.showAffiliated ? (this.tenant.affiliatedPerson || {}) : undefined
      };
      // reset filtered apartments when cancelling edit
      const currentAptId = this.getCurrentApartmentId(this.tenant);
      if (currentAptId) {
        const apt = this.apartmentsService.getApartmentById(currentAptId);
        if (apt) {
          this.filteredApartments = this.apartments.filter(a => a.buildingId === apt.buildingId);
          this.form.buildingId = apt.buildingId;
          this.form.apartmentId = apt.id;
        }
      } else {
        this.filteredApartments = [];
      }
    }
    this.errors = {};
  }

  // Handler when the affiliated-person toggle is changed in the form
  onShowAffiliatedChange(): void {
    if (this.showAffiliated) {
      if (!this.form.affiliatedPerson) {
        this.form.affiliatedPerson = {};
      }
    } else {
      if (this.form && this.form.affiliatedPerson) {
        delete this.form.affiliatedPerson;
      }
    }
  }

  // Validation du formulaire
  validate(): boolean {
    this.errors = {};
    
    // Validation des champs principaux
    if (!this.form.fullName?.trim()) {
      this.errors.fullName = 'Le nom complet est requis';
    }
    
    if (!this.form.country?.trim()) {
      this.errors.country = 'Le pays est requis';
    }
    
    if (!this.form.address?.trim()) {
      this.errors.address = 'L\'adresse est requise';
    }
    
    if (!this.form.phone?.trim()) {
      this.errors.phone = 'Le téléphone est requis';
    } else if (!/^[\+]?[0-9\s\-\(\)]{8,}$/.test(this.form.phone)) {
      this.errors.phone = 'Le format du téléphone est invalide';
    }
    
    if (this.form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email)) {
      this.errors.email = 'Le format de l\'email est invalide';
    }
    
    // Validation de la localisation
    if (!this.form.buildingId) {
      this.errors.buildingId = 'Le bâtiment est requis';
    }
    
    if (this.form.buildingId && !this.form.apartmentId) {
      this.errors.apartmentId = 'L\'appartement est requis';
    }
    
    // Validation de la personne affiliée
    if (this.form.affiliatedPerson) {
      if (!this.form.affiliatedPerson.relation?.trim()) {
        this.errors.affiliatedPersonRelation = 'Le type de relation est requis';
      }
      
      if (!this.form.affiliatedPerson.fullName?.trim()) {
        this.errors.affiliatedPersonFullName = 'Le nom complet est requis';
      }
      
      if (!this.form.affiliatedPerson.phone?.trim()) {
        this.errors.affiliatedPersonPhone = 'Le téléphone est requis';
      } else if (!/^[\+]?[0-9\s\-\(\)]{8,}$/.test(this.form.affiliatedPerson.phone)) {
        this.errors.affiliatedPersonPhone = 'Le format du téléphone est invalide';
      }
      
      if (!this.form.affiliatedPerson.address?.trim()) {
        this.errors.affiliatedPersonAddress = 'L\'adresse est requise';
      }
      
      if (this.form.affiliatedPerson.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.affiliatedPerson.email)) {
        this.errors.affiliatedPersonEmail = 'Le format de l\'email est invalide';
      }
    }
    
    return Object.keys(this.errors).length === 0;
  }

  // Sauvegarde des modifications
  save(): void {
    if (!this.validate()) return;
    
    try {
      // S'assurer que les données sont complètes
      const tenantData: any = {
        ...this.form,
        // Ensure affiliatedPerson exists when present
        affiliatedPerson: this.form.affiliatedPerson || {}
      };

      // persist selected apartment into the apartments array used by the Tenant model
      if (this.form.apartmentId) {
        tenantData.apartments = [Number(this.form.apartmentId)];
      } else if (this.form.apartments) {
        tenantData.apartments = Array.isArray(this.form.apartments) ? this.form.apartments.map((v: any) => Number(v)) : [Number(this.form.apartments)];
      }

      this.tenantsService.updateTenant(tenantData);
      this.tenant = { ...tenantData };
      this.editMode = false;
      
      // Recharger les données
      if (this.tenant && this.tenant.id) {
        this.loadTenantData(this.tenant.id);
      }
      
      // Recharger la liste globale des locataires
      this.tenants = this.tenantsService.getTenants();
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      this.errors.general = 'Une erreur est survenue lors de la sauvegarde';
    }
  }

  // Retour à la liste des locataires
  back(): void {
    this.router.navigate(['demo/admin-panel/tenants']);
  }

  // ==================== Gestion de l'abandon de location ====================
  
  /**
   * Ouvre la modale d'abandon de location
   */
  openAbandonmentModal(rental: Rental): void {
    if (!this.tenant) return;
    if (rental.tenantId !== this.tenant.id) {
      alert('Erreur: Cette location n\'appartient pas à ce locataire.');
      return;
    }
    if (rental.status === 'cancelled') {
      alert('Cette location est déjà annulée.');
      return;
    }
    this.selectedRentalForAbandonment = rental;
    this.abandonmentReason = '';
    this.acceptAbandonmentConditions = false;
    this.errors = {};
    this.showAbandonmentModal = true;
  }

  /**
   * Ferme la modale d'abandon
   */
  closeAbandonmentModal(): void {
    this.showAbandonmentModal = false;
    this.selectedRentalForAbandonment = undefined;
    this.abandonmentReason = '';
    this.acceptAbandonmentConditions = false;
    this.errors = {};
  }

  /**
   * Confirme l'abandon de location
   */
  confirmAbandonment(): void {
    if (!this.selectedRentalForAbandonment || !this.tenant) return;
    
    // Validation
    this.errors = {};
    if (!this.abandonmentReason || !this.abandonmentReason.trim()) {
      this.errors.abandonmentReason = 'La raison de l\'abandon est requise.';
      return;
    }
    if (!this.acceptAbandonmentConditions) {
      this.errors.abandonmentConditions = 'Vous devez accepter les conditions d\'abandon.';
      return;
    }

    // Conditions d'abandon (clauses contractuelles)
    const conditions = `
      Conditions d'abandon acceptées:
      - Paiement de tous les loyers impayés jusqu'à la date d'abandon
      - Restitution de l'appartement dans son état initial
      - Règlement de toutes les factures impayées
      - Perte de tous les droits sur l'appartement à partir de la date d'abandon
    `;

    // Appeler le service pour annuler la location
    this.rentalsService.cancelRentalByTenantAbandonment(
      this.selectedRentalForAbandonment.id,
      this.abandonmentReason.trim(),
      conditions,
      this.tenant.id
    ).subscribe({
      next: () => {
        alert('La location a été annulée avec succès.');
        this.closeAbandonmentModal();
        // Recharger les données
        if (this.tenant) {
          this.loadTenantData(this.tenant.id);
        }
      },
      error: (err: any) => {
        alert('Erreur lors de l\'annulation de la location: ' + (err.message || 'Erreur inconnue'));
      }
    });
  }

  /**
   * Retourne le libellé du type d'annulation
   */
  getCancellationTypeLabel(type?: string): string {
    if (!type) return 'Annulée';
    switch (type) {
      case 'tenant_abandonment':
        return 'Abandonnée';
      case 'owner_eviction':
        return 'Expulsée';
      case 'collector_cancellation':
        return 'Annulée (Recouvreur)';
      case 'admin_cancellation':
        return 'Annulée (Admin)';
      default:
        return 'Annulée';
    }
  }

  // ==================== Gestion des documents ====================

  /**
   * Ouvre la modale d'upload de document
   */
  openDocumentUploadModal(documentType?: string, docToEdit?: TenantDocument | null): void {
    if (!this.tenant) return;
    this.selectedDocumentBeingEdited = docToEdit || null;
    this.selectedDocumentType = documentType || (docToEdit ? docToEdit.type : '');
    this.documentFile = null;
    // If editing, prefill notes and display name
    if (this.selectedDocumentBeingEdited) {
      this.documentName = this.selectedDocumentBeingEdited.name || '';
      this.documentNotes = this.selectedDocumentBeingEdited.notes || '';
    } else {
      this.documentName = '';
      this.documentNotes = '';
    }
    this.uploadingDocument = false;
    this.errors = {};
    this.showDocumentUploadModal = true;
  }

  /**
   * Ferme la modale d'upload de document
   */
  closeDocumentUploadModal(): void {
    this.showDocumentUploadModal = false;
    this.selectedDocumentType = '';
    this.documentFile = null;
    this.documentName = '';
    this.documentNotes = '';
    this.uploadingDocument = false;
    this.errors = {};
    this.selectedDocumentBeingEdited = null;
  }

  /**
   * Gère la sélection d'un fichier
   */
  onDocumentFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.errors.documentFile = 'La taille du fichier doit être inférieure à 10MB.';
      return;
    }

    // Vérifier le type de fichier
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      this.errors.documentFile = 'Format de fichier non autorisé. Utilisez PDF, JPEG, PNG, WebP ou Word.';
      return;
    }

    this.documentFile = file;
    this.documentName = file.name;
    delete this.errors.documentFile;
  }

  /**
   * Upload un document
   */
  uploadDocument(): void {
    if (!this.tenant) return;

    // If creating a new document, a file is required. When editing, file is optional.
    if (!this.selectedDocumentBeingEdited && !this.documentFile) {
      this.errors.documentFile = 'Veuillez sélectionner un fichier.';
      return;
    }

    if (!this.selectedDocumentType) {
      this.errors.documentType = 'Veuillez sélectionner un type de document.';
      return;
    }

    // Trouver le nom du document depuis requiredDocuments
    const docType = this.requiredDocuments.find(d => d.type === this.selectedDocumentType);
    const documentName = docType ? docType.label : this.documentName || this.selectedDocumentType;

    this.uploadingDocument = true;
    this.errors = {};

    // If there is a file selected, read it and then add/update. If editing without file,
    // update metadata immediately.
    if (!this.documentFile && this.selectedDocumentBeingEdited) {
      try {
        const updates: Partial<TenantDocument> = {
          type: this.selectedDocumentType,
          name: documentName,
          notes: this.documentNotes || undefined,
          uploadedAt: new Date().toISOString()
        };
        this.tenantsService.updateTenantDocument(this.tenant.id, this.selectedDocumentBeingEdited.id, updates);
        this.loadTenantDocuments();
        this.closeDocumentUploadModal();
      } catch (error) {
        console.error('Erreur lors de la mise à jour du document:', error);
        this.errors.general = 'Une erreur est survenue lors de la mise à jour du document.';
      } finally {
        this.uploadingDocument = false;
      }
      return;
    }

    // Lire le fichier comme base64
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const fileUrl = e.target.result;
        const documentPayload: Omit<TenantDocument, 'id' | 'uploadedAt'> = {
          type: this.selectedDocumentType,
          name: documentName,
          fileUrl: fileUrl,
          fileName: this.documentFile!.name,
          fileSize: this.documentFile!.size,
          status: 'pending',
          notes: this.documentNotes || undefined
        };

        if (this.selectedDocumentBeingEdited) {
          // update existing document
          this.tenantsService.updateTenantDocument(this.tenant!.id, this.selectedDocumentBeingEdited.id, {
            ...documentPayload,
            uploadedAt: new Date().toISOString()
          });
        } else {
          this.tenantsService.addDocumentToTenant(this.tenant!.id, documentPayload);
        }

        this.loadTenantDocuments();
        this.closeDocumentUploadModal();
      } catch (error) {
        console.error('Erreur lors de l\'upload du document:', error);
        this.errors.general = 'Une erreur est survenue lors de l\'upload du document.';
      } finally {
        this.uploadingDocument = false;
      }
    };
    reader.onerror = () => {
      this.errors.general = 'Erreur lors de la lecture du fichier.';
      this.uploadingDocument = false;
    };
    if (this.documentFile) {
      reader.readAsDataURL(this.documentFile);
    } else {
      // Should not happen (we handle no-file case earlier), but guard for safety
      this.uploadingDocument = false;
      this.errors.general = 'Aucun fichier sélectionné.';
    }
  }

  /**
   * Supprime un document
   */
  deleteDocument(documentId: number): void {
    if (!this.tenant) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    this.tenantsService.removeDocumentFromTenant(this.tenant.id, documentId);
    this.loadTenantDocuments();
  }

  /**
   * Ouvre un document dans un nouvel onglet
   */
  viewDocument(doc: TenantDocument): void {
    if (doc.fileUrl) {
      window.open(doc.fileUrl, '_blank');
    }
  }

  /**
   * Télécharge un document
   */
  downloadDocument(doc: TenantDocument): void {
    if (doc.fileUrl) {
      const link = window.document.createElement('a');
      link.href = doc.fileUrl;
      link.download = doc.fileName;
      link.click();
    }
  }

  /**
   * Vérifie si un type de document existe
   */
  hasDocumentType(documentType: string): boolean {
    if (!this.tenant) return false;
    return this.tenantsService.hasDocumentType(this.tenant.id, documentType);
  }

  /**
   * Récupère les documents d'un type spécifique
   */
  getDocumentsByType(documentType: string): TenantDocument[] {
    return this.tenantDocuments.filter(d => d.type === documentType);
  }

  /**
   * Retourne l'icône pour un type de document
   */
  getDocumentIcon(documentType: string): string {
    const docType = this.requiredDocuments.find(d => d.type === documentType);
    return docType ? docType.icon : 'fa-file';
  }

  /**
   * Formate la taille du fichier
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Retourne le libellé du statut du document
   */
  getDocumentStatusLabel(status?: string): string {
    switch (status) {
      case 'approved':
        return 'Approuvé';
      case 'rejected':
        return 'Rejeté';
      case 'pending':
      default:
        return 'En attente';
    }
  }
}