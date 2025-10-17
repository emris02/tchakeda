import { Injectable } from '@angular/core';

export interface Tenant {
  identityImage?: string;
  identityType?: string;
  identityNumber?: string;
  id: number;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  registeredAt: string;
  profileImage?: string;
  maritalStatus?: string;
  emergencyContact?: string;
  rentalType?: string;
   mention?: string;    // Loyer ou note
  country?: string;
  address?: string;
  profession?: string;
  affiliatedPerson?: {
    fullName?: string;
    relation?: string;
    phone?: string;
    address?: string;
    email?: string;
    profession?: string;
  };
  apartments?: number[]; // IDs des appartements loués
  rental?: number[]; // IDs des locations
}

@Injectable({ providedIn: 'root' })
export class TenantsService {
  private storageKey = 'tenants';

  getTenants(): Tenant[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  getTenantById(id: number): Tenant | undefined {
    return this.getTenants().find(t => t.id === id);
  }

  createTenant(tenant: Omit<Tenant, 'id' | 'registeredAt'>): Tenant {
    const tenants = this.getTenants();
    const newTenant: Tenant = {
      ...tenant,
      id: Date.now(),
      registeredAt: new Date().toISOString()
    };
    tenants.push(newTenant);
    localStorage.setItem(this.storageKey, JSON.stringify(tenants));
    return newTenant;
  }

  updateTenant(updated: Tenant): void {
    // Accept and persist ALL changes
    const tenants = this.getTenants().map(t => {
      if (t.id === updated.id) {
        return {
          ...t,
          ...updated
        };
      }
      return t;
    });
    localStorage.setItem(this.storageKey, JSON.stringify(tenants));
  }

  deleteTenant(id: number): void {
    const tenants = this.getTenants().filter(t => t.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(tenants));
  }
}
