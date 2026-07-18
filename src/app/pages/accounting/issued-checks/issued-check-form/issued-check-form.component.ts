import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Account, AccountStructureType } from '../../../../core/api/models/account.models';
import { BankAccount } from '../../../../core/api/models/bank-account.models';
import { Branch } from '../../../../core/api/models/branch.models';
import { CheckBook } from '../../../../core/api/models/check-book.models';
import { CostCenter } from '../../../../core/api/models/cost-center.models';
import { Currency } from '../../../../core/api/models/currency.models';
import {
  IssueCheckRequest,
  IssuedCheck,
  IssuedCheckStatus,
} from '../../../../core/api/models/issued-check.models';
import { AuthService } from '../../../../core/api/auth.service';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AccountsService } from '../../../../core/services/accounts.service';
import { BankAccountsService } from '../../../../core/services/bank-accounts.service';
import { BranchesService } from '../../../../core/services/branches.service';
import { CheckBooksService } from '../../../../core/services/check-books.service';
import { CostCentersService } from '../../../../core/services/cost-centers.service';
import { CurrenciesService } from '../../../../core/services/currencies.service';
import { IssuedChecksService } from '../../../../core/services/issued-checks.service';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-issued-check-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './issued-check-form.component.html',
  styleUrl: './issued-check-form.component.scss',
})
export class IssuedCheckFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private issuedChecksService = inject(IssuedChecksService);
  private checkBooksService = inject(CheckBooksService);
  private bankAccountsService = inject(BankAccountsService);
  private branchesService = inject(BranchesService);
  private currenciesService = inject(CurrenciesService);
  private accountsService = inject(AccountsService);
  private costCentersService = inject(CostCentersService);
  private auth = inject(AuthService);
  private language = inject(LanguageService);

  isEditMode = signal(false);
  isReadOnly = signal(false);
  checkId = signal<number | null>(null);
  checkNumber = signal<string | null>(null);
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');

  bankAccounts = signal<BankAccount[]>([]);
  checkBooks = signal<CheckBook[]>([]);
  branches = signal<Branch[]>([]);
  currencies = signal<Currency[]>([]);
  accounts = signal<Account[]>([]);
  costCenters = signal<CostCenter[]>([]);

  postingAccounts = computed(() => {
    const active = this.accounts().filter((account) => !account.accStopped);
    const leaves = active.filter((account) => account.accType === AccountStructureType.Sub);
    return leaves.length > 0 ? leaves : active;
  });

  form = new FormGroup({
    bankAccountID: new FormControl<number | null>(null, { validators: [Validators.required] }),
    checkBookID: new FormControl<number | null>(null, { validators: [Validators.required] }),
    checkDate: new FormControl(this.todayIso(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    payeeName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    payeeID: new FormControl<number | null>(null),
    amount: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0.000001)],
    }),
    currencyID: new FormControl<number | null>(null, { validators: [Validators.required] }),
    exchangeRate: new FormControl(1, { nonNullable: true, validators: [Validators.min(0.000001)] }),
    branchID: new FormControl<number | null>(null, { validators: [Validators.required] }),
    gL_AccountID: new FormControl<number | null>(null, { validators: [Validators.required] }),
    costCenterID: new FormControl<number | null>(null),
    purpose: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.loadLookups();

    this.form.controls.bankAccountID.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((bankAccountId) => this.onBankAccountChange(bankAccountId));

    this.form.controls.checkBookID.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((checkBookId) => this.onCheckBookChange(checkBookId));

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.checkId.set(id);
    this.loadCheck(id);
  }

  todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  loadLookups(): void {
    this.bankAccountsService.getAll().subscribe({
      next: (items) => this.bankAccounts.set(items),
      error: () => this.bankAccounts.set([]),
    });
    this.branchesService.getAll().subscribe({
      next: (items) => this.branches.set(items),
      error: () => this.branches.set([]),
    });
    this.currenciesService.getAll().subscribe({
      next: (items) => this.currencies.set(items),
      error: () => this.currencies.set([]),
    });
    this.accountsService.getAll().subscribe({
      next: (items) => this.accounts.set(items),
      error: () => this.accounts.set([]),
    });
    this.costCentersService.getAll().subscribe({
      next: (items) => this.costCenters.set(items.filter((item) => item.isActive)),
      error: () => this.costCenters.set([]),
    });
  }

  loadCheck(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.issuedChecksService.getById(id).subscribe({
      next: (check) => {
        this.applyReadOnlyState(check);
        this.checkNumber.set(check.checkNumber ?? null);
        this.form.patchValue({
          bankAccountID: check.bankAccountID,
          checkBookID: check.checkBookID,
          checkDate: check.checkDate?.slice(0, 10) || this.todayIso(),
          payeeName: check.payeeName || '',
          payeeID: check.payeeID ?? null,
          amount: check.amount ?? null,
          currencyID: check.currencyID,
          exchangeRate: check.exchangeRate ?? 1,
          branchID: check.branchID,
          gL_AccountID: check.gL_AccountID,
          costCenterID: check.costCenterID ?? null,
          purpose: check.purpose || '',
          notes: check.notes || '',
        });
        this.loadCheckBooksForAccount(check.bankAccountID, check.checkBookID);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('issuedChecks.notFound')),
        );
      },
    });
  }

  applyReadOnlyState(check: IssuedCheck): void {
    const readOnly =
      !!check.isPosted ||
      check.status === IssuedCheckStatus.Paid ||
      check.status === IssuedCheckStatus.Cancelled ||
      check.status === IssuedCheckStatus.Bounced;
    this.isReadOnly.set(readOnly);
    if (readOnly) {
      this.form.disable({ emitEvent: false });
    }
  }

  onBankAccountChange(bankAccountId: number | null): void {
    if (this.isReadOnly()) {
      return;
    }
    this.form.controls.checkBookID.setValue(null, { emitEvent: false });
    this.checkBooks.set([]);
    if (bankAccountId == null) {
      return;
    }
    this.loadCheckBooksForAccount(bankAccountId);
  }

  loadCheckBooksForAccount(bankAccountId: number, selectedCheckBookId?: number): void {
    this.checkBooksService.getByBankAccount(bankAccountId).subscribe({
      next: (items) => {
        this.checkBooks.set(items);
        if (selectedCheckBookId != null) {
          this.form.controls.checkBookID.setValue(selectedCheckBookId, { emitEvent: false });
        }
      },
      error: () => this.checkBooks.set([]),
    });
  }

  onCheckBookChange(checkBookId: number | null): void {
    if (this.isReadOnly() || checkBookId == null) {
      return;
    }
    const book = this.checkBooks().find((item) => item.checkBookID === checkBookId);
    if (book?.bankAccountID != null && this.form.controls.bankAccountID.value !== book.bankAccountID) {
      this.form.controls.bankAccountID.setValue(book.bankAccountID, { emitEvent: false });
      this.loadCheckBooksForAccount(book.bankAccountID, checkBookId);
    }
  }

  accountLabel(account: Account): string {
    return `${account.accCode} — ${account.accName || account.accId}`;
  }

  bankAccountLabel(account: BankAccount): string {
    return `${account.accountName || account.accountNumber || account.bankAccountID} — ${account.bankName || ''}`;
  }

  checkBookLabel(book: CheckBook): string {
    return `${book.checkBookNumber || book.checkBookID}${book.checkBookName ? ' — ' + book.checkBookName : ''}`;
  }

  onSubmit(): void {
    if (this.isReadOnly()) {
      return;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.errorMessage.set(this.language.translate('issuedChecks.validation.form'));
      return;
    }

    const userId = this.auth.user()?.userId;
    if (!userId) {
      this.errorMessage.set(this.language.translate('issuedChecks.saveError'));
      return;
    }

    const value = this.form.getRawValue();
    const payload: IssueCheckRequest = {
      amount: Number(value.amount),
      bankAccountID: Number(value.bankAccountID),
      branchID: Number(value.branchID),
      checkBookID: Number(value.checkBookID),
      checkDate: new Date(`${value.checkDate}T00:00:00`).toISOString(),
      createdBy: userId,
      currencyID: Number(value.currencyID),
      gL_AccountID: Number(value.gL_AccountID),
      payeeName: value.payeeName.trim(),
      payeeID: value.payeeID,
      exchangeRate: value.exchangeRate || 1,
      purpose: value.purpose.trim() || null,
      costCenterID: value.costCenterID,
      notes: value.notes.trim() || null,
    };

    this.saving.set(true);
    this.errorMessage.set('');

    if (this.isEditMode() && this.checkId() != null) {
      this.issuedChecksService.update(this.checkId()!, payload).subscribe({
        next: () => this.navigateSuccess('issuedChecks.updateSuccess'),
        error: (error) => this.failSave(error),
      });
      return;
    }

    this.issuedChecksService.create(payload).subscribe({
      next: () => this.navigateSuccess('issuedChecks.createSuccess'),
      error: (error) => this.failSave(error),
    });
  }

  private navigateSuccess(messageKey: TranslationKey): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/accounting/issued-checks'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private failSave(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('issuedChecks.saveError')),
    );
  }
}
