import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Account, AccountStructureType } from '../../../../core/api/models/account.models';
import { SaveStockIssueTypeRequest } from '../../../../core/api/models/stock-issue-type.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AccountsService } from '../../../../core/services/accounts.service';
import { LanguageService } from '../../../../core/services/language.service';
import { StockIssueTypesService } from '../../../../core/services/stock-issue-types.service';

@Component({
  selector: 'app-stock-issue-type-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './stock-issue-type-form.component.html',
  styleUrl: './stock-issue-type-form.component.scss',
})
export class StockIssueTypeFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private stockIssueTypesService = inject(StockIssueTypesService);
  private accountsService = inject(AccountsService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  issueTypeId = signal<number | null>(null);
  accounts = signal<Account[]>([]);

  postingAccounts = computed(() => {
    const active = this.accounts().filter((account) => !account.accStopped);
    const leaves = active.filter((account) => account.accType === AccountStructureType.Sub);
    return leaves.length > 0 ? leaves : active;
  });

  form = new FormGroup({
    issueTypeName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(250)],
    }),
    debitAccountId: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    creditAccountId: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.accountsService.getAll().subscribe({
      next: (accounts) =>
        this.accounts.set([...accounts].sort((a, b) => a.accCode - b.accCode)),
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.issueTypeId.set(id);
    this.loadIssueType(id);
  }

  loadIssueType(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.stockIssueTypesService.getById(id).subscribe({
      next: (item) => {
        this.form.patchValue({
          issueTypeName: item.issueTypeName ?? '',
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
          extractApiErrorMessage(error, this.t('stockIssueTypes.notFound')),
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
    const payload: SaveStockIssueTypeRequest = {
      issueTypeName: raw.issueTypeName.trim(),
      debitAccountId: Number(raw.debitAccountId),
      creditAccountId: Number(raw.creditAccountId),
      description: raw.description.trim() || null,
      isActive: raw.isActive,
    };

    if (this.isEditMode()) {
      const id = this.issueTypeId();
      if (!id) {
        return;
      }

      this.stockIssueTypesService.update(id, { ...payload, issueTypeId: id }).subscribe({
        next: () => this.navigateBack('stockIssueTypes.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    this.stockIssueTypesService.create(payload).subscribe({
      next: () => this.navigateBack('stockIssueTypes.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private t(key: string): string {
    return this.language.translate(key as TranslationKey);
  }

  private navigateBack(messageKey: string): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/inventory/stock-issue-types'], {
      state: { successMessage: this.t(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.t('stockIssueTypes.saveError')),
    );
  }
}
