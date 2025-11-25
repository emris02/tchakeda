// angular import
import { Component } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

// bootstrap import
import { NgbDropdownConfig } from '@ng-bootstrap/ng-bootstrap';

// project import
import { SharedModule } from 'src/app/theme/shared/shared.module';

@Component({
  selector: 'app-nav-right',
  imports: [SharedModule, RouterModule, CommonModule],
  templateUrl: './nav-right.component.html',
  styleUrls: ['./nav-right.component.scss'],
  providers: [NgbDropdownConfig],
  animations: [
    trigger('slideInOutLeft', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-in', style({ transform: 'translateX(0%)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)' }))
      ])
    ]),
    trigger('slideInOutRight', [
      transition(':enter', [
        style({ transform: 'translateX(-100%)' }),
        animate('300ms ease-in', style({ transform: 'translateX(0%)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(-100%)' }))
      ])
    ])
  ]
})
export class NavRightComponent {
  // public props
  visibleUserList: boolean;
  chatMessage: boolean;
  friendId!: number;

  // small apps grid for quick navigation (label + route)
  apps: Array<{ label: string; route: string; icon?: string }>;

  // NEW → Barre verticale contrôlée depuis Angular
  showVerticalBar: boolean = true;

  constructor() {
    this.visibleUserList = false;
    this.chatMessage = false;

    this.apps = [
      { label: 'Tchakeda', route: '/analytics', icon: 'T' },
      { label: 'fere.tchakeda', route: 'https://fere.tchakeda.com/', icon: 'F' },
      { label: 'Tchakeda School', route: '/school', icon: 'S' },
      { label: 'Tchakeda Pressing', route: '/pressing', icon: 'P' },
      { label: 'Paiements', route: '/demo/admin-panel/recoveries/payments', icon: '€' },
      { label: 'Recouvrements', route: '/demo/admin-panel/recoveries', icon: 'R' },
      { label: 'Bâtiments', route: '/demo/admin-panel/buildings', icon: 'B' },
      { label: 'Appartements', route: '/demo/admin-panel/apartments', icon: 'A' },
      { label: 'Propriétaires', route: '/demo/admin-panel/owners', icon: 'O' }
    ];
  }

  // public method
  onChatToggle(friendID: any) {
    this.friendId = friendID;
    this.chatMessage = !this.chatMessage;
  }

  // NEW → Méthode de contrôle si un jour tu veux l’animer ou la cacher
  toggleVerticalBar(): void {
    this.showVerticalBar = !this.showVerticalBar;
  }
}
