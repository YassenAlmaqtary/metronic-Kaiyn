import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { FiscalYear } from '../../../../core/api/models/fiscal-year.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { FiscalYearsService } from '../../../../core/services/fiscal-years.service';
import { LanguageService } from '../../../../core/services/language.service';

type FiscalYearFilter = 'all' | 'open' | 'closed';
type FiscalYearAction = 'delete' | 'close' | 'reopen';

@Component({
  selector: 'app-fiscal-years-list',
  imports: [RouterLink, FormsModule, TranslatePipe, DatePipe],
  templateUrl: './fiscal-years-list.component.html',
  styleUrl: './fiscal-years-list.component.scss',
})
export class FiscalYearsListComponent implements OnInit {
  private fiscalYearsService = inject(FiscalYearsService);
  private language = inject(LanguageService);

  fiscalYears = signal<FiscalYear[]>([]);
  loading = signal(true);
  actionLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<FiscalYearFilter>('all');
  actionTarget = signal<FiscalYear | null>(null);
  actionType = signal<FiscalYearAction | null>(null);

  filteredFiscalYears = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    let list = this.fiscalYears();

    if (filter === 'open') {
      list = list.filter((item) => !item.isClosed);
    } else if (filter === 'closed') {
      list = list.filter((item) => item.isClosed);
    }

    if (!term) {
      return list;
    }

    return list.filter((item) =>
      [item.year, item.description, item.fiscalYearId]
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
    this.loadFiscalYears();
  }

  loadFiscalYears(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.fiscalYearsService.getAll().subscribe({
      next: (items) => {
        this.fiscalYears.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('fiscalYears.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: FiscalYearFilter): void {
    this.filter.set(filter);
  }

  openActionDialog(item: FiscalYear, action: FiscalYearAction): void {
    this.actionTarget.set(item);
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
    const item = this.actionTarget();
    const action = this.actionType();
    if (!item || !action) {
      return;
    }

    this.actionLoading.set(true);

    if (action === 'delete') {
      this.fiscalYearsService.delete(item.fiscalYearId).subscribe({
        next: () => {
          this.fiscalYears.update((list) =>
            list.filter((row) => row.fiscalYearId !== item.fiscalYearId),
          );
          this.finishAction('fiscalYears.deleteSuccess');
        },
        error: (error) => this.failAction(error, 'fiscalYears.deleteError'),
      });
      return;
    }

    if (action === 'close') {
      this.fiscalYearsService.close(item.fiscalYearId).subscribe({
        next: (updated) => {
          this.fiscalYears.update((list) =>
            list.map((row) => (row.fiscalYearId === updated.fiscalYearId ? updated : row)),
          );
          this.finishAction('fiscalYears.closeSuccess');
        },
        error: (error) => this.failAction(error, 'fiscalYears.closeError'),
      });
      return;
    }

    this.fiscalYearsService.reopen(item.fiscalYearId).subscribe({
      next: (updated) => {
        this.fiscalYears.update((list) =>
          list.map((row) => (row.fiscalYearId === updated.fiscalYearId ? updated : row)),
        );
        this.finishAction('fiscalYears.reopenSuccess');
      },
      error: (error) => this.failAction(error, 'fiscalYears.reopenError'),
    });
  }

  private finishAction(
    messageKey:
      | 'fiscalYears.deleteSuccess'
      | 'fiscalYears.closeSuccess'
      | 'fiscalYears.reopenSuccess',
  ): void {
    this.actionLoading.set(false);
    this.actionTarget.set(null);
    this.actionType.set(null);
    this.successMessage.set(this.language.translate(messageKey));
  }

  private failAction(
    error: unknown,
    fallbackKey:
      | 'fiscalYears.deleteError'
      | 'fiscalYears.closeError'
      | 'fiscalYears.reopenError',
  ): void {
    this.actionLoading.set(false);
    this.errorMessage.set(extractApiErrorMessage(error, this.language.translate(fallbackKey)));
  }
}
