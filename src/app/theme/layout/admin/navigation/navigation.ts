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
  children?: NavigationItem[];
}

export const NavigationItems: NavigationItem[] = [
  {
    id: 'navigation',
    title: 'Navigation',
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
    title: 'Biens Immobilier',
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
        id: 'tenants',
        title: 'Locataires',
        type: 'item',
        icon: 'feather icon-users',
  url: '/demo/admin-panel/tenants'
      },
      {
        id: 'rentals',
        title: 'Locations',
        type: 'item',
        icon: 'feather icon-file-text',
  url: '/demo/admin-panel/rentals'
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
      }
    ]
  },
  {
    id: 'Authentication',
    title: 'Authentication',
    type: 'group',
    icon: 'icon-group',
    children: [
      {
        id: 'signup',
        title: 'Sign up',
        type: 'item',
        url: '/register',
        icon: 'feather icon-at-sign',
        target: true,
        breadcrumbs: false
      },
      {
        id: 'signin',
        title: 'Sign in',
        type: 'item',
        url: '/login',
        icon: 'feather icon-log-in',
        target: true,
        breadcrumbs: false
      }
    ]
  },
];
