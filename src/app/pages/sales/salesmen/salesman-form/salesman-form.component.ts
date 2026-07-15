import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  CreateSalesmanRequest,
  UpdateSalesmanRequest,
} from '../../../../core/api/models/salesman.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { SalesmenService } from '../../../../core/services/salesmen.service';

@Component({
  selector: 'app-salesman-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './salesman-form.component.html',
  styleUrl: './salesman-form.component.scss',
})
export class SalesmanFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private salesmenService = inject(SalesmenService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  salesmanId = signal<number | null>(null);

  form = new FormGroup({
    salesmanNameAr: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    salesmanNameEn: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(150)],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(50)],
    }),
    commissionRate: new FormControl<number | null>(null, {
      validators: [Validators.min(0), Validators.max(100)],
    }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.salesmanId.set(id);
    this.loadSalesman(id);
  }

  loadSalesman(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.salesmenService.getById(id).subscribe({
      next: (salesman) => {
        this.form.patchValue({
          salesmanNameAr: salesman.salesmanNameAr ?? '',
          salesmanNameEn: salesman.salesmanNameEn ?? '',
          phone: salesman.phone ?? '',
          commissionRate: salesman.commissionRate ?? null,
          isActive: salesman.isActive ?? true,
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('salesmen.notFound')),
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
    const basePayload = {
      salesmanNameAr: raw.salesmanNameAr.trim(),
      salesmanNameEn: raw.salesmanNameEn.trim() || null,
      phone: raw.phone.trim() || null,
      commissionRate: raw.commissionRate,
      isActive: raw.isActive,
    };

    if (this.isEditMode()) {
      const id = this.salesmanId();
      if (!id) {
        return;
      }

      const payload: UpdateSalesmanRequest = {
        salesmanId: id,
        ...basePayload,
      };

      this.salesmenService.update(id, payload).subscribe({
        next: () => this.navigateBack('salesmen.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    const payload: CreateSalesmanRequest = basePayload;
    this.salesmenService.create(payload).subscribe({
      next: () => this.navigateBack('salesmen.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: TranslationKey): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/sales/salesmen'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('salesmen.saveError')),
    );
  }
}
