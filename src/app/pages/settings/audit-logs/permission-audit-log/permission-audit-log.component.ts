import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';

import { PermissionAuditLog } from '../../../../core/api/models/audit-log.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AuditLogsService } from '../../../../core/services/audit-logs.service';
import { LanguageService } from '../../../../core/services/language.service';
import { csvExportFilename } from '../../../../core/utils/csv-export-filename';
import { downloadCsv } from '../../../../core/utils/download-csv';

type ChangeFilter = 'all' | 'granted' | 'revoked';

@Component({
  selector: 'app-permission-audit-log',
  imports: [FormsModule, TranslatePipe, DatePipe],
  templateUrl: './permission-audit-log.component.html',
  styleUrl: './permission-audit-log.component.scss',
})
export class PermissionAuditLogComponent implements OnInit {
  private service = inject(AuditLogsService);
  private language = inject(LanguageService);

  readonly pageSize = 50;

  items = signal<PermissionAuditLog[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  pageNumber = signal(1);
  totalCount = signal(0);
  searchTerm = signal('');
  filter = signal<ChangeFilter>('all');

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize)));

  /** Search and grant/revoke filters apply to the loaded page only — the API has no filter params. */
  filtered = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    return this.items().filter((item) => {
      if (filter === 'granted' && item.newValue !== true) {
        return false;
      }
      if (filter === 'revoked' && item.newValue !== false) {
        return false;
      }
      if (!term) {
        return true;
      }
      return [item.permissionKey, item.moduleName, item.changedByName, item.entityType, item.notes].some(
        (value) => String(value ?? '').toLowerCase().includes(term),
      );
    });
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    forkJoin({
      items: this.service.getPermissionLogs(this.pageNumber(), this.pageSize),
      count: this.service.getPermissionLogCount().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ items, count }) => {
        this.items.set(items);
        this.totalCount.set(count ?? (this.pageNumber() - 1) * this.pageSize + items.length);
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

  setFilter(filter: ChangeFilter): void {
    this.filter.set(filter);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.pageNumber()) {
      return;
    }
    this.pageNumber.set(page);
    this.load();
  }

  changeLabel(value?: boolean | null): string {
    if (value == null) {
      return '—';
    }
    return this.language.translate(value ? 'auditLogs.granted' : 'auditLogs.revoked');
  }

  exportCsv(): void {
    downloadCsv(
      csvExportFilename('permission-audit-log'),
      [
        this.language.translate('auditLogs.auditId'),
        this.language.translate('auditLogs.performedAt'),
        this.language.translate('auditLogs.performedBy'),
        this.language.translate('auditLogs.entity'),
        this.language.translate('auditLogs.module'),
        this.language.translate('auditLogs.permissionKey'),
        this.language.translate('auditLogs.oldValues'),
        this.language.translate('auditLogs.newValues'),
        this.language.translate('auditLogs.notes'),
      ],
      this.filtered().map((item) => [
        item.auditId,
        item.changedAt ?? '',
        item.changedByName ?? item.changedBy,
        `${item.entityType ?? ''} #${item.entityId}`,
        item.moduleName ?? item.moduleId,
        item.permissionKey ?? item.permissionId,
        this.changeLabel(item.oldValue),
        this.changeLabel(item.newValue),
        item.notes ?? '',
      ]),
    );
  }
}
