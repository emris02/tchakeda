import { Injectable } from '@angular/core';

export interface TenantDocument {
  id: number;
  type: string;
  name: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  status?: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

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
  mention?: string;
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
  documents?: TenantDocument[];
}

@Injectable({ providedIn: 'root' })
export class TenantsService {
  private storageKey = 'tenants';

  // ==================== Gestion des locataires ====================

  getTenants(): Tenant[] {
    const data = localStorage.getItem(this.storageKey);
    try {
      return data ? JSON.parse(data) : [];
    } catch {
      localStorage.removeItem(this.storageKey);
      return [];
    }
  }

  getTenantById(id: number): Tenant | undefined {
    return this.getTenants().find(t => t.id === id);
  }

  createTenant(tenant: Omit<Tenant, 'id' | 'registeredAt'>): Tenant {
    const tenants = this.getTenants();
    const newTenant: Tenant = {
      ...tenant,
      id: Date.now(),
      registeredAt: new Date().toISOString(),
      apartments: [],
      rental: [],
      documents: []
    };
    tenants.push(newTenant);
    localStorage.setItem(this.storageKey, JSON.stringify(tenants));
    return newTenant;
  }

  updateTenant(updated: Tenant): void {
    const tenants = this.getTenants().map(t => t.id === updated.id ? { ...t, ...updated } : t);
    localStorage.setItem(this.storageKey, JSON.stringify(tenants));
  }

  deleteTenant(id: number): void {
    const tenants = this.getTenants().filter(t => t.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(tenants));
  }

  // ==================== Gestion des appartements ====================

  addApartmentToTenant(tenantId: number, apartmentId: number): void {
    const tenant = this.getTenantById(tenantId);
    if (!tenant) return;
    tenant.apartments = tenant.apartments || [];
    if (!tenant.apartments.includes(apartmentId)) tenant.apartments.push(apartmentId);
    this.updateTenant(tenant);
  }

  removeApartmentFromTenant(tenantId: number, apartmentId: number): void {
    const tenant = this.getTenantById(tenantId);
    if (!tenant || !tenant.apartments) return;
    tenant.apartments = tenant.apartments.filter(a => a !== apartmentId);
    this.updateTenant(tenant);
  }

  // ==================== Gestion des locations ====================

  addRentalToTenant(tenantId: number, rentalId: number): void {
    const tenant = this.getTenantById(tenantId);
    if (!tenant) return;
    tenant.rental = tenant.rental || [];
    if (!tenant.rental.includes(rentalId)) tenant.rental.push(rentalId);
    this.updateTenant(tenant);
  }

  removeRentalFromTenant(tenantId: number, rentalId: number): void {
    const tenant = this.getTenantById(tenantId);
    if (!tenant || !tenant.rental) return;
    tenant.rental = tenant.rental.filter(r => r !== rentalId);
    this.updateTenant(tenant);
  }

  hasActiveRental(tenantId: number, rentals: number[], rentalsService?: any): boolean {
    // Vérifie si le locataire a une location active
    if (!rentalsService) return false;
    return (tenantId ? this.getTenantById(tenantId)?.rental || [] : [])
      .some(rId => {
        const r = rentalsService.getRentalById(rId);
        return r && r.status === 'active';
      });
  }

  // ==================== Gestion des documents ====================

  addDocumentToTenant(tenantId: number, document: Omit<TenantDocument, 'id' | 'uploadedAt'>): TenantDocument {
    const tenant = this.getTenantById(tenantId);
    if (!tenant) throw new Error('Locataire non trouvé');
    tenant.documents = tenant.documents || [];
    const newDoc: TenantDocument = { ...document, id: Date.now(), uploadedAt: new Date().toISOString() };
    tenant.documents.push(newDoc);
    this.updateTenant(tenant);
    return newDoc;
  }

  removeDocumentFromTenant(tenantId: number, documentId: number): void {
    const tenant = this.getTenantById(tenantId);
    if (!tenant || !tenant.documents) return;
    tenant.documents = tenant.documents.filter(d => d.id !== documentId);
    this.updateTenant(tenant);
  }

  updateTenantDocument(tenantId: number, documentId: number, updates: Partial<TenantDocument>): void {
    const tenant = this.getTenantById(tenantId);
    if (!tenant || !tenant.documents) return;
    const idx = tenant.documents.findIndex(d => d.id === documentId);
    if (idx !== -1) {
      tenant.documents[idx] = { ...tenant.documents[idx], ...updates };
      this.updateTenant(tenant);
    }
  }

  getTenantDocuments(tenantId: number): TenantDocument[] {
    return this.getTenantById(tenantId)?.documents || [];
  }

  hasDocumentType(tenantId: number, type: string): boolean {
    return this.getTenantDocuments(tenantId).some(d => d.type === type);
  }
}
