import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { TaxSetup } from '../../../../core/api/models/tax-setup.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { TaxSetupsService } from '../../../../core/services/tax-setups.service';

type TaxFilter = 'all' | 'active';

@Component({
  selector: 'app-tax-setups-list',
  imports: [RouterLink, FormsModule, TranslatePipe, DatePipe],
  templateUrl: './tax-setups-list.component.html',
  styleUrl: './tax-setups-list.component.scss',
})
export class TaxSetupsListComponent implements OnInit {
  private taxSetupsService = inject(TaxSetupsService);
  private language = inject(LanguageService);

  taxSetups = signal<TaxSetup[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<TaxFilter>('all');
  deleteTarget = signal<TaxSetup | null>(null);
  deleting = signal(false);

  filteredTaxSetups = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    let list = this.taxSetups();

    if (filter === 'active') {
      list = list.filter((item) => item.isActive);
    }

    if (!term) {
      return list;
    }

    return list.filter((item) =>
      [item.taxCode, item.taxType, item.accountId, item.taxSetupId]
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
    this.loadTaxSetups();
  }

  loadTaxSetups(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.taxSetupsService.getAll().subscribe({
      next: (items) => {
        this.taxSetups.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('taxSetups.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: TaxFilter): void {
    this.filter.set(filter);
  }

  openDeleteDialog(item: TaxSetup): void {
    this.deleteTarget.set(item);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  closeDeleteDialog(): void {
    if (!this.deleting()) {
      this.deleteTarget.set(null);
    }
  }

  confirmDelete(): void {
    const item = this.deleteTarget();
    if (!item) {
      return;
    }

    this.deleting.set(true);
    this.taxSetupsService.delete(item.taxSetupId).subscribe({
      next: () => {
        this.taxSetups.update((list) => list.filter((row) => row.taxSetupId !== item.taxSetupId));
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.successMessage.set(this.language.translate('taxSetups.deleteSuccess'));
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('taxSetups.deleteError')),
        );
      },
    });
  }
}
