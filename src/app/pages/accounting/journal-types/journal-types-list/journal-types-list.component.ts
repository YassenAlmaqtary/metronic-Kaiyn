import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { JournalType } from '../../../../core/api/models/journal-type.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { JournalTypesService } from '../../../../core/services/journal-types.service';
import { LanguageService } from '../../../../core/services/language.service';
import { csvExportFilename } from '../../../../core/utils/csv-export-filename';
import { downloadCsv } from '../../../../core/utils/download-csv';

type JournalTypeFilter = 'all' | 'active';

@Component({
  selector: 'app-journal-types-list',
  imports: [RouterLink, FormsModule, TranslatePipe],
  templateUrl: './journal-types-list.component.html',
  styleUrl: './journal-types-list.component.scss',
})
export class JournalTypesListComponent implements OnInit {
  private journalTypesService = inject(JournalTypesService);
  private language = inject(LanguageService);

  journalTypes = signal<JournalType[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<JournalTypeFilter>('all');
  deleteTarget = signal<JournalType | null>(null);
  deleting = signal(false);

  filteredJournalTypes = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    let list = this.journalTypes();

    if (filter === 'active') {
      list = list.filter((item) => item.isActive);
    }

    if (!term) {
      return list;
    }

    return list.filter((item) =>
      [item.code, item.name, item.description, item.journalTypeId]
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
    this.loadJournalTypes();
  }

  journalTypeLabel(item: JournalType): string {
    return item.name || item.code || String(item.journalTypeId);
  }

  loadJournalTypes(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.journalTypesService.getAll().subscribe({
      next: (items) => {
        this.journalTypes.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('journalTypes.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: JournalTypeFilter): void {
    this.filter.set(filter);
  }

  exportCsv(): void {
    downloadCsv(
      csvExportFilename('journal-types'),
      [
        this.language.translate('journalTypes.code'),
        this.language.translate('journalTypes.name'),
        this.language.translate('journalTypes.description'),
        this.language.translate('journalTypes.status'),
      ],
      this.filteredJournalTypes().map((item) => [
        item.code ?? '',
        item.name ?? '',
        item.description ?? '',
        item.isActive
          ? this.language.translate('journalTypes.active')
          : this.language.translate('journalTypes.inactive'),
      ]),
    );
  }

  openDeleteDialog(item: JournalType): void {
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
    this.journalTypesService.delete(item.journalTypeId).subscribe({
      next: () => {
        this.journalTypes.update((list) =>
          list.filter((entry) => entry.journalTypeId !== item.journalTypeId),
        );
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.successMessage.set(this.language.translate('journalTypes.deleteSuccess'));
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('journalTypes.deleteError')),
        );
      },
    });
  }
}
