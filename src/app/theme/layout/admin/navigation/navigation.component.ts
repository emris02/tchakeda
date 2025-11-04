// Angular Import
import { Component, output, HostListener } from '@angular/core';

// project import
import { SharedModule } from 'src/app/theme/shared/shared.module';
import { NavContentComponent } from './nav-content/nav-content.component';

@Component({
  selector: 'app-navigation',
  imports: [SharedModule, NavContentComponent],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent {
  // public props
  windowWidth: number;
  NavMobCollapse = output();

  // constructor
  constructor() {
    this.windowWidth = window.innerWidth;
  }

  // public method
  navMobCollapse() {
    if (this.windowWidth < 992) {
      this.NavMobCollapse.emit();
    }
  }

  @HostListener('window:resize', ['$event'])
  // eslint-disable-next-line
  onResize(event: any): void {
    this.windowWidth = event.target.innerWidth;
  }
}
