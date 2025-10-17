// This file contains the ApartmentsService and Apartment interface definitions.
import { Injectable } from '@angular/core';

export interface Apartment {
  id: number;
  name: string;
  address: string;
  city: string;
  region: string;
  buildingId: number;
  type?: string;       // Type d’appartement (studio, F2, F3, etc.)
  rooms?: number;      // Nombre de pièces
  tenant?: string;     // Nom du locataire
  mention?: string;    // Loyer ou note
  status?: 'free' | 'sale' | 'rent' | 'construction'; // Statut de l'appartement
  customType?: string; // Type personnalisé
  images?: string[];   // ✅ Images de l’appartement
  roomLabels?: string[]; // ✅ Labels des pièces associées aux images
  roomDescriptions?: string[]; // ✅ Descriptions des pièces associées aux images
  description?: string;
  createdAt: string;   // Date de création
}

@Injectable({ providedIn: 'root' })
export class ApartmentsService {
  /** Ajoute une image à une pièce d'un appartement */
  addRoomImage(apartmentId: number, image: string, label: string): void {
    const apartments = this.getApartments();
    const apt = apartments.find(a => a.id === apartmentId);
    if (apt) {
      if (!apt.images) apt.images = [];
      if (!apt.roomLabels) apt.roomLabels = [];
      apt.images.push(image);
      apt.roomLabels.push(label);
      this.updateApartment(apt);
    }
  }

  /** Supprime une image d'une pièce d'un appartement */
  removeRoomImage(apartmentId: number, imageIndex: number): void {
    const apartments = this.getApartments();
    const apt = apartments.find(a => a.id === apartmentId);
    if (apt && apt.images && apt.images.length > imageIndex) {
      apt.images.splice(imageIndex, 1);
      if (apt.roomLabels && apt.roomLabels.length > imageIndex) {
        apt.roomLabels.splice(imageIndex, 1);
      }
      this.updateApartment(apt);
    }
  }
  private storageKey = 'apartments';

  /** Récupère la liste des appartements */
  getApartments(): Apartment[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  /** Récupère un appartement par son ID */
  getApartmentById(id: number): Apartment | undefined {
    return this.getApartments().find(a => a.id === id);
  }

  /** Crée un nouvel appartement */
  createApartment(apartment: Omit<Apartment, 'id' | 'createdAt'>): Apartment {
    const apartments = this.getApartments();
    const newApartment: Apartment = {
      ...apartment,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      images: apartment.images && apartment.images.length > 0 ? apartment.images : ['assets/images/rooms/default-apartment.jpg']
    };
    apartments.push(newApartment);
    localStorage.setItem(this.storageKey, JSON.stringify(apartments));
    return newApartment;
  }


  /** Filtre les appartements selon critères */
  filterApartments(apartments: Apartment[], filters: {
    type?: string;
    rooms?: number;
    status?: 'all' | 'occupied' | 'free' | 'sale' | 'rent' | 'construction';
    mention?: 'all' | 'high' | 'low';
  }): Apartment[] {
    return apartments.filter(a => {
      const typeMatch = !filters.type || (a.type && a.type.toLowerCase() === filters.type.toLowerCase());
      const roomsMatch = !filters.rooms || (a.rooms && a.rooms === filters.rooms);
      let statusMatch = false;
      switch (filters.status) {
        case 'all':
          statusMatch = true;
          break;
        case 'free':
          statusMatch = (!a.tenant || a.status === 'free' || !a.status);
          break;
        case 'occupied':
          statusMatch = !!a.tenant;
          break;
        case 'sale':
          statusMatch = a.status === 'sale';
          break;
        case 'rent':
          statusMatch = a.status === 'rent';
          break;
        case 'construction':
          statusMatch = a.status === 'construction';
          break;
        default:
          statusMatch = true;
      }
      let mentionValue = 0;
      if (a.mention) {
        mentionValue = typeof a.mention === 'string' ? parseInt(a.mention, 10) : a.mention;
      }
      const mentionMatch = filters.mention === 'all' || (filters.mention === 'high' && mentionValue > 20000) || (filters.mention === 'low' && mentionValue <= 20000);
      return typeMatch && roomsMatch && statusMatch && mentionMatch;
    });
  }

  /** Trie les appartements par date de création */
  sortApartments(apartments: Apartment[], order: 'recent' | 'oldest'): Apartment[] {
    return apartments.slice().sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return order === 'recent' ? bDate - aDate : aDate - bDate;
    });
  }

  /** Met à jour un appartement existant */
  updateApartment(updated: Apartment): void {
    const apartments = this.getApartments().map(a => 
      a.id === updated.id ? { ...updated } : a
    );
    localStorage.setItem(this.storageKey, JSON.stringify(apartments));
  }

  /** Supprime un appartement par son ID */
  deleteApartment(id: number): void {
    const apartments = this.getApartments().filter(a => a.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(apartments));
  }
}
