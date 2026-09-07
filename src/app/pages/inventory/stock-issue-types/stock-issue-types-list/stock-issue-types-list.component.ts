import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { StockIssueType } from '../../../../core/api/models/stock-issue-type.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { StockIssueTypesService } from '../../../../core/services/stock-issue-types.service';
import { csvExportFilename } from '../../../../core/utils/csv-export-filename';
import { downloadCsv } from '../../../../core/utils/download-csv';

type IssueTypeFilter = 'all' | 'active';

@Component({
  selector: 'app-stock-issue-types-list',
  imports: [RouterLink, FormsModule, TranslatePipe],
  templateUrl: './stock-issue-types-list.component.html',
})
export class StockIssueTypesListComponent implements OnInit {
  private stockIssueTypesService = inject(StockIssueTypesService);
  private language = inject(LanguageService);

  types = signal<StockIssueType[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<IssueTypeFilter>('all');
  deleteTarget = signal<StockIssueType | null>(null);
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
        item.issueTypeName,
        item.description,
        item.debitAccountCode,
        item.debitAccountName,
        item.creditAccountCode,
        item.creditAccountName,
        item.issueTypeId,
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

  typeLabel(item: StockIssueType): string {
    return item.issueTypeName || String(item.issueTypeId);
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

    this.stockIssueTypesService.getAll().subscribe({
      next: (types) => {
        this.types.set(types);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.t('stockIssueTypes.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: IssueTypeFilter): void {
    this.filter.set(filter);
  }

  exportCsv(): void {
    downloadCsv(
      csvExportFilename('stock-issue-types'),
      [
        this.t('stockIssueTypes.issueTypeName'),
        this.t('stockIssueTypes.description'),
        this.t('stockIssueTypes.debitAccount'),
        this.t('stockIssueTypes.creditAccount'),
        this.t('stockIssueTypes.status'),
      ],
      this.filteredTypes().map((item) => [
        item.issueTypeName ?? '',
        item.description ?? '',
        this.accountLabel(item.debitAccountCode, item.debitAccountName),
        this.accountLabel(item.creditAccountCode, item.creditAccountName),
        item.isActive
          ? this.t('stockIssueTypes.active')
          : this.t('stockIssueTypes.inactive'),
      ]),
    );
  }

  openDeleteDialog(item: StockIssueType): void {
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
    this.stockIssueTypesService.delete(item.issueTypeId).subscribe({
      next: () => {
        this.types.update((list) =>
          list.filter((entry) => entry.issueTypeId !== item.issueTypeId),
        );
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.successMessage.set(this.t('stockIssueTypes.deleteSuccess'));
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.t('stockIssueTypes.deleteError')),
        );
      },
    });
  }
}
