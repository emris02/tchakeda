export interface NavigationItem {
  id: string;
  title: string;
  type: 'item' | 'collapse' | 'group';
  translate?: string;
  icon?: string;
  hidden?: boolean;
  url?: string;
  classes?: string;
  exactMatch?: boolean;
  external?: boolean;
  target?: boolean;
  breadcrumbs?: boolean;
  badge?: {
    title?: string;
    type?: string;
  };
  queryParams?: any;
  children?: NavigationItem[];
}

export const NavigationItems: NavigationItem[] = [
  {
    id: 'navigation',
    title: '',
    type: 'group',
    icon: 'icon-group',
    children: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        type: 'item',
        url: '/analytics',
        icon: 'feather icon-home'
      }
    ]
  },
  {
    id: 'biens-immobilier',
    title: ' ',
    type: 'group',
    icon: 'icon-group',
    children: [
      {
        id: 'owners',
        title: 'Propriétaires',
        type: 'collapse',
        icon: 'feather icon-user',
        children: [
          {
            id: 'owners-list',
            title: 'Liste des propriétaires',
            type: 'item',
            icon: 'feather icon-list',
            url: '/demo/admin-panel/owners',
            classes: 'nav-child-icon'
          },
          {
            id: 'owners-payments',
            title: 'Paiements',
            type: 'item',
            icon: 'feather icon-credit-card',
            url: '/demo/admin-panel/owners/payments',
            classes: 'nav-child-icon'
          }
        ]
      },
            {
        id: 'buildings',
        title: 'Bâtiments',
        type: 'item',
        icon: 'feather icon-layers',
  url: '/demo/admin-panel/buildings'
      },
      {
        id: 'apartments',
        title: 'Appartements',
        type: 'item',
        icon: 'feather icon-grid',
  url: '/demo/admin-panel/apartments'
      },      
      {
        id: 'rentals',
        title: 'Locations',
        type: 'item',
        icon: 'feather icon-file-text',
  url: '/demo/admin-panel/rentals'
      },
      {
        id: 'tenants',
        title: 'Locataires',
        type: 'item',
        icon: 'feather icon-users',
        url: '/demo/admin-panel/tenants',
          },
  
      {
        id: 'recoveries',
        title: 'Recouvrements',
        type: 'collapse',
        // 🔥 icône corrigée : layers pour représenter le recouvrement
        icon: 'feather icon-layers',
        children: [
          {
            id: 'recoveries-list',
            title: 'Liste des recouvreurs',
            type: 'item',
            icon: 'feather icon-list',
            url: '/demo/admin-panel/collectors',
            classes: 'nav-child-icon'
          },
          {
            id: 'recoveries-payments',
            title: 'Paiements',
            type: 'item',
            icon: 'feather icon-credit-card',
            url: '/demo/admin-panel/recoveries/payments',
            classes: 'nav-child-icon'
          }
        ]
      },
    
    
 
   {
        id: 'settings',
        title: 'Paramètres',
        type: 'item',
        icon: 'feather icon-settings',
          url: '/demo/admin-panel/settings',
          queryParams: { collectorId: 42 },
        },
  ]
   },
];
