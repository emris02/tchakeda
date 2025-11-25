
import { Component } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { PaginationComponent } from 'src/app/theme/shared/components/pagination/pagination.component';
import { PaymentService } from './services/payment.service';
import { ContractService } from './services/contract.service';
import { OwnerService } from './services/owner.service';
import { CollectorService } from './services/collector.service';
import { TenantService } from './services/tenant.service';
import { PropertyService } from './services/property.service';
import { Payment } from './models/payment.model';
import { Contract } from './models/contract.model';
import { Owner } from './models/owner.model';
import { Collector } from './models/collector.model';
import { Tenant } from './models/tenant.model';
import { Property } from './models/property.model';

@Component({
  standalone: true,
  selector: 'app-payments-dashboard',
  templateUrl: './payments-dashboard.component.html',
  styleUrls: ['./payments-dashboard.component.scss'],
  imports: [CommonModule, PaginationComponent]
})
export class PaymentsDashboardComponent {
  payments: Payment[] = [];
  contracts: Contract[] = [];
  owners: Owner[] = [];
  collectors: Collector[] = [];
  tenants: Tenant[] = [];
  properties: Property[] = [];

  // pagination for payments list
  page = 1;
  pageSize = 10;
  total = 0;
  displayedPayments: Payment[] = [];

  // lookup maps for template-friendly access (no arrow funcs in templates)
  tenantsMap = new Map<string, Tenant>();
  propertiesMap = new Map<string, Property>();
  contractsMap = new Map<string, Contract>();
  collectorsMap = new Map<string, Collector>();
  ownersMap = new Map<string, Owner>();

  unpaidRentals: Contract[] = [];
  ownerPayouts: { owner: Owner; total: number }[] = [];
  collectorCommissions: { collector: Collector; total: number }[] = [];

  totalCollected = 0;
  totalUnpaid = 0;
  totalCommissions = 0;
  totalOwnerNet = 0;

  constructor(
    private paymentService: PaymentService,
    private contractService: ContractService,
    private ownerService: OwnerService,
    private collectorService: CollectorService,
    private tenantService: TenantService,
    private propertyService: PropertyService
  ) {
    this.loadData();
  }

  loadData() {
    this.payments = this.paymentService.getAll();
    this.contracts = this.contractService.getAll();
    this.owners = this.ownerService.getAll();
    this.collectors = this.collectorService.getAll();
    this.tenants = this.tenantService.getAll();
    this.properties = this.propertyService.getAll();
    // build maps
    this.tenantsMap = new Map(this.tenants.map(t => [t.id, t]));
    this.propertiesMap = new Map(this.properties.map(p => [p.id, p]));
    this.contractsMap = new Map(this.contracts.map(c => [c.id, c]));
    this.collectorsMap = new Map(this.collectors.map(c => [c.id, c]));
    this.ownersMap = new Map(this.owners.map(o => [o.id, o]));
    this.computeUnpaidRentals();
    this.computeOwnerPayouts();
    this.computeCollectorCommissions();
    this.computeSummaries();
    // pagination
    this.total = this.payments.length;
    this.updateDisplayedPayments();
  }

  updateDisplayedPayments() {
    const start = (this.page - 1) * this.pageSize;
    this.displayedPayments = this.payments.slice(start, start + this.pageSize);
  }

  onPageChange(p: number) {
    this.page = p;
    this.updateDisplayedPayments();
  }

  onPageSizeChange(s: number) {
    this.pageSize = s;
    this.page = 1;
    this.updateDisplayedPayments();
  }

  computeUnpaidRentals() {
    this.unpaidRentals = this.contracts.filter(contract => {
      const paid = this.payments.some(p => p.contractId === contract.id);
      return !paid && contract.status === 'active';
    });
    this.totalUnpaid = this.unpaidRentals.reduce((sum, c) => sum + c.monthlyRent, 0);
  }

  computeOwnerPayouts() {
    this.ownerPayouts = this.owners.map(owner => {
      const ownerPayments = this.payments.filter(p => p.ownerId === owner.id);
      const total = ownerPayments.reduce((sum, p) => sum + p.amount - p.commission, 0);
      return { owner, total };
    });
    this.totalOwnerNet = this.ownerPayouts.reduce((sum, o) => sum + o.total, 0);
  }

  computeCollectorCommissions() {
    this.collectorCommissions = this.collectors.map(collector => {
      const collectorPayments = this.payments.filter(p => p.collectorId === collector.id);
      const total = collectorPayments.reduce((sum, p) => sum + p.commission, 0);
      return { collector, total };
    });
    this.totalCommissions = this.collectorCommissions.reduce((sum, c) => sum + c.total, 0);
  }

  computeSummaries() {
    this.totalCollected = this.payments.reduce((sum, p) => sum + p.amount, 0);
  }

  extendContract(contract: Contract) {
    const newEnd = window.prompt('Nouvelle date de fin (YYYY-MM-DD)', contract.endDate);
    if (!newEnd) return;
    const newRentStr = window.prompt('Nouveau montant mensuel', contract.monthlyRent.toString());
    if (!newRentStr) return;
    const newRent = Number(newRentStr);
    if (isNaN(newRent) || newRent <= 0) { alert('Montant invalide'); return; }
    const updated: Contract = { ...contract, endDate: newEnd, monthlyRent: newRent, status: 'extended' };
    this.contractService.update(updated);
    this.loadData();
  }
}
