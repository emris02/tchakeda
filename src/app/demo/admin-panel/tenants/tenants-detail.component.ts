import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TenantsService, Tenant } from './tenants.service';
import { RentalsService, Rental } from '../rentals/rentals.service';
import { ApartmentsService, Apartment } from '../apartments/apartments.service';
import { OwnersService, Owner } from '../owners/owners.service';
import { BuildingsService, Building } from '../buildings/buildings.service';

interface RentalDetail {
  rental?: Rental;
  apartment?: Apartment;
  owner?: Owner;
  recoveredAmount?: number;
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tenantsService: TenantsService,
    private rentalsService: RentalsService,
    private apartmentsService: ApartmentsService,
    private ownersService: OwnersService,
    private buildingsService: BuildingsService
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
    }
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

          this.rentalDetails.push({
            rental: currentRental,
            apartment: currentApartment,
            owner: owner,
            recoveredAmount: this.calculateRecoveredAmount(currentRental)
          });
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
  isRentalActive(rental?: Rental): boolean {
    if (!rental) return false;
    const today = new Date();
    const endDate = new Date(rental.endDate);
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
}