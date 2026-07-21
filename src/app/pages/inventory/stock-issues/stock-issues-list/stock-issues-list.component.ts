import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { isStockDocPending, isStockDocPosted } from '../../../../core/api/models/stock-shared.models';
import { StockIssueListItem } from '../../../../core/api/models/stock-issue.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { StockIssuesService } from '../../../../core/services/stock-issues.service';

type ListFilter = 'all' | 'pending';

@Component({
  selector: 'app-stock-issues-list',
  imports: [RouterLink, FormsModule, DatePipe, DecimalPipe, TranslatePipe],
  templateUrl: './stock-issues-list.component.html',
  styleUrl: './stock-issues-list.component.scss',
})
export class StockIssuesListComponent implements OnInit {
  private service = inject(StockIssuesService);
  private language = inject(LanguageService);

  issues = signal<StockIssueListItem[]>([]);
  loading = signal(false);
  actionLoading = signal<number | null>(null);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<ListFilter>('all');

  filteredIssues = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.issues().filter(
      (issue) =>
        !term ||
        [issue.issueNumber, issue.branchName, issue.storeName, issue.issueToName].some((value) =>
          String(value ?? '')
            .toLowerCase()
            .includes(term),
        ),
    );
  });

  ngOnInit(): void {
    const state = history.state as { successMessage?: string };
    if (state.successMessage) {
      this.successMessage.set(state.successMessage);
      history.replaceState({}, '');
    }
    this.loadIssues();
  }

  loadIssues(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    const request = this.filter() === 'pending' ? this.service.getPending() : this.service.getAll();
    request.subscribe({
      next: (issues) => {
        this.issues.set(issues);
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
    if (this.filter() === filter) {
      return;
    }
    this.filter.set(filter);
    this.loadIssues();
  }

  isPending(issue: StockIssueListItem): boolean {
    return isStockDocPending(issue.status, issue.datePosted);
  }

  statusKey(status?: number, datePosted?: string | null): string {
    return isStockDocPosted(status, datePosted)
      ? 'stockIssues.status.posted'
      : 'stockIssues.status.pending';
  }

  post(issue: StockIssueListItem): void {
    if (!confirm(this.language.translate('stockIssues.postConfirm'))) {
      return;
    }
    this.run(issue.issueId, () => this.service.post(issue.issueId), 'stockIssues.postSuccess');
  }

  delete(issue: StockIssueListItem): void {
    if (!confirm(this.language.translate('stockIssues.deleteConfirm'))) {
      return;
    }
    this.run(issue.issueId, () => this.service.delete(issue.issueId), 'stockIssues.deleteSuccess');
  }

  private run(
    id: number,
    action: () => ReturnType<StockIssuesService['post']> | ReturnType<StockIssuesService['delete']>,
    key: string,
  ): void {
    this.actionLoading.set(id);
    this.errorMessage.set('');
    action().subscribe({
      next: () => {
        this.actionLoading.set(null);
        this.successMessage.set(this.language.translate(key));
        this.loadIssues();
      },
      error: (error) => {
        this.actionLoading.set(null);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('stockIssues.loadError')),
        );
      },
    });
  }
}
