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
  private affiliationKey = 'collector_affiliations';

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

  // ----------------------- Affiliation helpers -----------------------
  /**
   * Affiliations are stored as a map: { [collectorId]: { buildings: number[], apartments: number[] } }
   */
  private readAffiliations(): Record<number, { buildings: number[]; apartments: number[] }> {
    const raw = localStorage.getItem(this.affiliationKey);
    try {
      return raw ? JSON.parse(raw) : {};
    } catch {
      localStorage.removeItem(this.affiliationKey);
      return {};
    }
  }

  private writeAffiliations(map: Record<number, { buildings: number[]; apartments: number[] }>) {
    localStorage.setItem(this.affiliationKey, JSON.stringify(map));
  }

  getAffiliations(collectorId: number): { buildings: number[]; apartments: number[] } {
    const map = this.readAffiliations();
    const key = Number(collectorId);
    return map[key] ? { buildings: map[key].buildings.slice(), apartments: map[key].apartments.slice() } : { buildings: [], apartments: [] };
  }

  setAffiliations(collectorId: number, affiliations: { buildings?: number[]; apartments?: number[] }) {
    const map = this.readAffiliations();
    const key = Number(collectorId);
    map[key] = {
      buildings: affiliations.buildings ? Array.from(new Set(affiliations.buildings.map(Number))) : (map[key]?.buildings || []),
      apartments: affiliations.apartments ? Array.from(new Set(affiliations.apartments.map(Number))) : (map[key]?.apartments || [])
    };
    this.writeAffiliations(map);
  }

  addBuildingToCollector(collectorId: number, buildingId: number) {
    const map = this.readAffiliations();
    const key = Number(collectorId);
    if (!map[key]) map[key] = { buildings: [], apartments: [] };
    if (!map[key].buildings.includes(Number(buildingId))) map[key].buildings.push(Number(buildingId));
    this.writeAffiliations(map);
  }

  removeBuildingFromCollector(collectorId: number, buildingId: number) {
    const map = this.readAffiliations();
    const key = Number(collectorId);
    if (!map[key]) return;
    map[key].buildings = map[key].buildings.filter((b: number) => Number(b) !== Number(buildingId));
    this.writeAffiliations(map);
  }

  addApartmentToCollector(collectorId: number, apartmentId: number) {
    const map = this.readAffiliations();
    const key = Number(collectorId);
    if (!map[key]) map[key] = { buildings: [], apartments: [] };
    if (!map[key].apartments.includes(Number(apartmentId))) map[key].apartments.push(Number(apartmentId));
    this.writeAffiliations(map);
  }

  removeApartmentFromCollector(collectorId: number, apartmentId: number) {
    const map = this.readAffiliations();
    const key = Number(collectorId);
    if (!map[key]) return;
    map[key].apartments = map[key].apartments.filter((a: number) => Number(a) !== Number(apartmentId));
    this.writeAffiliations(map);
  }

  isBuildingAffiliated(collectorId: number, buildingId: number): boolean {
    const aff = this.getAffiliations(collectorId);
    return aff.buildings.includes(Number(buildingId));
  }

  isApartmentAffiliated(collectorId: number, apartmentId: number): boolean {
    const aff = this.getAffiliations(collectorId);
    return aff.apartments.includes(Number(apartmentId));
  }

  /**
   * Trouve le collecteur affilié à un bâtiment (retourne son id ou undefined).
   */
  findCollectorByBuilding(buildingId: number): number | undefined {
    const collectors = this.getCollectors();
    for (const c of collectors) {
      if (this.isBuildingAffiliated(c.id, Number(buildingId))) return c.id;
    }
    return undefined;
  }

  /**
   * Trouve le collecteur affilié à un appartement (retourne son id ou undefined).
   */
  findCollectorByApartment(apartmentId: number): number | undefined {
    const collectors = this.getCollectors();
    for (const c of collectors) {
      if (this.isApartmentAffiliated(c.id, Number(apartmentId))) return c.id;
    }
    return undefined;
  }
}
