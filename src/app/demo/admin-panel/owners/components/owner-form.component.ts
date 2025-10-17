import { Component, Inject, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

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
    private dialogRef: MatDialogRef<OwnerFormComponent>
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
      const newOwner = { id: Date.now(), ...this.form.value };
      this.saved.emit(newOwner);
      if (this.dialogRef) this.dialogRef.close(newOwner);
    }
  }

  onCancel() {
    if (this.dialogRef) this.dialogRef.close();
  }
}
