import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { BankAccount } from '../../../../core/api/models/bank-account.models';
import { CheckBook, CheckBookStatus } from '../../../../core/api/models/check-book.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { BankAccountsService } from '../../../../core/services/bank-accounts.service';
import { CheckBooksService } from '../../../../core/services/check-books.service';
import { LanguageService } from '../../../../core/services/language.service';

type CheckBookFilter = 'all' | 'lowStock';
type CheckBookAction = 'delete' | 'toggle';

@Component({
  selector: 'app-check-books-list',
  imports: [RouterLink, FormsModule, TranslatePipe, DatePipe],
  templateUrl: './check-books-list.component.html',
  styleUrl: './check-books-list.component.scss',
})
export class CheckBooksListComponent implements OnInit {
  private checkBooksService = inject(CheckBooksService);
  private bankAccountsService = inject(BankAccountsService);
  private router = inject(Router);
  private language = inject(LanguageService);

  get basePath(): string {
    return this.router.url.includes('/accounting/')
      ? '/demo1/accounting/check-books'
      : '/demo1/banks/check-books';
  }

  readonly CheckBookStatus = CheckBookStatus;

  checkBooks = signal<CheckBook[]>([]);
  bankAccounts = signal<BankAccount[]>([]);
  loading = signal(true);
  actionLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<CheckBookFilter>('all');
  bankAccountFilter = signal<number | null>(null);
  actionTarget = signal<CheckBook | null>(null);
  actionType = signal<CheckBookAction | null>(null);

  filteredCheckBooks = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    let list = this.checkBooks();

    const accountId = this.bankAccountFilter();
    if (accountId != null) {
      list = list.filter((item) => item.bankAccountID === accountId);
    }

    if (!term) {
      return list;
    }

    return list.filter((item) =>
      [
        item.checkBookNumber,
        item.checkBookName,
        item.bankAccountName,
        item.bankName,
        item.checkBookID,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  });

  stats = computed(() => {
    const list = this.checkBooks();
    let remaining = 0;
    let active = 0;
    let lowStock = 0;

    for (const item of list) {
      remaining += item.remainingChecks || 0;
      if (item.status === CheckBookStatus.Active) {
        active += 1;
      }
      if (
        item.alertBeforeEnd != null &&
        item.remainingChecks != null &&
        item.remainingChecks <= item.alertBeforeEnd
      ) {
        lowStock += 1;
      }
    }

    return { total: list.length, remaining, active, lowStock };
  });

  hasActiveFilters = computed(
    () =>
      this.filter() !== 'all' ||
      this.bankAccountFilter() != null ||
      this.searchTerm().trim().length > 0,
  );

  ngOnInit(): void {
    const navState = history.state as { successMessage?: string };
    if (navState?.successMessage) {
      this.successMessage.set(navState.successMessage);
      history.replaceState({}, '');
    }
    this.bankAccountsService.getAll().subscribe({
      next: (items) => this.bankAccounts.set(items),
      error: () => this.bankAccounts.set([]),
    });
    this.loadCheckBooks();
  }

  loadCheckBooks(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    const request$ =
      this.filter() === 'lowStock'
        ? this.checkBooksService.getLowStock()
        : this.checkBooksService.getAll();

    request$.subscribe({
      next: (items) => {
        this.checkBooks.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('checkBooks.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: CheckBookFilter): void {
    this.filter.set(filter);
    this.loadCheckBooks();
  }

  onBankAccountFilterChange(value: string): void {
    this.bankAccountFilter.set(value ? Number(value) : null);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.bankAccountFilter.set(null);
    if (this.filter() !== 'all') {
      this.filter.set('all');
      this.loadCheckBooks();
    }
  }

  statusLabel(status: number | null | undefined): string {
    switch (status) {
      case CheckBookStatus.Active:
        return this.language.translate('checkBooks.status.active');
      case CheckBookStatus.Finished:
        return this.language.translate('checkBooks.status.finished');
      case CheckBookStatus.Cancelled:
        return this.language.translate('checkBooks.status.cancelled');
      default:
        return status != null ? String(status) : '—';
    }
  }

  openActionDialog(item: CheckBook, action: CheckBookAction): void {
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
      this.checkBooksService.delete(item.checkBookID).subscribe({
        next: () => {
          this.checkBooks.update((list) =>
            list.filter((row) => row.checkBookID !== item.checkBookID),
          );
          this.finishAction('checkBooks.deleteSuccess');
        },
        error: (error) => this.failAction(error, 'checkBooks.deleteError'),
      });
      return;
    }

    this.checkBooksService.toggleStatus(item.checkBookID).subscribe({
      next: (updated) => {
        this.checkBooks.update((list) =>
          list.map((row) => (row.checkBookID === updated.checkBookID ? updated : row)),
        );
        this.finishAction('checkBooks.toggleSuccess');
      },
      error: (error) => this.failAction(error, 'checkBooks.toggleError'),
    });
  }

  private finishAction(
    messageKey: 'checkBooks.deleteSuccess' | 'checkBooks.toggleSuccess',
  ): void {
    this.actionLoading.set(false);
    this.actionTarget.set(null);
    this.actionType.set(null);
    this.successMessage.set(this.language.translate(messageKey));
  }

  private failAction(
    error: unknown,
    fallbackKey: 'checkBooks.deleteError' | 'checkBooks.toggleError',
  ): void {
    this.actionLoading.set(false);
    this.errorMessage.set(extractApiErrorMessage(error, this.language.translate(fallbackKey)));
  }
}
