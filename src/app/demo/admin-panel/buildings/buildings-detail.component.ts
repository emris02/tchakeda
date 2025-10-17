import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BuildingsService, Building } from './buildings.service';
import { ApartmentsService } from '../apartments/apartments.service';
import { OwnersService, Owner } from '../owners/owners.service';

@Component({
  selector: 'app-buildings-detail',
  templateUrl: './buildings-detail.component.html',
  styleUrls: ['./buildings-detail.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class BuildingsDetailComponent implements OnInit {
  showDeleteConfirm = false;
  buildingApartments: any[] = [];
  occupiedApartmentsCount = 0;
  freeApartmentsCount = 0;
  occupancyRate = 0;

  onBuildingImageSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) return;
    if (file.size > 2 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.form.image = e.target.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  deleteBuilding() {
    if (!this.building || !this.building.id) return;
    this.buildingsService.deleteBuilding(this.building.id);
    this.router.navigate(['demo/admin-panel/buildings']);
  }

  goToApartment(apartmentId: number) {
    this.router.navigate([`/demo/admin-panel/apartments/${apartmentId}`]);
  }
  building: Building | undefined;
  editMode = false;
  form: any = {};
  errors: any = {};
  owners: Owner[] = [];
  isCustomType = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private buildingsService: BuildingsService,
    private ownersService: OwnersService,
    private apartmentsService: ApartmentsService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.building = this.buildingsService.getBuildingById(id);
    this.owners = this.ownersService.getOwners();
    if (this.building) {
      this.form = { ...this.building };
      this.isCustomType = this.form.type === 'autre';
  // Récupérer les appartements liés à ce bâtiment via ApartmentsService
  const allApartments = this.apartmentsService.getApartments();
  this.buildingApartments = allApartments.filter((a: any) => a.buildingId === this.building?.id);
  this.occupiedApartmentsCount = this.buildingApartments.filter(a => a.tenant).length;
  this.freeApartmentsCount = this.buildingApartments.filter(a => !a.tenant).length;
  this.occupancyRate = this.buildingApartments.length > 0 ? Math.round((this.occupiedApartmentsCount / this.buildingApartments.length) * 100) : 0;
    }
  }

  onTypeChange(event: any) {
    this.isCustomType = this.form.type === 'autre';
    if (!this.isCustomType) {
      this.form.customType = '';
    }
  }

  goToNewOwner() {
    this.router.navigate(['demo/admin-panel/owners/new']);
  }

  enableEdit() {
    this.editMode = true;
    this.isCustomType = this.form.type === 'autre';
  }

  cancelEdit() {
    this.editMode = false;
    this.form = { ...this.building };
    this.isCustomType = this.form.type === 'autre';
    this.errors = {};
  }

  validate() {
    this.errors = {};
    if (!this.form.name) this.errors.name = 'Nom requis';
    if (!this.form.type) this.errors.type = 'Type requis';
    if (this.form.type === 'autre' && !this.form.customType) this.errors.customType = 'Type personnalisé requis';
    if (!this.form.floors || this.form.floors < 1) this.errors.floors = 'Nombre d\'étages requis';
    if (!this.form.apartments || this.form.apartments < 1) this.errors.apartments = 'Nombre d\'appartements requis';
    if (!this.form.address) this.errors.address = 'Adresse requise';
    if (!this.form.city) this.errors.city = 'Ville requise';
    if (!this.form.region) this.errors.region = 'Région requise';
    if (!this.form.constructionDate) this.errors.constructionDate = 'Date de construction requise';
    if (!this.form.ownerId) this.errors.ownerId = 'Propriétaire requis';
    return Object.keys(this.errors).length === 0;
  }

  save() {
    if (!this.validate()) return;
    // Si type personnalisé, stocker customType
    if (this.form.type !== 'autre') {
      this.form.customType = '';
    }
    this.buildingsService.updateBuilding(this.form);
    this.building = { ...this.form };
    this.editMode = false;
  }

  back() {
    this.router.navigate(['demo/admin-panel/buildings']);
  }

  // Utilitaire pour affichage du nom du propriétaire
  getOwnerName(ownerId: number | null | undefined): string {
    if (!ownerId) return '';
    const owner = this.owners.find(o => o.id === ownerId);
    return owner ? owner.name : '';
  }
}
