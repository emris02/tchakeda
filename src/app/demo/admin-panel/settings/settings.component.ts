import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';

// Interfaces pour le typage fort
interface Currency {
  value: string;
  label: string;
  symbol: string;
}

interface Country {
  value: string;
  label: string;
  phoneCode: string;
}

interface SettingsData {
  general: any;
  notifications: any;
  agency: any;
  financial: any;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatDividerModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit, OnDestroy {
  generalForm!: FormGroup;
  notificationForm!: FormGroup;
  agencyForm!: FormGroup;
  financialForm!: FormGroup;

  selectedTab = 0;
  isLoading = false;

  private destroy$ = new Subject<void>();

  // Options adaptées pour l'Afrique de l'Ouest (Mali)
  currencies: Currency[] = [
    { value: 'XOF', label: 'Franc CFA (FCFA)', symbol: 'FCFA' },
    { value: 'EUR', label: 'Euro (€)', symbol: '€' },
    { value: 'USD', label: 'Dollar ($)', symbol: '$' },
    { value: 'XAF', label: 'Franc CFA BEAC', symbol: 'FCFA' }
  ];

  countries: Country[] = [
    { value: 'ml', label: 'Mali', phoneCode: '+223' },
    { value: 'sn', label: 'Sénégal', phoneCode: '+221' },
    { value: 'ci', label: 'Côte d\'Ivoire', phoneCode: '+225' },
    { value: 'bf', label: 'Burkina Faso', phoneCode: '+226' },
    { value: 'gn', label: 'Guinée', phoneCode: '+224' },
    { value: 'ne', label: 'Niger', phoneCode: '+227' },
    { value: 'bj', label: 'Bénin', phoneCode: '+229' },
    { value: 'tg', label: 'Togo', phoneCode: '+228' },
    { value: 'gh', label: 'Ghana', phoneCode: '+233' },
    { value: 'ng', label: 'Nigeria', phoneCode: '+234' }
  ];

  languages = [
    { value: 'fr', label: 'Français' },
    { value: 'bm', label: 'Bambara' },
    { value: 'en', label: 'English' }
  ];

  timezones = [
    { value: 'Africa/Bamako', label: 'Bamako (UTC+0)' },
    { value: 'Africa/Abidjan', label: 'Abidjan (UTC+0)' },
    { value: 'Africa/Dakar', label: 'Dakar (UTC+0)' }
  ];

  agencySpecialties = [
    'Résidentiel',
    'Commercial', 
    'Bureaux',
    'Terrain',
    'Immobilier de prestige',
    'Location saisonnière',
    'Gestion locative',
    'Transaction'
  ];

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.loadSettings();
    this.setupFormListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForms(): void {
    // Formulaire Général avec validations spécifiques
    this.generalForm = this.fb.group({
      agencyName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-\(\)]{8,}$/)]],
      address: ['', Validators.maxLength(200)],
      city: ['', Validators.maxLength(50)],
      country: ['ml', Validators.required],
      currency: ['XOF', Validators.required],
      timezone: ['Africa/Bamako'],
      language: ['fr']
    });

    // Formulaire Notifications
    this.notificationForm = this.fb.group({
      emailNotifications: [true],
      smsNotifications: [false],
      newPropertyAlerts: [true],
      newClientAlerts: [true],
      paymentReminders: [true],
      maintenanceAlerts: [true],
      contractExpiryAlerts: [true],
      visitReminders: [true],
      weeklyReports: [false],
      monthlyReports: [true]
    });

    // Formulaire Agence avec validations
    this.agencyForm = this.fb.group({
      licenseNumber: ['', Validators.maxLength(50)],
      taxId: ['', Validators.maxLength(30)],
      managerName: ['', Validators.maxLength(100)],
      foundationYear: [new Date().getFullYear(), [Validators.min(1900), Validators.max(new Date().getFullYear())]],
      propertyCount: [0, [Validators.min(0), Validators.max(10000)]],
      employeeCount: [0, [Validators.min(0), Validators.max(500)]],
      specialties: [[]],
      website: ['', Validators.pattern(/https?:\/\/.+\..+/)],
      description: ['', Validators.maxLength(500)]
    });

    // Formulaire Financier avec validations métier
    this.financialForm = this.fb.group({
      defaultCommission: [5, [Validators.required, Validators.min(0), Validators.max(50)]],
      vatRate: [18, [Validators.required, Validators.min(0), Validators.max(100)]],
      paymentDueDays: [30, [Validators.required, Validators.min(1), Validators.max(90)]],
      latePaymentFee: [2, [Validators.min(0), Validators.max(20)]],
      securityDepositMonths: [2, [Validators.min(1), Validators.max(6)]],
      bankName: ['', Validators.maxLength(100)],
      accountNumber: ['', Validators.maxLength(34)],
      fiscalYearStart: ['01/01', Validators.pattern(/^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/)],
      currency: ['XOF']
    });
  }

  private setupFormListeners(): void {
    // Synchronisation automatique de la devise entre les formulaires
    this.generalForm.get('currency')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(currency => {
        this.financialForm.patchValue({ currency });
      });

    // Validation en temps réel
    this.generalForm.get('phone')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(phone => {
        if (phone && !this.isValidPhoneNumber(phone)) {
          this.generalForm.get('phone')?.setErrors({ invalidPhone: true });
        }
      });
  }

  private loadSettings(): void {
    this.isLoading = true;

    // Simulation de chargement avec des données adaptées au Mali
    const mockSettings: SettingsData = {
      general: {
        agencyName: 'TCHAK Immobilier Mali',
        email: 'contact@tchak-immobilier.ml',
        phone: '+223 20 20 20 20',
        address: 'ACI 2000, Rue 123',
        city: 'Bamako',
        country: 'ml',
        currency: 'XOF',
        timezone: 'Africa/Bamako',
        language: 'fr'
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: true,
        newPropertyAlerts: true,
        newClientAlerts: true,
        paymentReminders: true,
        maintenanceAlerts: true,
        contractExpiryAlerts: true,
        visitReminders: true,
        weeklyReports: false,
        monthlyReports: true
      },
      agency: {
        licenseNumber: 'RCC-2023-ML-12345',
        taxId: 'TVA-ML-123456789',
        managerName: 'Moussa Diarra',
        foundationYear: 2020,
        propertyCount: 150,
        employeeCount: 12,
        specialties: ['Résidentiel', 'Commercial', 'Gestion locative'],
        website: 'https://www.tchak-immobilier.ml',
        description: 'Votre partenaire immobilier de confiance au Mali'
      },
      financial: {
        defaultCommission: 5,
        vatRate: 18,
        paymentDueDays: 30,
        latePaymentFee: 2,
        securityDepositMonths: 2,
        bankName: 'Bank of Africa Mali',
        accountNumber: 'ML01 1234 5678 9012 3456 7890 123',
        fiscalYearStart: '01/01',
        currency: 'XOF'
      }
    };

    // Simulation d'un délai de chargement
    setTimeout(() => {
      this.generalForm.patchValue(mockSettings.general);
      this.notificationForm.patchValue(mockSettings.notifications);
      this.agencyForm.patchValue(mockSettings.agency);
      this.financialForm.patchValue(mockSettings.financial);
      this.isLoading = false;
    }, 1000);
  }

  private isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^(\+223|00223)?[0-9\s\-\(\)]{8,}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 4000,
      panelClass: ['success-snackbar']
    });
  }

  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 6000,
      panelClass: ['error-snackbar']
    });
  }

  onSaveGeneral(): void {
    if (this.generalForm.valid) {
      this.isLoading = true;
      
      // Simulation de sauvegarde
      setTimeout(() => {
        console.log('Sauvegarde des paramètres généraux:', this.generalForm.value);
        this.isLoading = false;
        this.showSuccessMessage('Paramètres généraux sauvegardés avec succès!');
      }, 1000);
    } else {
      this.markFormGroupTouched(this.generalForm);
      this.showErrorMessage('Veuillez corriger les erreurs dans le formulaire');
    }
  }

  onSaveNotifications(): void {
    this.isLoading = true;
    
    setTimeout(() => {
      console.log('Sauvegarde des paramètres de notification:', this.notificationForm.value);
      this.isLoading = false;
      this.showSuccessMessage('Paramètres de notification sauvegardés!');
    }, 800);
  }

  onSaveAgency(): void {
    if (this.agencyForm.valid) {
      this.isLoading = true;
      
      setTimeout(() => {
        console.log('Sauvegarde des informations agence:', this.agencyForm.value);
        this.isLoading = false;
        this.showSuccessMessage('Informations agence sauvegardées!');
      }, 1000);
    } else {
      this.markFormGroupTouched(this.agencyForm);
      this.showErrorMessage('Veuillez vérifier les informations de l\'agence');
    }
  }

  onSaveFinancial(): void {
    if (this.financialForm.valid) {
      this.isLoading = true;
      
      setTimeout(() => {
        console.log('Sauvegarde des paramètres financiers:', this.financialForm.value);
        this.isLoading = false;
        this.showSuccessMessage('Paramètres financiers sauvegardés!');
      }, 1000);
    } else {
      this.markFormGroupTouched(this.financialForm);
      this.showErrorMessage('Veuillez vérifier les paramètres financiers');
    }
  }

  onTabChange(event: any): void {
    if (typeof event === 'number') {
      this.selectedTab = event;
    } else if (event && typeof event.index === 'number') {
      this.selectedTab = event.index;
    }
  }

  exportSettings(): void {
    const allSettings: SettingsData = {
      general: this.generalForm.value,
      notifications: this.notificationForm.value,
      agency: this.agencyForm.value,
      financial: this.financialForm.value
    };
    
    const dataStr = JSON.stringify(allSettings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `paramètres-tchak-immobilier-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    this.showSuccessMessage('Paramètres exportés avec succès!');
  }

  resetForm(form: FormGroup): void {
    form.reset();
    this.loadSettings(); // Recharger les valeurs par défaut
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }

  // Getters pour faciliter l'accès dans le template
  get generalFormControls() {
    return this.generalForm.controls;
  }

  get agencyFormControls() {
    return this.agencyForm.controls;
  }

  get financialFormControls() {
    return this.financialForm.controls;
  }

  // Méthode utilitaire pour formater les numéros de téléphone
  formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Formatage pour le Mali
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('223')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('00223')) {
      return `+${cleaned.substring(2)}`;
    }
    return phone;
  }
}