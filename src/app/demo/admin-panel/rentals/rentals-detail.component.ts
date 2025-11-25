import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RentalsService, Rental } from './rentals.service';
import { ApartmentsService, Apartment } from '../apartments/apartments.service';
import { BuildingsService, Building } from '../buildings/buildings.service';
import { TenantsService, Tenant } from '../tenants/tenants.service';
import { RecoveriesService, Recovery } from '../recoveries/recoveries.service';
import { MatDialog } from '@angular/material/dialog';
import { BuildingFormComponent } from '../buildings/components/building-form.component';
import { ApartmentFormComponent } from '../apartments/components/apartment-form.component';
import { TenantFormComponent } from '../tenants/components/tenant-form.component';
import { CollectorsFormComponent } from '../collectors/components/collectors-form.component';

@Component({
  selector: 'app-rentals-detail',
  templateUrl: './rentals-detail.component.html',
  styleUrls: ['./rentals-detail.component.scss'],
  standalone: false
})
export class RentalsDetailComponent implements OnInit {
  // ...existing code...
  getCollectorName(id: number | undefined): string {
    if (!id) return '';
    const c = this.collectors?.find((c: any) => c.id === id);
    return c ? c.fullName : '';
  }
  showAddApartmentModal = false;
  showAddTenantModal = false;
  newApartmentName = '';
  newTenantName = '';

  addApartment() {
    if (!this.newApartmentName.trim()) return;
    // Minimal mock: add to apartments list
    const newId = Date.now();
    this.apartments.push({
      id: newId,
      name: this.newApartmentName,
      address: '',
      city: '',
      region: '',
      buildingId: 0,
      createdAt: new Date().toISOString()
    });
    this.form.apartmentId = newId;
    this.newApartmentName = '';
    this.showAddApartmentModal = false;
  }

  addTenant() {
    if (!this.newTenantName.trim()) return;
    // Minimal mock: add to tenants list
    const newId = Date.now();
    this.tenants.push({
      id: newId,
      fullName: this.newTenantName,
      email: '',
      phone: '',
      city: '',
      registeredAt: new Date().toISOString()
    });
    this.form.tenantId = newId;
    this.newTenantName = '';
    this.showAddTenantModal = false;
  }
  showContractModal: boolean = false;
  // Trigger file input for contract upload
  triggerContractUpload() {
    // Use a specific id to avoid selecting the wrong input when multiple file inputs exist
    const input = document.getElementById('contractInput') as HTMLInputElement | null;
    if (input) input.click();
  }
  rental: Rental | undefined;
  editMode = false;
  form: any = {};
  errors: any = {};
  apartments: Apartment[] = [];
  buildings: Building[] = [];
  filteredApartments: Apartment[] = [];
  tenants: Tenant[] = [];
  collectors: any[] = [];
  showDeleteConfirm = false;
  filterApartmentId: number | null = null;
  filterTenantId: number | null = null;
  filteredRentals: Rental[] = [];
  showLinkedApartments = false;
    paymentHistory: any[] = [];
  occupiedApartmentsCount: number = 0;
   // Mock contract image for demo
   contractImage: string | null = null;
   selectedPeriod: string = '';
   paymentPeriods: string[] = [];
  // Gallery and tabs - images may be string URLs or objects like { url, label }
  galleryImages: any[] = [];
  mainImage: string | null = null;
  activeTab: any = 'info';
  // Property metadata for HomFinder-style layout
  propertyTitle: string = '';
  locationText: string = '';
  badges: Array<{ icon: string; label: string; type?: string; count?: number }> = [];
  // room labels from apartment (names of each piece)
  roomLabels: string[] = [];
  // index of the currently selected room (for active styling)
  activeRoomIndex: number | null = null;
  invoices: any[] = [];
  showMapModal: boolean = false;
  // inline location edit state
  locationEditMode: boolean = false;
  tempLocationForm: any = {};
  // Admin cancellation modal
  showAdminCancellationModal = false;
  adminCancellationReason = '';
  // Payment status filter
  paymentStatusFilter = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rentalsService: RentalsService,
    private apartmentsService: ApartmentsService,
    private buildingsService: BuildingsService,
    private tenantsService: TenantsService
    , private recoveriesService: RecoveriesService,
    private dialog: MatDialog
  ) {
    this.apartments = this.apartmentsService.getApartments();
    this.buildings = this.buildingsService.getBuildings();
    this.tenants = this.tenantsService.getTenants();
    // Load collectors
    if ((window as any).CollectorsService) {
      this.collectors = (window as any).CollectorsService.getCollectors();
    } else {
      // fallback: try to get from localStorage
      const data = localStorage.getItem('collectors');
      this.collectors = data ? JSON.parse(data) : [];
    }
  }

  goToNewCollector() {
    const dialogRef = this.dialog.open(CollectorsFormComponent, {
      width: '500px',
      data: {}
    });
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        // Refresh collectors list
        if ((window as any).CollectorsService) {
          this.collectors = (window as any).CollectorsService.getCollectors();
        } else {
          const data = localStorage.getItem('collectors');
          this.collectors = data ? JSON.parse(data) : [];
        }
        this.form.collectorId = result.id;
      }
    });
  }

  goToNewApartment() {
   const dialogRef = this.dialog.open(ApartmentFormComponent, { width: '700px', data: { buildingId: this.form?.buildingId } });
   dialogRef.afterClosed().subscribe((result: any) => {
     if (result) {
       this.apartments = this.apartmentsService.getApartments();
       this.filteredApartments = this.apartments.filter(a => a.buildingId === (this.form?.buildingId || result.buildingId));
       this.form.apartmentId = result.id;
     }
   });
  }

  goToNewBuilding() {
   const dialogRef = this.dialog.open(BuildingFormComponent, { width: '700px', data: {} });
   dialogRef.afterClosed().subscribe((result: any) => {
     if (result) {
       this.buildings = this.buildingsService.getBuildings();
       this.form.buildingId = result.id;
       this.filteredApartments = this.apartments.filter(a => a.buildingId === result.id);
     }
   });
  }

  goToNewTenant() {
   const dialogRef = this.dialog.open(TenantFormComponent, { width: '600px', data: {} });
   dialogRef.afterClosed().subscribe((result: any) => {
     if (result) {
       this.tenants = this.tenantsService.getTenants();
       this.form.tenantId = result.id;
     }
   });
  }
  // Handle contract upload
  onContractSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Format de contrat non autorisé.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Le fichier doit être inférieur à 5Mo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.contractImage = e.target.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.rental = this.rentalsService.getRentalById(id);
    if (this.rental) {
      this.form = { ...this.rental };
    }
    // If editing/viewing an existing rental, prepare filtered apartments if building is known
    if (this.form && this.form.buildingId) {
      this.filteredApartments = this.apartments.filter(a => a.buildingId === this.form.buildingId);
    }
    this.applyFilters();
      // Load payment history for this rental from recoveries (if any)
      this.loadPaymentHistoryForRental();
     // Mock: set contract image if available
     this.contractImage = this.rental && (this.rental as any).contractImage ? (this.rental as any).contractImage : null;
     // Extract payment periods from paymentHistory
     this.paymentPeriods = Array.from(new Set(this.paymentHistory.map(p => p.period)));
    // prepare gallery: prefer apartment images, fallback to contractImage
    const apt = this.apartments.find(a => a.id === this.rental?.apartmentId);
    if (apt && (apt.images && apt.images.length > 0)) {
      this.galleryImages = apt.images.slice();
      this.mainImage = this.galleryImages[0] || null;
      // expose room labels for template
      this.roomLabels = (apt as any).roomLabels || [];
    } else if (this.contractImage) {
      this.galleryImages = [this.contractImage];
      this.mainImage = this.contractImage;
    } else {
      this.galleryImages = [];
      this.mainImage = null;
    }
    // compute occupied apartments count for this building
    if (this.form && this.form.buildingId) {
      const buildingApts = this.apartments.filter(a => Number(a.buildingId) === Number(this.form.buildingId));
      (this as any).occupiedApartmentsCount = buildingApts.filter(a => !!(a as any).tenant).length;
    } else {
      (this as any).occupiedApartmentsCount = 0;
    }

    // Prepare property metadata (title, location, badges)
  const aptData = this.apartments.find(a => a.id === this.rental?.apartmentId) as any;
  const buildingData = this.buildings.find(b => b.id === this.rental?.buildingId) as any;
    this.propertyTitle = aptData?.name || buildingData?.name || `Appartement ${this.rental?.apartmentId}`;
    const city = aptData?.city || buildingData?.city || aptData?.region || buildingData?.region || '';
    const addr = (aptData && aptData.address) ? aptData.address : (buildingData && buildingData.address) ? buildingData.address : '';
    this.locationText = [addr, city].filter(Boolean).join(', ');

    // Recompute badges after potential apartment/building/title change
    this.badges = this.computeBadges(aptData, buildingData, this.propertyTitle);

    // Ensure first badge is a calendar showing the rental start date (or fallback)
    const startDateLabel = this.rental && this.rental.startDate ? this.formatDate(this.rental.startDate) : 'N/A';
    // If there is already a calendar badge (first badge), replace it; otherwise prepend
    if (this.badges && this.badges.length) {
      if (this.badges[0] && this.badges[0].icon && this.badges[0].icon.includes('calendar')) {
        this.badges[0].label = startDateLabel;
      } else {
        this.badges.unshift({ icon: 'fas fa-calendar-alt', label: startDateLabel });
      }
    } else {
      this.badges = [{ icon: 'fas fa-calendar-alt', label: startDateLabel }];
    }
  this.roomLabels = aptData?.roomLabels || [];

    // invoices: if rental has invoices field use it, otherwise empty list
    this.invoices = (this.rental && (this.rental as any).invoices) ? (this.rental as any).invoices : [];
  }

  setMainImage(img: any) {
    if (!img) {
      this.mainImage = null;
      return;
    }
    // support objects with url property
    const resolved = (img && (img.url || img.src || img.image)) ? (img.url || img.src || img.image) : img;
    this.mainImage = String(resolved);

    // Try to find which room/badge (if any) corresponds to this image and set selectedBadgeType
    const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    const imgName = String(resolved).split('/').pop() || String(resolved);
    const imgNorm = norm(imgName);
    // detect semantic type from filename or image metadata if available
    let detectedType: string | null = null;
    // check gallery image metadata if img was object
    const meta = (typeof img === 'object') ? ((img.label || img.name || img.room || img.title) + '').toLowerCase() : '';
    if (imgNorm.includes('pool') || imgNorm.includes('piscine') || /piscine/.test(meta)) detectedType = 'pool';
    else if (imgNorm.includes('bath') || /sdb|bain|douche|toilet/.test(meta)) detectedType = 'bath';
    else if (imgNorm.includes('bed') || /chambre/.test(meta)) detectedType = 'bed';
    // set selected badge type accordingly
    this.selectedBadgeType = detectedType;
    // try also to set an active room index when roomLabels are present
    if (this.roomLabels && this.roomLabels.length) {
      let matchedIndex: number | null = null;
      for (let i = 0; i < this.roomLabels.length; i++) {
        const label = String(this.roomLabels[i] || '').toLowerCase().trim();
        if (!label) continue;
        const target = norm(label);
        if (imgNorm.includes(target) || (meta && target && meta.includes(target))) {
          matchedIndex = i;
          break;
        }
      }
      this.activeRoomIndex = matchedIndex;
    }
  }

  /**
   * Try to set the main image based on a room label index.
   * Strategy: look for an image whose filename or metadata label contains the room label.
   */
  setMainImageByRoom(index: number) {
    if (!this.roomLabels || !this.roomLabels[index]) return;
    // mark active immediately so UI updates even if no matching image found
    this.activeRoomIndex = index;
    if (!this.galleryImages || this.galleryImages.length === 0) return;
    const label = (this.roomLabels[index] || '').toLowerCase().trim();
    if (!label) return;

    // Helper to normalize strings for comparison
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const target = norm(label);

    // Try to find an image that matches label in metadata or filename
    let found: any = null;
    for (const img of this.galleryImages) {
      if (!img) continue;
      if (typeof img === 'string') {
        const name = img.split('/').pop() || img;
        if (norm(name).includes(target) || name.toLowerCase().includes(label)) {
          found = img;
          break;
        }
      } else if (typeof img === 'object') {
        const candidates = [img.label || img.name || img.room || img.title || ''].filter(Boolean).map((s: any) => String(s));
        for (const c of candidates) {
          if (norm(c).includes(target) || String(c).toLowerCase().includes(label)) {
            found = img.url || img.src || img.image || img;
            break;
          }
        }
        if (found) break;
      }
    }

    if (found) {
      this.setMainImage(found);
    }
  }

  switchTab(tab: string) {
    this.activeTab = tab;
  }

  // map url (Google Maps iframe) for location preview
  getMapUrl(): string {
    const q = encodeURIComponent(this.locationText || this.propertyTitle || 'Abidjan');
    // fallback embed (kept for compatibility) - prefer OpenStreetMap for external opening
    return `https://www.google.com/maps?q=${q}&output=embed`;
  }

  openMapModal() {
    this.showMapModal = true;
  }

  closeMapModal() {
    this.showMapModal = false;
  }

  openMapInNewTab() {
    const q = encodeURIComponent(this.locationText || this.propertyTitle || 'Abidjan');
    const url = `https://www.openstreetmap.org/search?query=${q}`;
    window.open(url, '_blank');
  }

  /** Return a static OpenStreetMap image URL centered on the textual address (good for quick testing) */
  getStaticMapUrl(width: number = 800, height: number = 300): string {
    const q = encodeURIComponent(this.locationText || this.propertyTitle || 'Abidjan');
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${q}&zoom=15&size=${width}x${height}`;
  }

  // Inline editing helpers for location/info
  toggleLocationEdit() {
    // when entering edit mode, ensure the Informations tab is shown
    this.activeTab = 'info';
    this.locationEditMode = !this.locationEditMode;
    if (this.locationEditMode) {
      // initialize temp form with current values
      this.tempLocationForm = {
        propertyTitle: this.propertyTitle,
        locationText: this.locationText,
        buildingId: this.rental?.buildingId || null,
        apartmentId: this.rental?.apartmentId || null,
        price: this.rental?.price || null,
        // ensure current tenant and collector are present when editing
        tenantId: this.rental?.tenantId || null,
        collectorId: (this.rental as any)?.collectorId || null,
        startDate: this.rental?.startDate || null,
        endDate: this.rental?.endDate || null
      };
      // Scroll to the informations section so the user sees the inline editor
      setTimeout(() => {
        const el = document.getElementById('infoSection');
        if (el && el.scrollIntoView) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 80);
    } else {
      this.tempLocationForm = {};
    }
  }

  saveLocationChanges() {
    // apply changes to rental and local fields, persist to localStorage and refresh related UI
    if (!this.rental) return;

    const previousApartmentId = this.rental.apartmentId;
    const previousBuildingId = this.rental.buildingId;

    if (this.tempLocationForm.propertyTitle !== undefined) this.propertyTitle = this.tempLocationForm.propertyTitle;
    if (this.tempLocationForm.locationText !== undefined) this.locationText = this.tempLocationForm.locationText;
    if (this.tempLocationForm.price !== undefined) this.rental.price = this.tempLocationForm.price;
    if (this.tempLocationForm.buildingId !== undefined) this.rental.buildingId = this.tempLocationForm.buildingId;
    if (this.tempLocationForm.apartmentId !== undefined) this.rental.apartmentId = this.tempLocationForm.apartmentId;
    if (this.tempLocationForm.tenantId !== undefined) this.rental.tenantId = this.tempLocationForm.tenantId;

    // Ensure readable names are stored on the rental for lists
    const apt = this.apartmentsService.getApartmentById(this.rental.apartmentId);
    const tenant = this.tenantsService.getTenantById(this.rental.tenantId as number);
    (this.rental as any).apartmentName = apt ? apt.name : '';
    (this.rental as any).tenantName = tenant ? tenant.fullName : '';

    // Persist rental via service (updates localStorage)
    try {
      this.rentalsService.updateRental(this.rental);
    } catch (e) {
      // ignore if service not implemented
    }

    // If apartment changed, update old/new apartment tenant/status
    try {
      if (previousApartmentId !== this.rental.apartmentId) {
        // clear tenant on previous apartment (if exists)
        const prevApt = this.apartmentsService.getApartmentById(previousApartmentId as number);
        if (prevApt) {
          const updatedPrev = { ...prevApt } as any;
          delete updatedPrev.tenant;
          updatedPrev.status = 'free';
          this.apartmentsService.updateApartment(updatedPrev);
        }

        // set tenant on new apartment
        if (apt) {
          const updatedNew = { ...apt } as any;
          updatedNew.tenant = tenant ? tenant.fullName : '';
          updatedNew.status = tenant ? 'rent' : 'free';
          this.apartmentsService.updateApartment(updatedNew);
        }
      } else if (previousApartmentId === this.rental.apartmentId && apt) {
        // apartment same but tenant possibly changed — update apartment tenant
        const updated = { ...apt } as any;
        updated.tenant = tenant ? tenant.fullName : '';
        updated.status = tenant ? 'rent' : (updated.status || 'free');
        this.apartmentsService.updateApartment(updated);
      }
    } catch (e) {
      // ignore apartment persistence errors
    }

    // Refresh local copies of rentals/apartments/tenants to reflect persisted changes
    this.rental = { ...this.rental };
    this.apartments = this.apartmentsService.getApartments();
    this.tenants = this.tenantsService.getTenants();

    // Recompute gallery and property metadata in case apartment changed
    const aptData = this.apartments.find(a => a.id === this.rental?.apartmentId) as any;
    const buildingData = this.buildings.find(b => b.id === this.rental?.buildingId) as any;
    this.propertyTitle = aptData?.name || buildingData?.name || `Appartement ${this.rental?.apartmentId}`;
    const city = aptData?.city || buildingData?.city || aptData?.region || buildingData?.region || '';
    const addr = (aptData && aptData.address) ? aptData.address : (buildingData && buildingData.address) ? buildingData.address : '';
    this.locationText = [addr, city].filter(Boolean).join(', ');

    if (aptData && (aptData.images && aptData.images.length > 0)) {
      this.galleryImages = aptData.images.slice();
      this.mainImage = this.galleryImages[0] || null;
    } else if (this.contractImage) {
      this.galleryImages = [this.contractImage];
      this.mainImage = this.contractImage;
    } else {
      this.galleryImages = [];
      this.mainImage = null;
    }

    // Recompute occupied apartments for the building
    if (this.rental && this.rental.buildingId) {
      const buildingApts = this.apartments.filter(a => Number(a.buildingId) === Number(this.rental?.buildingId));
      (this as any).occupiedApartmentsCount = buildingApts.filter(a => !!(a as any).tenant).length;
    }

    this.locationEditMode = false;
    this.tempLocationForm = {};
  }

  onTempBuildingChange() {
    // When the inline building select changes, update filteredApartments for the apartment select
    if (this.tempLocationForm && this.tempLocationForm.buildingId) {
      this.filteredApartments = this.apartments.filter(a => a.buildingId === this.tempLocationForm.buildingId);
    } else {
      this.filteredApartments = [];
    }
  }

  cancelLocationEdit() {
    this.locationEditMode = false;
    this.tempLocationForm = {};
  }

  goToTenantDetailChannel(tenantId: number | undefined) {
    if (!tenantId) return;
    this.router.navigate([`/demo/admin-panel/tenants/${tenantId}`]);
  }

  // Tenant helpers for template (avoid inline find with arrow fn)
  getTenantById(id: number | undefined) {
    if (!id) return undefined;
    return this.tenants.find(t => t.id === id);
  }

  getTenantCity(id: number | undefined) {
    const t = this.getTenantById(id);
    return t ? (t.city || t.country || '-') : '-';
  }

  getTenantPhone(id: number | undefined) {
    const t = this.getTenantById(id);
    return t ? (t.phone || '-') : '-';
  }

  getTenantAbout(id: number | undefined) {
    const t = this.getTenantById(id);
    return t ? (t.mention || t.profession || t.address || 'Aucune description disponible.') : 'Aucune description disponible.';
  }

  getTenantAvatar(id: number | undefined) {
    const t = this.getTenantById(id);
    return t ? (t.profileImage || t.identityImage || 'assets/images/user/default-avatar.png') : 'assets/images/user/default-avatar.png';
  }

  /**
   * Compute badges by combining apartment data, building data and parsing the title
   * Tries to extract total pieces / chambres / salles de bain from apartment fields first,
   * then from the title (T3, 3 pièces, 2 chambres, ...). Falls back to placeholders.
   */
  private computeBadges(aptData: any, buildingData: any, title?: string) {
    const year = (aptData && aptData.yearBuilt) || (buildingData && buildingData.yearBuilt) || 'N/A';

    // Helper parser: try to find counts from title
    const parseFromTitle = (t?: string) => {
      if (!t) return { total: null, bedrooms: null, bathrooms: null };
      const s = t.toLowerCase();
      // T3 or T2 style
      const tmatch = s.match(/\bT\s?(\d+)\b/);
      if (tmatch) {
        const total = Number(tmatch[1]);
        const bedrooms = Math.max(1, total - 1);
        return { total, bedrooms, bathrooms: 1 };
      }
      // '3 pièces' or '3 piece(s)'
      const pmatch = s.match(/(\d+)\s*pi[eè]ce/);
      if (pmatch) {
        const total = Number(pmatch[1]);
        const bedrooms = Math.max(1, total - 1);
        return { total, bedrooms, bathrooms: 1 };
      }
      // '2 chambres'
      const cmatch = s.match(/(\d+)\s*chambres?/);
      if (cmatch) {
        const bedrooms = Number(cmatch[1]);
        return { total: null, bedrooms, bathrooms: null };
      }
      // bathrooms like '2 sdb' or '2 salle de bain'
      const bmatch = s.match(/(\d+)\s*(sdb|salle[s]? de bain|bain)/);
      if (bmatch) {
        const bathrooms = Number(bmatch[1]);
        return { total: null, bedrooms: null, bathrooms };
      }
      return { total: null, bedrooms: null, bathrooms: null };
    };

    const parsed = parseFromTitle(title);

    // Prefer explicit apartment fields when available
    const totalRooms = (aptData && (aptData.rooms || aptData.pieces)) || parsed.total || null;
    const bedrooms = (aptData && (aptData.bedrooms || aptData.chambres)) || parsed.bedrooms || (totalRooms ? Math.max(1, totalRooms - 1) : null);
    const bathrooms = (aptData && (aptData.bathrooms || aptData.wc)) || parsed.bathrooms || null;

    const bedLabel = bedrooms !== null && bedrooms !== undefined ? String(bedrooms) : ((aptData && (aptData.rooms || aptData.bedrooms)) ? String((aptData.rooms || aptData.bedrooms)) : '—');
    const bathLabel = bathrooms !== null && bathrooms !== undefined ? String(bathrooms) : ((aptData && (aptData.bathrooms || aptData.wc)) ? String((aptData.bathrooms || aptData.wc)) : '—');

    const areaLabel = (aptData && aptData.area) ? String(aptData.area) + ' m²' : null;
    const parkingLabel = (aptData && aptData.parking) ? 'Parking' : null;
    const poolLabel = (aptData && aptData.pool) ? 'Piscine' : null;

    // derive counts for specific piece types from explicit fields or roomLabels
    const roomLabelsList: string[] = aptData?.roomLabels || this.roomLabels || [];
    const countKeyword = (kw: RegExp) => roomLabelsList.filter(r => kw.test(String(r).toLowerCase())).length;
    const bedroomsCount = aptData?.bedrooms || aptData?.chambres || countKeyword(/chambre|bed/);
    const salonsCount = countKeyword(/salon|séjour|living|lounge/);
    const bathroomsCount = aptData?.bathrooms || aptData?.wc || countKeyword(/salle\s*de\s*bain|sdb|bain|douche|toilet|wc/);
    const poolCount = (aptData && (aptData.pool || aptData.piscine)) ? 1 : countKeyword(/piscine|pool/);

    const badges: Array<{ icon: string; label: string; type?: string; count?: number }> = [
      { icon: 'fas fa-calendar-alt', label: year, type: 'date' },
      { icon: 'fas fa-bed', label: String(bedroomsCount || bedLabel), type: 'bed', count: Number(bedroomsCount || 0) },
      { icon: 'fas fa-bath', label: String(bathroomsCount || bathLabel), type: 'bath', count: Number(bathroomsCount || 0) }
    ];

    // Ajouter la superficie seulement si elle existe
    if (areaLabel) {
      badges.push({ icon: 'fas fa-ruler-combined', label: areaLabel, type: 'area' });
    }

    // Ajouter parking et piscine seulement s'ils existent
    if (parkingLabel) {
      badges.push({ icon: 'fas fa-car', label: parkingLabel, type: 'parking' });
    }
    if (poolLabel || poolCount) {
      badges.push({ icon: 'fas fa-swimmer', label: poolLabel || (poolCount ? String(poolCount) : ''), type: 'pool', count: Number(poolCount || 0) });
    }

    return badges;
  }

  // Badge selection state (e.g. 'bed', 'bath', 'pool')
  selectedBadgeType: string | null = null;

  onBadgeClick(b: any) {
    if (!b || !b.type) return;
    // toggle selection
    this.selectedBadgeType = this.selectedBadgeType === b.type ? null : b.type;
    // try to show an image matching the badge type
    this.setMainImageByType(b.type);
  }

  /** Try to find an image associated with a semantic type (bed, bath, pool) */
  setMainImageByType(type: string) {
    if (!this.galleryImages || this.galleryImages.length === 0) return;
    const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    let found: any = null;
    for (const img of this.galleryImages) {
      const url = typeof img === 'string' ? img : (img.url || img.src || img.image || img);
      const name = String(url).split('/').pop() || String(url);
      const meta = typeof img === 'object' ? ((img.label || img.name || img.room || img.title) + '') : '';
      if (type === 'bed' && (norm(name).includes('bed') || /chambre/.test(String(meta).toLowerCase()))) { found = url; break; }
      if (type === 'bath' && (norm(name).includes('bath') || /sdb|bain|douche|toilet/.test(String(meta).toLowerCase()))) { found = url; break; }
      if (type === 'pool' && (norm(name).includes('pool') || /piscine/.test(String(meta).toLowerCase()))) { found = url; break; }
    }
    if (found) {
      this.setMainImage(found);
      this.selectedBadgeType = type;
    } else {
      // if not found, still set selected type to highlight badge
      this.selectedBadgeType = type;
    }
  }

  // public wrapper for template
  formatRentalPeriodPublic(r: Rental | undefined): string {
    return this.formatRentalPeriod(r);
  }

  private formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  private formatRentalPeriod(r: Rental | undefined): string {
    if (!r) return '';
    const start = this.formatDate(r.startDate);
    const end = this.formatDate(r.endDate);
    if (start && end) return `${start} - ${end}`;
    return start || end || '';
  }

  /** Charge les paiements (recoveries) liés à la location courante et construit paymentHistory */
  private loadPaymentHistoryForRental() {
    this.paymentHistory = [];
    this.paymentPeriods = [];
    if (!this.rental) return;
    const allRecoveries = this.recoveriesService.getRecoveries();
    const related = allRecoveries.filter(r => Number(r.rentalId) === Number(this.rental?.id));
    this.paymentHistory = related.map((rec: Recovery) => {
      // Periode : utiliser la période de la location si disponible
      const period = this.formatRentalPeriod(this.rental);
      // Déterminer la date d'échéance (si disponible)
      const dueDate = (rec as any).dueDate || this.rental?.endDate;
      return {
        period,
        amount: rec.amount,
        paymentDate: rec.date,
        dueDate: dueDate,
        paymentMethod: (rec as any).paymentMethod || '-',
        status: rec.status || '-',
        collector: rec.name || '-'
      };
    });
    this.paymentPeriods = Array.from(new Set(this.paymentHistory.map(p => p.period)));
  }

  enableEdit() {
    // Prepare edit form: set building from apartment if needed and filter apartments
    if (this.form && this.form.apartmentId) {
      const apt = this.apartments.find(a => a.id === this.form.apartmentId);
      if (apt && apt.buildingId) {
        this.form.buildingId = apt.buildingId;
        this.filteredApartments = this.apartments.filter(a => a.buildingId === apt.buildingId);
      } else {
        this.form.buildingId = null;
        this.filteredApartments = [];
      }
    } else {
      // ensure filteredApartments is empty until building selected
      this.filteredApartments = [];
    }
    this.editMode = true;
  }

  cancelEdit() {
    this.editMode = false;
    this.form = { ...this.rental };
    this.errors = {};
  }

  validate() {
    this.errors = {};
    if (!this.form.buildingId) this.errors.buildingId = 'Bâtiment requis';
    if (!this.form.apartmentId) this.errors.apartmentId = 'Appartement requis';
    if (!this.form.tenantId) this.errors.tenantId = 'Locataire requis';
    if (!this.form.startDate) this.errors.startDate = 'Date début requise';
    if (!this.form.price || this.form.price < 1) this.errors.price = 'Prix requis';
    return Object.keys(this.errors).length === 0;
  }

  onBuildingChange() {
    if (this.form && this.form.buildingId) {
      this.filteredApartments = this.apartments.filter(a => a.buildingId === this.form.buildingId);
    } else {
      this.filteredApartments = [];
    }
    // reset apartment selection when building changes
    this.form.apartmentId = null;
  }

  save() {
    if (!this.validate()) return;
    this.rentalsService.updateRental(this.form);
    this.rental = { ...this.form };
    this.editMode = false;
  }

  back() {
    this.router.navigate(['demo/admin-panel/rentals']);
  }

  deleteRental() {
    if (!this.rental) return;
    this.rentalsService.deleteRental(this.rental.id);
    this.showDeleteConfirm = false;
    this.router.navigate(['demo/admin-panel/rentals']);
  }

  applyFilters() {
    const allRentals = this.rentalsService.getRentals();
    this.filteredRentals = allRentals.filter(r => {
      const matchApt = !this.filterApartmentId || r.apartmentId === this.filterApartmentId;
      const matchTenant = !this.filterTenantId || r.tenantId === this.filterTenantId;
      return matchApt && matchTenant;
    });
  }
  getBuildingName(id: number | undefined): string {
    if (!id) return '';
    const building = this.buildings.find(b => b.id === id);
    if (building) {
      return building.name || 'Bâtiment inconnu';
    }
    return '';
    }

  getApartmentName(id: number | undefined): string {
    if (!id) return '';
    const apt = this.apartments.find(a => a.id === id);
    return apt ? apt.name : '';
  }

  getApartmentArea(id: number | undefined): number | null {
    if (!id) return null;
    const apt = this.apartments.find(a => a.id === id);
    return apt && apt.area ? apt.area : null;
  }

  getApartmentRooms(id: number | undefined): number | null {
    if (!id) return null;
    const apt = this.apartments.find(a => a.id === id);
    return apt && apt.rooms ? apt.rooms : null;
  }

  /**
   * Retourne une icône adaptée au type de pièce (salon, chambre, cuisine, etc.)
   */
  getRoomIcon(label: string | undefined): string {
    const l = (label || '').toLowerCase().trim();
    if (!l) return 'fas fa-door-open';

    // common shortcuts and keywords
    if (/(^|\W)chambre(s)?(\W|$)|(^|\W)bed(s)?(\W|$)|\bt[0-9]+\b/.test(l)) return 'fas fa-bed';
    if (/(salon|séjour|living|lounge)/.test(l)) return 'fas fa-couch';
    if (/(cuisine|kitchen|kitchenette)/.test(l)) return 'fas fa-utensils';
    if (/(salle\s*de\s*bain|sdb|bain|douche|toilet|wc|lavabo)/.test(l)) return 'fas fa-bath';
    if (/(balcon|terrasse|veranda|balcony|patio)/.test(l)) return 'fas fa-umbrella-beach';
    if (/(bureau|office|study|work)/.test(l)) return 'fas fa-briefcase';
    if (/(entree|hall|hallway|corridor)/.test(l)) return 'fas fa-door-open';
    if (/(placard|storage|cellier|closet|storeroom)/.test(l)) return 'fas fa-box';
    if (/(garage|parking)/.test(l)) return 'fas fa-car';
    if (/(jardin|garden|yard|cour)/.test(l)) return 'fas fa-seedling';
    if (/(piscine|pool)/.test(l)) return 'fas fa-swimmer';

    // fallback
    return 'fas fa-door-open';
  }

  // mark a room as active (toggle)
  setActiveRoom(index: number) {
    if (this.activeRoomIndex === index) {
      this.activeRoomIndex = null;
    } else {
      this.activeRoomIndex = index;
    }
  }

  getTenantName(id: number | undefined): string {
    if (!id) return '';
    const t = this.tenants.find(t => t.id === id);
    return t ? t.fullName : '';
  }

  getLinkedApartments(): Apartment[] {
    if (!this.rental) return [];
    return this.apartments.filter(a => a.id === this.rental?.apartmentId);
  }
    
   // Download contract image
   downloadContract() {
     if (this.contractImage) {
       const link = document.createElement('a');
       link.href = this.contractImage;
       link.download = 'contrat-location.jpg';
       link.click();
     }
   }

   // View contract image in large modal
   viewContract() {
     if (this.contractImage) {
       window.open(this.contractImage, '_blank');
     }
   }

   // Filter payments by selected period and status
   filteredPayments(): any[] {
     let filtered = this.paymentHistory.slice();
     
     // Filtrer par période
     if (this.selectedPeriod) {
       filtered = filtered.filter(p => p.period === this.selectedPeriod);
     }
     
     // Filtrer par statut
     if (this.paymentStatusFilter) {
       const filter = this.paymentStatusFilter.toLowerCase();
       filtered = filtered.filter(p => {
         const status = (p.status || '').toLowerCase();
         if (filter === 'paid') {
           return status.includes('payé') || status === 'paid';
         } else if (filter === 'pending') {
           return status.includes('attente') || status === 'pending' || status.includes('en cours');
         } else if (filter === 'overdue') {
           return this.isPaymentOverdue(p);
         }
         return true;
       });
     }
     
     return filtered;
   }

   /**
    * Applique les filtres de paiement
    */
   applyPaymentFilters(): void {
     // La méthode filteredPayments() est appelée automatiquement dans le template
   }

   /**
    * Vérifie si un paiement est en retard
    */
   isPaymentOverdue(payment: any): boolean {
     if (!payment.dueDate && !payment.paymentDate) return false;
     if (payment.status && (payment.status.toLowerCase().includes('payé') || payment.status.toLowerCase() === 'paid')) {
       return false;
     }
     const today = new Date();
     today.setHours(0, 0, 0, 0);
     if (payment.dueDate) {
       const dueDate = new Date(payment.dueDate);
       dueDate.setHours(0, 0, 0, 0);
       return dueDate < today;
     }
     return false;
   }

  // ==================== Gestion de l'annulation admin ====================
  
  /**
   * Ouvre la modale d'annulation admin
   */
  openAdminCancellationModal(): void {
    if (!this.rental) return;
    if (this.rental.status === 'cancelled') {
      alert('Cette location est déjà annulée.');
      return;
    }
    this.adminCancellationReason = '';
    this.errors = {};
    this.showAdminCancellationModal = true;
  }

  /**
   * Ferme la modale d'annulation admin
   */
  closeAdminCancellationModal(): void {
    this.showAdminCancellationModal = false;
    this.adminCancellationReason = '';
    this.errors = {};
  }

  /**
   * Confirme l'annulation admin
   */
  confirmAdminCancellation(): void {
    if (!this.rental) return;
    
    // Validation
    this.errors = {};
    if (!this.adminCancellationReason || !this.adminCancellationReason.trim()) {
      this.errors.adminCancellationReason = 'La raison de l\'annulation est requise.';
      return;
    }

    // Appeler le service pour annuler la location par l'admin
    this.rentalsService.cancelRentalByAdmin(
      this.rental.id,
      this.adminCancellationReason.trim()
    ).subscribe({
      next: () => {
        alert('La location a été annulée avec succès.');
        this.closeAdminCancellationModal();
        // Recharger les données
        const id = this.rental?.id;
        if (id) {
          this.rental = this.rentalsService.getRentalById(id);
          if (this.rental) {
            this.form = { ...this.rental };
          }
        }
      },
      error: (err: any) => {
        alert('Erreur lors de l\'annulation de la location: ' + (err.message || 'Erreur inconnue'));
      }
    });
  }

  /**
   * Retourne le libellé du type d'annulation
   */
  getCancellationTypeLabel(type?: string): string {
    if (!type) return 'Annulée';
    switch (type) {
      case 'tenant_abandonment':
        return 'Abandonnée';
      case 'owner_eviction':
        return 'Expulsée';
      case 'collector_cancellation':
        return 'Annulée (Recouvreur)';
      case 'admin_cancellation':
        return 'Annulée (Admin)';
      default:
        return 'Annulée';
    }
  }
}
