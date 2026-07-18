import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { TrialBalanceRow } from '../../../../core/api/models/general-ledger.models';
import { Branch } from '../../../../core/api/models/branch.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { BranchesService } from '../../../../core/services/branches.service';
import { GeneralLedgerService } from '../../../../core/services/general-ledger.service';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-trial-balance',
  imports: [ReactiveFormsModule, TranslatePipe, DecimalPipe],
  templateUrl: './trial-balance.component.html',
  styleUrl: './trial-balance.component.scss',
})
export class TrialBalanceComponent implements OnInit {
  private generalLedgerService = inject(GeneralLedgerService);
  private branchesService = inject(BranchesService);
  private language = inject(LanguageService);

  branches = signal<Branch[]>([]);
  rows = signal<TrialBalanceRow[]>([]);
  loading = signal(false);
  errorMessage = signal('');
  hasRun = signal(false);

  totals = computed(() => {
    const list = this.rows();
    return list.reduce(
      (acc, row) => ({
        openingBalance: acc.openingBalance + (row.openingBalance || 0),
        totalDebit: acc.totalDebit + (row.totalDebit || 0),
        totalCredit: acc.totalCredit + (row.totalCredit || 0),
        netBalance: acc.netBalance + (row.netBalance || 0),
      }),
      { openingBalance: 0, totalDebit: 0, totalCredit: 0, netBalance: 0 },
    );
  });

  filterForm = new FormGroup({
    fromDate: new FormControl(this.firstDayOfYear(), { nonNullable: true }),
    toDate: new FormControl(this.todayIso(), { nonNullable: true }),
    branchId: new FormControl<number | null>(null),
  });

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (items) => this.branches.set(items),
      error: () => this.branches.set([]),
    });
  }

  todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  firstDayOfYear(): string {
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  }

  runReport(): void {
    const value = this.filterForm.getRawValue();
    this.loading.set(true);
    this.errorMessage.set('');
    this.hasRun.set(true);

    this.generalLedgerService
      .getTrialBalance({
        fromDate: value.fromDate ? `${value.fromDate}T00:00:00` : null,
        toDate: value.toDate ? `${value.toDate}T23:59:59` : null,
        branchId: value.branchId,
      })
      .subscribe({
        next: (result) => {
          this.rows.set(result);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.rows.set([]);
          this.errorMessage.set(
            extractApiErrorMessage(error, this.language.translate('trialBalance.loadError')),
          );
        },
      });
  }
}
