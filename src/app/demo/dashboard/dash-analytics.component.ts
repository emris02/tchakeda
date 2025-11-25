// angular import
import { Component, viewChild } from '@angular/core';

// project import
import { SharedModule } from 'src/app/theme/shared/shared.module';
import { ProductSaleComponent } from './product-sale/product-sale.component';

// domain services (localStorage-based)
import { ApartmentsService } from '../admin-panel/apartments/apartments.service';
import { RentalsService } from '../admin-panel/rentals/rentals.service';
import { TenantsService } from '../admin-panel/tenants/tenants.service';
import { OwnersService } from '../admin-panel/owners/owners.service';
import { CollectorsService } from '../admin-panel/collectors/collectors.service';
import { RecoveriesService } from '../admin-panel/recoveries/recoveries.service';

// 3rd party import
import { ApexOptions, ChartComponent, NgApexchartsModule } from 'ng-apexcharts';
@Component({
  selector: 'app-dash-analytics',
  imports: [SharedModule, NgApexchartsModule, ProductSaleComponent],
  templateUrl: './dash-analytics.component.html',
  styleUrls: ['./dash-analytics.component.scss']
})
export class DashAnalyticsComponent {
  // public props
  chart = viewChild<ChartComponent>('chart');
  customerChart = viewChild<ChartComponent>('customerChart');
  chartOptions!: Partial<ApexOptions>;
  chartOptions_1!: Partial<ApexOptions>;
  chartOptions_2!: Partial<ApexOptions>;
  chartOptions_3!: Partial<ApexOptions>;
  cards: DashboardCard[] = [];
  totalApartments = 0;
  occupiedApartments = 0;
  vacantApartments = 0;
  totalRentals = 0;
  activeRentals = 0;
  totalTenants = 0;
  totalCollectors = 0;
  occupancyRate = 0;
  paidAmountTotal = 0;
  pendingAmountTotal = 0;
  paidPaymentsCount = 0;
  pendingPaymentsCount = 0;

  // constructor
  constructor(
    private apartmentsService: ApartmentsService,
    private rentalsService: RentalsService,
    private tenantsService: TenantsService,
    private ownersService: OwnersService,
    private collectorsService: CollectorsService,
    private recoveriesService: RecoveriesService
  ) {
    this.chartOptions = {
      chart: {
        height: 205,
        type: 'line',
        toolbar: {
          show: false
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        width: 2,
        curve: 'smooth'
      },
      series: [
        {
          name: 'Arts',
          data: [20, 50, 30, 60, 30, 50]
        },
        {
          name: 'Commerce',
          data: [60, 30, 65, 45, 67, 35]
        }
      ],
      legend: {
        position: 'top'
      },
      xaxis: {
        type: 'datetime',
        categories: ['1/11/2000', '2/11/2000', '3/11/2000', '4/11/2000', '5/11/2000', '6/11/2000'],
        axisBorder: {
          show: false
        }
      },
      yaxis: {
        show: true,
        min: 10,
        max: 70
      },
      colors: ['#73b4ff', '#59e0c5'],
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          gradientToColors: ['#4099ff', '#2ed8b6'],
          shadeIntensity: 0.5,
          type: 'horizontal',
          opacityFrom: 1,
          opacityTo: 1,
          stops: [0, 100]
        }
      },
      grid: {
        borderColor: '#cccccc3b'
      }
    };
    this.chartOptions_1 = {
      chart: {
        height: 150,
        type: 'donut'
      },
      dataLabels: {
        enabled: false
      },
      plotOptions: {
        pie: {
          donut: {
            size: '75%'
          }
        }
      },
      labels: ['New', 'Return'],
      series: [39, 10],
      legend: {
        show: false
      },
      tooltip: {
        theme: 'dark'
      },
      grid: {
        padding: {
          top: 20,
          right: 0,
          bottom: 0,
          left: 0
        }
      },
      colors: ['#4680ff', '#2ed8b6'],
      fill: {
        opacity: [1, 1]
      },
      stroke: {
        width: 0
      }
    };
    this.chartOptions_2 = {
      chart: {
        height: 150,
        type: 'donut'
      },
      dataLabels: {
        enabled: false
      },
      plotOptions: {
        pie: {
          donut: {
            size: '75%'
          }
        }
      },
      labels: ['New', 'Return'],
      series: [20, 15],
      legend: {
        show: false
      },
      tooltip: {
        theme: 'dark'
      },
      grid: {
        padding: {
          top: 20,
          right: 0,
          bottom: 0,
          left: 0
        }
      },
      colors: ['#fff', '#2ed8b6'],
      fill: {
        opacity: [1, 1]
      },
      stroke: {
        width: 0
      }
    };
    this.chartOptions_3 = {
      chart: {
        type: 'area',
        height: 145,
        sparkline: {
          enabled: true
        }
      },
      dataLabels: {
        enabled: false
      },
      colors: ['#ff5370'],
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          gradientToColors: ['#ff869a'],
          shadeIntensity: 1,
          type: 'horizontal',
          opacityFrom: 1,
          opacityTo: 0.8,
          stops: [0, 100, 100, 100]
        }
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      series: [
        {
          data: [45, 35, 60, 50, 85, 70]
        }
      ],
      yaxis: {
        min: 5,
        max: 90
      },
      tooltip: {
        fixed: {
          enabled: false
        },
        x: {
          show: false
        },
        marker: {
          show: false
        }
      }
    };

    // Initialise les cartes avec des statistiques immobilières réelles
    this.initRealEstateCards();
  }

  images = [
    {
      src: 'assets/images/gallery-grid/img-grd-gal-1.jpg',
      title: 'Old Scooter',
      size: 'PNG-100KB'
    },
    {
      src: 'assets/images/gallery-grid/img-grd-gal-2.jpg',
      title: 'Wall Art',
      size: 'PNG-150KB'
    },
    {
      src: 'assets/images/gallery-grid/img-grd-gal-3.jpg',
      title: 'Microphone',
      size: 'PNG-150KB'
    }
  ];

  /**
   * Construit les cartes et résumés du dashboard à partir des données locales
   */
  private initRealEstateCards(): void {
    const apartments = this.apartmentsService.getApartments();
    const rentals = this.rentalsService.getRentals();
    const tenants = this.tenantsService.getTenants();
    const owners = this.ownersService.getOwners();
    const collectors = this.collectorsService.getCollectors();
    const recoveries = this.recoveriesService.getRecoveries();

    const occupiedApartments = apartments.filter(a => !!a.tenant || a.status === 'rent').length;
    const activeRentals = rentals.filter(r => r.status === 'active' || !r.status).length;
    const endedRentals = rentals.filter(r => r.status === 'ended').length;
    const paidRecoveries = recoveries.filter(r => (r.status || '').toLowerCase() === 'paid');
    const pendingRecoveries = recoveries.filter(r => (r.status || '').toLowerCase() !== 'paid');
    const paidAmount = paidRecoveries.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const pendingAmount = pendingRecoveries.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const totalRecoveriesAmount = paidAmount + pendingAmount;

    this.totalApartments = apartments.length;
    this.occupiedApartments = occupiedApartments;
    this.vacantApartments = Math.max(this.totalApartments - occupiedApartments, 0);
    this.totalRentals = rentals.length;
    this.activeRentals = activeRentals;
    this.totalTenants = tenants.length;
    this.totalCollectors = collectors.length;
    this.occupancyRate = this.totalApartments ? Math.round((occupiedApartments / this.totalApartments) * 100) : 0;
    this.paidAmountTotal = paidAmount;
    this.pendingAmountTotal = pendingAmount;
    this.paidPaymentsCount = paidRecoveries.length;
    this.pendingPaymentsCount = pendingRecoveries.length;

    this.cards = [
      {
        background: 'bg-primary text-white',
        title: 'Appartements',
        icon: 'feather icon-grid',
        text: 'Occupés / Vacants',
        number: this.totalApartments,
        no: `${this.occupiedApartments} / ${this.vacantApartments}`
      },
      {
        background: 'bg-primary text-white',
        title: 'Maisons en location',
        icon: 'feather icon-home',
        text: 'Locations actives',
        number: this.activeRentals,
        no: `${this.totalRentals} contrats`
      },
      {
        background: 'bg-primary text-white',
        title: 'Locataires',
        icon: 'feather icon-users',
        text: 'Locataires suivis',
        number: this.totalTenants,
        no: `${owners.length} propriétaires`
      },
      {
        background: 'bg-primary text-white',
        title: 'Recouvreurs',
        icon: 'feather icon-user-check',
        text: 'Montant recouvré',
        number: this.totalCollectors,
        no: this.formatCurrency(totalRecoveriesAmount)
      }
    ];
  }

  private formatCurrency(value: number): string {
    if (!value) {
      return '0 F CFA';
    }
    return `${Math.round(value).toLocaleString('fr-FR')} F CFA`;
  }
}

interface DashboardCard {
  background: string;
  title: string;
  icon: string;
  text: string;
  number: string | number;
  no: string | number;
}
