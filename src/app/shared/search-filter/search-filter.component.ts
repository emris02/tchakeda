import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-search-filter',
  templateUrl: './search-filter.component.html',
  styleUrls: ['./search-filter.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule]
})
export class SearchFilterComponent {
  @Input() entityType: string = '';
  @Input() placeholder: string = '';

  @Output() searchChange = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<any>();
  @Output() refresh = new EventEmitter<void>();
  @Output() print = new EventEmitter<void>();
  @Output() addNew = new EventEmitter<void>();

  searchControl = new FormControl('');
  selectedFilters: any = {};

  constructor() {
    // debounce the search input
    this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe(v => {
      this.searchChange.emit((v || '').toString());
    });
  }

  onFilterChange(key: string, value: any) {
    this.selectedFilters = { ...this.selectedFilters, [key]: value };
    this.filterChange.emit(this.selectedFilters);
  }

  onRefresh() {
    this.refresh.emit();
  }

  onPrint() {
    this.print.emit();
  }

  onAddNew() {
    this.addNew.emit();
  }
}
