import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BuildingsService, Building } from './buildings.service';
// Keep header navigation for building creation
import { OwnersService, Owner } from '../owners/owners.service';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-buildings',
  templateUrl: './buildings.component.html',
  styleUrls: ['./buildings.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class BuildingsComponent implements OnInit {
  buildings: Building[] = [];
  owners: Owner[] = [];

  constructor(
    private buildingsService: BuildingsService,
    private ownersService: OwnersService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.buildings = this.buildingsService.getBuildings();
    this.owners = this.ownersService.getOwners();
  }

  getOwnerName(ownerId: number | null | undefined): string {
    if (!ownerId) return '';
    const owner = this.owners.find(o => o.id === ownerId);
    return owner ? owner.name : '';
  }

  goToDetail(building: Building) {
    this.router.navigate(['demo/admin-panel/buildings', building.id]);
  }

  goToNew() {
    this.router.navigate(['demo/admin-panel/buildings/new']);
  }
}
