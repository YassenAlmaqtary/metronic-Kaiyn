import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { SystemLog } from '../../../../core/api/models/system-log.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { SystemLogService } from '../../../../core/services/system-log.service';

@Component({
  selector: 'app-system-logs-list',
  imports: [RouterLink, FormsModule, DatePipe, TranslatePipe],
  templateUrl: './system-logs-list.component.html',
  styleUrl: './system-logs-list.component.scss',
})
export class SystemLogsListComponent implements OnInit {
  private systemLogService = inject(SystemLogService);
  private language = inject(LanguageService);

  logs = signal<SystemLog[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');

  selectedLog = signal<SystemLog | null>(null);
  detailsLoading = signal(false);
  detailsError = signal('');

  filteredLogs = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.logs();

    if (!term) {
      return list;
    }

    return list.filter((log) =>
      [log.userName, log.actionType, log.tableName, log.recordID, log.description, log.ipAddress, log.machineName]
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
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.systemLogService.getAll().subscribe({
      next: (logs) => {
        this.logs.set(logs);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('systemLogs.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  openDetails(log: SystemLog): void {
    this.selectedLog.set(null);
    this.detailsError.set('');
    this.detailsLoading.set(true);
    this.successMessage.set('');

    this.systemLogService.getById(log.logID).subscribe({
      next: (details) => {
        this.selectedLog.set(details);
        this.detailsLoading.set(false);
      },
      error: (error) => {
        this.detailsLoading.set(false);
        this.detailsError.set(
          extractApiErrorMessage(error, this.language.translate('systemLogs.detailsError')),
        );
        // Fallback to list row data if getById fails
        this.selectedLog.set(log);
      },
    });
  }

  closeDetails(): void {
    if (this.detailsLoading()) {
      return;
    }
    this.selectedLog.set(null);
    this.detailsError.set('');
  }
}
