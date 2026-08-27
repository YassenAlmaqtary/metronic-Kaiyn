import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  CreateSupplierRequest,
  UpdateSupplierRequest,
} from '../../../../core/api/models/supplier.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { SuppliersService } from '../../../../core/services/suppliers.service';

@Component({
  selector: 'app-supplier-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './supplier-form.component.html',
})
export class SupplierFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private suppliersService = inject(SuppliersService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  supplierId = signal<number | null>(null);

  form = new FormGroup({
    supplierName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(50)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(150), Validators.email],
    }),
    taxNumber: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(50)],
    }),
    address: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(300)],
    }),
    city: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(100)],
    }),
    country: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(100)],
    }),
    notes: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
    isActive: new FormControl(true, { nonNullable: true }),
    inactiveReason: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(200)],
    }),
    isLinkedToGL: new FormControl(false, { nonNullable: true }),
    glAccountCode: new FormControl<number | null>(null),
    type: new FormControl<number | null>(null),
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.supplierId.set(id);
    this.loadSupplier(id);
  }

  loadSupplier(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.suppliersService.getById(id).subscribe({
      next: (supplier) => {
        this.form.patchValue({
          supplierName: supplier.supplierName ?? '',
          phone: supplier.phone ?? '',
          email: supplier.email ?? '',
          taxNumber: supplier.taxNumber ?? '',
          address: supplier.address ?? '',
          city: supplier.city ?? '',
          country: supplier.country ?? '',
          notes: supplier.notes ?? '',
          isActive: supplier.isActive ?? true,
          inactiveReason: supplier.inactiveReason ?? '',
          isLinkedToGL: supplier.isLinkedToGL ?? false,
          glAccountCode: supplier.glAccountCode ?? null,
          type: supplier.type ?? null,
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('suppliers.notFound')),
        );
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const raw = this.form.getRawValue();
    const basePayload: CreateSupplierRequest = {
      supplierName: raw.supplierName.trim(),
      phone: raw.phone.trim() || null,
      email: raw.email.trim() || null,
      taxNumber: raw.taxNumber.trim() || null,
      address: raw.address.trim() || null,
      city: raw.city.trim() || null,
      country: raw.country.trim() || null,
      notes: raw.notes.trim() || null,
      isActive: raw.isActive,
      inactiveReason: raw.inactiveReason.trim() || null,
      isLinkedToGL: raw.isLinkedToGL,
      glAccountCode: raw.glAccountCode,
      type: raw.type,
    };

    if (this.isEditMode()) {
      const id = this.supplierId();
      if (!id) {
        return;
      }

      const payload: UpdateSupplierRequest = {
        supplierId: id,
        ...basePayload,
      };

      this.suppliersService.update(id, payload).subscribe({
        next: () => this.navigateBack('suppliers.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    this.suppliersService.create(basePayload).subscribe({
      next: () => this.navigateBack('suppliers.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: TranslationKey): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/purchasing/suppliers'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('suppliers.saveError')),
    );
  }
}
