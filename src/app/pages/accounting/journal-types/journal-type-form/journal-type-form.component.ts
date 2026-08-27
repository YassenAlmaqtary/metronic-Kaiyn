import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  CreateJournalTypeRequest,
  UpdateJournalTypeRequest,
} from '../../../../core/api/models/journal-type.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { JournalTypesService } from '../../../../core/services/journal-types.service';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-journal-type-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './journal-type-form.component.html',
  styleUrl: './journal-type-form.component.scss',
})
export class JournalTypeFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private journalTypesService = inject(JournalTypesService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  isSystemType = signal(false);
  journalTypeId = signal<number | null>(null);

  form = new FormGroup({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
    allowManualEntry: new FormControl(true, { nonNullable: true }),
    autoGenerate: new FormControl(false, { nonNullable: true }),
    affectsBalances: new FormControl(true, { nonNullable: true }),
    allowCrossBranches: new FormControl(false, { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true }),
    defaultDebitAccountId: new FormControl<number | null>(null),
    defaultCreditAccountId: new FormControl<number | null>(null),
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.journalTypeId.set(id);
    this.loadJournalType(id);
  }

  loadJournalType(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.journalTypesService.getById(id).subscribe({
      next: (item) => {
        this.isSystemType.set(item.isSystem);
        this.form.patchValue({
          code: item.code ?? '',
          name: item.name ?? '',
          description: item.description ?? '',
          allowManualEntry: item.allowManualEntry ?? true,
          autoGenerate: item.autoGenerate ?? false,
          affectsBalances: item.affectsBalances ?? true,
          allowCrossBranches: item.allowCrossBranches ?? false,
          isActive: item.isActive ?? true,
          defaultDebitAccountId: item.defaultDebitAccountId ?? null,
          defaultCreditAccountId: item.defaultCreditAccountId ?? null,
        });

        if (item.isSystem) {
          this.form.controls.code.disable();
          this.form.controls.name.disable();
        }

        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('journalTypes.notFound')),
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
      code: raw.code.trim(),
      name: raw.name.trim(),
      description: raw.description.trim() || null,
      allowManualEntry: raw.allowManualEntry,
      autoGenerate: raw.autoGenerate,
      affectsBalances: raw.affectsBalances,
      allowCrossBranches: raw.allowCrossBranches,
      isActive: raw.isActive,
      defaultDebitAccountId: raw.defaultDebitAccountId,
      defaultCreditAccountId: raw.defaultCreditAccountId,
    };

    if (this.isEditMode()) {
      const id = this.journalTypeId();
      if (!id) {
        return;
      }

      const payload: UpdateJournalTypeRequest = {
        journalTypeId: id,
        ...basePayload,
      };

      this.journalTypesService.update(id, payload).subscribe({
        next: () => this.navigateBack('journalTypes.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    const payload: CreateJournalTypeRequest = basePayload;
    this.journalTypesService.create(payload).subscribe({
      next: () => this.navigateBack('journalTypes.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: TranslationKey): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/accounting/journal-types'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('journalTypes.saveError')),
    );
  }
}
