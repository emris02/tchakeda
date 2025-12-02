// apartments.service.ts
import { Injectable } from '@angular/core';

/**
 * Interface représentant un appartement
 */
export interface Apartment {
  id: number;
  name: string;
  address: string;
  city: string;
  region: string;
  buildingId: number;
  tenantId?: number;
  type?: string;       
  floor?: number | string;
  underMaintenance?: boolean;
  rooms?: number;      
  tenant?: string;     
  mention?: string;
  occupied?: boolean;    
  status?: 'free' | 'sale' | 'rent' | 'construction';
  customType?: string; 
  images?: string[];   
  roomLabels?: string[];
  roomDescriptions?: string[];
  roomAreas?: number[];
  area?: number;       
  description?: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ApartmentsService {

  private storageKey = 'apartments';

  constructor() {
    // Initialisation des images par défaut si nécessaire
    this.initializeDefaultImages();
  }

  /**
   * Récupère tous les appartements depuis le localStorage
   */
  getApartments(): Apartment[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Récupère un appartement par son ID
   */
  getApartmentById(id: number): Apartment | undefined {
    return this.getApartments().find(a => a.id === id);
  }

  /**
   * Récupère les appartements d'un bâtiment spécifique
   */
  getApartmentsByBuilding(buildingId: number): Apartment[] {
    if (buildingId == null) return [];
    return this.getApartments().filter(a => Number(a.buildingId) === Number(buildingId));
  }

  /**
   * Crée un nouvel appartement
   */
  createApartment(apartment: Omit<Apartment, 'id' | 'createdAt'>): Apartment {
    const apartments = this.getApartments();

    const newApartment: Apartment = {
      ...apartment,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      images: apartment.images && apartment.images.length > 0
        ? apartment.images
        : ['assets/images/rooms/default-apartment.jpg'],
      roomLabels: apartment.roomLabels || ['Salon'],
      roomDescriptions: apartment.roomDescriptions || ['Pièce principale'],
      rooms: apartment.images ? apartment.images.length : 1
    };

    apartments.push(newApartment);
    localStorage.setItem(this.storageKey, JSON.stringify(apartments));
    return newApartment;
  }

  /**
   * Ajoute une image à une pièce et met à jour labels/descriptions
   */
  addRoomImage(apartmentId: number, image: string, label: string, description?: string): void {
    const apartments = this.getApartments();
    const apt = apartments.find(a => a.id === apartmentId);
    if (!apt) return;

    apt.images = apt.images || [];
    apt.roomLabels = apt.roomLabels || [];
    apt.roomDescriptions = apt.roomDescriptions || [];

    apt.images.push(image);
    apt.roomLabels.push(label || `Pièce ${apt.images.length}`);
    apt.roomDescriptions.push(description || '');

    apt.rooms = apt.images.length;
    this.updateApartment(apt);
  }

  /**
   * Supprime une image d'une pièce
   */
  removeRoomImage(apartmentId: number, imageIndex: number): void {
    const apartments = this.getApartments();
    const apt = apartments.find(a => a.id === apartmentId);
    if (!apt || !apt.images || imageIndex < 0 || imageIndex >= apt.images.length) return;

    apt.images.splice(imageIndex, 1);
    if (apt.roomLabels && apt.roomLabels.length > imageIndex) apt.roomLabels.splice(imageIndex, 1);
    if (apt.roomDescriptions && apt.roomDescriptions.length > imageIndex) apt.roomDescriptions.splice(imageIndex, 1);

    apt.rooms = apt.images.length;
    this.updateApartment(apt);
  }

  /**
   * Met à jour un appartement existant
   */
  updateApartment(updated: Apartment): void {
    const apartments = this.getApartments().map(a => a.id === updated.id ? { ...updated } : a);
    localStorage.setItem(this.storageKey, JSON.stringify(apartments));
  }

  /**
 * Marque un appartement comme occupé par un locataire
 */
occupyApartment(apartmentId: number, tenantId: number): Apartment | undefined {
  const apartment = this.getApartmentById(apartmentId);
  if (!apartment) return undefined;

  apartment.tenantId = tenantId;
  apartment.occupied = true;
  apartment.status = 'rent'; // si tu veux le marquer comme en location
  this.updateApartment(apartment);

  return apartment;
}


  /**
   * Supprime un appartement par son ID
   */
  deleteApartment(id: number): void {
    const apartments = this.getApartments().filter(a => a.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(apartments));
  }

  /**
   * Filtre les appartements selon différents critères
   */
  filterApartments(apartments: Apartment[], filters: {
    type?: string;
    rooms?: number;
    status?: 'all' | 'occupied' | 'free' | 'sale' | 'rent' | 'construction';
    mention?: 'all' | 'high' | 'low';
  }): Apartment[] {
    return apartments.filter(a => {
      const typeMatch = !filters.type || (a.type?.toLowerCase() === filters.type.toLowerCase());
      const roomsMatch = !filters.rooms || a.rooms === filters.rooms;

      let statusMatch = true;
      switch (filters.status) {
        case 'free': statusMatch = !a.tenant || a.status === 'free'; break;
        case 'occupied': statusMatch = !!a.tenant; break;
        case 'sale': statusMatch = a.status === 'sale'; break;
        case 'rent': statusMatch = a.status === 'rent'; break;
        case 'construction': statusMatch = a.status === 'construction'; break;
      }

      const mentionValue = a.mention ? parseInt(a.mention as any, 10) : 0;
      const mentionMatch = filters.mention === 'all'
        || (filters.mention === 'high' && mentionValue > 20000)
        || (filters.mention === 'low' && mentionValue <= 20000);

      return typeMatch && roomsMatch && statusMatch && mentionMatch;
    });
  }

  /**
   * Trie les appartements par date
   */
  sortApartments(apartments: Apartment[], order: 'recent' | 'oldest'): Apartment[] {
    return apartments.slice().sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return order === 'recent' ? bTime - aTime : aTime - bTime;
    });
  }

  /**
   * Initialise les images par défaut pour tous les appartements existants
   */
  private initializeDefaultImages(): void {
    const apartments = this.getApartments();
    let modified = false;

    apartments.forEach(apt => {
      if (!apt.images || apt.images.length === 0) {
        apt.images = ['assets/images/rooms/default-apartment.jpg'];
        apt.roomLabels = ['Salon'];
        apt.roomDescriptions = ['Pièce principale'];
        apt.rooms = 1;
        modified = true;
      }
    });

    if (modified) localStorage.setItem(this.storageKey, JSON.stringify(apartments));
  }
}
