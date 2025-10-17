import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TenantsService } from '../tenants.service';

@Component({
  selector: 'app-tenant-form',
  templateUrl: './tenant-form.component.html',
  styleUrls: ['./tenant-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule
  ]
})
export class TenantFormComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<TenantFormComponent>,
    private tenantsService: TenantsService
  ) {
    this.form = this.fb.group({
      fullName: [data?.fullName || '', Validators.required],
      email: [data?.email || '', [Validators.required, Validators.email]],
      phone: [data?.phone || '', Validators.required],
      address: [data?.address || '', Validators.required]
    });
  }

  onSubmit() {
    if (this.form.valid) {
      const newTenant = this.tenantsService.createTenant(this.form.value);
      this.dialogRef.close(newTenant);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
