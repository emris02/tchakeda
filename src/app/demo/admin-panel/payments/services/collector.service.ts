import { Injectable } from '@angular/core';
import { Collector } from '../models/collector.model';

@Injectable({ providedIn: 'root' })
export class CollectorService {
  private storageKey = 'collectors';

  getAll(): Collector[] {
    return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
  }

  add(collector: Collector): void {
    const collectors = this.getAll();
    collectors.push(collector);
    localStorage.setItem(this.storageKey, JSON.stringify(collectors));
  }

  update(collector: Collector): void {
    const collectors = this.getAll().map(c => c.id === collector.id ? collector : c);
    localStorage.setItem(this.storageKey, JSON.stringify(collectors));
  }

  delete(id: string): void {
    const collectors = this.getAll().filter(c => c.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(collectors));
  }
}
