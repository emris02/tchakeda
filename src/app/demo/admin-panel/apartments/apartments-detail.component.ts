import { Component, OnInit, ViewChild, ElementRef, Inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BuildingFormComponent } from '../buildings/components/building-form.component';
import { TenantFormComponent } from '../tenants/components/tenant-form.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ApartmentsService, Apartment } from './apartments.service';
import { BuildingsService } from '../buildings/buildings.service';
import { TenantsService } from '../../admin-panel/tenants/tenants.service';
import { RoomImagesService } from './room-images.service';

interface RoomForm {
  label: string;
  description: string;
  image: string;
  isNew?: boolean;
}

@Component({
  selector: 'app-apartments-detail',
  templateUrl: './apartments-detail.component.html',
  styleUrls: ['./apartments-detail.component.scss'],
  standalone: false
})
export class ApartmentsDetailComponent implements OnInit {
  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;

  // État pour la gestion des pièces
  apartment: Apartment | undefined;
  editMode = false;
  showDeleteConfirm = false;
  
  // Données du formulaire
  form: any = {
    images: [],
    roomLabels: [],
    roomDescriptions: [],
    roomAreas: [],
    area: 0
  };
  
  errors: any = {};
  buildings: any[] = [];
  tenants: any[] = [];
  apartmentTypes: string[] = ['résidentiel', 'commercial', 'appartement', 'hôtel', 'villa',   'mixte'];  
  isCustomType = false;
  
  // État pour l'ajout de nouvelles pièces
  newRoomLabel: string = '';
  newRoomImage: string = '';
  newRoomDescription: string = '';
  tempRoomLabel: string = '';
  showRoomLabelError: boolean = false;
  labelValidated: boolean = false;
  
  // Gestion de l'édition inline des pièces
  editPieceIndexMap: { [index: number]: boolean } = {};
  pieceEditBackup: { [index: number]: { label: string; desc: string; img: string; area?: number } } = {};
  // Hover state pour l'overlay (utilisé dans le template)
  isHovered: boolean[] = [];
  
  // Données de location
  currentRental: any = null;
  rentalHistory: any[] = [];
  mentionOptions = [0, 10000, 20000, 30000, 40000, 50000];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apartmentsService: ApartmentsService,
    private buildingsService: BuildingsService,
    @Inject(TenantsService) private tenantsService: TenantsService,
    private roomImagesService: RoomImagesService,
    private dialog: MatDialog
  ) {
    this.buildings = this.buildingsService.getBuildings();
    this.tenants = this.tenantsService.getTenants ? this.tenantsService.getTenants() : [];
    // Charger les types d'appartement depuis localStorage si présent
    try {
      const saved = localStorage.getItem('apartmentTypes');
      if (saved) {
        this.apartmentTypes = JSON.parse(saved);
      } else {
        localStorage.setItem('apartmentTypes', JSON.stringify(this.apartmentTypes));
      }
    } catch (e) {
      // ignore localStorage errors
    }
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadApartmentData(id);
    this.loadRentalData();
  }

  /**
   * Charge les données de l'appartement
   */
  private loadApartmentData(id: number): void {
    this.apartment = this.apartmentsService.getApartmentById(id);
    
    if (this.apartment) {
      this.form = { ...this.apartment };
      
      // Initialise les tableaux s'ils n'existent pas
      if (!this.form.images) this.form.images = [];
      if (!this.form.roomLabels) this.form.roomLabels = [];
      if (!this.form.roomDescriptions) this.form.roomDescriptions = [];
      if (!this.form.roomAreas) this.form.roomAreas = [];
      if (!this.form.area) this.form.area = 0;
      
      // Synchronise les tableaux
      this.synchronizeRoomArrays();
      
      // Gère le mapping du locataire
      this.synchronizeTenantData();

      // Gestion des types personnalisés : si le type enregistré n'est pas dans la liste,
      // on le traite comme un customType pour permettre l'édition.
      if (this.form.type) {
        if (this.form.type === 'autre') {
          this.isCustomType = true;
        } else if (!this.apartmentTypes.includes(this.form.type)) {
          // Le type est personnalisé (ex: 'F2'), on le place dans customType pour l'édition
          this.isCustomType = true;
          this.form.customType = this.form.type;
        } else {
          this.isCustomType = false;
        }
      }
    }
  }

  /**
   * Charge les données de location
   */
  private loadRentalData(): void {
    // Implémentez la logique pour charger les données de location actuelles et historiques
    // Cette méthode est un placeholder - à adapter selon votre implémentation
    this.currentRental = null; // À implémenter
    this.rentalHistory = [];   // À implémenter
  }

  /**
   * Synchronise les tableaux d'images, labels et descriptions
   */
  private synchronizeRoomArrays(): void {
    const maxLength = Math.max(
      this.form.images.length,
      this.form.roomLabels.length,
      this.form.roomDescriptions.length,
      this.form.roomAreas ? this.form.roomAreas.length : 0
    );

    // Assure que tous les tableaux ont la même longueur
    while (this.form.images.length < maxLength) {
      this.form.images.push(this.roomImagesService.getDefaultRoomImage());
    }
    while (this.form.roomLabels.length < maxLength) {
      this.form.roomLabels.push('');
    }
    while (this.form.roomDescriptions.length < maxLength) {
      this.form.roomDescriptions.push('');
    }
    if (!this.form.roomAreas) this.form.roomAreas = [];
    while (this.form.roomAreas.length < maxLength) {
      this.form.roomAreas.push(0);
    }
    // Synchronise aussi l'état de survol pour le template
    while (this.isHovered.length < maxLength) {
      this.isHovered.push(false);
    }
    while (this.isHovered.length > maxLength) {
      this.isHovered.pop();
    }
    // Si le nombre d'images dépasse la valeur rooms actuelle, mets à jour rooms
    if (!this.form.rooms || this.form.images.length > this.form.rooms) {
      this.form.rooms = this.form.images.length;
    }
  }

  /**
   * Retourne un tableau d'indices correspondant au nombre de pièces à afficher
   * (au moins la valeur de form.rooms, ou la longueur des images si plus grande)
   */
  getRoomIndices(): number[] {
    const imagesLen = this.form.images ? this.form.images.length : 0;
    const roomsVal = this.form.rooms ? Number(this.form.rooms) : 0;
    const n = Math.max(imagesLen, roomsVal);
    return Array.from({ length: n }, (_, i) => i);
  }

  /**
   * Appelé lorsque l'utilisateur modifie le champ "rooms" dans le formulaire.
   * Ajuste la taille des tableaux d'images/labels/descriptions en conséquence.
   */
  onRoomsCountChange(value: any): void {
    let desired = Number(value);
    if (isNaN(desired) || desired < 0) desired = 0;
    this.form.rooms = desired;

    // agrandir ou réduire les tableaux pour correspondre au nouveau nombre
    if (!this.form.roomAreas) this.form.roomAreas = [];
    while (this.form.images.length < desired) {
      this.form.images.push(this.roomImagesService.getDefaultRoomImage());
      this.form.roomLabels.push('');
      this.form.roomDescriptions.push('');
      this.form.roomAreas.push(0);
      this.isHovered.push(false);
    }
    while (this.form.roomLabels.length < desired) {
      this.form.roomLabels.push('');
    }
    while (this.form.roomDescriptions.length < desired) {
      this.form.roomDescriptions.push('');
    }
    while (this.form.roomAreas.length < desired) {
      this.form.roomAreas.push(0);
    }

    // Si on réduit, tronquer les tableaux
    if (this.form.images.length > desired) {
      this.form.images.splice(desired);
    }
    if (this.form.roomLabels.length > desired) {
      this.form.roomLabels.splice(desired);
    }
    if (this.form.roomDescriptions.length > desired) {
      this.form.roomDescriptions.splice(desired);
    }
    if (this.form.roomAreas.length > desired) {
      this.form.roomAreas.splice(desired);
    }
    if (this.isHovered.length > desired) {
      this.isHovered.splice(desired);
    }

    // nettoyer backups/edit map hors bornes
    Object.keys(this.pieceEditBackup).forEach(k => {
      const idx = Number(k);
      if (idx >= desired) delete this.pieceEditBackup[idx];
    });
    Object.keys(this.editPieceIndexMap).forEach(k => {
      const idx = Number(k);
      if (idx >= desired) delete this.editPieceIndexMap[idx];
    });
  }

  /**
   * Synchronise les données du locataire
   */
  private synchronizeTenantData(): void {
    if (!this.form.tenantId && this.form.tenant) {
      const found = this.tenants.find(t => t.fullName === this.form.tenant);
      if (found) this.form.tenantId = found.id;
    }
  }

  // =========================================================================
  // GESTION DES PIÈCES - MÉTHODES AMÉLIORÉES
  // =========================================================================

  /**
   * Déclenche la sélection d'image pour une nouvelle pièce
   */
  triggerImageInput(): void {
    if (this.imageInput) {
      this.imageInput.nativeElement.click();
    }
  }

  /**
   * Gère la sélection d'image pour une nouvelle pièce
   */
  onImageSelected(event: any): void {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (!validTypes.includes(file.type)) {
      this.errors.roomImages = 'Type de fichier non supporté. Utilisez JPEG, PNG ou WebP.';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.errors.roomImages = 'L\'image ne doit pas dépasser 2MB.';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.newRoomImage = e.target.result;
      this.errors.roomImages = '';
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  /**
   * Passe à l'étape suivante lors de l'ajout d'une pièce
   */
  nextStep(): void {
    if (this.newRoomLabel && this.newRoomLabel.trim() !== '') {
      this.labelValidated = true;
      this.showRoomLabelError = false;
    } else {
      this.showRoomLabelError = true;
    }
  }

  /**
   * Confirme l'ajout d'une nouvelle pièce
   */
  confirmAddRoom(): void {
    if (!this.newRoomLabel || this.newRoomLabel.trim() === '' || !this.newRoomImage) {
      this.showRoomLabelError = true;
      return;
    }

    // Ajoute la nouvelle pièce
    if (!this.form.roomAreas) this.form.roomAreas = [];
    this.form.images.push(this.newRoomImage);
    this.form.roomLabels.push(this.newRoomLabel.trim());
    this.form.roomDescriptions.push(this.newRoomDescription || '');
    this.form.roomAreas.push(0);
  // Maintient l'état de survol en phase
  this.isHovered.push(false);
  // Met à jour automatiquement le nombre de pièces dans le formulaire
  this.form.rooms = this.form.images.length;

    // Sauvegarde si l'appartement existe
    if (this.apartment?.id) {
      this.apartmentsService.addRoomImage(
        this.apartment.id, 
        this.newRoomImage, 
        this.newRoomLabel.trim()
      );
    }

    // Réinitialise les champs temporaires
    this.resetNewRoomFields();
  }

  /**
   * Annule l'ajout d'une nouvelle pièce
   */
  cancelAddRoom(): void {
    this.resetNewRoomFields();
  }

  /**
   * Réinitialise les champs pour une nouvelle pièce
   */
  private resetNewRoomFields(): void {
    this.newRoomLabel = '';
    this.newRoomImage = '';
    this.newRoomDescription = '';
    this.tempRoomLabel = '';
    this.labelValidated = false;
    this.showRoomLabelError = false;
  }

  /**
   * Supprime une pièce existante
   */
  removeRoom(index: number): void {
    if (this.form.images && this.form.images.length > index) {
      this.form.images.splice(index, 1);
      this.form.roomLabels.splice(index, 1);
      this.form.roomDescriptions.splice(index, 1);
      if (this.form.roomAreas && this.form.roomAreas.length > index) {
        this.form.roomAreas.splice(index, 1);
      }
      // Supprime l'état de survol correspondant
      if (this.isHovered && this.isHovered.length > index) {
        this.isHovered.splice(index, 1);
      }

      // Met à jour automatiquement le nombre de pièces dans le formulaire
      this.form.rooms = this.form.images.length;
      
      // Nettoie les sauvegardes d'édition
      if (this.pieceEditBackup[index]) {
        delete this.pieceEditBackup[index];
      }
    }
  }

  // =========================================================================
  // ÉDITION INLINE DES PIÈCES
  // =========================================================================

  /**
   * Démarre l'édition d'une pièce existante
   */
  startPieceEdit(index: number): void {
    this.pieceEditBackup[index] = {
      label: this.form.roomLabels[index] || '',
      desc: this.form.roomDescriptions[index] || '',
      img: this.form.images[index] || '',
      area: this.form.roomAreas && this.form.roomAreas[index] ? this.form.roomAreas[index] : 0
    };
    this.editPieceIndexMap[index] = true;
  }

  /**
   * Sauvegarde les modifications d'une pièce
   */
  savePieceEdit(index: number): void {
    if (!this.form.roomLabels[index] || this.form.roomLabels[index].trim() === '') {
      this.errors.roomImages = 'Le nom de la pièce est requis.';
      return;
    }

    this.editPieceIndexMap[index] = false;
    delete this.pieceEditBackup[index];
    this.errors.roomImages = '';
  }

  /**
   * Annule l'édition d'une pièce
   */
  cancelPieceEdit(index: number): void {
    if (this.pieceEditBackup[index]) {
      this.form.roomLabels[index] = this.pieceEditBackup[index].label;
      this.form.roomDescriptions[index] = this.pieceEditBackup[index].desc;
      this.form.images[index] = this.pieceEditBackup[index].img;
      if (!this.form.roomAreas) this.form.roomAreas = [];
      this.form.roomAreas[index] = this.pieceEditBackup[index].area || 0;
      delete this.pieceEditBackup[index];
    }
    this.editPieceIndexMap[index] = false;
    this.errors.roomImages = '';
  }

  /**
   * Change l'image d'une pièce existante
   */
  onChangeRoomImage(event: any, index: number): void {
    const files: FileList = event.target.files;
    if (!files || !files.length) return;

    const file = files[0];
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    // Accept common image types; if file.type is missing try to infer from extension
    const fileType = file.type && file.type.length ? file.type : (file.name ? this.inferMimeFromFilename(file.name) : '');

    if (!validTypes.includes(fileType)) {
      this.errors.roomImages = 'Type de fichier non supporté. Utilisez JPEG, PNG ou WebP.';
      event.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.errors.roomImages = 'L\'image ne doit pas dépasser 2MB.';
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      // Assure que l'index existe
      while (this.form.images.length <= index) {
        this.form.images.push(this.roomImagesService.getDefaultRoomImage());
        this.form.roomLabels.push('');
        this.form.roomDescriptions.push('');
        this.isHovered.push(false);
      }
      this.form.images[index] = e.target.result;
      // Si le nom de la pièce n'est pas renseigné, afficher un message et activer l'édition
      if (!this.form.roomLabels[index] || !this.form.roomLabels[index].trim()) {
        this.errors.roomImages = 'Le nom de la pièce est requis pour chaque image. Cliquez sur la pièce pour la nommer.';
        // ouvrir l'éditeur inline pour cet index
        this.editPieceIndexMap[index] = true;
      } else {
        this.errors.roomImages = '';
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  /**
   * Essaie d'inférer un mime-type simple à partir de l'extension de fichier
   */
  private inferMimeFromFilename(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      default:
        return '';
    }
  }

  // =========================================================================
  // GESTION DU FORMULAIRE PRINCIPAL
  // =========================================================================

  /**
   * Active le mode édition
   */
  enableEdit(): void {
    this.synchronizeRoomArrays();
    this.editMode = true;
  }

  /**
   * Annule l'édition
   */
  cancelEdit(): void {
    if (this.apartment) {
      this.form = { ...this.apartment };
      this.synchronizeRoomArrays();
    }
    this.editMode = false;
    this.errors = {};
  }

  /**
   * Valide le formulaire
   */
  validate(): boolean {
    this.errors = {};

    // Validation des champs de base
    if (!this.form.name?.trim()) this.errors.name = 'Nom requis';
    if (!this.form.type) this.errors.type = 'Type requis';
    if (!this.form.rooms || this.form.rooms < 1) this.errors.rooms = 'Nombre de pièces invalide';
    if (!this.form.buildingId) this.errors.buildingId = 'Bâtiment requis';
    if (!this.form.rent || this.form.rent < 1000) this.errors.rent = 'Loyer mensuel invalide';

    // Validation des pièces
    if (this.form.images && this.form.roomLabels) {
      const missingLabels = this.form.roomLabels.some((label: string, index: number) => {
        return !label?.trim() && this.form.images[index];
      });

      if (missingLabels) {
        this.errors.roomImages = 'Chaque image doit avoir un nom de pièce renseigné.';
      }
    }

    return Object.keys(this.errors).length === 0;
  }

  /**
   * Sauvegarde l'appartement
   */
  save(): void {
    if (!this.validate()) return;

    // Gestion du type personnalisé
    if (this.isCustomType && this.form.customType?.trim()) {
      const customType = this.form.customType.trim();
      if (!this.apartmentTypes.includes(customType)) {
        this.apartmentTypes.push(customType);
        try {
          localStorage.setItem('apartmentTypes', JSON.stringify(this.apartmentTypes));
        } catch (e) {
          // ignore
        }
      }
      this.form.type = customType;
    }

    // Synchronise les données du locataire
    if (this.form.tenantId) {
      const tenant = this.tenants.find(t => t.id === this.form.tenantId);
      this.form.tenant = tenant ? tenant.fullName : '';
    } else {
      this.form.tenant = '';
    }

    // Sauvegarde
    // Vérifier la capacité du bâtiment (ne compte pas l'appartement courant)
    if (this.form.buildingId) {
      const allApts = this.apartmentsService.getApartments();
      const countInBuilding = allApts.filter(a => a.buildingId === this.form.buildingId && a.id !== this.form.id).length;
      const building = this.buildingsService.getBuildingById(this.form.buildingId);
      if (building && countInBuilding >= (building.apartments || 0)) {
        this.errors.buildingId = 'Verifier le nombre d\'appartement disponible dans votre batiment';
        return;
      }
    }

    this.apartmentsService.updateApartment(this.form);
    this.apartment = { ...this.form };
    this.editMode = false;
    
    // Redirige vers la page de détail
    if (this.apartment?.id) {
      this.router.navigate([`/demo/admin-panel/apartments/${this.apartment.id}`]);
    }
  }

  // =========================================================================
  // GESTION DES ÉVÉNEMENTS D'INTERFACE
  // =========================================================================

  onTypeChange(event: any): void {
    this.isCustomType = event.target.value === 'autre';
    if (!this.isCustomType) this.form.customType = '';
  }

  onRoomLabelInput(): void {
    if (this.showRoomLabelError && this.newRoomLabel.trim() !== '') {
      this.showRoomLabelError = false;
    }
  }

  /**
   * Appelé quand l'utilisateur modifie le nom d'une pièce inline.
   * Efface l'erreur générale liée aux images si le label est maintenant renseigné.
   */
  onRoomLabelChange(index: number): void {
    if (this.form.roomLabels && this.form.roomLabels[index] && this.form.roomLabels[index].trim()) {
      if (this.errors && this.errors.roomImages) {
        this.errors.roomImages = '';
      }
    }
  }

  incrementMention(): void {
    if (!this.form.mention) this.form.mention = 0;
    this.form.mention += 1000;
  }

  decrementMention(): void {
    if (!this.form.mention) this.form.mention = 0;
    if (this.form.mention > 0) this.form.mention -= 1000;
  }

  // =========================================================================
  // GESTION DES DONNÉES ASSOCIÉES
  // =========================================================================

  buildingName(buildingId: number): string {
    const building = this.buildings.find(b => b.id === buildingId);
    return building ? building.name : 'Non affilié';
  }

  getTenantName(tenantId: number | undefined): string {
    if (!tenantId) return '';
    const tenant = this.tenants.find(t => t.id === tenantId);
    return tenant ? tenant.fullName : '';
  }

  // =========================================================================
  // GESTION DES MODALS
  // =========================================================================

  openBuildingDialog(): void {
    const dialogRef = this.dialog.open(BuildingFormComponent, {
      width: '600px',
      data: {}
    });

  dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.buildings = this.buildingsService.getBuildings();
        this.form.buildingId = result.id;
      }
    });
  }

  openTenantDialog(): void {
    const dialogRef = this.dialog.open(TenantFormComponent, {
      width: '600px',
      data: {}
    });

  dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.tenants = this.tenantsService.getTenants();
        this.form.tenantId = result.id;
      }
    });
  }

  // =========================================================================
  // GESTION DES IMAGES
  // =========================================================================

  getRoomImage(roomLabel: string): string {
    if (!roomLabel) return this.roomImagesService.getDefaultRoomImage();
    return this.roomImagesService.getRoomImage(roomLabel);
  }

  getDefaultApartmentImage(): string {
    return this.roomImagesService.getDefaultApartmentImage();
  }

  isDefaultImage(imagePath: string): boolean {
    return this.roomImagesService.isDefaultImage(imagePath);
  }

  getDisplayImage(imagePath: string, roomLabel: string): string {
    if (imagePath && !this.isDefaultImage(imagePath)) {
      return imagePath;
    }
    return this.getRoomImage(roomLabel);
  }

  // =========================================================================
  // NAVIGATION ET ACTIONS
  // =========================================================================

  back(): void {
    this.router.navigate(['demo/admin-panel/apartments']);
  }

  goToNewBuilding(): void {
    this.router.navigate(['/demo/admin-panel/buildings/new']);
  }

  goToNewTenant(): void {
    this.router.navigate(['/demo/admin-panel/tenants/new']);
  }

  deleteApartment(): void {
    if (!this.apartment?.id) return;
    
    this.apartmentsService.deleteApartment(this.apartment.id);
    this.router.navigate(['demo/admin-panel/apartments']);
  }

  // =========================================================================
  // MÉTHODES DE COMPATIBILITÉ (à déprécier progressivement)
  // =========================================================================

  /**
   * @deprecated Utiliser removeRoom à la place
   */
  removeRoomImage(i: number): void {
    this.removeRoom(i);
  }

  /**
   * @deprecated Utiliser confirmAddRoom à la place
   */
  validateRoomLabel(): void {
    // Méthode conservée pour compatibilité
  }

  /**
   * @deprecated Utiliser onImageSelected à la place
   */
  addRoomImage(event: any, roomLabel: string): void {
    // Méthode conservée pour compatibilité
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    if (!roomLabel?.trim()) {
      this.showRoomLabelError = true;
      event.target.value = '';
      return;
    }

    this.showRoomLabelError = false;
    // Implémentation simplifiée pour compatibilité
  }
}