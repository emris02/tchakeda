# Contracts Panel - Integration

This small guide shows how to integrate the `ContractsPanelComponent` into tenant / owner / rental pages so users can view and download stored contracts.

Usage (template):

- Add the component somewhere in your feature template (usually in a parent template or at the end of the page):

```html
<!-- place once per page (or in a shared layout) -->
<app-contracts-panel #contractsPanel></app-contracts-panel>
```

- Add a button that opens the panel for a specific entity (tenant / owner / collector / rental):

```html
<!-- Example: open contracts for a tenant -->
<button class="btn btn-sm" (click)="contractsPanel.openForTenant(tenant.id)">Voir contrats</button>

<!-- Example: open contracts for owner from owner details -->
<button class="btn btn-sm" (click)="contractsPanel.openForOwner(owner.id)">Voir contrats propriétaire</button>
```

Usage (component code):

- If you need programmatic access from the TS file, get a `ViewChild` reference:

```ts
import { Component, ViewChild } from '@angular/core';
import { ContractsPanelComponent } from 'src/app/shared/contracts/contracts-panel.component';

@Component({ /* ... */ })
export class TenantDetailComponent {
  @ViewChild('contractsPanel') contractsPanel!: ContractsPanelComponent;

  openContractsForTenant(id: number) {
    this.contractsPanel.openForTenant(id);
  }
}
```

Saving a contract (example with `ContractService`):

```ts
// inject ContractService
this.contractService.saveRentalContract({
  tenantId: tenant.id,
  ownerId: owner.id,
  assetId: apartment.id,
  rentAmount: 85000,
  leaseStart: new Date().toISOString(),
  leaseEnd: new Date(new Date().setFullYear(new Date().getFullYear()+1)).toISOString(),
  contractFileUrl: '/assets/sample-contracts/contract-123.pdf'
});
```

Notes
- The `ContractsPanelComponent` and `ContractPreviewComponent` are exported from the shared module located at `src/app/theme/shared/shared.module.ts`, so any module that imports `SharedModule` can use `<app-contracts-panel>` directly.
- Contracts are persisted in `localStorage` by `ContractService` under keys `ownerCollectorContracts` and `rentalContracts`.
