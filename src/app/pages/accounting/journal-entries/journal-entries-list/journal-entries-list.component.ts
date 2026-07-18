import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AccountingPeriod } from '../../../../core/api/models/accounting-period.models';
import { Branch } from '../../../../core/api/models/branch.models';
import {
  isJournalEntryPosted,
  JournalEntry,
  JournalType,
} from '../../../../core/api/models/journal-entry.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { AuthService } from '../../../../core/api/auth.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AccountingPeriodsService } from '../../../../core/services/accounting-periods.service';
import { BranchesService } from '../../../../core/services/branches.service';
import { JournalEntriesService } from '../../../../core/services/journal-entries.service';
import { JournalTypesService } from '../../../../core/services/journal-types.service';
import { LanguageService } from '../../../../core/services/language.service';

type JournalFilter = 'all' | 'unposted' | 'posted';
type JournalAction = 'delete' | 'post' | 'unpost' | 'reverse' | 'bulkPost';

@Component({
  selector: 'app-journal-entries-list',
  imports: [RouterLink, FormsModule, ReactiveFormsModule, TranslatePipe, DecimalPipe],
  templateUrl: './journal-entries-list.component.html',
  styleUrl: './journal-entries-list.component.scss',
})
export class JournalEntriesListComponent implements OnInit {
  private journalEntriesService = inject(JournalEntriesService);
  private journalTypesService = inject(JournalTypesService);
  private accountingPeriodsService = inject(AccountingPeriodsService);
  private branchesService = inject(BranchesService);
  private auth = inject(AuthService);
  private language = inject(LanguageService);

  entries = signal<JournalEntry[]>([]);
  periods = signal<AccountingPeriod[]>([]);
  branches = signal<Branch[]>([]);
  journalTypes = signal<JournalType[]>([]);
  loading = signal(true);
  actionLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<JournalFilter>('all');
  periodFilter = signal<number | null>(null);
  branchFilter = signal<number | null>(null);
  typeFilter = signal<number | null>(null);
  selectedIds = signal<Set<number>>(new Set());
  actionTarget = signal<JournalEntry | null>(null);
  actionType = signal<JournalAction | null>(null);

  actionForm = new FormGroup({
    actorName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  filteredEntries = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    let list = this.entries();

    const periodId = this.periodFilter();
    if (periodId != null) {
      list = list.filter((entry) => entry.periodId === periodId);
    }

    const branchId = this.branchFilter();
    if (branchId != null) {
      list = list.filter((entry) => entry.branchId === branchId);
    }

    const typeId = this.typeFilter();
    if (typeId != null) {
      list = list.filter((entry) => entry.journalTypeId === typeId);
    }

    if (!term) {
      return list;
    }

    return list.filter((entry) =>
      [entry.entryId, entry.entryDate, entry.postedBy, entry.userId, entry.referenceId, entry.originalEntryId]
        .filter((value) => value != null && value !== '')
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  });

  stats = computed(() => {
    const list = this.entries();
    let posted = 0;
    let unposted = 0;
    let debit = 0;
    let credit = 0;

    for (const entry of list) {
      if (isJournalEntryPosted(entry)) {
        posted += 1;
      } else {
        unposted += 1;
      }
      debit += this.totalDebit(entry);
      credit += this.totalCredit(entry);
    }

    return {
      total: list.length,
      posted,
      unposted,
      debit,
      credit,
    };
  });

  hasActiveFilters = computed(
    () =>
      this.filter() !== 'all' ||
      this.periodFilter() != null ||
      this.branchFilter() != null ||
      this.typeFilter() != null ||
      this.searchTerm().trim().length > 0,
  );

  selectedUnpostedCount = computed(() => {
    const selected = this.selectedIds();
    return this.filteredEntries().filter(
      (entry) => selected.has(entry.entryId) && !isJournalEntryPosted(entry),
    ).length;
  });

  allVisibleSelected = computed(() => {
    const visible = this.filteredEntries();
    if (visible.length === 0) {
      return false;
    }
    const selected = this.selectedIds();
    return visible.every((entry) => selected.has(entry.entryId));
  });

  ngOnInit(): void {
    const navState = history.state as { successMessage?: string };
    if (navState?.successMessage) {
      this.successMessage.set(navState.successMessage);
      history.replaceState({}, '');
    }
    this.loadLookups();
    this.loadEntries();
  }

  loadLookups(): void {
    this.accountingPeriodsService.getAll().subscribe({
      next: (items) => this.periods.set(items),
      error: () => this.periods.set([]),
    });
    this.branchesService.getAll().subscribe({
      next: (items) => this.branches.set(items),
      error: () => this.branches.set([]),
    });
    this.journalTypesService.getActive().subscribe({
      next: (items) => this.journalTypes.set(items),
      error: () =>
        this.journalTypesService.getAll().subscribe({
          next: (all) => this.journalTypes.set(all),
          error: () => this.journalTypes.set([]),
        }),
    });
  }

  loadEntries(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.selectedIds.set(new Set());

    const filter = this.filter();
    const request =
      filter === 'posted'
        ? this.journalEntriesService.getPosted()
        : filter === 'unposted'
          ? this.journalEntriesService.getUnposted()
          : this.journalEntriesService.getAll();

    request.subscribe({
      next: (items) => {
        this.entries.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('journalEntries.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: JournalFilter): void {
    if (this.filter() === filter) {
      return;
    }
    this.filter.set(filter);
    this.loadEntries();
  }

  onPeriodFilterChange(value: string): void {
    this.periodFilter.set(value ? Number(value) : null);
  }

  onBranchFilterChange(value: string): void {
    this.branchFilter.set(value ? Number(value) : null);
  }

  onTypeFilterChange(value: string): void {
    this.typeFilter.set(value ? Number(value) : null);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.filter.set('all');
    this.periodFilter.set(null);
    this.branchFilter.set(null);
    this.typeFilter.set(null);
    this.loadEntries();
  }

  isPosted(entry: JournalEntry): boolean {
    return isJournalEntryPosted(entry);
  }

  isSelected(entryId: number): boolean {
    return this.selectedIds().has(entryId);
  }

  toggleSelect(entryId: number, checked: boolean): void {
    this.selectedIds.update((set) => {
      const next = new Set(set);
      if (checked) {
        next.add(entryId);
      } else {
        next.delete(entryId);
      }
      return next;
    });
  }

  toggleSelectAll(checked: boolean): void {
    if (!checked) {
      this.selectedIds.set(new Set());
      return;
    }
    this.selectedIds.set(new Set(this.filteredEntries().map((entry) => entry.entryId)));
  }

  branchLabel(branchId?: number | null): string {
    if (branchId == null) {
      return '—';
    }
    const branch = this.branches().find((item) => item.branchId === branchId);
    return branch?.branchName || branch?.branchCode || String(branchId);
  }

  periodLabel(periodId?: number | null): string {
    if (periodId == null) {
      return '—';
    }
    const period = this.periods().find((item) => item.periodId === periodId);
    return period?.periodName || String(periodId);
  }

  typeLabel(typeId?: number | null): string {
    if (typeId == null) {
      return '—';
    }
    const type = this.journalTypes().find((item) => item.journalTypeId === typeId);
    return type ? `${type.code || ''} ${type.name || ''}`.trim() || String(typeId) : String(typeId);
  }

  totalDebit(entry: JournalEntry): number {
    if (entry.totalDebit != null) {
      return entry.totalDebit;
    }
    return (entry.details ?? []).reduce((sum, line) => sum + (line.debit || 0), 0);
  }

  totalCredit(entry: JournalEntry): number {
    if (entry.totalCredit != null) {
      return entry.totalCredit;
    }
    return (entry.details ?? []).reduce((sum, line) => sum + (line.credit || 0), 0);
  }

  openActionDialog(entry: JournalEntry | null, action: JournalAction): void {
    this.actionTarget.set(entry);
    this.actionType.set(action);
    this.successMessage.set('');
    this.errorMessage.set('');
    this.actionForm.reset({ actorName: this.auth.userName() || '' });
  }

  closeActionDialog(): void {
    if (!this.actionLoading()) {
      this.actionTarget.set(null);
      this.actionType.set(null);
    }
  }

  confirmAction(): void {
    const action = this.actionType();
    if (!action) {
      return;
    }

    if (action === 'post' || action === 'reverse' || action === 'bulkPost') {
      this.actionForm.markAllAsTouched();
      if (this.actionForm.invalid) {
        return;
      }
    }

    this.actionLoading.set(true);
    const actor = this.actionForm.controls.actorName.value.trim();

    if (action === 'bulkPost') {
      const ids = this.filteredEntries()
        .filter((entry) => this.selectedIds().has(entry.entryId) && !isJournalEntryPosted(entry))
        .map((entry) => entry.entryId);

      if (ids.length === 0) {
        this.actionLoading.set(false);
        this.errorMessage.set(this.language.translate('journalEntries.bulkPostEmpty'));
        this.closeActionDialog();
        return;
      }

      this.journalEntriesService.postBulk({ entryIds: ids }).subscribe({
        next: (result) => {
          this.finishAction(
            this.language
              .translate('journalEntries.bulkPostSuccess')
              .replace('{success}', String(result.successCount))
              .replace('{failed}', String(result.failedCount)),
          );
          this.loadEntries();
        },
        error: (error) => this.failAction(error, 'journalEntries.bulkPostError'),
      });
      return;
    }

    const entry = this.actionTarget();
    if (!entry) {
      this.actionLoading.set(false);
      return;
    }

    if (action === 'delete') {
      this.journalEntriesService.delete(entry.entryId).subscribe({
        next: () => {
          this.entries.update((list) => list.filter((row) => row.entryId !== entry.entryId));
          this.finishAction(this.language.translate('journalEntries.deleteSuccess'));
        },
        error: (error) => this.failAction(error, 'journalEntries.deleteError'),
      });
      return;
    }

    if (action === 'post') {
      this.journalEntriesService.post(entry.entryId, actor).subscribe({
        next: (updated) => {
          this.replaceEntry(updated);
          this.finishAction(this.language.translate('journalEntries.postSuccess'));
        },
        error: (error) => this.failAction(error, 'journalEntries.postError'),
      });
      return;
    }

    if (action === 'unpost') {
      this.journalEntriesService.unpost(entry.entryId).subscribe({
        next: (updated) => {
          this.replaceEntry(updated);
          this.finishAction(this.language.translate('journalEntries.unpostSuccess'));
        },
        error: (error) => this.failAction(error, 'journalEntries.unpostError'),
      });
      return;
    }

    this.journalEntriesService.reverse(entry.entryId, actor).subscribe({
      next: () => {
        this.finishAction(this.language.translate('journalEntries.reverseSuccess'));
        this.loadEntries();
      },
      error: (error) => this.failAction(error, 'journalEntries.reverseError'),
    });
  }

  private replaceEntry(updated: JournalEntry): void {
    this.entries.update((list) =>
      list.map((row) => (row.entryId === updated.entryId ? updated : row)),
    );
  }

  private finishAction(message: string): void {
    this.actionLoading.set(false);
    this.actionTarget.set(null);
    this.actionType.set(null);
    this.successMessage.set(message);
  }

  private failAction(
    error: unknown,
    fallbackKey:
      | 'journalEntries.deleteError'
      | 'journalEntries.postError'
      | 'journalEntries.unpostError'
      | 'journalEntries.reverseError'
      | 'journalEntries.bulkPostError',
  ): void {
    this.actionLoading.set(false);
    this.errorMessage.set(extractApiErrorMessage(error, this.language.translate(fallbackKey)));
  }
}
