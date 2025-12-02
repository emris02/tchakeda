import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContractService, RentalContract, OwnerCollectorContract } from 'src/app/demo/admin-panel/contracts/contract.service';

@Component({
  selector: 'app-contracts-panel',
  templateUrl: './contracts-panel.component.html',
  styleUrls: ['./contracts-panel.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class ContractsPanelComponent {
  @Input() tenantId?: number;
  @Input() ownerId?: number;
  @Input() collectorId?: number;
  @Input() rentalId?: number;

  visibleContracts: { rental: RentalContract[]; ownerCollector: OwnerCollectorContract[] } = { rental: [], ownerCollector: [] };
  showPanel = false;
  previewUrl: string | null = null;

  constructor(private contractService: ContractService) {}

  openForTenant(id?: number) {
    if (!id && !this.tenantId) return;
    const tid = id || this.tenantId!;
    this.visibleContracts.rental = this.contractService.getContractsForTenant(tid);
    this.visibleContracts.ownerCollector = [];
    this.showPanel = true;
  }

  openForOwner(id?: number) {
    const oid = id || this.ownerId;
    if (!oid) return;
    const data = this.contractService.getContractsForOwner(Number(oid));
    this.visibleContracts = { rental: data.rentalContracts, ownerCollector: data.ownerCollectorContracts };
    this.showPanel = true;
  }

  openForCollector(id?: number) {
    const cid = id || this.collectorId;
    if (!cid) return;
    const data = this.contractService.getContractsForCollector(Number(cid));
    this.visibleContracts = { rental: data.rentalContracts, ownerCollector: data.ownerCollectorContracts };
    this.showPanel = true;
  }

  openForRental(rentalId?: number) {
    const rid = rentalId || this.rentalId;
    if (!rid) return;
    // find rental contracts that reference this rental by assetId
    const rentals = this.contractService.getRentalContracts().filter(c => Number(c.assetId) === Number(rid));
    const ocs = this.contractService.getOwnerCollectorContracts().filter(c => Number(c.assetId) === Number(rid));
    this.visibleContracts = { rental: rentals, ownerCollector: ocs };
    this.showPanel = true;
  }

  closePanel() {
    this.showPanel = false;
    this.previewUrl = null;
  }

  openPreview(url?: string) {
    if (!url) return;
    this.previewUrl = url;
  }
}
