import { Injectable } from '@angular/core';
import { ApartmentsService, Apartment } from '../apartments/apartments.service';
import { BuildingsService, Building } from '../buildings/buildings.service';
import { TenantsService } from '../tenants/tenants.service';
import { Observable, of, throwError } from 'rxjs';
import { PaymentsService, PaymentRecordDto } from '../recoveries/payments.service';
import { map } from 'rxjs/operators';
import { CollectorsService } from '../collectors/collectors.service';

export interface Rental {
  id: number;
  apartmentId: number;
  buildingId: number;
  collectorId: number;
  apartmentName: string;
  buildingName: string;
  collectorName: string;
  tenantId: number;
  tenantName: string;
  startDate: string;
  endDate: string;
  price: number;
  createdAt: string;
  // statut de la location : 'active' | 'ended' | 'cancelled' (optionnel)
  status?: 'active' | 'ended' | 'cancelled';
  // Champs d'annulation
  cancellationType?: 'tenant_abandonment' | 'owner_eviction' | 'collector_cancellation' | 'admin_cancellation';
  cancellationReason?: string;
  cancelledBy?: number; // ID de l'entité qui a annulé (tenantId, ownerId, collectorId, ou adminId)
  cancellationDate?: string;
  cancellationConditions?: string; // Conditions spécifiques à l'annulation (ex: clauses d'abandon)
}

@Injectable({ providedIn: 'root' })
export class RentalsService {
  constructor(
    private apartmentsService: ApartmentsService,
    private buildingsService: BuildingsService,
    private tenantsService: TenantsService,
    private paymentsService: PaymentsService,
    private collectorsService: CollectorsService
  ) {}
  private storageKey = 'rentals';

  /**
   * Vérifie si un appartement est disponible pour une nouvelle location.
   * Accepte plusieurs synonymes de statut pour la compatibilité avec le dépôt existant.
   */
  private isApartmentAvailable(apartmentId: number): boolean {
    const apt = this.apartmentsService.getApartmentById(apartmentId);
    if (!apt) return false;
    const status = (apt.status || '').toString().toLowerCase();
    // Considérer loué si status contient 'rent' ou 'lou' (loué) ou 'occupied'
    const occupiedKeywords = ['rent', 'lou', 'occupied', 'leased'];
    return !occupiedKeywords.some(k => status.includes(k));
  }

  /**
   * Vérifie si les dates [start, end] chevauchent une location existante pour le même appartement.
   */
  private hasOverlap(apartmentId: number, start: Date, end: Date): boolean {
    const rentals = this.getRentalsByApartment(apartmentId);
    for (const r of rentals) {
      // Ignorer les locations terminées ou annulées
      if (r.status === 'ended' || r.status === 'cancelled') continue;
      const s = new Date(r.startDate);
      const e = new Date(r.endDate);
      // chevauchement: start <= e && s <= end
      if (start <= e && s <= end) return true;
    }
    return false;
  }

  /**
   * Retourne toutes les locations, ou un tableau vide si le localStorage est corrompu.
   */
  getRentals(): Rental[] {
    const data = localStorage.getItem(this.storageKey);
    try {
      return data ? JSON.parse(data) : [];
    } catch {
      localStorage.removeItem(this.storageKey);
      return [];
    }
  }

  /**
   * Retourne une location par son ID.
   */
  getRentalById(id: number): Rental | undefined {
    return this.getRentals().find(r => r.id === id);
  }

  /**
   * Crée une nouvelle location et la sauvegarde.
   */
  createRental(rental: Omit<Rental, 'id' | 'createdAt' | 'apartmentName' | 'tenantName'>): Rental {
    const rentals = this.getRentals();
    // Récupère le nom de l'appartement et du locataire
    let apartmentName = '';
    let tenantName = '';
    if (this.apartmentsService && rental.apartmentId) {
      const apt = this.apartmentsService.getApartmentById(rental.apartmentId);
      apartmentName = apt ? apt.name : '';
    }
    if (this.tenantsService && rental.tenantId) {
      const tenant = this.tenantsService.getTenantById(rental.tenantId);
      tenantName = tenant ? tenant.fullName : '';
    }
    const newRental: Rental = {
      ...rental,
      apartmentName,
  tenantName,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    rentals.push(newRental);
    localStorage.setItem(this.storageKey, JSON.stringify(rentals));
    return newRental;
  }

  /**
   * Met à jour une location existante.
   */
  updateRental(updated: Rental): void {
    const rentals = this.getRentals().map(r => r.id === updated.id ? updated : r);
    localStorage.setItem(this.storageKey, JSON.stringify(rentals));
  }

  /**
   * Supprime une location par son ID.
   */
  deleteRental(id: number): void {
    const rentals = this.getRentals().filter(r => r.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(rentals));
  }

  /**
   * Supprime toutes les locations (administration).
   */
  clearRentals(): void {
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Filtre les locations par locataire.
   */
  getRentalsByTenant(tenantId: number): Rental[] {
    return this.getRentals().filter(r => r.tenantId === tenantId);
  }

  /**
   * Filtre les locations par appartement.
   */
  getRentalsByApartment(apartmentId: number): Rental[] {
    return this.getRentals().filter(r => r.apartmentId === apartmentId);
  }

  /**
   * Retourne la location active d'un appartement (s'il y en a une).
   * Une location est considérée comme active si :
   * 1. Elle n'a pas de statut (compatibilité avec les anciennes données) OU son statut est 'active'
   * 2. ET elle n'est pas 'cancelled' ou 'ended'
   * 3. ET la date de fin est dans le futur ou aujourd'hui
   */
  getActiveRental(apartmentId: number): Rental | undefined {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.getRentalsByApartment(apartmentId).find(r => {
      // Exclure les locations annulées ou terminées
      if (r.status === 'cancelled' || r.status === 'ended') return false;
      
      // Accepter les locations sans statut (compatibilité) ou avec statut 'active'
      const isActiveStatus = !r.status || r.status === 'active';
      
      // Vérifier que la date de fin est dans le futur ou aujourd'hui
      const endDate = new Date(r.endDate);
      endDate.setHours(0, 0, 0, 0);
      const isDateValid = endDate >= today;
      
      return isActiveStatus && isDateValid;
    });
  }

  /**
   * Termine une location en définissant la date de fin et met le statut à 'ended'.
   */
  endRentalWithDate(rentalId: number, endDate: string): Observable<Rental> {
    const rentals = this.getRentals();
    const idx = rentals.findIndex(r => r.id === rentalId);
    if (idx === -1) return throwError(() => new Error('Location introuvable.'));
    rentals[idx].status = 'ended';
    rentals[idx].endDate = new Date(endDate).toISOString();
    localStorage.setItem(this.storageKey, JSON.stringify(rentals));
    const aptId = rentals[idx].apartmentId;
    const tenantId = rentals[idx].tenantId;
    this.releaseApartment(aptId);
    if (tenantId) {
      try { this.tenantsService.removeApartmentFromTenant(tenantId, aptId); } catch {}
    }
    return of(rentals[idx]);
  }

  /**
   * Ajoute une nouvelle location après validations.
   * Input properties expected (French names accepted and mapped):
   * { clientId, apartmentId, dateDebut, dateFin, prixTotal, statutLocation, modePaiement?, montantPaye?, montantDu? }
   * Retourne un Observable qui émet la location créée ou une erreur avec message clair.
   */
  addRental(input: {
    clientId: number;
    apartmentId: number;
    dateDebut: string;
    dateFin: string;
    prixTotal: number;
    statutLocation?: 'active' | 'ended' | 'cancelled' | string;
    modePaiement?: string;
    montantPaye?: number;
    montantDu?: number;
  }): Observable<Rental> {
    // Validation des champs obligatoires
    if (!input || !input.clientId || !input.apartmentId) {
      return throwError(() => new Error('Champs obligatoires manquants : clientId ou apartmentId'));
    }
    if (!input.dateDebut || !input.dateFin) {
      return throwError(() => new Error('Les dates de début et de fin sont requises.'));
    }
    const start = new Date(input.dateDebut);
    const end = new Date(input.dateFin);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return throwError(() => new Error('Dates invalides.')); 
    }
    if (start >= end) {
      return throwError(() => new Error('La date de début doit être antérieure à la date de fin.'));
    }
    if (!input.prixTotal || isNaN(Number(input.prixTotal)) || Number(input.prixTotal) <= 0) {
      return throwError(() => new Error('Le prix total est invalide.'));
    }

    const apartmentId = Number(input.apartmentId);
    const clientId = Number(input.clientId);

    // Vérifier qu'un même locataire n'a pas déjà une location active
    const existingActive = this.getRentalsByTenant(clientId).some(r => r.status === 'active');
    if (existingActive) {
      return throwError(() => new Error('Le locataire a déjà une location active.')); 
    }

    // Vérifier disponibilité de l'appartement
    const apt = this.apartmentsService.getApartmentById(apartmentId);
    if (!apt) {
      return throwError(() => new Error('Appartement introuvable.'));
    }
    if (!this.isApartmentAvailable(apartmentId)) {
      return throwError(() => new Error("L'appartement n'est pas disponible."));
    }

    // Vérifier chevauchement avec d'autres locations
    if (this.hasOverlap(apartmentId, start, end)) {
      return throwError(() => new Error('Les dates de la location chevauchent une location existante pour cet appartement.'));
    }

    // Construire l'objet attendu par createRental (réutilise la logique existante pour stocker)
    // Résoudre collectorId éventuel via affiliations (apartment/building)
    let resolvedCollectorId: number | undefined = this.collectorsService.findCollectorByApartment(apartmentId);
    if (resolvedCollectorId === undefined) {
      resolvedCollectorId = this.collectorsService.findCollectorByBuilding(apt.buildingId);
    }

    const rentalPayload: Omit<Rental, 'id' | 'createdAt' | 'apartmentName' | 'tenantName'> & { status?: string } = {
      apartmentId: apartmentId,
      buildingId: apt.buildingId || 0,
      collectorId: resolvedCollectorId as any,
      tenantId: clientId,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      price: Number(input.prixTotal),
      // statut de la location (normaliser en 'active' par défaut)
      status: (input.statutLocation as string) || 'active'
    } as any;

    try {
      const created = this.createRental(rentalPayload);

      // Après sauvegarde, mettre à jour le statut de l'appartement en 'rent' et lier le locataire
      const tenant = this.tenantsService.getTenantById(clientId);
      const tenantName = tenant ? (tenant.fullName || '') : '';
      const updatedApt: Apartment = { ...apt, status: 'rent', tenant: tenantName, tenantId: clientId } as Apartment;
      this.apartmentsService.updateApartment(updatedApt);

      // Mettre à jour le locataire: associer l'appartement et l'historique de location
      this.tenantsService.addApartmentToTenant(clientId, apartmentId);
      this.tenantsService.addRentalToTenant(clientId, created.id);

      // Assurer que le statut est enregistré dans la location (createRental inclut status si fourni)
      const rentals = this.getRentals();
      const idx = rentals.findIndex(r => r.id === created.id);
      if (idx !== -1) {
        rentals[idx].status = (rentalPayload.status as any) || 'active';
        localStorage.setItem(this.storageKey, JSON.stringify(rentals));
      }

      // Enregistrer un paiement initial (mode de paiement, montant payé, montant dû)
      const paidAmount = Number(input.montantPaye || 0);
      const dueAmount = Number(input.montantDu ?? (Number(input.prixTotal) - paidAmount));
      const period = new Date(input.dateDebut).toISOString().slice(0, 7); // YYYY-MM
      // Déterminer statut du paiement initial
      const status = paidAmount >= dueAmount ? 'paid' : 'pending';
      const paymentRecord: Omit<PaymentRecordDto, 'id' | 'paymentDate'> = {
        rentalId: created.id,
        tenantId: clientId,
        collectorId: resolvedCollectorId,
        amount: paidAmount,
        dueAmount: dueAmount,
        paidAmount: paidAmount,
        status,
        paymentMethod: input.modePaiement || 'cash',
        period
      };
      // fire-and-forget; subscription side-effects not strictly needed here
      this.paymentsService.createPayment(paymentRecord).subscribe({ next: () => {}, error: () => {} });

      return of(created);
    } catch (err: any) {
      return throwError(() => new Error(err?.message || 'Erreur lors de la création de la location.'));
    }
  }

  /**
   * Libère un appartement (le rend disponible) — utilisé quand une location est terminée ou annulée.
   */
  releaseApartment(apartmentId: number): Observable<boolean> {
    const apt = this.apartmentsService.getApartmentById(apartmentId);
    if (!apt) return throwError(() => new Error('Appartement introuvable.'));
    const updated: Apartment = { ...apt, status: 'free' } as Apartment;
    // clear tenant name when releasing
    if ((updated as any).tenant !== undefined) {
      delete (updated as any).tenant;
    }
    // If we have tenantId recorded on apartment, remove the apartment from tenant record
    if ((updated as any).tenantId) {
      try {
        this.tenantsService.removeApartmentFromTenant((updated as any).tenantId, apartmentId);
      } catch {
        // ignore
      }
      delete (updated as any).tenantId;
    }
    this.apartmentsService.updateApartment(updated);
    return of(true);
  }

  /**
   * Termine une location et libère l'appartement.
   */
  endRental(rentalId: number): Observable<Rental> {
    const rentals = this.getRentals();
    const idx = rentals.findIndex(r => r.id === rentalId);
    if (idx === -1) return throwError(() => new Error('Location introuvable.'));
    rentals[idx].status = 'ended';
    localStorage.setItem(this.storageKey, JSON.stringify(rentals));
    // libérer l'appartement associé
    const aptId = rentals[idx].apartmentId;
    const tenantId = rentals[idx].tenantId;
    this.releaseApartment(aptId);
    // Retirer l'appartement de la liste du locataire
    if (tenantId) {
      try { this.tenantsService.removeApartmentFromTenant(tenantId, aptId); } catch {}
    }
    return of(rentals[idx]);
  }

  /**
   * Annule une location et libère l'appartement.
   */
  cancelRental(rentalId: number): Observable<Rental> {
    const rentals = this.getRentals();
    const idx = rentals.findIndex(r => r.id === rentalId);
    if (idx === -1) return throwError(() => new Error('Location introuvable.'));
    rentals[idx].status = 'cancelled';
    localStorage.setItem(this.storageKey, JSON.stringify(rentals));
    // libérer l'appartement associé
    const aptId = rentals[idx].apartmentId;
    const tenantId = rentals[idx].tenantId;
    this.releaseApartment(aptId);
    // Retirer l'appartement de la liste du locataire
    if (tenantId) {
      try { this.tenantsService.removeApartmentFromTenant(tenantId, aptId); } catch {}
    }
    return of(rentals[idx]);
  }

  /**
   * Annule une location par abandon du locataire.
   * @param rentalId ID de la location
   * @param reason Raison de l'abandon
   * @param conditions Conditions d'abandon (clauses contractuelles)
   * @param tenantId ID du locataire qui abandonne
   */
  cancelRentalByTenantAbandonment(
    rentalId: number,
    reason: string,
    conditions: string,
    tenantId: number
  ): Observable<Rental> {
    const rentals = this.getRentals();
    const idx = rentals.findIndex(r => r.id === rentalId);
    if (idx === -1) return throwError(() => new Error('Location introuvable.'));
    if (rentals[idx].status === 'cancelled') {
      return throwError(() => new Error('La location est déjà annulée.'));
    }
    if (rentals[idx].tenantId !== tenantId) {
      return throwError(() => new Error('Le locataire ne correspond pas à cette location.'));
    }
    
    // Mettre à jour la location avec les informations d'annulation
    rentals[idx].status = 'cancelled';
    rentals[idx].cancellationType = 'tenant_abandonment';
    rentals[idx].cancellationReason = reason;
    rentals[idx].cancellationConditions = conditions;
    rentals[idx].cancelledBy = tenantId;
    rentals[idx].cancellationDate = new Date().toISOString();
    rentals[idx].endDate = new Date().toISOString();
    
    localStorage.setItem(this.storageKey, JSON.stringify(rentals));
    
    // Libérer l'appartement
    const aptId = rentals[idx].apartmentId;
    this.releaseApartment(aptId);
    // Retirer l'appartement de la liste du locataire
    try {
      this.tenantsService.removeApartmentFromTenant(tenantId, aptId);
    } catch {}
    
    return of(rentals[idx]);
  }

  /**
   * Annule une location par expulsion du propriétaire.
   * @param rentalId ID de la location
   * @param reason Raison de l'expulsion
   * @param ownerId ID du propriétaire qui expulse
   */
  cancelRentalByOwnerEviction(
    rentalId: number,
    reason: string,
    ownerId: number
  ): Observable<Rental> {
    const rentals = this.getRentals();
    const idx = rentals.findIndex(r => r.id === rentalId);
    if (idx === -1) return throwError(() => new Error('Location introuvable.'));
    if (rentals[idx].status === 'cancelled') {
      return throwError(() => new Error('La location est déjà annulée.'));
    }
    
    // Vérifier que le propriétaire est bien le propriétaire du bâtiment
    const apt = this.apartmentsService.getApartmentById(rentals[idx].apartmentId);
    if (!apt) {
      return throwError(() => new Error('Appartement introuvable.'));
    }
    const building = this.buildingsService.getBuildingById(apt.buildingId);
    if (!building) {
      return throwError(() => new Error('Bâtiment introuvable.'));
    }
    // Vérifier que le propriétaire est bien le propriétaire du bâtiment
    if (building.ownerId !== ownerId) {
      return throwError(() => new Error('Le propriétaire n\'est pas autorisé à expulser ce locataire.'));
    }
    
    // Mettre à jour la location avec les informations d'annulation
    rentals[idx].status = 'cancelled';
    rentals[idx].cancellationType = 'owner_eviction';
    rentals[idx].cancellationReason = reason;
    rentals[idx].cancelledBy = ownerId;
    rentals[idx].cancellationDate = new Date().toISOString();
    rentals[idx].endDate = new Date().toISOString();
    
    localStorage.setItem(this.storageKey, JSON.stringify(rentals));
    
    // Libérer l'appartement
    const aptId = rentals[idx].apartmentId;
    const tenantId = rentals[idx].tenantId;
    this.releaseApartment(aptId);
    // Retirer l'appartement de la liste du locataire
    if (tenantId) {
      try {
        this.tenantsService.removeApartmentFromTenant(tenantId, aptId);
      } catch {}
    }
    
    return of(rentals[idx]);
  }

  /**
   * Annule une location par le recouvreur.
   * @param rentalId ID de la location
   * @param reason Raison de l'annulation
   * @param collectorId ID du recouvreur
   */
  cancelRentalByCollector(
    rentalId: number,
    reason: string,
    collectorId: number
  ): Observable<Rental> {
    const rentals = this.getRentals();
    const idx = rentals.findIndex(r => r.id === rentalId);
    if (idx === -1) return throwError(() => new Error('Location introuvable.'));
    if (rentals[idx].status === 'cancelled') {
      return throwError(() => new Error('La location est déjà annulée.'));
    }
    
    // Vérifier que le recouvreur est bien associé à cette location
    if (rentals[idx].collectorId !== collectorId) {
      // Vérifier si le recouvreur est affilié à l'appartement ou au bâtiment
      const apt = this.apartmentsService.getApartmentById(rentals[idx].apartmentId);
      if (!apt) {
        return throwError(() => new Error('Appartement introuvable.'));
      }
      const isAffiliated = this.collectorsService.isApartmentAffiliated(collectorId, apt.id) ||
                          this.collectorsService.isBuildingAffiliated(collectorId, apt.buildingId);
      if (!isAffiliated) {
        return throwError(() => new Error('Le recouvreur n\'est pas autorisé à annuler cette location.'));
      }
    }
    
    // Mettre à jour la location avec les informations d'annulation
    rentals[idx].status = 'cancelled';
    rentals[idx].cancellationType = 'collector_cancellation';
    rentals[idx].cancellationReason = reason;
    rentals[idx].cancelledBy = collectorId;
    rentals[idx].cancellationDate = new Date().toISOString();
    rentals[idx].endDate = new Date().toISOString();
    
    localStorage.setItem(this.storageKey, JSON.stringify(rentals));
    
    // Libérer l'appartement
    const aptId = rentals[idx].apartmentId;
    const tenantId = rentals[idx].tenantId;
    this.releaseApartment(aptId);
    // Retirer l'appartement de la liste du locataire
    if (tenantId) {
      try {
        this.tenantsService.removeApartmentFromTenant(tenantId, aptId);
      } catch {}
    }
    
    return of(rentals[idx]);
  }

  /**
   * Annule une location par l'admin (annulation administrative).
   * @param rentalId ID de la location
   * @param reason Raison de l'annulation
   * @param adminId ID de l'admin (optionnel)
   */
  cancelRentalByAdmin(
    rentalId: number,
    reason: string,
    adminId?: number
  ): Observable<Rental> {
    const rentals = this.getRentals();
    const idx = rentals.findIndex(r => r.id === rentalId);
    if (idx === -1) return throwError(() => new Error('Location introuvable.'));
    if (rentals[idx].status === 'cancelled') {
      return throwError(() => new Error('La location est déjà annulée.'));
    }
    
    // Mettre à jour la location avec les informations d'annulation
    rentals[idx].status = 'cancelled';
    rentals[idx].cancellationType = 'admin_cancellation';
    rentals[idx].cancellationReason = reason;
    rentals[idx].cancelledBy = adminId || 0;
    rentals[idx].cancellationDate = new Date().toISOString();
    rentals[idx].endDate = new Date().toISOString();
    
    localStorage.setItem(this.storageKey, JSON.stringify(rentals));
    
    // Libérer l'appartement
    const aptId = rentals[idx].apartmentId;
    const tenantId = rentals[idx].tenantId;
    this.releaseApartment(aptId);
    // Retirer l'appartement de la liste du locataire
    if (tenantId) {
      try {
        this.tenantsService.removeApartmentFromTenant(tenantId, aptId);
      } catch {}
    }
    
    return of(rentals[idx]);
  }

  /**
   * Retourne les totaux financiers liés à une location (paid/due/balance), via PaymentsService.
   */
  getRentalFinancials(rentalId: number): Observable<{ paid: number; due: number; balance: number }> {
    return this.paymentsService.getTotalsByRental(rentalId).pipe(map(x => x));
  }
}
