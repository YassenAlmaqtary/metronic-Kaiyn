import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  CreateFiscalYearRequest,
  UpdateFiscalYearRequest,
} from '../../../../core/api/models/fiscal-year.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { FiscalYearsService } from '../../../../core/services/fiscal-years.service';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-fiscal-year-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './fiscal-year-form.component.html',
  styleUrl: './fiscal-year-form.component.scss',
})
export class FiscalYearFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fiscalYearsService = inject(FiscalYearsService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  fiscalYearId = signal<number | null>(null);

  form = new FormGroup({
    year: new FormControl<number | null>(new Date().getFullYear(), {
      validators: [Validators.required],
    }),
    startDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    endDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    description: new FormControl('', { nonNullable: true }),
    isClosed: new FormControl(false, { nonNullable: true }),
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.fiscalYearId.set(id);
    this.loadFiscalYear(id);
  }

  loadFiscalYear(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.fiscalYearsService.getById(id).subscribe({
      next: (item) => {
        this.form.patchValue({
          year: item.year,
          startDate: this.toDateInput(item.startDate),
          endDate: this.toDateInput(item.endDate),
          description: item.description ?? '',
          isClosed: item.isClosed,
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('fiscalYears.notFound')),
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
    const payload: CreateFiscalYearRequest | UpdateFiscalYearRequest = {
      year: Number(raw.year),
      startDate: this.toApiDate(raw.startDate),
      endDate: this.toApiDate(raw.endDate),
      description: raw.description.trim() || null,
      isClosed: raw.isClosed,
    };

    if (this.isEditMode()) {
      const id = this.fiscalYearId();
      if (!id) {
        return;
      }

      this.fiscalYearsService.update(id, payload).subscribe({
        next: () => this.navigateBack('fiscalYears.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    this.fiscalYearsService.create(payload).subscribe({
      next: () => this.navigateBack('fiscalYears.createSuccess'),
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
    void this.router.navigate(['/demo1/accounting/fiscal-years'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('fiscalYears.saveError')),
    );
  }
}
