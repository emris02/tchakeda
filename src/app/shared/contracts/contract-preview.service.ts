import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ContractPreviewService {
  public currentContract = new BehaviorSubject<any | null>(null);

  open(contract: any) {
    this.currentContract.next(contract || null);
  }

  close() {
    this.currentContract.next(null);
  }
}
