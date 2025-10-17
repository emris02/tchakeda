import { Injectable } from '@angular/core';

export interface Owner {
  id: number;
  name: string;
  country: string;
  adress: string;
  email: string;
  phone: string;
  city: string;
  profession: string;
  registeredAt: string;
  buildingId?: number;
  profileImage?: string;
}

@Injectable({ providedIn: 'root' })
export class OwnersService {
  /**
   * Ajoute un propriétaire (alias de createOwner pour compatibilité avec les formulaires modaux)
   */
  addOwner(owner: Omit<Owner, 'id' | 'registeredAt'>): Owner {
    return this.createOwner(owner);
  }
  private storageKey = 'owners';

  getOwners(): Owner[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  getOwnerById(id: number): Owner | undefined {
    return this.getOwners().find(o => o.id === id);
  }

  createOwner(owner: Omit<Owner, 'id' | 'registeredAt'>): Owner {
    const owners = this.getOwners();
    const newOwner: Owner = {
      ...owner,
      id: Date.now(),
      registeredAt: new Date().toISOString()
    };
    owners.push(newOwner);
    localStorage.setItem(this.storageKey, JSON.stringify(owners));
    return newOwner;
  }

  updateOwner(updated: Owner): void {
    const owners = this.getOwners().map(o => o.id === updated.id ? updated : o);
    localStorage.setItem(this.storageKey, JSON.stringify(owners));
  }

  deleteOwner(id: number): void {
    const owners = this.getOwners().filter(o => o.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(owners));
  }
}
