import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Account } from '../../../../core/api/models/account.models';
import { AuthService } from '../../../../core/api/auth.service';
import {
  BankAccountStatus,
  BankAccountType,
  CreateBankAccountRequest,
  UpdateBankAccountRequest,
} from '../../../../core/api/models/bank-account.models';
import { Bank } from '../../../../core/api/models/bank.models';
import { Branch } from '../../../../core/api/models/branch.models';
import { CostCenter } from '../../../../core/api/models/cost-center.models';
import { Currency } from '../../../../core/api/models/currency.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AccountsService } from '../../../../core/services/accounts.service';
import { BankAccountsService } from '../../../../core/services/bank-accounts.service';
import { BanksService } from '../../../../core/services/banks.service';
import { BranchesService } from '../../../../core/services/branches.service';
import { CostCentersService } from '../../../../core/services/cost-centers.service';
import { CurrenciesService } from '../../../../core/services/currencies.service';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-bank-account-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './bank-account-form.component.html',
  styleUrl: './bank-account-form.component.scss',
})
export class BankAccountFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private bankAccountsService = inject(BankAccountsService);
  private banksService = inject(BanksService);
  private branchesService = inject(BranchesService);
  private currenciesService = inject(CurrenciesService);
  private accountsService = inject(AccountsService);
  private costCentersService = inject(CostCentersService);
  private auth = inject(AuthService);
  private language = inject(LanguageService);

  readonly BankAccountType = BankAccountType;
  readonly BankAccountStatus = BankAccountStatus;

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  bankAccountId = signal<number | null>(null);
  banks = signal<Bank[]>([]);
  branches = signal<Branch[]>([]);
  currencies = signal<Currency[]>([]);
  glAccounts = signal<Account[]>([]);
  costCenters = signal<CostCenter[]>([]);

  form = new FormGroup({
    bankID: new FormControl<number | null>(null, { validators: [Validators.required] }),
    branchID: new FormControl<number | null>(null, { validators: [Validators.required] }),
    accountName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    }),
    accountNumber: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    iban: new FormControl('', { nonNullable: true }),
    accountType: new FormControl<number>(BankAccountType.Current, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    accountStatus: new FormControl<number>(BankAccountStatus.Active, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    gL_AccountID: new FormControl<number | null>(null, { validators: [Validators.required] }),
    currencyID: new FormControl<number | null>(null, { validators: [Validators.required] }),
    swiftCode: new FormControl('', { nonNullable: true }),
    allowMultiCurrency: new FormControl(false, { nonNullable: true }),
    exchangeRatePolicy: new FormControl<number | null>(null),
    defaultCostCenter: new FormControl<number | null>(null),
    exchangeDiffAccountID: new FormControl<number | null>(null),
    openingBalance: new FormControl<number | null>(null),
    openingBalanceDate: new FormControl('', { nonNullable: true }),
    openingBalanceVoucher: new FormControl('', { nonNullable: true }),
    supportsChecks: new FormControl(true, { nonNullable: true }),
    supportsTransfers: new FormControl(true, { nonNullable: true }),
    supportsReconciliation: new FormControl(true, { nonNullable: true }),
    requireCheckApproval: new FormControl(false, { nonNullable: true }),
    isHidden: new FormControl(false, { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.banksService.getAll().subscribe({
      next: (items) => this.banks.set(items),
      error: () => this.banks.set([]),
    });
    this.branchesService.getAll().subscribe({
      next: (items) => this.branches.set(items),
      error: () => this.branches.set([]),
    });
    this.currenciesService.getActive().subscribe({
      next: (items) => this.currencies.set(items),
      error: () =>
        this.currenciesService.getAll().subscribe({
          next: (all) => this.currencies.set(all),
          error: () => this.currencies.set([]),
        }),
    });
    this.accountsService.getAll().subscribe({
      next: (items) => this.glAccounts.set(items.sort((a, b) => a.accCode - b.accCode)),
      error: () => this.glAccounts.set([]),
    });
    this.costCentersService.getAll().subscribe({
      next: (items) => this.costCenters.set(items),
      error: () => this.costCenters.set([]),
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.bankAccountId.set(id);
    this.loadBankAccount(id);
  }

  loadBankAccount(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.bankAccountsService.getById(id).subscribe({
      next: (item) => {
        this.form.patchValue({
          bankID: item.bankID,
          branchID: item.branchID,
          accountName: item.accountName ?? '',
          accountNumber: item.accountNumber ?? '',
          iban: item.iban ?? '',
          accountType: item.accountType,
          accountStatus: item.accountStatus,
          gL_AccountID: item.gl_AccountID,
          currencyID: item.currencyID,
          swiftCode: item.swiftCode ?? '',
          allowMultiCurrency: item.allowMultiCurrency ?? false,
          exchangeRatePolicy: item.exchangeRatePolicy ?? null,
          defaultCostCenter: item.defaultCostCenter ?? null,
          exchangeDiffAccountID: item.exchangeDiffAccountID ?? null,
          openingBalance: item.openingBalance ?? null,
          openingBalanceDate: item.openingBalanceDate
            ? item.openingBalanceDate.slice(0, 10)
            : '',
          openingBalanceVoucher: item.openingBalanceVoucher ?? '',
          supportsChecks: item.supportsChecks ?? true,
          supportsTransfers: item.supportsTransfers ?? true,
          supportsReconciliation: item.supportsReconciliation ?? true,
          requireCheckApproval: item.requireCheckApproval ?? false,
          isHidden: item.isHidden ?? false,
          notes: item.notes ?? '',
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('bankAccounts.notFound')),
        );
      },
    });
  }

  accountLabel(account: Account): string {
    return `${account.accCode} — ${account.accName || account.accId}`;
  }

  costCenterLabel(item: CostCenter): string {
    return `${item.costCenterCode || item.costCenterId} — ${item.costCenterName || ''}`;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const userId = this.auth.user()?.userId;
    if (!this.isEditMode() && !userId) {
      this.errorMessage.set(this.language.translate('bankAccounts.saveError'));
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const raw = this.form.getRawValue();
    const common = {
      bankID: Number(raw.bankID),
      branchID: Number(raw.branchID),
      accountName: raw.accountName.trim(),
      accountNumber: raw.accountNumber.trim(),
      accountType: Number(raw.accountType),
      accountStatus: Number(raw.accountStatus),
      currencyID: Number(raw.currencyID),
      gL_AccountID: Number(raw.gL_AccountID),
      iban: raw.iban.trim() || null,
      swiftCode: raw.swiftCode.trim() || null,
      allowMultiCurrency: raw.allowMultiCurrency,
      exchangeRatePolicy: raw.exchangeRatePolicy != null ? Number(raw.exchangeRatePolicy) : null,
      defaultCostCenter:
        raw.defaultCostCenter != null ? Number(raw.defaultCostCenter) : null,
      exchangeDiffAccountID:
        raw.exchangeDiffAccountID != null ? Number(raw.exchangeDiffAccountID) : null,
      openingBalance: raw.openingBalance != null ? Number(raw.openingBalance) : null,
      openingBalanceDate: raw.openingBalanceDate
        ? new Date(`${raw.openingBalanceDate}T00:00:00`).toISOString()
        : null,
      openingBalanceVoucher: raw.openingBalanceVoucher.trim() || null,
      supportsChecks: raw.supportsChecks,
      supportsTransfers: raw.supportsTransfers,
      supportsReconciliation: raw.supportsReconciliation,
      requireCheckApproval: raw.requireCheckApproval,
      isHidden: raw.isHidden,
      notes: raw.notes.trim() || null,
    };

    if (this.isEditMode()) {
      const id = this.bankAccountId();
      if (!id) {
        return;
      }

      const payload: UpdateBankAccountRequest = { bankAccountID: id, ...common };
      this.bankAccountsService.update(id, payload).subscribe({
        next: () => this.navigateBack('bankAccounts.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    const payload: CreateBankAccountRequest = { ...common, createdBy: userId! };
    this.bankAccountsService.create(payload).subscribe({
      next: () => this.navigateBack('bankAccounts.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: TranslationKey): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/banks/accounts'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('bankAccounts.saveError')),
    );
  }
}
