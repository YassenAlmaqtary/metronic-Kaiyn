import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Account, AccountStructureType } from '../../../../core/api/models/account.models';
import { SaveStockReceivingTypeRequest } from '../../../../core/api/models/stock-receiving-type.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AccountsService } from '../../../../core/services/accounts.service';
import { LanguageService } from '../../../../core/services/language.service';
import { StockReceivingTypesService } from '../../../../core/services/stock-receiving-types.service';

@Component({
  selector: 'app-stock-receiving-type-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './stock-receiving-type-form.component.html',
  styleUrl: './stock-receiving-type-form.component.scss',
})
export class StockReceivingTypeFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private stockReceivingTypesService = inject(StockReceivingTypesService);
  private accountsService = inject(AccountsService);
  private language = inject(LanguageService);

  loading = signal(false);
  loadingAccounts = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  receivingTypeId = signal<number | null>(null);
  accounts = signal<Account[]>([]);

  postingAccounts = computed(() => {
    const active = this.accounts().filter((account) => account.accStopped !== true);
    const leaves = active.filter((account) => account.accType === AccountStructureType.Sub);
    return leaves.length > 0 ? leaves : active;
  });

  form = new FormGroup({
    receivingTypeName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    }),
    description: new FormControl('', { nonNullable: true }),
    debitAccountId: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    creditAccountId: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.loadAccounts();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.receivingTypeId.set(id);
    this.loadReceivingType(id);
  }

  loadAccounts(): void {
    this.loadingAccounts.set(true);
    this.accountsService.getAll().subscribe({
      next: (accounts) => {
        this.accounts.set(
          [...accounts].sort((a, b) => Number(a.accCode) - Number(b.accCode)),
        );
        this.loadingAccounts.set(false);
      },
      error: (error) => {
        this.accounts.set([]);
        this.loadingAccounts.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.t('stockReceivingTypes.accountsLoadError')),
        );
      },
      complete: () => {
        if (this.loadingAccounts()) {
          this.loadingAccounts.set(false);
          if (!this.accounts().length && !this.errorMessage()) {
            this.errorMessage.set(this.t('stockReceivingTypes.accountsLoadError'));
          }
        }
      },
    });
  }

  loadReceivingType(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.stockReceivingTypesService.getById(id).subscribe({
      next: (item) => {
        this.form.patchValue({
          receivingTypeName: item.receivingTypeName ?? '',
          description: item.description ?? '',
          debitAccountId: item.debitAccountId ?? null,
          creditAccountId: item.creditAccountId ?? null,
          isActive: item.isActive ?? true,
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.t('stockReceivingTypes.notFound')),
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
    const payload: SaveStockReceivingTypeRequest = {
      receivingTypeName: raw.receivingTypeName.trim(),
      debitAccountId: Number(raw.debitAccountId),
      creditAccountId: Number(raw.creditAccountId),
      description: raw.description.trim() || null,
      isActive: raw.isActive,
    };

    if (this.isEditMode()) {
      const id = this.receivingTypeId();
      if (!id) {
        return;
      }

      this.stockReceivingTypesService
        .update(id, { ...payload, receivingTypeId: id })
        .subscribe({
          next: () => this.navigateBack('stockReceivingTypes.updateSuccess'),
          error: (error) => this.handleSaveError(error),
        });
      return;
    }

    this.stockReceivingTypesService.create(payload).subscribe({
      next: () => this.navigateBack('stockReceivingTypes.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private t(key: string): string {
    return this.language.translate(key as TranslationKey);
  }

  private navigateBack(messageKey: string): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/inventory/stock-receiving-types'], {
      state: { successMessage: this.t(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.t('stockReceivingTypes.saveError')),
    );
  }
}
