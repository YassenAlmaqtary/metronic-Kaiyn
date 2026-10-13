import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SystemAuditLog } from '../../../../core/api/models/audit-log.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AuditLogsService } from '../../../../core/services/audit-logs.service';
import { LanguageService } from '../../../../core/services/language.service';
import { csvExportFilename } from '../../../../core/utils/csv-export-filename';
import { downloadCsv } from '../../../../core/utils/download-csv';

type ActionFilter = '' | 'Insert' | 'Update' | 'Delete';

@Component({
  selector: 'app-system-audit-log',
  imports: [FormsModule, TranslatePipe, DatePipe],
  templateUrl: './system-audit-log.component.html',
  styleUrl: './system-audit-log.component.scss',
})
export class SystemAuditLogComponent implements OnInit {
  private service = inject(AuditLogsService);
  private language = inject(LanguageService);

  readonly pageSize = 25;

  items = signal<SystemAuditLog[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  pageNumber = signal(1);
  totalPages = signal(1);
  totalCount = signal(0);

  searchTerm = signal('');
  tableName = signal('');
  actionType = signal<ActionFilter>('');

  selected = signal<SystemAuditLog | null>(null);
  detailsLoading = signal(false);
  detailsError = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.service
      .getSystemLogs({
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize,
        searchTerm: this.searchTerm(),
        tableName: this.tableName(),
        actionType: this.actionType(),
      })
      .subscribe({
        next: (page) => {
          this.items.set(page.items ?? []);
          this.totalPages.set(Math.max(1, page.totalPages || 1));
          this.totalCount.set(page.totalCount || 0);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.items.set([]);
          this.errorMessage.set(
            extractApiErrorMessage(error, this.language.translate('auditLogs.loadError')),
          );
        },
      });
  }

  applyFilters(): void {
    this.pageNumber.set(1);
    this.load();
  }

  setAction(action: ActionFilter): void {
    this.actionType.set(action);
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.tableName.set('');
    this.actionType.set('');
    this.applyFilters();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.pageNumber()) {
      return;
    }
    this.pageNumber.set(page);
    this.load();
  }

  actionBadge(action?: string | null): string {
    const value = (action ?? '').toLowerCase();
    if (value.startsWith('ins') || value.startsWith('add') || value.startsWith('create')) {
      return 'kt-badge-success';
    }
    if (value.startsWith('del') || value.startsWith('rem')) {
      return 'kt-badge-destructive';
    }
    return 'kt-badge-warning';
  }

  openDetails(item: SystemAuditLog): void {
    this.selected.set(item);
    this.detailsError.set('');
    this.detailsLoading.set(true);
    this.service.getSystemLogById(item.auditId).subscribe({
      next: (details) => {
        this.selected.set(details);
        this.detailsLoading.set(false);
      },
      error: (error) => {
        this.detailsLoading.set(false);
        this.detailsError.set(
          extractApiErrorMessage(error, this.language.translate('auditLogs.detailsError')),
        );
      },
    });
  }

  closeDetails(): void {
    this.selected.set(null);
    this.detailsError.set('');
    this.detailsLoading.set(false);
  }

  formatValues(raw?: string | null): string {
    if (!raw?.trim()) {
      return '—';
    }
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }

  exportCsv(): void {
    downloadCsv(
      csvExportFilename('system-audit-log'),
      [
        this.language.translate('auditLogs.auditId'),
        this.language.translate('auditLogs.performedAt'),
        this.language.translate('auditLogs.performedBy'),
        this.language.translate('auditLogs.actionType'),
        this.language.translate('auditLogs.table'),
        this.language.translate('auditLogs.recordId'),
        this.language.translate('auditLogs.ip'),
      ],
      this.items().map((item) => [
        item.auditId,
        item.performedAt ?? '',
        item.performedByUserName ?? item.performedByUserId,
        item.actionType ?? '',
        item.tableDisplayName || item.tableName || '',
        item.recordId ?? '',
        item.performedFromIP ?? '',
      ]),
    );
  }
}
