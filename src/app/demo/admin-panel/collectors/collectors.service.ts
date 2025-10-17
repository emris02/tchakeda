export interface Collector {
  id: number;
  fullName: string;
  phone: string;
  email: string;
  country?: string;
  address?: string;
  houseCount?: number;
  // Optional profile image (base64 or asset path)
  identityImage?: string;
  // Identity fields
  identityType?: string;
  identityNumber?: string;
  // Optional affiliated person/contact
  affiliatedPerson?: {
    fullName?: string;
    relation?: string;
    phone?: string;
    address?: string;
    email?: string;
  };
}

import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CollectorsService {
  private storageKey = 'collectors';

  getCollectors(): Collector[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  createCollector(collector: Omit<Collector, 'id'>): Collector {
    const collectors = this.getCollectors();
    const newCollector: Collector = {
      ...collector,
      id: Date.now(),
      country: collector.country || '',
      address: collector.address || '',
      houseCount: collector.houseCount || 0
    };
    collectors.push(newCollector);
    localStorage.setItem(this.storageKey, JSON.stringify(collectors));
    return newCollector;
  }

  updateCollector(updated: Collector): void {
    const collectors = this.getCollectors().map(c => c.id === updated.id ? updated : c);
    localStorage.setItem(this.storageKey, JSON.stringify(collectors));
  }

  deleteCollector(id: number): void {
    const collectors = this.getCollectors().filter(c => c.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(collectors));
  }
}
