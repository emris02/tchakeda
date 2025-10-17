
import { Component } from '@angular/core';
import { Router } from '@angular/router';
// Import corrigé pour éviter les erreurs de module introuvable
import { CollectorsService, Collector } from './collectors.service'; // force refresh

import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-collectors',
  templateUrl: './collectors.component.html',
  styleUrls: ['./collectors.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class CollectorsComponent {
  collectors: Collector[] = [];

  constructor(private collectorsService: CollectorsService, private router: Router) {
    this.collectors = this.collectorsService.getCollectors();
  }


  goToNewCollector() {
    this.router.navigate(['demo/admin-panel/collectors/new']);
  }

  editCollector(collector: Collector) {
    // Redirige vers la page de détail pour édition inline
    this.router.navigate(['demo/admin-panel/collectors', collector.id]);
  }

  deleteCollector(collector: Collector) {
    if (confirm('Supprimer ce recouvreur ?')) {
      this.collectorsService.deleteCollector(collector.id);
      this.collectors = this.collectorsService.getCollectors();
    }
  }
}

