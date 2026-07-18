import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AccountingPeriod } from '../../../../core/api/models/accounting-period.models';
import { AuthService } from '../../../../core/api/auth.service';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AccountingPeriodsService } from '../../../../core/services/accounting-periods.service';
import { LanguageService } from '../../../../core/services/language.service';

type PeriodFilter = 'all' | 'open' | 'closed';
type PeriodAction = 'delete' | 'close' | 'reopen';

@Component({
  selector: 'app-accounting-periods-list',
  imports: [RouterLink, FormsModule, TranslatePipe, DatePipe],
  templateUrl: './accounting-periods-list.component.html',
  styleUrl: './accounting-periods-list.component.scss',
})
export class AccountingPeriodsListComponent implements OnInit {
  private accountingPeriodsService = inject(AccountingPeriodsService);
  private auth = inject(AuthService);
  private language = inject(LanguageService);

  periods = signal<AccountingPeriod[]>([]);
  loading = signal(true);
  actionLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<PeriodFilter>('all');
  actionTarget = signal<AccountingPeriod | null>(null);
  actionType = signal<PeriodAction | null>(null);

  filteredPeriods = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    let list = this.periods();

    if (filter === 'open') {
      list = list.filter((period) => !period.isClosed);
    } else if (filter === 'closed') {
      list = list.filter((period) => period.isClosed);
    }

    if (!term) {
      return list;
    }

    return list.filter((period) =>
      [period.periodName, period.fiscalYear, period.periodId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  });

  ngOnInit(): void {
    const navState = history.state as { successMessage?: string };
    if (navState?.successMessage) {
      this.successMessage.set(navState.successMessage);
      history.replaceState({}, '');
    }
    this.loadPeriods();
  }

  loadPeriods(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.accountingPeriodsService.getAll().subscribe({
      next: (periods) => {
        this.periods.set(periods);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('accountingPeriods.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: PeriodFilter): void {
    this.filter.set(filter);
  }

  openActionDialog(period: AccountingPeriod, action: PeriodAction): void {
    this.actionTarget.set(period);
    this.actionType.set(action);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  closeActionDialog(): void {
    if (!this.actionLoading()) {
      this.actionTarget.set(null);
      this.actionType.set(null);
    }
  }

  confirmAction(): void {
    const period = this.actionTarget();
    const action = this.actionType();
    if (!period || !action) {
      return;
    }

    this.actionLoading.set(true);

    if (action === 'delete') {
      this.accountingPeriodsService.delete(period.periodId).subscribe({
        next: () => {
          this.periods.update((list) => list.filter((item) => item.periodId !== period.periodId));
          this.finishAction('accountingPeriods.deleteSuccess');
        },
        error: (error) => this.failAction(error, 'accountingPeriods.deleteError'),
      });
      return;
    }

    if (action === 'close') {
      const userId = this.auth.user()?.userId;
      if (!userId) {
        this.failAction(new Error('Missing user'), 'accountingPeriods.closeError');
        return;
      }

      this.accountingPeriodsService.close(period.periodId, userId).subscribe({
        next: (updated) => {
          this.periods.update((list) =>
            list.map((item) => (item.periodId === updated.periodId ? updated : item)),
          );
          this.finishAction('accountingPeriods.closeSuccess');
        },
        error: (error) => this.failAction(error, 'accountingPeriods.closeError'),
      });
      return;
    }

    this.accountingPeriodsService.reopen(period.periodId).subscribe({
      next: (updated) => {
        this.periods.update((list) =>
          list.map((item) => (item.periodId === updated.periodId ? updated : item)),
        );
        this.finishAction('accountingPeriods.reopenSuccess');
      },
      error: (error) => this.failAction(error, 'accountingPeriods.reopenError'),
    });
  }

  private finishAction(
    messageKey:
      | 'accountingPeriods.deleteSuccess'
      | 'accountingPeriods.closeSuccess'
      | 'accountingPeriods.reopenSuccess',
  ): void {
    this.actionLoading.set(false);
    this.actionTarget.set(null);
    this.actionType.set(null);
    this.successMessage.set(this.language.translate(messageKey));
  }

  private failAction(
    error: unknown,
    fallbackKey:
      | 'accountingPeriods.deleteError'
      | 'accountingPeriods.closeError'
      | 'accountingPeriods.reopenError',
  ): void {
    this.actionLoading.set(false);
    this.errorMessage.set(extractApiErrorMessage(error, this.language.translate(fallbackKey)));
  }
}
