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
    const input = document.querySelector<HTMLInputElement>('input[type=file][accept="image/*,.pdf"]');
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
   // Mock contract image for demo
   contractImage: string | null = null;
   selectedPeriod: string = '';
   paymentPeriods: string[] = [];

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
      return {
        period,
        amount: rec.amount,
        paymentDate: rec.date,
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

   // Filter payments by selected period
   filteredPayments(): any[] {
     if (!this.selectedPeriod) return this.paymentHistory;
     return this.paymentHistory.filter(p => p.period === this.selectedPeriod);
   }
}
