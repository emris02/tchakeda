import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OwnersService, Owner } from './owners.service';
import { BuildingsService, Building } from '../buildings/buildings.service';

@Component({
  selector: 'app-owners',
  templateUrl: './owners.component.html',
  styleUrls: ['./owners.component.scss'],
  standalone: false
})
export class OwnersComponent implements OnInit {
  owners: Owner[] = [];
  buildings: Building[] = [];

  constructor(
    private ownersService: OwnersService,
    private buildingsService: BuildingsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.owners = this.ownersService.getOwners();
    this.buildings = this.buildingsService.getBuildings();
  }

  getBuildingCount(ownerId: number): number {
    return this.buildings.filter(b => b.ownerId === ownerId).length;
  }

  goToDetail(owner: Owner) {
    this.router.navigate(['demo/admin-panel/owners', owner.id]);
  }

  goToNew() {
    this.router.navigate(['demo/admin-panel/owners/new']);
  }
}
