import { Component, Inject, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { BuildingsService } from '../../buildings/buildings.service';
import { BuildingFormComponent } from '../../buildings/components/building-form.component';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-apartment-form',
  templateUrl: './apartment-form.component.html',
  styleUrls: ['./apartment-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ]
})
export class ApartmentFormComponent {
  @Input() initialData: any;
  @Output() saved = new EventEmitter<any>();
  form: FormGroup;
  buildings: any[] = [];

  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<ApartmentFormComponent>,
    private buildingsService: BuildingsService,
    private dialog: MatDialog
  ) {
    this.buildings = this.buildingsService?.getBuildings() || [];
    this.form = this.fb.group({
      name: [data?.name || '', Validators.required],
      type: [data?.type || '', Validators.required],
      customType: [data?.customType || ''],
      rooms: [data?.rooms || 1, [Validators.required, Validators.min(1)]],
      buildingId: [data?.buildingId || null, Validators.required],
      tenantId: [data?.tenantId || null],
      mention: [data?.mention || 0],
      images: [data?.images || []],
      city: [data?.city || ''],
      region: [data?.region || '']
    });
  }

  openBuildingDialog() {
    if (!this.dialog) return;
    const dialogRef = this.dialog.open(BuildingFormComponent, {
      width: '600px',
      data: {}
    });
  dialogRef.afterClosed().subscribe((result: any) => {
      if (result && this.buildingsService) {
        this.buildings = this.buildingsService.getBuildings();
        this.form.patchValue({ buildingId: result.id });
      }
    });
  }

  onSubmit() {
    if (this.form.valid) {
      const newApartment = { id: Date.now(), ...this.form.value };
      this.saved.emit(newApartment);
      if (this.dialogRef) this.dialogRef.close(newApartment);
    }
  }

  onCancel() {
    if (this.dialogRef) this.dialogRef.close();
  }
}
