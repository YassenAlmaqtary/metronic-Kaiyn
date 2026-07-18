import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Bank } from '../../../../core/api/models/bank.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { BanksService } from '../../../../core/services/banks.service';
import { LanguageService } from '../../../../core/services/language.service';

type BankFilter = 'all' | 'active';
type BankAction = 'delete' | 'toggle';

@Component({
  selector: 'app-banks-list',
  imports: [RouterLink, FormsModule, TranslatePipe],
  templateUrl: './banks-list.component.html',
  styleUrl: './banks-list.component.scss',
})
export class BanksListComponent implements OnInit {
  private banksService = inject(BanksService);
  private language = inject(LanguageService);

  banks = signal<Bank[]>([]);
  loading = signal(true);
  actionLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<BankFilter>('all');
  actionTarget = signal<Bank | null>(null);
  actionType = signal<BankAction | null>(null);

  filteredBanks = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    let list = this.banks();

    if (filter === 'active') {
      list = list.filter((item) => item.isActive);
    }

    if (!term) {
      return list;
    }

    return list.filter((item) =>
      [item.bankName, item.bankCode, item.swiftCode, item.contactPerson, item.email, item.bankID]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  });

  stats = computed(() => {
    const list = this.banks();
    let active = 0;
    let accounts = 0;

    for (const item of list) {
      if (item.isActive) {
        active += 1;
      }
      accounts += item.accountsCount || 0;
    }

    return {
      total: list.length,
      active,
      inactive: list.length - active,
      accounts,
    };
  });

  hasActiveFilters = computed(
    () => this.filter() !== 'all' || this.searchTerm().trim().length > 0,
  );

  ngOnInit(): void {
    const navState = history.state as { successMessage?: string };
    if (navState?.successMessage) {
      this.successMessage.set(navState.successMessage);
      history.replaceState({}, '');
    }
    this.loadBanks();
  }

  loadBanks(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.banksService.getAll().subscribe({
      next: (items) => {
        this.banks.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('banks.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: BankFilter): void {
    this.filter.set(filter);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.filter.set('all');
  }

  openActionDialog(bank: Bank, action: BankAction): void {
    this.actionTarget.set(bank);
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
    const bank = this.actionTarget();
    const action = this.actionType();
    if (!bank || !action) {
      return;
    }

    this.actionLoading.set(true);

    if (action === 'delete') {
      this.banksService.delete(bank.bankID).subscribe({
        next: () => {
          this.banks.update((list) => list.filter((row) => row.bankID !== bank.bankID));
          this.finishAction('banks.deleteSuccess');
        },
        error: (error) => this.failAction(error, 'banks.deleteError'),
      });
      return;
    }

    this.banksService.toggleStatus(bank.bankID).subscribe({
      next: (updated) => {
        this.banks.update((list) =>
          list.map((row) => (row.bankID === updated.bankID ? updated : row)),
        );
        this.finishAction('banks.toggleSuccess');
      },
      error: (error) => this.failAction(error, 'banks.toggleError'),
    });
  }

  private finishAction(messageKey: 'banks.deleteSuccess' | 'banks.toggleSuccess'): void {
    this.actionLoading.set(false);
    this.actionTarget.set(null);
    this.actionType.set(null);
    this.successMessage.set(this.language.translate(messageKey));
  }

  private failAction(error: unknown, fallbackKey: 'banks.deleteError' | 'banks.toggleError'): void {
    this.actionLoading.set(false);
    this.errorMessage.set(extractApiErrorMessage(error, this.language.translate(fallbackKey)));
  }
}
