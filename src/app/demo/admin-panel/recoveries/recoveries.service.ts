import { Injectable } from '@angular/core';

export interface Recovery {
  id: number;
  rentalId: number;
  amount: number;
  date: string;
  status: string;
  createdAt: string;
  name: string;

}

@Injectable({ providedIn: 'root' })
export class RecoveriesService {
  private storageKey = 'recoveries';

  getRecoveries(): Recovery[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  getRecoveryById(id: number): Recovery | undefined {
    return this.getRecoveries().find(r => r.id === id);
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
