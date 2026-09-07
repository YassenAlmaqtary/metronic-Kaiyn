import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { StockReceivingType } from '../../../../core/api/models/stock-receiving-type.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { StockReceivingTypesService } from '../../../../core/services/stock-receiving-types.service';
import { csvExportFilename } from '../../../../core/utils/csv-export-filename';
import { downloadCsv } from '../../../../core/utils/download-csv';

type ReceivingTypeFilter = 'all' | 'active';

@Component({
  selector: 'app-stock-receiving-types-list',
  imports: [RouterLink, FormsModule, TranslatePipe],
  templateUrl: './stock-receiving-types-list.component.html',
})
export class StockReceivingTypesListComponent implements OnInit {
  private stockReceivingTypesService = inject(StockReceivingTypesService);
  private language = inject(LanguageService);

  types = signal<StockReceivingType[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<ReceivingTypeFilter>('all');
  deleteTarget = signal<StockReceivingType | null>(null);
  deleting = signal(false);

  filteredTypes = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    let list = this.types();

    if (filter === 'active') {
      list = list.filter((item) => item.isActive);
    }

    if (!term) {
      return list;
    }

    return list.filter((item) =>
      [
        item.receivingTypeName,
        item.description,
        item.debitAccountCode,
        item.debitAccountName,
        item.creditAccountCode,
        item.creditAccountName,
        item.receivingTypeId,
      ]
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
    this.loadTypes();
  }

  typeLabel(item: StockReceivingType): string {
    return item.receivingTypeName || String(item.receivingTypeId);
  }

  accountLabel(code?: string | null, name?: string | null): string {
    if (code && name) {
      return `${code} — ${name}`;
    }
    return code || name || '—';
  }

  private t(key: string): string {
    return this.language.translate(key as TranslationKey);
  }

  loadTypes(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.stockReceivingTypesService.getAll().subscribe({
      next: (types) => {
        this.types.set(types);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.t('stockReceivingTypes.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: ReceivingTypeFilter): void {
    this.filter.set(filter);
  }

  exportCsv(): void {
    downloadCsv(
      csvExportFilename('stock-receiving-types'),
      [
        this.t('stockReceivingTypes.receivingTypeName'),
        this.t('stockReceivingTypes.description'),
        this.t('stockReceivingTypes.debitAccount'),
        this.t('stockReceivingTypes.creditAccount'),
        this.t('stockReceivingTypes.status'),
      ],
      this.filteredTypes().map((item) => [
        item.receivingTypeName ?? '',
        item.description ?? '',
        this.accountLabel(item.debitAccountCode, item.debitAccountName),
        this.accountLabel(item.creditAccountCode, item.creditAccountName),
        item.isActive
          ? this.t('stockReceivingTypes.active')
          : this.t('stockReceivingTypes.inactive'),
      ]),
    );
  }

  openDeleteDialog(item: StockReceivingType): void {
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
    this.stockReceivingTypesService.delete(item.receivingTypeId).subscribe({
      next: () => {
        this.types.update((list) =>
          list.filter((entry) => entry.receivingTypeId !== item.receivingTypeId),
        );
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.successMessage.set(this.t('stockReceivingTypes.deleteSuccess'));
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.t('stockReceivingTypes.deleteError')),
        );
      },
    });
  }
}
