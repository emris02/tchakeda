import { Injectable } from '@angular/core';

export interface TenantDocument {
  id: number;
  type: string; // Type de document (identity, rent_receipt, electricity_bill, tax_notice, pay_slip, employment_certificate, contract, edl, quittance, etc.)
  name: string; // Nom du document
  fileUrl: string; // URL du fichier (base64 ou chemin)
  fileName: string; // Nom du fichier original
  fileSize: number; // Taille du fichier en bytes
  uploadedAt: string; // Date de téléchargement
  status?: 'pending' | 'approved' | 'rejected'; // Statut du document
  notes?: string; // Notes additionnelles
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
  documents?: TenantDocument[]; // Documents complémentaires
}

@Injectable({ providedIn: 'root' })
export class TenantsService {
  private storageKey = 'tenants';

  /** Ajoute un appartement à la liste d'appartements du locataire (évite les doublons) */
  addApartmentToTenant(tenantId: number, apartmentId: number): void {
    const tenants = this.getTenants();
    const idx = tenants.findIndex(t => t.id === tenantId);
    if (idx === -1) return;
    const tenant = { ...tenants[idx] };
    if (!tenant.apartments) tenant.apartments = [];
    if (!tenant.apartments.includes(apartmentId)) tenant.apartments.push(apartmentId);
    tenants[idx] = tenant;
    localStorage.setItem(this.storageKey, JSON.stringify(tenants));
  }

  /** Retire un appartement de la liste du locataire (quand la location prend fin) */
  removeApartmentFromTenant(tenantId: number, apartmentId: number): void {
    const tenants = this.getTenants();
    const idx = tenants.findIndex(t => t.id === tenantId);
    if (idx === -1) return;
    const tenant = { ...tenants[idx] };
    if (tenant.apartments && tenant.apartments.length) {
      tenant.apartments = tenant.apartments.filter(a => a !== apartmentId);
    }
    tenants[idx] = tenant;
    localStorage.setItem(this.storageKey, JSON.stringify(tenants));
  }

  /** Ajoute l'id d'une location à l'historique du locataire */
  addRentalToTenant(tenantId: number, rentalId: number): void {
    const tenants = this.getTenants();
    const idx = tenants.findIndex(t => t.id === tenantId);
    if (idx === -1) return;
    const tenant = { ...tenants[idx] };
    if (!tenant.rental) tenant.rental = [];
    if (!tenant.rental.includes(rentalId)) tenant.rental.push(rentalId);
    tenants[idx] = tenant;
    localStorage.setItem(this.storageKey, JSON.stringify(tenants));
  }

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

  // ==================== Gestion des documents ====================

  /**
   * Ajoute un document à un locataire
   */
  addDocumentToTenant(tenantId: number, document: Omit<TenantDocument, 'id' | 'uploadedAt'>): TenantDocument {
    const tenants = this.getTenants();
    const idx = tenants.findIndex(t => t.id === tenantId);
    if (idx === -1) {
      throw new Error('Locataire non trouvé');
    }

    const tenant = { ...tenants[idx] };
    if (!tenant.documents) {
      tenant.documents = [];
    }

    const newDocument: TenantDocument = {
      ...document,
      id: Date.now(),
      uploadedAt: new Date().toISOString()
    };

    tenant.documents.push(newDocument);
    tenants[idx] = tenant;
    localStorage.setItem(this.storageKey, JSON.stringify(tenants));
    return newDocument;
  }

  /**
   * Supprime un document d'un locataire
   */
  removeDocumentFromTenant(tenantId: number, documentId: number): void {
    const tenants = this.getTenants();
    const idx = tenants.findIndex(t => t.id === tenantId);
    if (idx === -1) return;

    const tenant = { ...tenants[idx] };
    if (tenant.documents) {
      tenant.documents = tenant.documents.filter(d => d.id !== documentId);
      tenants[idx] = tenant;
      localStorage.setItem(this.storageKey, JSON.stringify(tenants));
    }
  }

  /**
   * Met à jour un document d'un locataire
   */
  updateTenantDocument(tenantId: number, documentId: number, updates: Partial<TenantDocument>): void {
    const tenants = this.getTenants();
    const idx = tenants.findIndex(t => t.id === tenantId);
    if (idx === -1) return;

    const tenant = { ...tenants[idx] };
    if (tenant.documents) {
      const docIdx = tenant.documents.findIndex(d => d.id === documentId);
      if (docIdx !== -1) {
        tenant.documents[docIdx] = { ...tenant.documents[docIdx], ...updates };
        tenants[idx] = tenant;
        localStorage.setItem(this.storageKey, JSON.stringify(tenants));
      }
    }
  }

  /**
   * Récupère les documents d'un locataire
   */
  getTenantDocuments(tenantId: number): TenantDocument[] {
    const tenant = this.getTenantById(tenantId);
    return tenant?.documents || [];
  }

  /**
   * Vérifie si un type de document existe pour un locataire
   */
  hasDocumentType(tenantId: number, documentType: string): boolean {
    const documents = this.getTenantDocuments(tenantId);
    return documents.some(d => d.type === documentType);
  }
}
