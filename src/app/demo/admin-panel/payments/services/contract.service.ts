import { Injectable } from '@angular/core';
import { Contract } from '../models/contract.model';

@Injectable({ providedIn: 'root' })
export class ContractService {
  private storageKey = 'contracts';

  getAll(): Contract[] {
    return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
  }

  add(contract: Contract): void {
    const contracts = this.getAll();
    contracts.push(contract);
    localStorage.setItem(this.storageKey, JSON.stringify(contracts));
  }

  update(contract: Contract): void {
    const contracts = this.getAll().map(c => c.id === contract.id ? contract : c);
    localStorage.setItem(this.storageKey, JSON.stringify(contracts));
  }

  delete(id: string): void {
    const contracts = this.getAll().filter(c => c.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(contracts));
  }
}
