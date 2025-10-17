import { OwnersService } from '../../owners/owners.service';
import { MatDialog } from '@angular/material/dialog';
import { OwnerFormComponent } from '../../owners/components/owner-form.component';
import { Component, Inject, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-building-form',
  templateUrl: './building-form.component.html',
  styleUrls: ['./building-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ]
})
export class BuildingFormComponent {
  @Input() initialData: any;
  @Output() saved = new EventEmitter<any>();
  form: FormGroup;

  owners: any[] = [];

  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<BuildingFormComponent>,
    private ownersService: OwnersService,
    private dialog: MatDialog
  ) {
    this.form = this.fb.group({
      name: [data?.name || '', Validators.required],
      type: [data?.type || '', Validators.required],
      customType: [data?.customType || ''],
      floors: [data?.floors || 1, [Validators.required, Validators.min(1)]],
      apartments: [data?.apartments || 1, [Validators.required, Validators.min(1)]],
      address: [data?.address || '', Validators.required],
      city: [data?.city || '', Validators.required],
      region: [data?.region || '', Validators.required],
      constructionDate: [data?.constructionDate || '', Validators.required],
      ownerId: [data?.ownerId || null, Validators.required]
    });
    if (this.ownersService) {
      this.owners = this.ownersService.getOwners ? this.ownersService.getOwners() : [];
    }
  }

  openOwnerDialog() {
    if (!this.dialog) return;
    const dialogRef = this.dialog.open(OwnerFormComponent, {
      width: '500px',
      data: {}
    });
  dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        if (this.ownersService && this.ownersService.addOwner) {
          this.ownersService.addOwner(result);
          this.owners = this.ownersService.getOwners();
          this.form.patchValue({ ownerId: result.id });
        }
      }
    });
  }

  onSubmit() {
    if (this.form.valid) {
      const newBuilding = { id: Date.now(), ...this.form.value };
      this.saved.emit(newBuilding);
      if (this.dialogRef) this.dialogRef.close(newBuilding);
    }
  }

  onCancel() {
    if (this.dialogRef) this.dialogRef.close();
  }
}
