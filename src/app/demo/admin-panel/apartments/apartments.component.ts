import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApartmentsService, Apartment } from './apartments.service';

// Extension pour gestion du carrousel
interface ApartmentWithCarousel extends Apartment {
  _carouselIndex: number;
  _showOverlay?: boolean;
  ownerId?: string;
}

@Component({
  selector: 'app-apartments',
  templateUrl: './apartments.component.html',
  styleUrls: ['./apartments.component.scss'],
  standalone: false
})
export class ApartmentsComponent implements OnInit {

  /** Utilisateur connecté (à remplacer par AuthService) */
  currentUser = { id: 'owner-123', role: 'owner' };

  /** Données */
  apartments: ApartmentWithCarousel[] = [];
  filteredApartments: ApartmentWithCarousel[] = [];
  displayedApartments: ApartmentWithCarousel[] = [];

  /** Filtres */
  filterName = '';
  filterCity = '';
  filterRegion = '';
  filterType = '';
  filterRooms: number | null = null;

  filterStatus: 'all' | 'occupied' | 'free' | 'sale' | 'rent' | 'construction' = 'all';
  filterMention: 'all' | 'high' | 'low' = 'all';

  activeFilter: 'name' | 'city' | 'region' | null = null;

  /** Pagination */
  page = 1;
  pageSize = 10;
  total = 0;

  /** Affichage */
  viewMode: 'list' | 'grid' = 'grid';
  sortOrder: 'recent' | 'oldest' = 'recent';

  cityOptions: string[] = [];

  constructor(
    private apartmentsService: ApartmentsService,
    private router: Router
  ) {}

  // =====================================
  //  INIT
  // =====================================

  ngOnInit(): void {
    this.loadApartments();
  }

  /** Charge les appartements depuis le service */
  loadApartments(): void {
    this.apartments = this.apartmentsService
      .getApartments()
      .map(a => ({
        ...a,
        _carouselIndex: 0,
        _showOverlay: false
      }));

    // Récupère la liste des villes uniques
    this.cityOptions = Array.from(
      new Set(this.apartments.map(a => a.city).filter(Boolean))
    );

    this.applyFilters();
  }

  // =====================================
  //  FILTRES
  // =====================================

  applyFilters(): void {
    let result = this.apartmentsService.filterApartments(this.apartments, {
      type: this.filterType,
      rooms: this.filterRooms || undefined,
      status: this.filterStatus,
      mention: this.filterMention
    });

    // Tri
    result = this.apartmentsService.sortApartments(result, this.sortOrder);

    // Recherche par nom/adresse
    if (this.filterName) {
      const q = this.filterName.toLowerCase();
      result = result.filter(a =>
        (a.name || '').toLowerCase().includes(q) ||
        (a.address || '').toLowerCase().includes(q)
      );
    }

    // Filtre par ville
    if (this.filterCity) {
      result = result.filter(a => (a.city || '') === this.filterCity);
    }

    // Filtre par région
    if (this.filterRegion) {
      result = result.filter(a =>
        (a.region || '')
          .toLowerCase()
          .includes(this.filterRegion.toLowerCase())
      );
    }

    // Normalise les objets pour le carrousel
    this.filteredApartments = result.map(a => ({
      ...a,
      _carouselIndex: 0,
      _showOverlay: false
    }));

    this.total = this.filteredApartments.length;
    this.updateDisplayed();
  }

  // =====================================
  //  PAGINATION
  // =====================================

  updateDisplayed(): void {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.displayedApartments = this.filteredApartments.slice(start, end);
  }

  onPageChange(page: number): void {
    this.page = page;
    this.updateDisplayed();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.page = 1;
    this.updateDisplayed();
  }

  // =====================================
  //  EVENTS SEARCH-FILTER COMPONENT
  // =====================================

  onSearch(term: string): void {
    this.filterName = term || '';
    this.applyFilters();
  }

  onFilter(filters: any): void {
    if (!filters) return;

    if (filters.city !== undefined) this.filterCity = filters.city || '';
    if (filters.q !== undefined) this.filterName = filters.q || '';

    this.applyFilters();
  }

  onRefreshClicked(): void {
    this.loadApartments();
  }

  onPrintClicked(): void {
    window.print();
  }

  onAddNewClicked(): void {
    this.goToNew();
  }
 // ===== Handlers UI =====
    onViewChange(mode: 'grid' | 'list') {
    this.viewMode = mode;
  }
  // =====================================
  //  NAVIGATION
  // =====================================

  goToDetail(apartment: Apartment): void {
    this.router.navigate(['demo/admin-panel/apartments', apartment.id]);
  }

  goToNew(): void {
    this.router.navigate(['demo/admin-panel/apartments/new']);
  }

  // =====================================
  //  TRI & AFFICHAGE
  // =====================================

  setSortOrder(order: 'recent' | 'oldest'): void {
    this.sortOrder = order;
    this.applyFilters();
  }

  toggleView(): void {
    this.viewMode = this.viewMode === 'list' ? 'grid' : 'list';
  }

  // =====================================
  //  CARROUSEL
  // =====================================

  getRoomCount(apartment: ApartmentWithCarousel): number {
    return apartment.images?.length || apartment.rooms || 0;
  }

  getRoomImages(apartment: ApartmentWithCarousel): string[] {
    return apartment.images || [];
  }

  goToRoom(apartment: ApartmentWithCarousel, index: number): void {
    if (!apartment.images) return;
    if (index < 0 || index >= apartment.images.length) return;
    apartment._carouselIndex = index;
  }

  getCurrentRoomLabel(apartment: ApartmentWithCarousel): string {
    return apartment.roomLabels?.[apartment._carouselIndex] || 'Nom de la pièce';
  }

  getCurrentRoomDescription(apartment: ApartmentWithCarousel): string {
    return apartment.roomDescriptions?.[apartment._carouselIndex] || 'Aucune description';
  }

  getTenantDisplay(apartment: ApartmentWithCarousel): string {
    return apartment.tenant ? 'Occupé' : 'Libre';
  }
}
