import { Injectable } from '@angular/core';
import { Tenant } from '../models/tenant.model';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private storageKey = 'tenants';

  getAll(): Tenant[] {
    return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
  }

  add(tenant: Tenant): void {
    const tenants = this.getAll();
    tenants.push(tenant);
    localStorage.setItem(this.storageKey, JSON.stringify(tenants));
  }

  update(tenant: Tenant): void {
    const tenants = this.getAll().map(t => t.id === tenant.id ? tenant : t);
    localStorage.setItem(this.storageKey, JSON.stringify(tenants));
  }

  delete(id: string): void {
    const tenants = this.getAll().filter(t => t.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(tenants));
  }
}
