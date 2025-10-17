  // ...existing code...
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RecoveriesService, Recovery } from './recoveries.service';

@Component({
  selector: 'app-recoveries',
  templateUrl: './recoveries.component.html',
  styleUrls: ['./recoveries.component.scss'],
  standalone: false
})
export class RecoveriesComponent implements OnInit {
  recoveries: Recovery[] = [];

  constructor(private recoveriesService: RecoveriesService, private router: Router) {}

  ngOnInit(): void {
    this.recoveries = this.recoveriesService.getRecoveries();
  }

  goToDetail(recovery: Recovery) {
    this.router.navigate(['demo/admin-panel/recoveries', recovery.id]);
  }

  goToNew() {
    this.router.navigate(['demo/admin-panel/recoveries/new']);
  }


  goToNewCollector() {
    this.router.navigate(['demo/admin-panel/collectors/new']);
  }
}
