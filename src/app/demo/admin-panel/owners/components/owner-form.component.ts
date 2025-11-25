import { Component, Inject, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { OwnersService } from '../owners.service';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-owner-form',
  templateUrl: './owner-form.component.html',
  styleUrls: ['./owner-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ]
})
export class OwnerFormComponent {
  @Input() initialData: any;
  @Output() saved = new EventEmitter<any>();
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<OwnerFormComponent>,
    private ownersService: OwnersService
  ) {
    this.form = this.fb.group({
      fullName: [data?.fullName || '', Validators.required],
      email: [data?.email || '', [Validators.required, Validators.email]],
      phone: [data?.phone || '', Validators.required],
      country: [data?.country || '', Validators.required],
      adress: [data?.adress || '', Validators.required],
      profession: [data?.profession || '']
    });
  }

  onSubmit() {
    if (this.form.valid) {
      // Normalize fields and persist via OwnersService so owner exists in localStorage
      const payload: any = {
        name: this.form.value.fullName,
        email: this.form.value.email,
        phone: this.form.value.phone,
        country: this.form.value.country,
        adress: this.form.value.adress,
        profession: this.form.value.profession
      };
      try {
        const created = this.ownersService.addOwner(payload as any);
        this.saved.emit(created);
        if (this.dialogRef) this.dialogRef.close(created);
      } catch (e) {
        // fallback: emit local object if service unavailable
        const newOwner = { id: Date.now(), name: this.form.value.fullName, ...this.form.value };
        this.saved.emit(newOwner);
        if (this.dialogRef) this.dialogRef.close(newOwner);
      }
    }
  }

  onCancel() {
    if (this.dialogRef) this.dialogRef.close();
  }
}
