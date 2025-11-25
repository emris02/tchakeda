import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss']
})
export class PaginationComponent {
  @Input() page = 1;
  @Input() pageSize = 10;
  @Input() total = 0;
  @Input() pageSizes: number[] = [10, 20, 50];
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / (this.pageSize || 1)));
  }

  pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  go(p: number) {
    if (p < 1) p = 1;
    if (p > this.totalPages) p = this.totalPages;
    if (p === this.page) return;
    this.page = p;
    this.pageChange.emit(this.page);
  }

  changeSize(size: number | string) {
    const s = Number(size) || 10;
    this.pageSize = s;
    this.pageSizeChange.emit(this.pageSize);
    this.page = 1;
    this.pageChange.emit(this.page);
  }
}
