import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  CreateAccountingPeriodRequest,
  UpdateAccountingPeriodRequest,
} from '../../../../core/api/models/accounting-period.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AccountingPeriodsService } from '../../../../core/services/accounting-periods.service';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-accounting-period-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './accounting-period-form.component.html',
  styleUrl: './accounting-period-form.component.scss',
})
export class AccountingPeriodFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private accountingPeriodsService = inject(AccountingPeriodsService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  periodId = signal<number | null>(null);

  form = new FormGroup({
    periodName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    startDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    endDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    fiscalYear: new FormControl<number | null>(new Date().getFullYear(), {
      validators: [Validators.required],
    }),
    isClosed: new FormControl(false, { nonNullable: true }),
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.periodId.set(id);
    this.loadPeriod(id);
  }

  loadPeriod(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.accountingPeriodsService.getById(id).subscribe({
      next: (period) => {
        this.form.patchValue({
          periodName: period.periodName ?? '',
          startDate: this.toDateInput(period.startDate),
          endDate: this.toDateInput(period.endDate),
          fiscalYear: period.fiscalYear,
          isClosed: period.isClosed,
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('accountingPeriods.notFound')),
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
    const payload: CreateAccountingPeriodRequest | UpdateAccountingPeriodRequest = {
      periodName: raw.periodName.trim(),
      startDate: this.toApiDate(raw.startDate),
      endDate: this.toApiDate(raw.endDate),
      fiscalYear: Number(raw.fiscalYear),
      isClosed: raw.isClosed,
    };

    if (this.isEditMode()) {
      const id = this.periodId();
      if (!id) {
        return;
      }

      this.accountingPeriodsService.update(id, payload).subscribe({
        next: () => this.navigateBack('accountingPeriods.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    this.accountingPeriodsService.create(payload).subscribe({
      next: () => this.navigateBack('accountingPeriods.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private toDateInput(value: string): string {
    return value.slice(0, 10);
  }

  private toApiDate(value: string): string {
    return new Date(`${value}T00:00:00`).toISOString();
  }

  private navigateBack(messageKey: TranslationKey): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/accounting/periods'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('accountingPeriods.saveError')),
    );
  }
}
