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
  submitted: boolean = false;

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
    this.submitted = true;
    if (this.form.valid) {
      const newTenant = this.tenantsService.createTenant(this.form.value);
      this.dialogRef.close(newTenant);
      return;
    }
    // mark controls as touched to show validation
    this.form.markAllAsTouched();
    // focus first invalid control
    const firstInvalid = Object.keys(this.form.controls).find(k => this.form.get(k)?.invalid);
    if (firstInvalid) {
      setTimeout(() => {
        const el = document.querySelector(`[formcontrolname="${firstInvalid}"]`) as HTMLElement | null;
        if (el && typeof (el as any).focus === 'function') (el as any).focus();
      }, 0);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
