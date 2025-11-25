import { Injectable } from '@angular/core';

export interface Building {
  id: number;
  name: string;
  type: string;
  customType?: string;
  floors: number;
  apartments: number;
  address: string;
  city: string;
  region: string;
  constructionDate: string;
  createdAt: string;
  ownerId?: number | null;
  image?: string;
}

@Injectable({ providedIn: 'root' })
export class BuildingsService {
  private storageKey = 'buildings';

  // Récupérer tous les bâtiments
  getBuildings(): Building[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  // Récupérer les bâtiments d'un propriétaire
  getBuildingsByOwner(ownerId: number): Building[] {
    if (ownerId === undefined || ownerId === null) return [];
    return this.getBuildings().filter(b => Number(b.ownerId) === Number(ownerId));
  }

  // Récupérer un bâtiment par son ID
  getBuildingById(id: number): Building | undefined {
    return this.getBuildings().find(b => b.id === id);
  }

  // Créer un nouveau bâtiment
  createBuilding(building: Omit<Building, 'id' | 'createdAt'>): Building {
    const buildings = this.getBuildings();
    const newBuilding: Building = {
      ...building,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      ownerId: building.ownerId ?? null
    };
    buildings.push(newBuilding);
    localStorage.setItem(this.storageKey, JSON.stringify(buildings));
    return newBuilding;
  }

  // Mettre à jour un bâtiment existant
  updateBuilding(updated: Building): void {
    const buildings = this.getBuildings().map(b => b.id === updated.id ? updated : b);
    localStorage.setItem(this.storageKey, JSON.stringify(buildings));
  }

  // Supprimer un bâtiment
  deleteBuilding(id: number): void {
    const buildings = this.getBuildings().filter(b => b.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(buildings));
  }
}
