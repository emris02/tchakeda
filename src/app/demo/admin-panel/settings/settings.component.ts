import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

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
  customization: any;
  security: any;
}

interface Tab {
  label: string;
  icon: string;
  hasChanges: boolean;
}

interface Theme {
  id: string;
  name: string;
  primaryColor: string;
  accentColor: string;
}

interface Feature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
}

interface ThemeColors {
  header: string;
  primary: string;
  cards: string;
  background: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit, OnDestroy {
  // Formulaires
  generalForm!: FormGroup;
  notificationForm!: FormGroup;
  agencyForm!: FormGroup;
  financialForm!: FormGroup;

  // États de l'application
  selectedTab = 0;
  isLoading = false;
  hasUnsavedChanges = false;
  currentTheme = 'default';
  uiDensity = 'comfortable';

  // Données de personnalisation
  themes: Theme[] = [
    {
      id: 'default',
      name: 'Classique',
      primaryColor: '#4099ff',
      accentColor: '#ff6b6b'
    },
    {
      id: 'dark',
      name: 'Sombre',
      primaryColor: '#6366f1',
      accentColor: '#f59e0b'
    },
    {
      id: 'green',
      name: 'Nature',
      primaryColor: '#10b981',
      accentColor: '#f59e0b'
    },
    {
      id: 'purple',
      name: 'Royal',
      primaryColor: '#8b5cf6',
      accentColor: '#ec4899'
    }
  ];

  // Couleurs personnalisées
  customColors = {
    primary: '#4099ff',
    accent: '#ff6b6b'
  };

  // Couleurs du thème
  themeColors: ThemeColors = {
    header: '#1a1a1a',
    primary: '#4099ff',
    cards: '#ffffff',
    background: '#f8f9fa',
    success: '#2e7d32',
    warning: '#ed6c02',
    error: '#d32f2f',
    info: '#0288d1'
  };

  // Fonctionnalités
  propertyFeatures: Feature[] = [
    {
      id: 'property_import',
      name: 'Import de biens',
      description: 'Importer des biens depuis un fichier CSV',
      enabled: true,
      category: 'property'
    },
    {
      id: 'property_export',
      name: 'Export de biens',
      description: 'Exporter la liste des biens',
      enabled: true,
      category: 'property'
    },
    {
      id: 'virtual_tours',
      name: 'Visites virtuelles',
      description: 'Gérer les visites virtuelles des biens',
      enabled: false,
      category: 'property'
    },
    {
      id: 'property_analytics',
      name: 'Analytique des biens',
      description: 'Statistiques détaillées sur les biens',
      enabled: true,
      category: 'property'
    }
  ];

  financialFeatures: Feature[] = [
    {
      id: 'online_payments',
      name: 'Paiements en ligne',
      description: 'Accepter les paiements en ligne',
      enabled: true,
      category: 'financial'
    },
    {
      id: 'recurring_invoices',
      name: 'Factures récurrentes',
      description: 'Générer des factures automatiques',
      enabled: false,
      category: 'financial'
    },
    {
      id: 'expense_tracking',
      name: 'Suivi des dépenses',
      description: 'Suivre les dépenses de l\'agence',
      enabled: true,
      category: 'financial'
    },
    {
      id: 'tax_calculations',
      name: 'Calculs fiscaux',
      description: 'Calculs automatiques des taxes',
      enabled: true,
      category: 'financial'
    }
  ];

  analyticsFeatures: Feature[] = [
    {
      id: 'performance_reports',
      name: 'Rapports de performance',
      description: 'Analyser les performances de l\'agence',
      enabled: true,
      category: 'analytics'
    },
    {
      id: 'client_analytics',
      name: 'Analytique clients',
      description: 'Analyser le comportement des clients',
      enabled: false,
      category: 'analytics'
    },
    {
      id: 'market_insights',
      name: 'Insights marché',
      description: 'Données sur le marché immobilier',
      enabled: true,
      category: 'analytics'
    }
  ];

  // Paramètres de sécurité
  securitySettings = {
    sessionTimeout: 60,
    twoFactorAuth: false,
    passwordExpiry: 90,
    loginAttempts: 5
  };

  // Onglets améliorés
  tabs: Tab[] = [
    { label: 'Général', icon: 'fas fa-cog', hasChanges: false },
    { label: 'Personnalisation', icon: 'fas fa-palette', hasChanges: false },
    { label: 'Notifications', icon: 'fas fa-bell', hasChanges: false },
    { label: 'Sécurité', icon: 'fas fa-shield-alt', hasChanges: false },
    { label: 'Agence', icon: 'fas fa-landmark', hasChanges: false },
    { label: 'Financier', icon: 'fas fa-money-bill-wave', hasChanges: false }
  ];

  private destroy$ = new Subject<void>();
  private originalSettings: SettingsData | null = null;

  // Options adaptées pour l'Afrique de l'Ouest
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

  constructor(
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.loadSettings();
    this.setupFormListeners();
    this.setupChangeDetection();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForms(): void {
    // Formulaire Général
    this.generalForm = this.fb.group({
      agencyName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-\(\)]{8,}$/)]],
      address: ['', Validators.maxLength(200)],
      city: ['', Validators.maxLength(50)],
      country: ['ml', Validators.required],
      currency: ['XOF', Validators.required],
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
      weeklyReports: [false],
      monthlyReports: [true]
    });

    // Formulaire Agence
    this.agencyForm = this.fb.group({
      licenseNumber: ['', Validators.maxLength(50)],
      taxId: ['', Validators.maxLength(30)],
      managerName: ['', Validators.maxLength(100)],
      foundationYear: [new Date().getFullYear(), [Validators.min(1900), Validators.max(new Date().getFullYear())]],
      propertyCount: [0, [Validators.min(0), Validators.max(10000)]],
      employeeCount: [0, [Validators.min(0), Validators.max(500)]],
      specialties: ['']
    });

    // Formulaire Financier
    this.financialForm = this.fb.group({
      defaultCommission: [5, [Validators.required, Validators.min(0), Validators.max(50)]],
      vatRate: [18, [Validators.required, Validators.min(0), Validators.max(100)]],
      paymentDueDays: [30, [Validators.required, Validators.min(1), Validators.max(90)]],
      latePaymentFee: [2, [Validators.min(0), Validators.max(20)]],
      securityDepositMonths: [2, [Validators.min(1), Validators.max(6)]],
      bankName: ['', Validators.maxLength(100)],
      accountNumber: ['', Validators.maxLength(34)],
      fiscalYearStart: ['01/01', Validators.pattern(/^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/)]
    });
  }

  private setupFormListeners(): void {
    // Synchronisation automatique de la devise
    this.generalForm.get('currency')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(currency => {
        this.financialForm.patchValue({ currency });
      });

    // Validation en temps réel du téléphone
    this.generalForm.get('phone')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(phone => {
        if (phone && !this.isValidPhoneNumber(phone)) {
          this.generalForm.get('phone')?.setErrors({ invalidPhone: true });
        }
      });

    // Mise à jour automatique du préfixe téléphonique
    this.generalForm.get('country')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(countryCode => {
        const country = this.countries.find(c => c.value === countryCode);
        if (country) {
          const currentPhone = this.generalForm.get('phone')?.value;
          if (!currentPhone || currentPhone.startsWith('+')) {
            this.generalForm.get('phone')?.setValue(country.phoneCode + ' ');
          }
        }
      });
  }

  private setupChangeDetection(): void {
    // Détection des changements pour tous les formulaires
    const forms = [this.generalForm, this.notificationForm, this.agencyForm, this.financialForm];
    
    forms.forEach((form, index) => {
      form.valueChanges
        .pipe(
          debounceTime(300),
          distinctUntilChanged(),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          this.tabs[index].hasChanges = true;
          this.checkUnsavedChanges();
        });
    });

    // Détection des changements pour les paramètres de personnalisation
    this.destroy$.subscribe(() => {
      // Les changements de thème et de couleurs sont gérés par leurs méthodes dédiées
    });
  }

  private checkUnsavedChanges(): void {
    const hasFormChanges = this.tabs.some(tab => tab.hasChanges);
    const hasCustomizationChanges = this.hasCustomizationChanges();
    
    this.hasUnsavedChanges = hasFormChanges || hasCustomizationChanges;
  }

  private hasCustomizationChanges(): boolean {
    // Vérifier si les couleurs personnalisées ont changé
    const originalColors = this.originalSettings?.customization?.themeColors;
    if (originalColors) {
      return JSON.stringify(originalColors) !== JSON.stringify(this.themeColors);
    }
    return false;
  }

  private loadSettings(): void {
    this.isLoading = true;

    const mockSettings: SettingsData = {
      general: {
        agencyName: 'TCHAK Immobilier',
        email: 'contact@tchak-immobilier.com',
        phone: '+223 20 20 20 20',
        address: 'ACI 2000, Rue 123',
        city: 'Bamako',
        country: 'ml',
        currency: 'XOF',
        language: 'fr'
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: true,
        newPropertyAlerts: true,
        newClientAlerts: true,
        paymentReminders: true,
        maintenanceAlerts: true,
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
        specialties: 'Résidentiel, Commercial, Gestion locative'
      },
      financial: {
        defaultCommission: 5,
        vatRate: 18,
        paymentDueDays: 30,
        latePaymentFee: 2,
        securityDepositMonths: 2,
        bankName: 'Bank of Africa Mali',
        accountNumber: 'ML01 1234 5678 9012 3456 7890 123',
        fiscalYearStart: '01/01'
      },
      customization: {
        theme: 'default',
        themeColors: { ...this.themeColors },
        uiDensity: 'comfortable',
        features: this.getAllFeaturesState()
      },
      security: {
        sessionTimeout: 60,
        twoFactorAuth: false,
        passwordExpiry: 90,
        loginAttempts: 5
      }
    };

    setTimeout(() => {
      this.generalForm.patchValue(mockSettings.general);
      this.notificationForm.patchValue(mockSettings.notifications);
      this.agencyForm.patchValue(mockSettings.agency);
      this.financialForm.patchValue(mockSettings.financial);
      this.securitySettings = mockSettings.security;
      
      // Charger la personnalisation
      this.currentTheme = mockSettings.customization.theme;
      this.themeColors = { ...mockSettings.customization.themeColors };
      this.uiDensity = mockSettings.customization.uiDensity;
      this.loadFeaturesState(mockSettings.customization.features);
      
      this.originalSettings = JSON.parse(JSON.stringify(mockSettings));
      this.isLoading = false;
    }, 1000);
  }

  private getAllFeaturesState(): any {
    const allFeatures = [...this.propertyFeatures, ...this.financialFeatures, ...this.analyticsFeatures];
    const featuresState: any = {};
    allFeatures.forEach(feature => {
      featuresState[feature.id] = feature.enabled;
    });
    return featuresState;
  }

  private loadFeaturesState(featuresState: any): void {
    const allFeatures = [...this.propertyFeatures, ...this.financialFeatures, ...this.analyticsFeatures];
    allFeatures.forEach(feature => {
      if (featuresState[feature.id] !== undefined) {
        feature.enabled = featuresState[feature.id];
      }
    });
  }

  // Méthodes de personnalisation
  selectTheme(themeId: string): void {
    this.currentTheme = themeId;
    const theme = this.themes.find(t => t.id === themeId);
    if (theme) {
      this.themeColors.primary = theme.primaryColor;
      this.themeColors.header = this.darkenColor(theme.primaryColor, 30);
      this.applyThemeColors();
      this.tabs[1].hasChanges = true;
      this.checkUnsavedChanges();
    }
  }

  updateCustomColors(): void {
    this.applyThemeColors();
    this.tabs[1].hasChanges = true;
    this.checkUnsavedChanges();
  }

  applyThemeColors(): void {
    // Appliquer les couleurs aux variables CSS
    const root = document.documentElement;
    root.style.setProperty('--primary-color', this.themeColors.primary);
    root.style.setProperty('--header-bg', this.themeColors.header);
    root.style.setProperty('--card-bg', this.themeColors.cards);
    root.style.setProperty('--background', this.themeColors.background);
    root.style.setProperty('--success-color', this.themeColors.success);
    root.style.setProperty('--warning-color', this.themeColors.warning);
    root.style.setProperty('--error-color', this.themeColors.error);
    root.style.setProperty('--info-color', this.themeColors.info);
  }

  setUIDensity(density: string): void {
    this.uiDensity = density;
    document.body.classList.remove('ui-comfortable', 'ui-compact');
    document.body.classList.add(`ui-${density}`);
    this.tabs[1].hasChanges = true;
    this.checkUnsavedChanges();
  }

  toggleFeature(featureId: string): void {
    const allFeatures = [...this.propertyFeatures, ...this.financialFeatures, ...this.analyticsFeatures];
    const feature = allFeatures.find(f => f.id === featureId);
    if (feature) {
      feature.enabled = !feature.enabled;
      this.tabs[1].hasChanges = true;
      this.checkUnsavedChanges();
    }
  }

  // Méthodes utilitaires pour les couleurs
  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  // Méthodes de sauvegarde améliorées
  onSaveGeneral(): void {
    if (this.generalForm.valid) {
      this.isLoading = true;
      setTimeout(() => {
        console.log('Sauvegarde des paramètres généraux:', this.generalForm.value);
        this.isLoading = false;
        this.tabs[0].hasChanges = false;
        this.checkUnsavedChanges();
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
      this.tabs[2].hasChanges = false;
      this.checkUnsavedChanges();
      this.showSuccessMessage('Paramètres de notification sauvegardés!');
    }, 800);
  }

  onSaveAgency(): void {
    if (this.agencyForm.valid) {
      this.isLoading = true;
      setTimeout(() => {
        console.log('Sauvegarde des informations agence:', this.agencyForm.value);
        this.isLoading = false;
        this.tabs[4].hasChanges = false;
        this.checkUnsavedChanges();
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
        this.tabs[5].hasChanges = false;
        this.checkUnsavedChanges();
        this.showSuccessMessage('Paramètres financiers sauvegardés!');
      }, 1000);
    } else {
      this.markFormGroupTouched(this.financialForm);
      this.showErrorMessage('Veuillez vérifier les paramètres financiers');
    }
  }

  saveAllSettings(): void {
    this.isLoading = true;
    const allSettings = this.getAllSettings();
    
    setTimeout(() => {
      console.log('Sauvegarde de tous les paramètres:', allSettings);
      this.isLoading = false;
      
      // Réinitialiser tous les indicateurs de changement
      this.tabs.forEach(tab => tab.hasChanges = false);
      this.hasUnsavedChanges = false;
      
      this.showSuccessMessage('Tous les paramètres ont été sauvegardés avec succès!');
    }, 1500);
  }

  private getAllSettings(): SettingsData {
    return {
      general: this.generalForm.value,
      notifications: this.notificationForm.value,
      agency: this.agencyForm.value,
      financial: this.financialForm.value,
      customization: {
        theme: this.currentTheme,
        themeColors: this.themeColors,
        uiDensity: this.uiDensity,
        features: this.getAllFeaturesState()
      },
      security: this.securitySettings
    };
  }

  // Méthodes de navigation et d'interface
  selectTab(index: number): void {
    this.selectedTab = index;
  }

  getTabChanges(tabIndex: number): string {
    return this.tabs[tabIndex].hasChanges ? '!' : '';
  }

  resetToDefaults(): void {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres aux valeurs par défaut ?')) {
      this.isLoading = true;
      setTimeout(() => {
        this.initForms();
        this.loadSettings();
        this.tabs.forEach(tab => tab.hasChanges = false);
        this.hasUnsavedChanges = false;
        this.isLoading = false;
        this.showSuccessMessage('Paramètres réinitialisés avec succès!');
      }, 1000);
    }
  }

  exportSettings(): void {
    const allSettings = this.getAllSettings();
    const dataStr = JSON.stringify(allSettings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `paramètres-agence-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    this.showSuccessMessage('Paramètres exportés avec succès!');
  }

  importSettings(): void {
    // Implémentation de l'import de paramètres
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          try {
            const settings = JSON.parse(e.target.result);
            this.loadImportedSettings(settings);
          } catch (error) {
            this.showErrorMessage('Erreur lors de la lecture du fichier');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  private loadImportedSettings(settings: SettingsData): void {
    // Charger les paramètres importés
    if (settings.general) this.generalForm.patchValue(settings.general);
    if (settings.notifications) this.notificationForm.patchValue(settings.notifications);
    if (settings.agency) this.agencyForm.patchValue(settings.agency);
    if (settings.financial) this.financialForm.patchValue(settings.financial);
    if (settings.customization) {
      this.currentTheme = settings.customization.theme;
      this.themeColors = settings.customization.themeColors;
      this.uiDensity = settings.customization.uiDensity;
      this.loadFeaturesState(settings.customization.features);
      this.applyThemeColors();
    }
    if (settings.security) this.securitySettings = settings.security;
    
    this.showSuccessMessage('Paramètres importés avec succès!');
  }

  exportUserData(): void {
    this.showSuccessMessage('Export de vos données utilisateur lancé!');
  }

  // Gestion de la navigation
  @HostListener('window:beforeunload', ['$event'])
  beforeUnloadHandler(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = 'Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter ?';
    }
  }

  back(): void {
    if (this.hasUnsavedChanges) {
      if (confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?')) {
        window.history.back();
      }
    } else {
      window.history.back();
    }
  }
  // Ajoutez ces méthodes manquantes dans votre composant SettingsComponent

// Méthode pour obtenir le code téléphonique actuel
getCurrentPhoneCode(): string {
  const selectedCountry = this.generalForm.get('country')?.value;
  const country = this.countries.find(c => c.value === selectedCountry);
  return country?.phoneCode || '+223';
}

// Propriété pour l'année en cours
get currentYear(): number {
  return new Date().getFullYear();
}

// Méthodes de validation pour les pourcentages
validatePercentage(controlName: string, form: FormGroup): boolean {
  const control = form.get(controlName);
  return control ? control.invalid && control.touched : false;
}

// Méthodes de validation pour les nombres
validateNumber(controlName: string, form: FormGroup): boolean {
  const control = form.get(controlName);
  return control ? control.invalid && control.touched : false;
}

// Méthode utilitaire pour formater les numéros de téléphone
formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Formatage pour les pays d'Afrique de l'Ouest
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('223')) {
    return `+${cleaned}`;
  } else if (cleaned.startsWith('00223')) {
    return `+${cleaned.substring(2)}`;
  } else if (cleaned.startsWith('221')) {
    return `+${cleaned}`;
  } else if (cleaned.startsWith('00221')) {
    return `+${cleaned.substring(2)}`;
  }
  return phone;
}

  // Méthodes utilitaires
  private isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^(\+223|00223)?[0-9\s\-\(\)]{8,}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  private showSuccessMessage(message: string): void {
    // Implémentez votre système de notification
    console.log('SUCCESS:', message);
    // this.notificationService.success(message);
  }

  private showErrorMessage(message: string): void {
    console.log('ERROR:', message);
    // this.notificationService.error(message);
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

  // Getters pour le template
  get generalFormControls() { return this.generalForm.controls; }
  get agencyFormControls() { return this.agencyForm.controls; }
  get financialFormControls() { return this.financialForm.controls; }
  get notificationFormControls() { return this.notificationForm.controls; }

  // Méthodes de reset améliorées
  resetGeneralForm(): void { this.generalForm.reset(); this.loadSettings(); }
  resetNotificationForm(): void { this.notificationForm.reset(); this.loadSettings(); }
  resetAgencyForm(): void { this.agencyForm.reset(); this.loadSettings(); }
  resetFinancialForm(): void { this.financialForm.reset(); this.loadSettings(); }
}
