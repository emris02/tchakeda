import { Injectable } from '@angular/core';
import { Property } from '../models/property.model';

@Injectable({ providedIn: 'root' })
export class PropertyService {
  private storageKey = 'properties';

  getAll(): Property[] {
    return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
  }

  add(property: Property): void {
    const properties = this.getAll();
    properties.push(property);
    localStorage.setItem(this.storageKey, JSON.stringify(properties));
  }

  update(property: Property): void {
    const properties = this.getAll().map(p => p.id === property.id ? property : p);
    localStorage.setItem(this.storageKey, JSON.stringify(properties));
  }

  delete(id: string): void {
    const properties = this.getAll().filter(p => p.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(properties));
  }
}
