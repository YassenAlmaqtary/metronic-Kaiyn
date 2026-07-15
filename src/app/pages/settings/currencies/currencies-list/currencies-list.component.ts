import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Currency } from '../../../../core/api/models/currency.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { CurrenciesService } from '../../../../core/services/currencies.service';
import { LanguageService } from '../../../../core/services/language.service';

type CurrencyFilter = 'all' | 'active';

@Component({
  selector: 'app-currencies-list',
  imports: [RouterLink, FormsModule, DatePipe, TranslatePipe],
  templateUrl: './currencies-list.component.html',
  styleUrl: './currencies-list.component.scss',
})
export class CurrenciesListComponent implements OnInit {
  private currenciesService = inject(CurrenciesService);
  private language = inject(LanguageService);

  currencies = signal<Currency[]>([]);
  baseCurrency = signal<Currency | null>(null);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<CurrencyFilter>('all');
  deleteTarget = signal<Currency | null>(null);
  deleting = signal(false);

  filteredCurrencies = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    let list = this.currencies();

    if (filter === 'active') {
      list = list.filter((currency) => currency.isActive);
    }

    if (!term) {
      return list;
    }

    return list.filter((currency) =>
      [currency.currencyName, currency.currencyShorcut, currency.fakhName]
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
    this.loadCurrencies();
    this.loadBaseCurrency();
  }

  loadCurrencies(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.currenciesService.getAll().subscribe({
      next: (currencies) => {
        this.currencies.set(currencies);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('currencies.loadError')),
        );
      },
    });
  }

  loadBaseCurrency(): void {
    this.currenciesService.getBase().subscribe({
      next: (currency) => this.baseCurrency.set(currency),
      error: () => this.baseCurrency.set(null),
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: CurrencyFilter): void {
    this.filter.set(filter);
  }

  openDeleteDialog(currency: Currency): void {
    this.deleteTarget.set(currency);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  closeDeleteDialog(): void {
    if (!this.deleting()) {
      this.deleteTarget.set(null);
    }
  }

  confirmDelete(): void {
    const currency = this.deleteTarget();
    if (!currency) {
      return;
    }

    this.deleting.set(true);
    this.currenciesService.delete(currency.id).subscribe({
      next: () => {
        this.currencies.update((list) => list.filter((item) => item.id !== currency.id));
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.successMessage.set(this.language.translate('currencies.deleteSuccess'));
        if (this.baseCurrency()?.id === currency.id) {
          this.loadBaseCurrency();
        }
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('currencies.deleteError')),
        );
      },
    });
  }
}
