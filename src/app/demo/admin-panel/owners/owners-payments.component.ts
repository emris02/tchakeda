import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PaymentsService, PaymentRecordDto } from '../recoveries/payments.service';
import { RentalsService, Rental } from '../rentals/rentals.service';
import { TenantsService } from '../tenants/tenants.service';
import { CollectorsService } from '../collectors/collectors.service';
import { ApartmentsService } from '../apartments/apartments.service';
import { BuildingsService } from '../buildings/buildings.service';
import { OwnersService, Owner } from './owners.service';

interface EnrichedPayment extends PaymentRecordDto {
  tenantName?: string;
  collectorName?: string;
  apartmentName?: string;
  buildingId?: number;
  buildingName?: string;
  ownerId?: number;
  ownerName?: string;
}

@Component({
  selector: 'app-owners-payments',
  templateUrl: './owners-payments.component.html',
  styleUrls: ['./owners-payments.component.scss'],
  standalone: false
})
export class OwnersPaymentsComponent implements OnInit {
  payments: EnrichedPayment[] = [];
  filteredPayments: EnrichedPayment[] = [];
  owners: Owner[] = [];
  selectedOwnerId?: number;
  searchTerm = '';
  periods: string[] = [];
  selectedPeriod = '';
  ownerRentalIds: number[] = [];
  // owner summary
  totalCollected = 0;
  paymentsCount = 0;
  methodBreakdown: { method: string; amount: number; count: number }[] = [];
  periodTotals: { period: string; amount: number }[] = [];

  constructor(private router: Router,
              private paymentsService: PaymentsService,
              private rentalsService: RentalsService,
              private tenantsService: TenantsService,
              private collectorsService: CollectorsService,
              private apartmentsService: ApartmentsService,
              private buildingsService: BuildingsService,
              private ownersService: OwnersService) {}

  ngOnInit(): void {
    this.loadOwners();
    this.loadPayments();
  }

  loadOwners() {
    this.owners = this.ownersService.getOwners();
    if (this.owners.length > 0) this.selectedOwnerId = this.owners[0].id;
    // precompute rental ids for selected owner so filters work on initial load
    if (this.selectedOwnerId) this.computeOwnerRentals(this.selectedOwnerId);
  }

  loadPayments() {
    this.paymentsService.getPayments().subscribe((data: PaymentRecordDto[]|any) => {
      const raw: PaymentRecordDto[] = data || [];
      this.payments = raw.map(p => this.enrichPayment(p));
      this.periods = Array.from(new Set(this.payments.map(p => p.period)));
      this.applyFilters();
      this.computeSummary();
    });
  }

  /**
   * Compute rentals that belong to the given owner (by checking building.ownerId)
   * and store their ids for filtering payments.
   */
  computeOwnerRentals(ownerId?: number) {
    if (!ownerId) {
      this.ownerRentalIds = [];
      return;
    }
    const rentals = this.rentalsService.getRentals();
    const ids: number[] = [];
    for (const r of rentals) {
      const building = this.buildingsService.getBuildingById(Number(r.buildingId || 0));
      if (building && (building.ownerId === ownerId)) {
        ids.push(r.id);
      }
    }
    this.ownerRentalIds = ids;
  }

  enrichPayment(p: PaymentRecordDto): EnrichedPayment {
    // Try multiple strategies to resolve related entities because backend payloads may vary
    let rental: Rental | undefined;
    try { rental = this.rentalsService.getRentalById ? this.rentalsService.getRentalById(Number(p.rentalId || 0)) : undefined; } catch {}

    // tenant: prefer explicit tenantId, then rental.tenantId, then nested tenant object
    let tenantObj: any | undefined;
    try {
      if (p.tenantId) tenantObj = this.tenantsService.getTenantById(Number(p.tenantId));
    } catch {}
    if (!tenantObj && rental && (rental as any).tenantId) {
      try { tenantObj = this.tenantsService.getTenantById(Number((rental as any).tenantId)); } catch {}
    }
    if (!tenantObj && (p as any).tenant) {
      tenantObj = (p as any).tenant;
    }

    // collector
    let collectorObj: any | undefined;
    try { collectorObj = this.collectorsService.getCollectors().find((c: any) => c.id === Number(p.collectorId || (p as any).collectorId || 0)); } catch {}
    if (!collectorObj && (p as any).collector) collectorObj = (p as any).collector;

    // apartment: prefer rental.apartmentId, then p.apartmentId, then nested apartment
    let apartmentObj: any | undefined;
    try {
      const aptId = rental ? Number((rental as any).apartmentId || 0) : ((p as any).apartmentId ? Number((p as any).apartmentId) : undefined);
      if (aptId) apartmentObj = this.apartmentsService.getApartmentById(Number(aptId));
    } catch {}
    if (!apartmentObj && (p as any).apartment) apartmentObj = (p as any).apartment;

    // building: prefer rental.buildingId, then p.buildingId, then nested building
    let buildingObj: any | undefined;
    try {
      const bId = rental ? Number((rental as any).buildingId || 0) : ((p as any).buildingId ? Number((p as any).buildingId) : undefined);
      if (bId) buildingObj = this.buildingsService.getBuildingById(Number(bId));
    } catch {}
    if (!buildingObj && (p as any).building) buildingObj = (p as any).building;

    // owner id and name from building or fallback
    const ownerId = buildingObj && typeof buildingObj.ownerId === 'number' ? buildingObj.ownerId : ((p as any).ownerId ? Number((p as any).ownerId) : undefined);
    let ownerName = '';
    try {
      if (ownerId && (this.ownersService as any).getOwnerById) {
        const o = (this.ownersService as any).getOwnerById(ownerId);
        ownerName = o ? (o.name || (o as any).fullName || '') : '';
      }
    } catch {}
    // if still empty, try nested payload
    if (!ownerName && (p as any).owner) ownerName = (p as any).owner.name || (p as any).owner.fullName || '';

    return {
      ...p,
      tenantName: tenantObj ? (tenantObj.fullName || tenantObj.name || '') : (p as any).tenantName || '',
      collectorName: collectorObj ? (collectorObj.fullName || collectorObj.name || '') : (p as any).collectorName || '',
      apartmentName: apartmentObj ? (apartmentObj.name || apartmentObj.address || '') : (p as any).apartmentName || '',
      buildingId: buildingObj ? buildingObj.id : (p as any).buildingId,
      buildingName: buildingObj ? (buildingObj.name || '') : (p as any).buildingName || '',
      ownerId: ownerId,
      // add ownerName for potential display elsewhere
      ...(ownerName ? { ownerName } : {})
    };
  }

  applyFilters() {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredPayments = this.payments.filter(p => {
      // if an owner is selected, only include payments whose rental belongs to that owner
      if (this.selectedOwnerId) {
        // ensure ownerRentalIds is up to date
        if (!this.ownerRentalIds || this.ownerRentalIds.length === 0) {
          this.computeOwnerRentals(this.selectedOwnerId);
        }
        const rid = Number(p.rentalId || 0);
        if (this.ownerRentalIds.length > 0 && !this.ownerRentalIds.includes(rid)) return false;
      }
      if (this.selectedPeriod && p.period !== this.selectedPeriod) return false;
      if (!term) return true;
      return (
        (p.tenantName || '').toLowerCase().includes(term) ||
        (p.collectorName || '').toLowerCase().includes(term) ||
        (p.apartmentName || '').toLowerCase().includes(term) ||
        (p.paymentMethod || '').toLowerCase().includes(term) ||
        (p.amount || '').toString().includes(term)
      );
    });
    this.computeSummary();
  }

  computeSummary() {
    const list = this.filteredPayments || [];
    this.totalCollected = list.reduce((s, p) => s + (p.amount || 0), 0);
    this.paymentsCount = list.length;

    const methodMap = new Map<string, { amount: number; count: number }>();
    const periodMap = new Map<string, number>();
    for (const p of list) {
      const m = p.paymentMethod || 'Autre';
      const entry = methodMap.get(m) || { amount: 0, count: 0 };
      entry.amount += (p.amount || 0);
      entry.count += 1;
      methodMap.set(m, entry);

      const per = p.period || '—';
      periodMap.set(per, (periodMap.get(per) || 0) + (p.amount || 0));
    }

    this.methodBreakdown = Array.from(methodMap.entries()).map(([method, v]) => ({ method, amount: v.amount, count: v.count }));
    this.periodTotals = Array.from(periodMap.entries()).map(([period, amount]) => ({ period, amount })).sort((a, b) => (a.period > b.period ? 1 : -1));
  }
}
