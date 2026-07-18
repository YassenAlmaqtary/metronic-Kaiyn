import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { Account, AccountStructureType } from '../../../../core/api/models/account.models';
import { AccountLedgerReport } from '../../../../core/api/models/general-ledger.models';
import { Branch } from '../../../../core/api/models/branch.models';
import { CostCenter } from '../../../../core/api/models/cost-center.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AccountsService } from '../../../../core/services/accounts.service';
import { BranchesService } from '../../../../core/services/branches.service';
import { CostCentersService } from '../../../../core/services/cost-centers.service';
import { GeneralLedgerService } from '../../../../core/services/general-ledger.service';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-general-ledger',
  imports: [ReactiveFormsModule, TranslatePipe, DatePipe, DecimalPipe],
  templateUrl: './general-ledger.component.html',
  styleUrl: './general-ledger.component.scss',
})
export class GeneralLedgerComponent implements OnInit {
  private generalLedgerService = inject(GeneralLedgerService);
  private accountsService = inject(AccountsService);
  private branchesService = inject(BranchesService);
  private costCentersService = inject(CostCentersService);
  private language = inject(LanguageService);

  accounts = signal<Account[]>([]);
  branches = signal<Branch[]>([]);
  costCenters = signal<CostCenter[]>([]);
  report = signal<AccountLedgerReport | null>(null);
  loading = signal(false);
  errorMessage = signal('');
  hasRun = signal(false);

  postingAccounts = computed(() => {
    const active = this.accounts().filter((account) => !account.accStopped);
    const leaves = active.filter((account) => account.accType === AccountStructureType.Sub);
    return leaves.length > 0 ? leaves : active;
  });

  transactions = computed(() => this.report()?.transactions ?? []);

  filterForm = new FormGroup({
    accId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    fromDate: new FormControl(this.firstDayOfYear(), { nonNullable: true }),
    toDate: new FormControl(this.todayIso(), { nonNullable: true }),
    branchId: new FormControl<number | null>(null),
    costCenterId: new FormControl<number | null>(null),
  });

  ngOnInit(): void {
    this.accountsService.getAll().subscribe({ next: (items) => this.accounts.set(items), error: () => this.accounts.set([]) });
    this.branchesService.getAll().subscribe({ next: (items) => this.branches.set(items), error: () => this.branches.set([]) });
    this.costCentersService.getAll().subscribe({ next: (items) => this.costCenters.set(items.filter((item) => item.isActive)), error: () => this.costCenters.set([]) });
  }

  todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  firstDayOfYear(): string {
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  }

  accountLabel(account: Account): string {
    return `${account.accCode} — ${account.accName || account.accId}`;
  }

  runReport(): void {
    this.filterForm.markAllAsTouched();
    if (this.filterForm.invalid) {
      return;
    }

    const value = this.filterForm.getRawValue();
    this.loading.set(true);
    this.errorMessage.set('');
    this.hasRun.set(true);

    this.generalLedgerService
      .getLedger({
        accId: value.accId!,
        fromDate: value.fromDate ? `${value.fromDate}T00:00:00` : null,
        toDate: value.toDate ? `${value.toDate}T23:59:59` : null,
        branchId: value.branchId,
        costCenterId: value.costCenterId,
      })
      .subscribe({
        next: (result) => {
          this.report.set(result);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.report.set(null);
          this.errorMessage.set(
            extractApiErrorMessage(error, this.language.translate('generalLedger.loadError')),
          );
        },
      });
  }
}
