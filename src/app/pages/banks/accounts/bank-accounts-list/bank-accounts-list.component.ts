import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  BankAccount,
  BankAccountStatus,
} from '../../../../core/api/models/bank-account.models';
import { Bank } from '../../../../core/api/models/bank.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { BankAccountsService } from '../../../../core/services/bank-accounts.service';
import { BanksService } from '../../../../core/services/banks.service';
import { LanguageService } from '../../../../core/services/language.service';

type AccountAction = 'delete' | 'toggle';

@Component({
  selector: 'app-bank-accounts-list',
  imports: [RouterLink, FormsModule, TranslatePipe, DecimalPipe],
  templateUrl: './bank-accounts-list.component.html',
  styleUrl: './bank-accounts-list.component.scss',
})
export class BankAccountsListComponent implements OnInit {
  private bankAccountsService = inject(BankAccountsService);
  private banksService = inject(BanksService);
  private language = inject(LanguageService);

  readonly BankAccountStatus = BankAccountStatus;

  accounts = signal<BankAccount[]>([]);
  banks = signal<Bank[]>([]);
  loading = signal(true);
  actionLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  bankFilter = signal<number | null>(null);
  statusFilter = signal<number | null>(null);
  actionTarget = signal<BankAccount | null>(null);
  actionType = signal<AccountAction | null>(null);

  filteredAccounts = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    let list = this.accounts();

    const bankId = this.bankFilter();
    if (bankId != null) {
      list = list.filter((item) => item.bankID === bankId);
    }

    const status = this.statusFilter();
    if (status != null) {
      list = list.filter((item) => item.accountStatus === status);
    }

    if (!term) {
      return list;
    }

    return list.filter((item) =>
      [
        item.accountName,
        item.accountNumber,
        item.iban,
        item.bankName,
        item.currencyName,
        item.bankAccountID,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  });

  stats = computed(() => {
    const list = this.accounts();
    let active = 0;
    let balance = 0;
    let available = 0;

    for (const item of list) {
      if (item.accountStatus === BankAccountStatus.Active) {
        active += 1;
      }
      balance += item.currentBalance || 0;
      available += item.availableBalance || 0;
    }

    return { total: list.length, active, balance, available };
  });

  hasActiveFilters = computed(
    () =>
      this.bankFilter() != null ||
      this.statusFilter() != null ||
      this.searchTerm().trim().length > 0,
  );

  ngOnInit(): void {
    const navState = history.state as { successMessage?: string };
    if (navState?.successMessage) {
      this.successMessage.set(navState.successMessage);
      history.replaceState({}, '');
    }
    this.banksService.getAll().subscribe({
      next: (items) => this.banks.set(items),
      error: () => this.banks.set([]),
    });
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.bankAccountsService.getAll().subscribe({
      next: (items) => {
        this.accounts.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('bankAccounts.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  onBankFilterChange(value: string): void {
    this.bankFilter.set(value ? Number(value) : null);
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value ? Number(value) : null);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.bankFilter.set(null);
    this.statusFilter.set(null);
  }

  statusLabel(status: number): string {
    switch (status) {
      case BankAccountStatus.Active:
        return this.language.translate('bankAccounts.status.active');
      case BankAccountStatus.Inactive:
        return this.language.translate('bankAccounts.status.inactive');
      case BankAccountStatus.Closed:
        return this.language.translate('bankAccounts.status.closed');
      default:
        return String(status);
    }
  }

  openActionDialog(account: BankAccount, action: AccountAction): void {
    this.actionTarget.set(account);
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
    const account = this.actionTarget();
    const action = this.actionType();
    if (!account || !action) {
      return;
    }

    this.actionLoading.set(true);

    if (action === 'delete') {
      this.bankAccountsService.delete(account.bankAccountID).subscribe({
        next: () => {
          this.accounts.update((list) =>
            list.filter((row) => row.bankAccountID !== account.bankAccountID),
          );
          this.finishAction('bankAccounts.deleteSuccess');
        },
        error: (error) => this.failAction(error, 'bankAccounts.deleteError'),
      });
      return;
    }

    this.bankAccountsService.toggleStatus(account.bankAccountID).subscribe({
      next: (updated) => {
        this.accounts.update((list) =>
          list.map((row) => (row.bankAccountID === updated.bankAccountID ? updated : row)),
        );
        this.finishAction('bankAccounts.toggleSuccess');
      },
      error: (error) => this.failAction(error, 'bankAccounts.toggleError'),
    });
  }

  private finishAction(
    messageKey: 'bankAccounts.deleteSuccess' | 'bankAccounts.toggleSuccess',
  ): void {
    this.actionLoading.set(false);
    this.actionTarget.set(null);
    this.actionType.set(null);
    this.successMessage.set(this.language.translate(messageKey));
  }

  private failAction(
    error: unknown,
    fallbackKey: 'bankAccounts.deleteError' | 'bankAccounts.toggleError',
  ): void {
    this.actionLoading.set(false);
    this.errorMessage.set(extractApiErrorMessage(error, this.language.translate(fallbackKey)));
  }
}
