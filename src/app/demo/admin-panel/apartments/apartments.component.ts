import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApartmentsService, Apartment } from './apartments.service';
// Keep header navigation for apartment creation

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
  // Simule l'utilisateur connecté (à remplacer par le vrai service d'authentification)
  currentUser = { id: 'owner-123', role: 'owner' };
  // Get the number of rooms for an apartment
  getRoomCount(apartment: ApartmentWithCarousel): number {
    if (apartment.images && apartment.images.length) {
      return apartment.images.length;
    }
    if (apartment.rooms) {
      return apartment.rooms;
    }
    return 0;
  }

  // Switch navigation to a specific room (carousel index)
  goToRoom(apartment: ApartmentWithCarousel, index: number): void {
    if (apartment.images && index >= 0 && index < apartment.images.length) {
      apartment._carouselIndex = index;
    }
  }
  getRoomImages(apartment: ApartmentWithCarousel): string[] {
    return apartment.images || [];
  }
  sortOrder: 'recent' | 'oldest' = 'recent';
  filterType: string = '';
  filterRooms: number | null = null;
  filterStatus: 'all' | 'occupied' | 'free' | 'sale' | 'rent' | 'construction' = 'all';
  filterMention: 'all' | 'high' | 'low' = 'all';
  activeFilter: 'name' | 'city' | 'region' | null = null;
  apartments: ApartmentWithCarousel[] = [];
  filteredApartments: ApartmentWithCarousel[] = [];
  viewMode: 'list' | 'grid' = 'grid';
  filterName: string = '';
  filterCity: string = '';
  filterRegion: string = '';
  cityOptions: string[] = [];
  // pagination
  page: number = 1;
  pageSize: number = 10;
  total: number = 0;
  displayedApartments: ApartmentWithCarousel[] = [];
  description?: string;
    // Utilitaires pour récupérer le nom et la description de la pièce courante

    getCurrentRoomLabel(apartment: ApartmentWithCarousel): string {
      return apartment.roomLabels && apartment.roomLabels[apartment._carouselIndex || 0]
        ? apartment.roomLabels[apartment._carouselIndex || 0]
        : 'Nom de la pièce';
    }

    getCurrentRoomDescription(apartment: ApartmentWithCarousel): string {
      return apartment.roomDescriptions && apartment.roomDescriptions[apartment._carouselIndex || 0]
        ? apartment.roomDescriptions[apartment._carouselIndex || 0]
        : 'Aucune description';
    }

  constructor(
    private apartmentsService: ApartmentsService,
    private router: Router
  ) {}

  // Utilitaire pour afficher le statut de disponibilité
  getTenantDisplay(apartment: ApartmentWithCarousel): string {
    // Affiche toujours 'Libre' si pas de locataire, sinon 'Occupé'
    return apartment && apartment.tenant ? 'Occupé' : 'Libre';
  }

  ngOnInit(): void {
  this.apartments = this.apartmentsService.getApartments().map(a => ({ ...a, _carouselIndex: 0, _showOverlay: false }));
  // compute city options
  this.cityOptions = Array.from(new Set(this.apartments.map(a => a.city).filter(Boolean)));
  this.applyFilters();
  }

  applyFilters(): void {
    let result = this.apartmentsService.filterApartments(this.apartments, {
      type: this.filterType,
      rooms: this.filterRooms || undefined,
      status: this.filterStatus,
      mention: this.filterMention
    });
    result = this.apartmentsService.sortApartments(result, this.sortOrder);
    // text filters
    if (this.filterName) {
      const q = this.filterName.toLowerCase();
      result = result.filter(a => (a.name || '').toLowerCase().includes(q) || (a.address || '').toLowerCase().includes(q));
    }
    if (this.filterCity) {
      result = result.filter(a => (a.city || '') === this.filterCity);
    }
    if (this.filterRegion) {
      result = result.filter(a => (a.region || '').toLowerCase().includes(this.filterRegion.toLowerCase()));
    }
    // Ensure _carouselIndex is present
  this.filteredApartments = result.map(a => ({ ...a, _carouselIndex: 0, _showOverlay: false }));
  // pagination
  this.total = this.filteredApartments.length;
  this.updateDisplayed();
  }

  updateDisplayed() {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.displayedApartments = this.filteredApartments.slice(start, end);
  }

  onPageChange(p: number) {
    this.page = p;
    this.updateDisplayed();
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.page = 1;
    this.updateDisplayed();
  }

  setSortOrder(order: 'recent' | 'oldest'): void {
    this.sortOrder = order;
    this.applyFilters();
  }

  goToDetail(apartment: Apartment) {
    this.router.navigate(['demo/admin-panel/apartments', apartment.id]);
  }

  goToNew() {
    this.router.navigate(['demo/admin-panel/apartments/new']);
  }

  toggleView() {
    this.viewMode = this.viewMode === 'list' ? 'grid' : 'grid';
  }
}
