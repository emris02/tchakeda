import { Injectable } from '@angular/core';

export interface OwnerCollectorContract {
  id: number;
  ownerId: number;
  collectorId: number;
  assetId?: number; // building / apartment id
  commissionType: 'percent' | 'fixed';
  commissionValue: number;
  mandateStart?: string; // ISO
  mandateEnd?: string; // ISO
  ownerResponsibilities?: string;
  collectorResponsibilities?: string;
  contractFileUrl?: string;
  createdAt: string;
}

export interface RentalContract {
  id: number;
  tenantId: number;
  ownerId: number;
  collectorId?: number;
  assetId?: number; // apartment or building
  rentAmount: number;
  depositAmount?: number;
  paymentFrequency?: 'monthly' | 'quarterly' | 'yearly' | string;
  leaseStart?: string;
  leaseEnd?: string;
  tenantObligations?: string;
  ownerObligations?: string;
  clauses?: string;
  contractFileUrl?: string;
  createdAt: string;
}

const OWNER_COLLECTOR_KEY = 'ownerCollectorContracts';
const RENTAL_CONTRACTS_KEY = 'rentalContracts';

@Injectable({ providedIn: 'root' })
export class ContractService {
  constructor() {}

  // Owner-Collector
  saveOwnerCollectorContract(c: Partial<OwnerCollectorContract>) {
    const list = this.getOwnerCollectorContracts();
    const id = c.id || Date.now();
    const contract: OwnerCollectorContract = {
      id,
      ownerId: c.ownerId as number,
      collectorId: c.collectorId as number,
      assetId: c.assetId,
      commissionType: c.commissionType || 'percent',
      commissionValue: c.commissionValue || 0,
      mandateStart: c.mandateStart,
      mandateEnd: c.mandateEnd,
      ownerResponsibilities: c.ownerResponsibilities || '',
      collectorResponsibilities: c.collectorResponsibilities || '',
      contractFileUrl: c.contractFileUrl,
      createdAt: new Date().toISOString()
    };

    const idx = list.findIndex(x => x.id === id);
    if (idx >= 0) list[idx] = contract;
    else list.unshift(contract);
    localStorage.setItem(OWNER_COLLECTOR_KEY, JSON.stringify(list));
    return contract;
  }

  getOwnerCollectorContracts(): OwnerCollectorContract[] {
    try {
      const raw = localStorage.getItem(OWNER_COLLECTOR_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  // Rental
  saveRentalContract(c: Partial<RentalContract>) {
    const list = this.getRentalContracts();
    const id = c.id || Date.now();
    const contract: RentalContract = {
      id,
      tenantId: c.tenantId as number,
      ownerId: c.ownerId as number,
      collectorId: c.collectorId,
      assetId: c.assetId,
      rentAmount: c.rentAmount || 0,
      depositAmount: c.depositAmount,
      paymentFrequency: c.paymentFrequency,
      leaseStart: c.leaseStart,
      leaseEnd: c.leaseEnd,
      tenantObligations: c.tenantObligations || '',
      ownerObligations: c.ownerObligations || '',
      clauses: c.clauses || '',
      contractFileUrl: c.contractFileUrl,
      createdAt: new Date().toISOString()
    };
    const idx = list.findIndex(x => x.id === id);
    if (idx >= 0) list[idx] = contract;
    else list.unshift(contract);
    localStorage.setItem(RENTAL_CONTRACTS_KEY, JSON.stringify(list));
    return contract;
  }

  getRentalContracts(): RentalContract[] {
    try {
      const raw = localStorage.getItem(RENTAL_CONTRACTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  // Queries
  getContractsForTenant(tenantId: number) {
    return this.getRentalContracts().filter(c => Number(c.tenantId) === Number(tenantId));
  }

  getContractsForOwner(ownerId: number) {
    const rentals = this.getRentalContracts().filter(c => Number(c.ownerId) === Number(ownerId));
    const oc = this.getOwnerCollectorContracts().filter(c => Number(c.ownerId) === Number(ownerId));
    return { rentalContracts: rentals, ownerCollectorContracts: oc };
  }

  getContractsForCollector(collectorId: number) {
    const rentals = this.getRentalContracts().filter(c => Number(c.collectorId) === Number(collectorId));
    const oc = this.getOwnerCollectorContracts().filter(c => Number(c.collectorId) === Number(collectorId));
    return { rentalContracts: rentals, ownerCollectorContracts: oc };
  }

  // helpers
  deleteOwnerCollectorContract(id: number) {
    const list = this.getOwnerCollectorContracts().filter(x => x.id !== id);
    localStorage.setItem(OWNER_COLLECTOR_KEY, JSON.stringify(list));
  }

  deleteRentalContract(id: number) {
    const list = this.getRentalContracts().filter(x => x.id !== id);
    localStorage.setItem(RENTAL_CONTRACTS_KEY, JSON.stringify(list));
  }
}
