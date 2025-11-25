import { Injectable } from '@angular/core';

export interface Recovery {
  id: number;
  rentalId: number;
  collectorId?: number;
  amount: number;
  date: string;
  status: string;
  createdAt: string;
  name: string;

}

@Injectable({ providedIn: 'root' })
export class RecoveriesService {
  private storageKey = 'recoveries';

  /** Liste tous les dossiers de recouvrement */
  getRecoveries(): Recovery[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  getRecoveryById(id: number): Recovery | undefined {
    return this.getRecoveries().find(r => r.id === id);
  }

  /** Récupère le dernier recouvrement "ouvert" d'une location s'il existe */
  getOpenRecoveryByRental(rentalId: number): Recovery | undefined {
    return this.getRecoveries()
      .filter(r => Number(r.rentalId) === Number(rentalId))
      .find(r => (r.status || '').toLowerCase() === 'open' || (r.status || '').toLowerCase() === 'partial');
  }

  /** Ouvre un recouvrement sur une location */
  openRecovery(input: { rentalId: number; amount: number; name?: string; status?: string }): Recovery {
    const payload: Omit<Recovery, 'id' | 'createdAt'> = {
      rentalId: input.rentalId,
      amount: input.amount,
      date: new Date().toISOString(),
      status: input.status || 'open',
      name: input.name || `Recovery for rental #${input.rentalId}`
    };
    return this.createRecovery(payload);
  }

  createRecovery(recovery: Omit<Recovery, 'id' | 'createdAt'>): Recovery {
    const recoveries = this.getRecoveries();
    const newRecovery: Recovery = {
      ...recovery,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    recoveries.push(newRecovery);
    localStorage.setItem(this.storageKey, JSON.stringify(recoveries));
    return newRecovery;
  }

  updateRecovery(updated: Recovery): void {
    const recoveries = this.getRecoveries().map(r => r.id === updated.id ? updated : r);
    localStorage.setItem(this.storageKey, JSON.stringify(recoveries));
  }

  deleteRecovery(id: number): void {
    const recoveries = this.getRecoveries().filter(r => r.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(recoveries));
  }
}
