import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { OpeningBalance } from '../../../../core/api/models/opening-balance.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { OpeningBalancesService } from '../../../../core/services/opening-balances.service';

type OpeningBalanceFilter = 'all' | 'draft' | 'posted';
type OpeningBalanceAction = 'delete' | 'post';

@Component({
  selector: 'app-opening-balances-list',
  imports: [RouterLink, FormsModule, TranslatePipe, DatePipe, DecimalPipe],
  templateUrl: './opening-balances-list.component.html',
  styleUrl: './opening-balances-list.component.scss',
})
export class OpeningBalancesListComponent implements OnInit {
  private openingBalancesService = inject(OpeningBalancesService);
  private language = inject(LanguageService);

  items = signal<OpeningBalance[]>([]);
  loading = signal(true);
  actionLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<OpeningBalanceFilter>('all');
  actionTarget = signal<OpeningBalance | null>(null);
  actionType = signal<OpeningBalanceAction | null>(null);

  filteredItems = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    let list = this.items();

    if (filter === 'draft') {
      list = list.filter((item) => !item.isPosted);
    } else if (filter === 'posted') {
      list = list.filter((item) => item.isPosted);
    }

    if (!term) {
      return list;
    }

    return list.filter((item) =>
      [
        item.openingId,
        item.periodName,
        item.year,
        item.branchName,
        item.currencyName,
        item.costCenterName,
      ]
        .filter((value) => value != null && value !== '')
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  });

  ngOnInit(): void {
    const navState = history.state as { successMessage?: string };
    if (navState?.successMessage) {
      this.successMessage.set(navState.successMessage);
      history.replaceState({}, '');
    }
    this.loadItems();
  }

  loadItems(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.openingBalancesService.getAll().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('openingBalances.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: OpeningBalanceFilter): void {
    this.filter.set(filter);
  }

  lineCount(item: OpeningBalance): number {
    return (
      (item.accounts?.length ?? 0) +
      (item.partners?.length ?? 0) +
      (item.inventoryItems?.length ?? 0)
    );
  }

  openActionDialog(item: OpeningBalance, action: OpeningBalanceAction): void {
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
      this.openingBalancesService.delete(item.openingId).subscribe({
        next: () => {
          this.items.update((list) => list.filter((row) => row.openingId !== item.openingId));
          this.finishAction('openingBalances.deleteSuccess');
        },
        error: (error) => this.failAction(error, 'openingBalances.deleteError'),
      });
      return;
    }

    this.openingBalancesService.post(item.openingId).subscribe({
      next: () => {
        this.items.update((list) =>
          list.map((row) =>
            row.openingId === item.openingId ? { ...row, isPosted: true } : row,
          ),
        );
        this.finishAction('openingBalances.postSuccess');
      },
      error: (error) => this.failAction(error, 'openingBalances.postError'),
    });
  }

  private finishAction(
    messageKey: 'openingBalances.deleteSuccess' | 'openingBalances.postSuccess',
  ): void {
    this.actionLoading.set(false);
    this.actionTarget.set(null);
    this.actionType.set(null);
    this.successMessage.set(this.language.translate(messageKey));
  }

  private failAction(
    error: unknown,
    fallbackKey: 'openingBalances.deleteError' | 'openingBalances.postError',
  ): void {
    this.actionLoading.set(false);
    this.errorMessage.set(extractApiErrorMessage(error, this.language.translate(fallbackKey)));
  }
}
