import { Injectable } from '@angular/core';
import { Owner } from '../models/owner.model';

@Injectable({ providedIn: 'root' })
export class OwnerService {
  private storageKey = 'owners';

  getAll(): Owner[] {
    return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
  }

  add(owner: Owner): void {
    const owners = this.getAll();
    owners.push(owner);
    localStorage.setItem(this.storageKey, JSON.stringify(owners));
  }

  update(owner: Owner): void {
    const owners = this.getAll().map(o => o.id === owner.id ? owner : o);
    localStorage.setItem(this.storageKey, JSON.stringify(owners));
  }

  delete(id: string): void {
    const owners = this.getAll().filter(o => o.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(owners));
  }
}
