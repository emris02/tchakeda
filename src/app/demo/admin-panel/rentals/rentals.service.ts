import { Injectable } from '@angular/core';
import { ApartmentsService, Apartment } from '../apartments/apartments.service';
import { TenantsService } from '../tenants/tenants.service';
import { Observable, of, throwError } from 'rxjs';

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
}

@Injectable({ providedIn: 'root' })
export class RentalsService {
  constructor(
    private apartmentsService: ApartmentsService,
    private tenantsService: TenantsService
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
   * Ajoute une nouvelle location après validations.
   * Input properties expected (French names accepted and mapped):
   * { clientId, apartmentId, dateDebut, dateFin, prixTotal, statutLocation }
   * Retourne un Observable qui émet la location créée ou une erreur avec message clair.
   */
  addRental(input: {
    clientId: number;
    apartmentId: number;
    dateDebut: string;
    dateFin: string;
    prixTotal: number;
    statutLocation?: 'active' | 'ended' | 'cancelled' | string;
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
    const rentalPayload: Omit<Rental, 'id' | 'createdAt' | 'apartmentName' | 'tenantName'> & { status?: string } = {
      apartmentId: apartmentId,
      buildingId: apt.buildingId || 0,
      tenantId: clientId,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      price: Number(input.prixTotal),
      // statut de la location (normaliser en 'active' par défaut)
      status: (input.statutLocation as string) || 'active'
    } as any;

    try {
      const created = this.createRental(rentalPayload);

      // Après sauvegarde, mettre à jour le statut de l'appartement en 'rent' (loué)
      const tenant = this.tenantsService.getTenantById(clientId);
      const tenantName = tenant ? (tenant.fullName || '') : '';
  const updatedApt: Apartment = { ...apt, status: 'rent', tenant: tenantName } as Apartment;
  this.apartmentsService.updateApartment(updatedApt);

      // Assurer que le statut est enregistré dans la location (createRental inclut status si fourni)
      const rentals = this.getRentals();
      const idx = rentals.findIndex(r => r.id === created.id);
      if (idx !== -1) {
        rentals[idx].status = (rentalPayload.status as any) || 'active';
        localStorage.setItem(this.storageKey, JSON.stringify(rentals));
      }

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
    this.releaseApartment(aptId);
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
    this.releaseApartment(aptId);
    return of(rentals[idx]);
  }
}
