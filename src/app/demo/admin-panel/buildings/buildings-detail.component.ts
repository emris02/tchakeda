import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BuildingsService, Building } from './buildings.service';
import { ApartmentsService, Apartment } from '../apartments/apartments.service';
import { OwnersService, Owner } from '../owners/owners.service';
import { CollectorsService } from '../collectors/collectors.service';
import { MatDialog } from '@angular/material/dialog';
import { OwnerFormComponent } from '../owners/components/owner-form.component';

@Component({
  selector: 'app-buildings-detail',
  templateUrl: './buildings-detail.component.html',
  styleUrls: ['./buildings-detail.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class BuildingsDetailComponent implements OnInit {
  showDeleteConfirm = false;
  showLinkApartmentModal = false;
  buildingApartments: Apartment[] = [];
  availableApartments: Apartment[] = [];
  selectedApartmentId: number | null = null;
  occupiedApartmentsCount = 0;
  freeApartmentsCount = 0;
  occupancyRate = 0;
  occupancyTrend = 0;

  building: Building | undefined;
  editMode = false;
  form: any = {};
  errors: any = {};
  owners: Owner[] = [];
  isCustomType = false;
  collectorContextId: number | null = null;
  canManage: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private buildingsService: BuildingsService,
    private ownersService: OwnersService,
    private apartmentsService: ApartmentsService,
    private dialog: MatDialog,
    private collectorsService: CollectorsService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.building = this.buildingsService.getBuildingById(id);
    this.owners = this.ownersService.getOwners();
    
    // Collector context (optional) - show manage controls only if affiliated
    const q = this.route.snapshot.queryParamMap.get('collectorId');
    this.collectorContextId = q ? Number(q) : null;
    this.canManage = this.collectorContextId ? 
      this.collectorsService.isBuildingAffiliated(this.collectorContextId, id) : true;
    
    if (this.building) {
      this.form = { ...this.building };
      this.isCustomType = this.form.type === 'autre';
      this.loadBuildingApartments();
      this.loadAvailableApartments();
      this.calculateStatistics();
    }
  }

  // Charger les appartements liés à ce bâtiment
  private loadBuildingApartments(): void {
    const allApartments = this.apartmentsService.getApartments();
    this.buildingApartments = allApartments.filter((a: Apartment) => a.buildingId === this.building?.id);
  }

  // Charger les appartements disponibles pour liaison
  private loadAvailableApartments(): void {
    const allApartments = this.apartmentsService.getApartments();
    this.availableApartments = allApartments.filter((a: Apartment) => 
      !a.buildingId || a.buildingId === 0 || a.buildingId === null
    );
  }

  // Calculer les statistiques
  private calculateStatistics(): void {
    this.occupiedApartmentsCount = this.buildingApartments.filter(a => a.tenant).length;
    this.freeApartmentsCount = this.buildingApartments.filter(a => !a.tenant).length;
    this.occupancyRate = this.buildingApartments.length > 0 ? 
      Math.round((this.occupiedApartmentsCount / this.buildingApartments.length) * 100) : 0;
    
    // Simulation de tendance (à remplacer par des données réelles)
    this.occupancyTrend = this.calculateOccupancyTrend();
  }

  // Calculer la tendance d'occupation (méthode simulée)
  private calculateOccupancyTrend(): number {
    // Simulation - en réalité, il faudrait comparer avec les données historiques
    const trends = [-5, -2, 0, 2, 5, 8];
    return trends[Math.floor(Math.random() * trends.length)];
  }

  // Gestion des images du bâtiment
  onBuildingImageSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;
    
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.errors.image = 'Format d\'image non supporté';
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      this.errors.image = 'L\'image ne doit pas dépasser 2MB';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.form.image = e.target.result;
      this.errors.image = '';
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  // Suppression du bâtiment
  deleteBuilding() {
    if (!this.building || !this.building.id) return;
    
    // Vérifier s'il y a des appartements liés
    if (this.buildingApartments.length > 0) {
      const confirmMessage = `Ce bâtiment contient ${this.buildingApartments.length} appartement(s). ` +
                           `La suppression entraînera la dissociation de tous les appartements. Continuer ?`;
      if (!confirm(confirmMessage)) {
        return;
      }
      
      // Dissocier tous les appartements
      this.buildingApartments.forEach(apartment => {
        const apt = this.apartmentsService.getApartmentById(apartment.id);
        if (apt) {
          apt.buildingId = null as any;
          this.apartmentsService.updateApartment(apt);
        }
      });
    }
    
    this.buildingsService.deleteBuilding(this.building.id);
    this.router.navigate(['demo/admin-panel/buildings']);
  }

  // Navigation vers un appartement
  goToApartment(apartmentId: number) {
    this.router.navigate([`/demo/admin-panel/apartments/${apartmentId}`]);
  }

  // Navigation vers la création d'un nouvel appartement
  goToNewApartment(): void {
    if (this.building?.id) {
      this.router.navigate(['/demo/admin-panel/apartments/new'], {
        queryParams: { buildingId: this.building.id }
      });
    } else {
      this.router.navigate(['/demo/admin-panel/apartments/new']);
    }
  }

  // Liaison d'un appartement existant
  linkApartment(): void {
    if (!this.selectedApartmentId || !this.building?.id) return;
    
    const apartment = this.apartmentsService.getApartmentById(this.selectedApartmentId);
    if (!apartment) {
      alert('Appartement non trouvé');
      return;
    }
    
    // Vérifier si l'appartement n'est pas déjà lié à un autre bâtiment
    if (apartment.buildingId && apartment.buildingId !== this.building.id) {
      const confirmMessage = `Cet appartement est déjà lié au bâtiment "${this.getBuildingName(apartment.buildingId)}". ` +
                           `Voulez-vous le transférer vers ce bâtiment ?`;
      if (!confirm(confirmMessage)) {
        return;
      }
    }
    
    // Mettre à jour l'appartement
    const aptToLink = this.apartmentsService.getApartmentById(this.selectedApartmentId as number);
    if (aptToLink) {
      aptToLink.buildingId = this.building!.id;
      this.apartmentsService.updateApartment(aptToLink);
    }
    
    // Recharger les données
    this.loadBuildingApartments();
    this.loadAvailableApartments();
    this.calculateStatistics();
    
    // Fermer le modal et réinitialiser
    this.showLinkApartmentModal = false;
    this.selectedApartmentId = null;
    
    console.log(`Appartement ${apartment.name} lié au bâtiment ${this.building.name}`);
  }

  // Dissociation d'un appartement
  unlinkApartment(apartmentId: number): void {
    const apartment = this.apartmentsService.getApartmentById(apartmentId);
    if (!apartment) return;
    
    const confirmMessage = `Voulez-vous dissocier l'appartement "${apartment.name}" de ce bâtiment ?`;
    if (!confirm(confirmMessage)) return;
    
    // Mettre à jour l'appartement
    const aptToUnlink = this.apartmentsService.getApartmentById(apartmentId);
    if (aptToUnlink) {
      aptToUnlink.buildingId = null as any;
      this.apartmentsService.updateApartment(aptToUnlink);
    }
    
    // Recharger les données
    this.loadBuildingApartments();
    this.loadAvailableApartments();
    this.calculateStatistics();
    
    console.log(`Appartement ${apartment.name} dissocié du bâtiment`);
  }

  // Export de la liste des appartements
  exportApartmentsList(): void {
    if (this.buildingApartments.length === 0) {
      alert('Aucun appartement à exporter');
      return;
    }
    
    const data = {
      bâtiment: this.building?.name,
      dateExport: new Date().toLocaleDateString('fr-FR'),
      appartements: this.buildingApartments.map(apt => ({
        nom: apt.name,
        type: apt.type,
        pièces: apt.rooms,
        étage: apt.floor || 'Non défini',
        locataire: apt.tenant || 'Libre',
        loyer: apt.mention ? `${apt.mention} FCFA` : 'Non défini',
        statut: apt.tenant ? 'Occupé' : 'Libre'
      }))
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileName = `appartements-${this.building?.name}-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
    
    console.log('Liste des appartements exportée');
  }

  // Gestion du type de bâtiment
  onTypeChange(event: any) {
    this.isCustomType = this.form.type === 'autre';
    if (!this.isCustomType) {
      this.form.customType = '';
    }
  }

  // Ouverture du formulaire de propriétaire
  goToNewOwner() {
    const dialogRef = this.dialog.open(OwnerFormComponent, { 
      width: '500px', 
      data: {} 
    });
    
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        // Rafraîchir la liste des propriétaires et sélectionner le nouveau
        this.owners = this.ownersService.getOwners();
        this.form.ownerId = result.id;
      }
    });
  }

  // Activation du mode édition
  enableEdit() {
    this.editMode = true;
    this.isCustomType = this.form.type === 'autre';
  }

  // Annulation de l'édition
  cancelEdit() {
    this.editMode = false;
    this.form = { ...this.building };
    this.isCustomType = this.form.type === 'autre';
    this.errors = {};
  }

  // Validation du formulaire
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

  // Sauvegarde des modifications
  save() {
    if (!this.validate()) return;
    
    // Si type personnalisé, stocker customType
    if (this.form.type !== 'autre') {
      this.form.customType = '';
    }
    
    this.buildingsService.updateBuilding(this.form);
    this.building = { ...this.form };
    this.editMode = false;
    
    console.log('Bâtiment mis à jour:', this.building);
  }

  // Navigation retour
  back() {
    this.router.navigate(['demo/admin-panel/buildings']);
  }

  // Utilitaire pour affichage du nom du propriétaire
  getOwnerName(ownerId: number | null | undefined): string {
    if (!ownerId) return '';
    const owner = this.owners.find(o => o.id === ownerId);
    return owner ? owner.name : '';
  }

  // Utilitaire pour obtenir le nom d'un bâtiment par son ID
  private getBuildingName(buildingId: number): string {
    const building = this.buildingsService.getBuildingById(buildingId);
    return building ? building.name : 'Bâtiment inconnu';
  }

  // Accesseur pour Math (utilisé dans le template)
  get Math() {
    return Math;
  }
}