import { Component, Inject } from '@angular/core';
import { NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CollectorsService } from '../collectors.service';

@Component({
  selector: 'app-collectors-form',
  templateUrl: './collectors-form.component.html',
  styleUrls: ['./collectors-form.component.scss'],
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class CollectorsFormComponent {
  form = {
    fullName: '',
    country: 'Mali',
    address: '',
    phone: '',
    email: '',
    identityType: '',
    identityNumber: ''
  };
  errors: Record<string, string> = {};
  isSubmitting = false;
  get hasErrors(): boolean { return Object.keys(this.errors || {}).length > 0; }

  constructor(
    private dialogRef: MatDialogRef<CollectorsFormComponent>,
    private collectorsService: CollectorsService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    if (data && data.form) {
      this.form = { ...this.form, ...data.form };
    }
  }

  validate() {
    this.errors = {};
    if (!this.form.fullName) this.errors['fullName'] = 'Nom requis';
    if (!this.form.phone) this.errors['phone'] = 'Téléphone requis';
    const valid = Object.keys(this.errors).length === 0;
    if (!valid) {
      const firstKey = Object.keys(this.errors)[0];
      setTimeout(() => {
        const el = document.querySelector(`[name="${firstKey}"]`) as HTMLElement | null;
        if (el && typeof (el as any).focus === 'function') (el as any).focus();
      }, 0);
    }
    return valid;
  }

  save(formRef?: NgForm) {
    if (formRef && formRef.form) formRef.form.markAllAsTouched();
    if (!this.validate()) return;
    this.isSubmitting = true;
    const result = this.collectorsService.createCollector({ ...this.form });
    this.isSubmitting = false;
    this.dialogRef.close(result);
  }

  cancel() {
    this.dialogRef.close();
  }
}
