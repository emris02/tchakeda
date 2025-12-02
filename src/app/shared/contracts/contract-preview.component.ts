import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { ContractPreviewService } from './contract-preview.service';

@Component({
  selector: 'app-contract-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contract-preview.component.html',
  styleUrls: ['./contract-preview.component.scss']
})
export class ContractPreviewComponent implements OnDestroy {
  contract: any = null;
  visible = false;
  safeUrl: SafeResourceUrl | null = null;
  sub: Subscription;

  constructor(private previewService: ContractPreviewService, private sanitizer: DomSanitizer) {
    this.sub = this.previewService.currentContract.subscribe(c => {
      this.contract = c;
      this.visible = !!c;
      if (c && c.contractFileUrl) {
        try {
          this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(c.contractFileUrl);
        } catch {
          this.safeUrl = null;
        }
      } else this.safeUrl = null;
    });
  }

  close() {
    this.previewService.close();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
