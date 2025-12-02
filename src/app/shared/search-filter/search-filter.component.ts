import { Component, EventEmitter, Input, Output, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';

type FilterKind = 'text' | 'select' | 'date' | 'date-range';

interface FilterDef {
  key: string;
  label: string;
  kind: FilterKind;
  options?: { value: any; label: string }[];
}

interface Collector {
  id: number;
  fullName: string;
}

interface Owner {
  id: number;
  name: string;
}

interface Building {
  id: number;
  name: string;
}

interface PaymentRecord {
  id?: number;
  period: string;
  amount: number;
  status: 'paid' | 'pending' | 'late';
  // ... autres propriétés
}

@Component({
  selector: 'app-search-filter',
  templateUrl: './search-filter.component.html',
  styleUrls: ['./search-filter.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule]
})
export class SearchFilterComponent implements OnInit {
  @Input() entityType: string = '';
  @Input() placeholder: string = 'Rechercher...';
  @Input() collectors: Collector[] = [];
  @Input() owners: Owner[] = [];
  @Input() buildings: Building[] = [];
  @Input() periods: string[] = [];
  @Input() payments: PaymentRecord[] = [];
  @Input() filteredPayments: PaymentRecord[] = [];

  @Output() searchChange = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<any>();
  @Output() refresh = new EventEmitter<void>();
  @Output() print = new EventEmitter<void>();
  @Output() addNew = new EventEmitter<void>();
  @Output() viewChange = new EventEmitter<'grid' | 'list'>();

  searchControl = new FormControl('');
  selectedFilters: Record<string, any> = {};
  currentView: 'grid' | 'list' = 'grid';

  // États du dropdown de filtrage
  filterDropdownOpen = false;
  activeFilterCount = 0;

  // Filtres étendus
  historyFilters = {
    period: '',
    status: '',
    search: '',
    collector: '',
    owner: '',
    building: '',
    amountMin: null as number | null,
    amountMax: null as number | null,
    startDate: '',
    endDate: ''
  };

  // Options de statut
  statusOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'paid', label: 'Payés' },
    { value: 'pending', label: 'En attente' },
    { value: 'late', label: 'En retard' }
  ];

  private entityLabelMap: Record<string, string> = {
    Owners: 'Nouveau propriétaire',
    Buildings: 'Nouveau bâtiment',
    Apartments: 'Nouvel appartement',
    Rentals: 'Nouvelle location',
    Tenants: 'Nouveau locataire',
    Recoveries: 'Nouveau recouvreur'
  };

  constructor() {
    this.searchControl.valueChanges.pipe(debounceTime(300))
      .subscribe(value => {
        this.historyFilters.search = value || '';
        this.searchChange.emit(value || '');
        this.applyFilters();
      });
  }

  ngOnInit() {
    this.calculateActiveFilterCount();
  }

  /** Retourne les filtres actifs selon l'entité */
  get activeFilters(): FilterDef[] {
    const map: Record<string, FilterDef[]> = {
      Owners: [{ key: 'name', label: 'Nom', kind: 'text' }],
      Buildings: [{ key: 'type', label: 'Type', kind: 'select', options: [
        { value: 'residential', label: 'Résidentiel' },
        { value: 'commercial', label: 'Commercial' }
      ]}],
      Apartments: [{ key: 'floor', label: 'Étage', kind: 'select', options: [
        { value: 'ground', label: 'RDC' }, { value: 1, label: '1' }
      ]}],
      Rentals: [{ key: 'status', label: 'Statut', kind: 'select', options: [
        { value: 'active', label: 'Actif' }, { value: 'terminated', label: 'Terminé' }
      ]}],
      Tenants: [{ key: 'moved_in', label: 'Date d\'emménagement', kind: 'date' }],
      Recoveries: [{ key: 'recovery_type', label: 'Type', kind: 'select', options: [
        { value: 'rent', label: 'Loyer' }, { value: 'fee', label: 'Frais' }
      ]}]
    };
    return map[this.entityType] || [];
  }

  get newEntityLabel(): string {
    return this.entityLabelMap[this.entityType] || 'Nouveau';
  }

  /** Toggle le dropdown de filtrage */
  toggleFilterDropdown(): void {
    this.filterDropdownOpen = !this.filterDropdownOpen;
  }

  /** Vérifie si un statut est sélectionné */
  isStatusSelected(status: string): boolean {
    return this.historyFilters.status === status;
  }

  /** Toggle le filtre de statut */
  toggleStatusFilter(status: string): void {
    this.historyFilters.status = this.historyFilters.status === status ? '' : status;
    this.applyFilters();
  }

  /** Réinitialise tous les filtres */
  clearFilters(): void {
    this.historyFilters = {
      period: '',
      status: '',
      search: '',
      collector: '',
      owner: '',
      building: '',
      amountMin: null,
      amountMax: null,
      startDate: '',
      endDate: ''
    };
    this.searchControl.setValue('');
    this.applyFilters();
    this.filterDropdownOpen = false;
  }

  /** Applique les filtres et émet les événements */
  applyFilters(): void {
    this.calculateActiveFilterCount();
    
    // Émettre les changements de recherche
    this.searchChange.emit(this.historyFilters.search);
    
    // Émettre les changements de filtre
    this.filterChange.emit({ ...this.historyFilters });
    
    // Appliquer la logique de filtrage locale si nécessaire
    this.filterPayments();
  }

  /** Calcule le nombre de filtres actifs */
  private calculateActiveFilterCount(): void {
    this.activeFilterCount = Object.values(this.historyFilters).filter(
      value => value !== '' && value !== null && value !== undefined && value !== 0
    ).length;
  }

  /** Logique de filtrage des paiements (à adapter selon vos besoins) */
  private filterPayments(): void {
    if (!this.payments) return;

    this.filteredPayments = this.payments.filter(payment => {
      // Filtre par période
      if (this.historyFilters.period && payment.period !== this.historyFilters.period) {
        return false;
      }

      // Filtre par statut
      if (this.historyFilters.status && payment.status !== this.historyFilters.status) {
        return false;
      }

      // Filtre par montant minimum
      if (this.historyFilters.amountMin && payment.amount < this.historyFilters.amountMin) {
        return false;
      }

      // Filtre par montant maximum
      if (this.historyFilters.amountMax && payment.amount > this.historyFilters.amountMax) {
        return false;
      }

      // Filtre par recherche (à adapter selon vos champs)
      if (this.historyFilters.search) {
        const searchTerm = this.historyFilters.search.toLowerCase();
        // Implémentez votre logique de recherche ici
        // Ex: return payment.tenantName.toLowerCase().includes(searchTerm);
      }

      return true;
    });
  }

  /** Toggle un filtre simple (dropdown) - méthode originale conservée */
  toggleFilter(key: string, value: any = true) {
    if (this.selectedFilters[key]) {
      delete this.selectedFilters[key];
    } else {
      this.selectedFilters[key] = value;
    }
    this.filterChange.emit({ ...this.selectedFilters });
  }

  /** Ferme le dropdown si clic en dehors */
  @HostListener('document:click', ['$event'])
  clickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.filter-dropdown')) {
      this.filterDropdownOpen = false;
    }
  }

  /** Actions boutons */
  onRefreshClick() {
    const btn = document.querySelector('.refresh-icon');
    btn?.classList.add('spin');
    setTimeout(() => btn?.classList.remove('spin'), 500);
    this.refreshData();
  }

  refreshData() { 
    this.refresh.emit(); 
  }

  onPrint() { 
    this.print.emit(); 
  }

  onAddNew() { 
    this.addNew.emit(); 
  }

  toggleView(view: 'grid' | 'list') {
    this.currentView = view;
    this.viewChange.emit(this.currentView);
  }

  /** Méthode utilitaire pour formater les dates si nécessaire */
  formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR');
    } catch {
      return dateString;
    }
  }

  /** Méthode pour récupérer le nom d'un collecteur */
  getCollectorName(collectorId: number): string {
    const collector = this.collectors.find(c => c.id === collectorId);
    return collector ? collector.fullName : `Collecteur ${collectorId}`;
  }

  /** Méthode pour récupérer le nom d'un propriétaire */
  getOwnerName(ownerId: number): string {
    const owner = this.owners.find(o => o.id === ownerId);
    return owner ? owner.name : `Propriétaire ${ownerId}`;
  }

  /** Méthode pour récupérer le nom d'un bâtiment */
  getBuildingName(buildingId: number): string {
    const building = this.buildings.find(b => b.id === buildingId);
    return building ? building.name : `Bâtiment ${buildingId}`;
  }
}