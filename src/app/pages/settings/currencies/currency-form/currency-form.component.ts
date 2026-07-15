import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  CreateCurrencyRequest,
  UpdateCurrencyRequest,
} from '../../../../core/api/models/currency.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { CurrenciesService } from '../../../../core/services/currencies.service';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-currency-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './currency-form.component.html',
  styleUrl: './currency-form.component.scss',
})
export class CurrencyFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private currenciesService = inject(CurrenciesService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  currencyId = signal<number | null>(null);

  form = new FormGroup({
    currencyName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    currencyShorcut: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(10)],
    }),
    fakhName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(100)],
    }),
    valuesCurr: new FormControl<number | null>(null),
    isActive: new FormControl(true, { nonNullable: true }),
    isBaseCurrency: new FormControl(false, { nonNullable: true }),
    effectiveDate: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.currencyId.set(id);
    this.loadCurrency(id);
  }

  loadCurrency(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.currenciesService.getById(id).subscribe({
      next: (currency) => {
        this.form.patchValue({
          currencyName: currency.currencyName ?? '',
          currencyShorcut: currency.currencyShorcut ?? '',
          fakhName: currency.fakhName ?? '',
          valuesCurr: currency.valuesCurr ?? null,
          isActive: currency.isActive ?? true,
          isBaseCurrency: currency.isBaseCurrency,
          effectiveDate: this.toDateInput(currency.effectiveDate),
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('currencies.notFound')),
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
    const payload: CreateCurrencyRequest | UpdateCurrencyRequest = {
      currencyName: raw.currencyName.trim() || null,
      currencyShorcut: raw.currencyShorcut.trim() || null,
      fakhName: raw.fakhName.trim() || null,
      valuesCurr: raw.valuesCurr,
      isActive: raw.isActive,
      isBaseCurrency: raw.isBaseCurrency,
      effectiveDate: this.toApiDate(raw.effectiveDate),
    };

    if (this.isEditMode()) {
      const id = this.currencyId();
      if (!id) {
        return;
      }

      this.currenciesService.update(id, payload).subscribe({
        next: () => this.navigateBack('currencies.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    this.currenciesService.create(payload).subscribe({
      next: () => this.navigateBack('currencies.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: TranslationKey): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/settings/currencies'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('currencies.saveError')),
    );
  }

  private toDateInput(value?: string | null): string {
    if (!value) {
      return '';
    }
    return value.slice(0, 10);
  }

  private toApiDate(value: string): string | null {
    if (!value) {
      return null;
    }
    return value;
  }
}
