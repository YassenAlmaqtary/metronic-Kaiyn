import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  StockAdjustmentListItem,
  isAdjustmentDraft,
} from '../../../../core/api/models/stock-adjustment.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { StockAdjustmentsService } from '../../../../core/services/stock-adjustments.service';
import { csvExportFilename } from '../../../../core/utils/csv-export-filename';
import { downloadCsv } from '../../../../core/utils/download-csv';

@Component({
  selector: 'app-stock-adjustments-list',
  imports: [FormsModule, RouterLink, TranslatePipe, DatePipe, DecimalPipe],
  templateUrl: './stock-adjustments-list.component.html',
  styleUrl: './stock-adjustments-list.component.scss',
})
export class StockAdjustmentsListComponent implements OnInit {
  private service = inject(StockAdjustmentsService);
  private language = inject(LanguageService);

  items = signal<StockAdjustmentListItem[]>([]);
  loading = signal(false);
  actionLoading = signal<number | null>(null);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  draftsOnly = signal(false);

  filtered = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.items().filter(
      (x) =>
        (!this.draftsOnly() || isAdjustmentDraft(x.statusId)) &&
        (!term ||
          [x.adjNo, x.storeName, x.takingNo].some((v) =>
            String(v ?? '')
              .toLowerCase()
              .includes(term),
          )),
    );
  });

  readonly isDraft = isAdjustmentDraft;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    (this.draftsOnly() ? this.service.getDrafts() : this.service.getAll()).subscribe({
      next: (x) => {
        this.items.set(x);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(e, this.language.translate('stockAdjustments.loadError')),
        );
      },
    });
  }

  setFilter(draftsOnly: boolean): void {
    this.draftsOnly.set(draftsOnly);
    this.load();
  }

  exportCsv(): void {
    downloadCsv(
      csvExportFilename('stock-adjustments'),
      [
        this.language.translate('stockAdjustments.number'),
        this.language.translate('stockAdjustments.date'),
        this.language.translate('stockAdjustments.store'),
        this.language.translate('stockAdjustments.taking'),
        this.language.translate('stockAdjustments.totalValue'),
        this.language.translate('stockAdjustments.status'),
      ],
      this.filtered().map((x) => [
        x.adjNo ?? x.adjId,
        x.adjDate ?? '',
        x.storeName ?? '',
        x.takingNo ?? '',
        x.totalValue ?? 0,
        x.statusName ?? this.language.translate('stockAdjustments.draft'),
      ]),
    );
  }

  post(item: StockAdjustmentListItem): void {
    this.actionLoading.set(item.adjId);
    this.service.post(item.adjId).subscribe({
      next: (result) => {
        this.actionLoading.set(null);
        if (result.success === false) {
          this.errorMessage.set(
            result.message ?? this.language.translate('stockAdjustments.postError'),
          );
          return;
        }
        this.successMessage.set(this.language.translate('stockAdjustments.postSuccess'));
        this.load();
      },
      error: (e) => {
        this.actionLoading.set(null);
        this.errorMessage.set(
          extractApiErrorMessage(e, this.language.translate('stockAdjustments.postError')),
        );
      },
    });
  }
}
