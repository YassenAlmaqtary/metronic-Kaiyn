import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Account, AccountStructureType } from '../../../../core/api/models/account.models';
import { AccountingPeriod } from '../../../../core/api/models/accounting-period.models';
import { Branch } from '../../../../core/api/models/branch.models';
import { CostCenter } from '../../../../core/api/models/cost-center.models';
import { Currency } from '../../../../core/api/models/currency.models';
import {
  CreateJournalEntryRequest,
  isJournalEntryPosted,
  JournalEntryDetail,
  JournalEntryStatus,
  JournalType,
  UpdateJournalEntryRequest,
} from '../../../../core/api/models/journal-entry.models';
import { TaxSetup } from '../../../../core/api/models/tax-setup.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { AuthService } from '../../../../core/api/auth.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AccountingPeriodsService } from '../../../../core/services/accounting-periods.service';
import { AccountsService } from '../../../../core/services/accounts.service';
import { BranchesService } from '../../../../core/services/branches.service';
import { CostCentersService } from '../../../../core/services/cost-centers.service';
import { CurrenciesService } from '../../../../core/services/currencies.service';
import { JournalEntriesService } from '../../../../core/services/journal-entries.service';
import { JournalTypesService } from '../../../../core/services/journal-types.service';
import { LanguageService } from '../../../../core/services/language.service';
import { TaxSetupsService } from '../../../../core/services/tax-setups.service';

type DetailLineGroup = FormGroup<{
  accCode: FormControl<number | null>;
  accId: FormControl<number | null>;
  debit: FormControl<number>;
  credit: FormControl<number>;
  description: FormControl<string>;
  costCenterId: FormControl<number | null>;
  branchId: FormControl<number | null>;
  isTaxable: FormControl<boolean>;
  taxSetupId: FormControl<number | null>;
  currencyId: FormControl<number | null>;
  exchangeRate: FormControl<number>;
  amountInCurrency: FormControl<number>;
  amountInLocalCurrency: FormControl<number>;
}>;

@Component({
  selector: 'app-journal-entry-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe, DecimalPipe],
  templateUrl: './journal-entry-form.component.html',
  styleUrl: './journal-entry-form.component.scss',
})
export class JournalEntryFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private journalEntriesService = inject(JournalEntriesService);
  private journalTypesService = inject(JournalTypesService);
  private accountingPeriodsService = inject(AccountingPeriodsService);
  private branchesService = inject(BranchesService);
  private costCentersService = inject(CostCentersService);
  private currenciesService = inject(CurrenciesService);
  private accountsService = inject(AccountsService);
  private taxSetupsService = inject(TaxSetupsService);
  private auth = inject(AuthService);
  private language = inject(LanguageService);

  isEditMode = signal(false);
  isReadOnly = signal(false);
  entryId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  private totalsTick = signal(0);

  periods = signal<AccountingPeriod[]>([]);
  branches = signal<Branch[]>([]);
  costCenters = signal<CostCenter[]>([]);
  currencies = signal<Currency[]>([]);
  accounts = signal<Account[]>([]);
  journalTypes = signal<JournalType[]>([]);
  taxSetups = signal<TaxSetup[]>([]);

  postingAccounts = computed(() => {
    const active = this.accounts().filter((account) => !account.accStopped);
    const leaves = active.filter((account) => account.accType === AccountStructureType.Sub);
    return leaves.length > 0 ? leaves : active;
  });

  form = new FormGroup({
    entryId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    entryDate: new FormControl(this.todayIso(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    branchId: new FormControl<number | null>(null),
    periodId: new FormControl<number | null>(null),
    journalTypeId: new FormControl<number | null>(null),
    referenceId: new FormControl<number | null>(null),
    originalEntryId: new FormControl<number | null>(null),
    isClosingEntry: new FormControl(false, { nonNullable: true }),
    isAdjusted: new FormControl(false, { nonNullable: true }),
    isReversingEntry: new FormControl(false, { nonNullable: true }),
    details: new FormArray<DetailLineGroup>([]),
  });

  totalDebit = computed(() => {
    this.totalsTick();
    return this.details.controls.reduce((sum, group) => sum + (group.controls.debit.value || 0), 0);
  });

  totalCredit = computed(() => {
    this.totalsTick();
    return this.details.controls.reduce((sum, group) => sum + (group.controls.credit.value || 0), 0);
  });

  isBalanced = computed(() => Math.abs(this.totalDebit() - this.totalCredit()) < 0.0001);

  ngOnInit(): void {
    this.loadLookups();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.loadNextNumber();
      this.addLine();
      this.addLine();
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.entryId.set(id);
    this.loadEntry(id);
  }

  get details(): FormArray<DetailLineGroup> {
    return this.form.controls.details;
  }

  todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  loadLookups(): void {
    this.accountingPeriodsService.getAll().subscribe({
      next: (items) => this.periods.set(items),
      error: () => this.periods.set([]),
    });
    this.branchesService.getAll().subscribe({
      next: (items) => this.branches.set(items),
      error: () => this.branches.set([]),
    });
    this.costCentersService.getAll().subscribe({
      next: (items) => this.costCenters.set(items.filter((item) => item.isActive)),
      error: () => this.costCenters.set([]),
    });
    this.currenciesService.getAll().subscribe({
      next: (items) => this.currencies.set(items),
      error: () => this.currencies.set([]),
    });
    this.accountsService.getAll().subscribe({
      next: (items) => this.accounts.set(items),
      error: () => this.accounts.set([]),
    });
    this.taxSetupsService.getActive().subscribe({
      next: (items) => this.taxSetups.set(items),
      error: () =>
        this.taxSetupsService.getAll().subscribe({
          next: (all) => this.taxSetups.set(all.filter((item) => item.isActive)),
          error: () => this.taxSetups.set([]),
        }),
    });
    this.journalTypesService.getActive().subscribe({
      next: (items) => this.journalTypes.set(items.filter((item) => item.allowManualEntry !== false)),
      error: () =>
        this.journalTypesService.getAll().subscribe({
          next: (all) => this.journalTypes.set(all),
          error: () => this.journalTypes.set([]),
        }),
    });
  }

  loadNextNumber(): void {
    this.journalEntriesService.getNextNumber().subscribe({
      next: (next) => this.form.controls.entryId.setValue(next),
      error: () => this.form.controls.entryId.setValue(null),
    });
  }

  loadEntry(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.journalEntriesService.getById(id).subscribe({
      next: (entry) => {
        const posted = isJournalEntryPosted(entry);
        this.isReadOnly.set(posted);

        this.form.patchValue({
          entryId: entry.entryId,
          entryDate: entry.entryDate?.slice(0, 10) || this.todayIso(),
          branchId: entry.branchId ?? null,
          periodId: entry.periodId ?? null,
          journalTypeId: entry.journalTypeId ?? null,
          referenceId: entry.referenceId ?? null,
          originalEntryId: entry.originalEntryId ?? null,
          isClosingEntry: entry.isClosingEntry,
          isAdjusted: entry.isAdjusted,
          isReversingEntry: entry.isReversingEntry,
        });

        this.details.clear();
        const lines = entry.details ?? [];
        if (lines.length === 0) {
          this.addLine();
          this.addLine();
        } else {
          lines.forEach((line) => this.details.push(this.createLine(line)));
        }

        if (posted) {
          this.form.disable({ emitEvent: false });
        } else {
          this.form.controls.entryId.disable({ emitEvent: false });
        }

        this.loading.set(false);
        this.refreshTotals();
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('journalEntries.notFound')),
        );
      },
    });
  }

  createLine(line?: Partial<JournalEntryDetail>): DetailLineGroup {
    const group = new FormGroup({
      accCode: new FormControl<number | null>(line?.accCode ?? null, {
        validators: [Validators.required],
      }),
      accId: new FormControl<number | null>(line?.accId ?? null),
      debit: new FormControl(line?.debit ?? 0, { nonNullable: true, validators: [Validators.min(0)] }),
      credit: new FormControl(line?.credit ?? 0, {
        nonNullable: true,
        validators: [Validators.min(0)],
      }),
      description: new FormControl(line?.description ?? '', { nonNullable: true }),
      costCenterId: new FormControl<number | null>(line?.costCenterId ?? null),
      branchId: new FormControl<number | null>(line?.branchId ?? null),
      isTaxable: new FormControl(!!line?.isTaxable, { nonNullable: true }),
      taxSetupId: new FormControl<number | null>(line?.taxSetupId ?? null),
      currencyId: new FormControl<number | null>(line?.currencyId ?? null),
      exchangeRate: new FormControl(line?.exchangeRate ?? 1, { nonNullable: true }),
      amountInCurrency: new FormControl(line?.amountInCurrency ?? 0, { nonNullable: true }),
      amountInLocalCurrency: new FormControl(line?.amountInLocalCurrency ?? 0, { nonNullable: true }),
    });

    group.controls.accCode.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((accCode) => this.onAccountChange(group, accCode));

    group.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refreshTotals());
    return group;
  }

  addLine(): void {
    this.details.push(this.createLine({ branchId: this.form.controls.branchId.value }));
    this.refreshTotals();
  }

  removeLine(index: number): void {
    if (this.details.length <= 2) {
      this.errorMessage.set(this.language.translate('journalEntries.validation.minLines'));
      return;
    }
    this.details.removeAt(index);
    this.refreshTotals();
  }

  accountLabel(account: Account): string {
    return `${account.accCode} — ${account.accName || account.accId}`;
  }

  onSubmit(): void {
    if (this.isReadOnly()) {
      return;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.errorMessage.set(this.language.translate('journalEntries.validation.form'));
      return;
    }

    if (this.details.length < 2) {
      this.errorMessage.set(this.language.translate('journalEntries.validation.minLines'));
      return;
    }

    if (!this.isBalanced()) {
      this.errorMessage.set(this.language.translate('journalEntries.validation.balance'));
      return;
    }

    const payload = this.buildPayload();
    this.saving.set(true);
    this.errorMessage.set('');

    if (this.isEditMode() && this.entryId() != null) {
      const updatePayload: UpdateJournalEntryRequest = payload;
      this.journalEntriesService.update(this.entryId()!, updatePayload).subscribe({
        next: () => this.navigateSuccess('journalEntries.updateSuccess'),
        error: (error) => this.failSave(error),
      });
      return;
    }

    const createPayload: CreateJournalEntryRequest = {
      ...payload,
      entryId: this.form.controls.entryId.getRawValue()!,
      status: JournalEntryStatus.Unposted,
      userId: this.auth.userName() || null,
    };

    this.journalEntriesService.create(createPayload).subscribe({
      next: () => this.navigateSuccess('journalEntries.createSuccess'),
      error: (error) => this.failSave(error),
    });
  }

  private buildPayload(): UpdateJournalEntryRequest {
    const value = this.form.getRawValue();
    return {
      entryDate: value.entryDate,
      branchId: value.branchId,
      periodId: value.periodId,
      journalTypeId: value.journalTypeId,
      referenceId: value.referenceId,
      originalEntryId: value.originalEntryId,
      isClosingEntry: value.isClosingEntry,
      isAdjusted: value.isAdjusted,
      isReversingEntry: value.isReversingEntry,
      userId: this.auth.userName() || null,
      details: value.details
        .filter((line) => line.accCode != null)
        .map((line) => ({
          accCode: line.accCode!,
          accId: line.accId,
          debit: line.debit || 0,
          credit: line.credit || 0,
          description: line.description || null,
          costCenterId: line.costCenterId,
          branchId: line.branchId,
          isTaxable: line.isTaxable,
          taxSetupId: line.isTaxable ? line.taxSetupId : null,
          currencyId: line.currencyId,
          exchangeRate: line.exchangeRate || 1,
          amountInCurrency: line.amountInCurrency || null,
          amountInLocalCurrency: line.amountInLocalCurrency || null,
        })),
    };
  }

  private onAccountChange(group: DetailLineGroup, accCode: number | null): void {
    if (accCode == null || this.isReadOnly()) {
      return;
    }
    const account = this.postingAccounts().find((item) => item.accCode === accCode);
    if (!account) {
      return;
    }
    group.controls.accId.setValue(account.accId, { emitEvent: false });
    if (account.isTaxable != null) {
      group.controls.isTaxable.setValue(!!account.isTaxable, { emitEvent: false });
    }
    if (account.costCenterId != null && account.isCostCenterRequired) {
      group.controls.costCenterId.setValue(account.costCenterId, { emitEvent: false });
    }
    if (account.currencyId != null) {
      group.controls.currencyId.setValue(account.currencyId, { emitEvent: false });
    }
  }

  private refreshTotals(): void {
    this.totalsTick.update((value) => value + 1);
  }

  private navigateSuccess(
    messageKey: 'journalEntries.createSuccess' | 'journalEntries.updateSuccess',
  ): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/accounting/journal-entries'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private failSave(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('journalEntries.saveError')),
    );
  }
}
