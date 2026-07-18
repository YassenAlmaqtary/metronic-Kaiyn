import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Account } from '../../../../core/api/models/account.models';
import {
  CommonTaxTypes,
  CreateTaxSetupRequest,
  UpdateTaxSetupRequest,
} from '../../../../core/api/models/tax-setup.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AccountsService } from '../../../../core/services/accounts.service';
import { AuthService } from '../../../../core/api/auth.service';
import { LanguageService } from '../../../../core/services/language.service';
import { TaxSetupsService } from '../../../../core/services/tax-setups.service';

@Component({
  selector: 'app-tax-setup-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './tax-setup-form.component.html',
  styleUrl: './tax-setup-form.component.scss',
})
export class TaxSetupFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private taxSetupsService = inject(TaxSetupsService);
  private accountsService = inject(AccountsService);
  private auth = inject(AuthService);
  private language = inject(LanguageService);

  readonly commonTaxTypes = CommonTaxTypes;

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  taxSetupId = signal<number | null>(null);
  accounts = signal<Account[]>([]);

  form = new FormGroup({
    taxCode: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    taxType: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(20)],
    }),
    accountId: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    taxRate: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0), Validators.max(100)],
    }),
    startDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    endDate: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.accountsService.getAll().subscribe({
      next: (accounts) => this.accounts.set(accounts.sort((a, b) => a.accCode - b.accCode)),
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.form.controls.startDate.setValue(new Date().toISOString().slice(0, 10));
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.taxSetupId.set(id);
    this.loadTaxSetup(id);
  }

  loadTaxSetup(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.taxSetupsService.getById(id).subscribe({
      next: (item) => {
        this.form.patchValue({
          taxCode: item.taxCode ?? '',
          taxType: item.taxType ?? '',
          accountId: item.accountId,
          taxRate: item.taxRate,
          startDate: item.startDate.slice(0, 10),
          endDate: item.endDate ? item.endDate.slice(0, 10) : '',
          notes: item.notes ?? '',
          isActive: item.isActive ?? true,
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('taxSetups.notFound')),
        );
      },
    });
  }

  accountLabel(account: Account): string {
    return `${account.accCode} — ${account.accName || account.accId}`;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const raw = this.form.getRawValue();
    const payload: CreateTaxSetupRequest | UpdateTaxSetupRequest = {
      taxCode: raw.taxCode.trim(),
      taxType: raw.taxType.trim(),
      accountId: Number(raw.accountId),
      taxRate: Number(raw.taxRate),
      startDate: new Date(`${raw.startDate}T00:00:00`).toISOString(),
      endDate: raw.endDate ? new Date(`${raw.endDate}T00:00:00`).toISOString() : null,
      notes: raw.notes.trim() || null,
      isActive: raw.isActive,
      createdBy: this.auth.userName() || null,
    };

    if (this.isEditMode()) {
      const id = this.taxSetupId();
      if (!id) {
        return;
      }
      this.taxSetupsService.update(id, payload).subscribe({
        next: () => this.navigateBack('taxSetups.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    this.taxSetupsService.create(payload).subscribe({
      next: () => this.navigateBack('taxSetups.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: TranslationKey): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/accounting/tax-setups'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('taxSetups.saveError')),
    );
  }
}
