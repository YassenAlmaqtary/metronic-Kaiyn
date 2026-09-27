import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { isStockDocPending, isStockDocPosted } from '../../../../core/api/models/stock-shared.models';
import { StockIssueListItem } from '../../../../core/api/models/stock-issue.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { BranchesService } from '../../../../core/services/branches.service';
import { LanguageService } from '../../../../core/services/language.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StockIssuesService } from '../../../../core/services/stock-issues.service';
import { StoresService } from '../../../../core/services/stores.service';
import { csvExportFilename } from '../../../../core/utils/csv-export-filename';
import { downloadCsv } from '../../../../core/utils/download-csv';

type ListFilter = 'all' | 'pending';
type IssueAction = 'post' | 'delete';

@Component({
  selector: 'app-stock-issues-list',
  imports: [RouterLink, FormsModule, DatePipe, DecimalPipe, TranslatePipe],
  templateUrl: './stock-issues-list.component.html',
  styleUrl: './stock-issues-list.component.scss',
})
export class StockIssuesListComponent implements OnInit {
  private service = inject(StockIssuesService);
  private branchesService = inject(BranchesService);
  private storesService = inject(StoresService);
  private language = inject(LanguageService);
  private toast = inject(ToastService);

  issues = signal<StockIssueListItem[]>([]);
  loading = signal(false);
  actionLoading = signal(false);
  errorMessage = signal('');
  searchTerm = signal('');
  filter = signal<ListFilter>('all');
  actionType = signal<IssueAction | null>(null);
  actionTarget = signal<StockIssueListItem | null>(null);

  private branchNames = new Map<number, string>();
  private storeNames = new Map<number, string>();

  filteredIssues = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    return this.issues().filter((issue) => {
      if (filter === 'pending' && !this.isPending(issue)) {
        return false;
      }
      if (!term) {
        return true;
      }
      return [issue.issueNumber, issue.branchName, issue.storeName, issue.issueToName].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(term),
      );
    });
  });

  ngOnInit(): void {
    this.loadIssues();
  }

  loadIssues(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    forkJoin({
      issues: this.service.getAll(),
      branches: this.branchesService.getAll().pipe(catchError(() => of([]))),
      stores: this.storesService.getAll().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ issues, branches, stores }) => {
        this.branchNames.clear();
        for (const b of branches) {
          const name = (b.branchName ?? '').trim();
          if (name) {
            this.branchNames.set(b.branchId, name);
          }
        }
        this.storeNames.clear();
        for (const s of stores) {
          const name = (s.storeName ?? '').trim();
          if (name) {
            this.storeNames.set(s.storeId, name);
          }
        }
        this.issues.set(issues.map((row) => this.withResolvedNames(row)));
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('stockIssues.loadError')),
        );
      },
    });
  }

  setFilter(filter: ListFilter): void {
    this.filter.set(filter);
  }

  isPending(issue: StockIssueListItem): boolean {
    return isStockDocPending(issue.status, issue.datePosted, { kind: 'issue' });
  }

  statusKey(status?: number, datePosted?: string | null): string {
    return isStockDocPosted(status, datePosted, { kind: 'issue' })
      ? 'stockIssues.status.posted'
      : 'stockIssues.status.pending';
  }

  exportCsv(): void {
    downloadCsv(
      csvExportFilename('stock-issues'),
      [
        this.language.translate('stockIssues.number'),
        this.language.translate('stockIssues.date'),
        this.language.translate('stockIssues.branch'),
        this.language.translate('stockIssues.store'),
        this.language.translate('stockIssues.total'),
        this.language.translate('stockIssues.status'),
      ],
      this.filteredIssues().map((issue) => [
        issue.issueNumber ?? issue.issueId,
        issue.issueDate ?? '',
        issue.branchName ?? '',
        issue.storeName ?? '',
        issue.totalAmount ?? 0,
        this.language.translate(this.statusKey(issue.status, issue.datePosted)),
      ]),
    );
  }

  openActionDialog(issue: StockIssueListItem, action: IssueAction): void {
    this.actionTarget.set(issue);
    this.actionType.set(action);
  }

  closeActionDialog(): void {
    if (this.actionLoading()) {
      return;
    }
    this.actionType.set(null);
    this.actionTarget.set(null);
  }

  confirmAction(): void {
    const action = this.actionType();
    const issue = this.actionTarget();
    if (!action || !issue) {
      return;
    }
    const id = issue.issueId;
    const request = action === 'post' ? this.service.post(id) : this.service.delete(id);
    const successKey = action === 'post' ? 'stockIssues.postSuccess' : 'stockIssues.deleteSuccess';

    this.actionLoading.set(true);
    this.errorMessage.set('');
    
    request.subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.actionType.set(null);
        this.actionTarget.set(null);
        this.toast.success(this.language.translate(successKey));
        this.loadIssues();
      },
      error: (error) => {
        this.actionLoading.set(false);
        this.actionType.set(null);
        this.actionTarget.set(null);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('stockIssues.actionError')),
        );
      },
    });
  }

  private withResolvedNames(row: StockIssueListItem): StockIssueListItem {
    return {
      ...row,
      branchName:
        (row.branchName ?? '').trim() || this.branchNames.get(Number(row.branchId)) || null,
      storeName: (row.storeName ?? '').trim() || this.storeNames.get(Number(row.storeId)) || null,
    };
  }
}
