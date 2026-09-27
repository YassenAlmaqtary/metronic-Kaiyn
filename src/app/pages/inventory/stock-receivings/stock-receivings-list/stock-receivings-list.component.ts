import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  StockDocStatus,
  StockReceivingListItem,
  isStockDocPending,
  isStockDocPosted,
} from '../../../../core/api/models/stock-receiving.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { BranchesService } from '../../../../core/services/branches.service';
import { LanguageService } from '../../../../core/services/language.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StockReceivingsService } from '../../../../core/services/stock-receivings.service';
import { StoresService } from '../../../../core/services/stores.service';
import { csvExportFilename } from '../../../../core/utils/csv-export-filename';
import { downloadCsv } from '../../../../core/utils/download-csv';

@Component({
  selector: 'app-stock-receivings-list',
  imports: [FormsModule, RouterLink, TranslatePipe, DatePipe, DecimalPipe],
  templateUrl: './stock-receivings-list.component.html',
  styleUrl: './stock-receivings-list.component.scss',
})
export class StockReceivingsListComponent implements OnInit {
  private service = inject(StockReceivingsService);
  private branchesService = inject(BranchesService);
  private storesService = inject(StoresService);
  private language = inject(LanguageService);
  private toast = inject(ToastService);

  items = signal<StockReceivingListItem[]>([]);
  loading = signal(false);
  actionLoading = signal<number | null>(null);
  errorMessage = signal('');
  searchTerm = signal('');
  statusFilter = signal<'all' | 'pending' | 'posted'>('all');
  deleteTarget = signal<StockReceivingListItem | null>(null);

  private branchNames = new Map<number, string>();
  private storeNames = new Map<number, string>();

  filtered = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const filter = this.statusFilter();
    return this.items().filter((x) => {
      const pending = isStockDocPending(x.status, x.datePosted, { kind: 'receiving' });
      if (filter === 'pending' && !pending) {
        return false;
      }
      if (filter === 'posted' && pending) {
        return false;
      }
      if (!term) {
        return true;
      }
      return [x.receivingNumber, x.storeName, x.branchName, x.supplierId].some((v) =>
        String(v ?? '')
          .toLowerCase()
          .includes(term),
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
      items: this.service.getAll(),
      branches: this.branchesService.getAll(),
      stores: this.storesService.getAll(),
    }).subscribe({
      next: ({ items, branches, stores }) => {
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
        this.items.set(items.map((row) => this.withResolvedNames(row)));
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(e, this.language.translate('stockReceivings.loadError')),
        );
      },
    });
  }

  setFilter(filter: 'all' | 'pending' | 'posted'): void {
    this.statusFilter.set(filter);
  }

  exportCsv(): void {
    downloadCsv(
      csvExportFilename('stock-receivings'),
      [
        this.language.translate('stockReceivings.number'),
        this.language.translate('stockReceivings.date'),
        this.language.translate('stockReceivings.branch'),
        this.language.translate('stockReceivings.store'),
        this.language.translate('stockReceivings.total'),
        this.language.translate('stockReceivings.status'),
      ],
      this.filtered().map((item) => [
        item.receivingNumber ?? item.receivingId,
        item.receivingDate ?? '',
        item.branchName ?? '',
        item.storeName ?? '',
        item.totalAmount ?? 0,
        this.isPending(item)
          ? this.language.translate('stockReceivings.pending')
          : this.language.translate('stockReceivings.posted'),
      ]),
    );
  }

  post(item: StockReceivingListItem): void {
    const id = Number(item.receivingId);
    if (!Number.isFinite(id) || id <= 0) {
      this.errorMessage.set(this.language.translate('stockReceivings.actionError'));
      return;
    }
    this.actionLoading.set(id);
    this.errorMessage.set('');
    
    this.service.post(id).subscribe({
      next: (doc) => {
        this.actionLoading.set(null);
        this.toast.success(this.language.translate('stockReceivings.postSuccess'));
        this.items.update((list) =>
          list.map((row) =>
            row.receivingId === id
              ? this.withResolvedNames({
                  ...row,
                  ...doc,
                  status: StockDocStatus.ReceivingPosted,
                  datePosted: doc.datePosted || new Date().toISOString(),
                })
              : row,
          ),
        );
      },
      error: (e) => {
        this.actionLoading.set(null);
        this.errorMessage.set(
          extractApiErrorMessage(e, this.language.translate('stockReceivings.actionError')),
        );
        this.load();
      },
    });
  }

  delete(item: StockReceivingListItem): void {
    this.deleteTarget.set(item);
  }

  closeDeleteDialog(): void {
    if (this.actionLoading() != null) {
      return;
    }
    this.deleteTarget.set(null);
  }

  confirmDelete(): void {
    const item = this.deleteTarget();
    if (!item) {
      return;
    }
    const id = Number(item.receivingId);
    this.actionLoading.set(id);
    this.errorMessage.set('');
    
    this.service.delete(id).subscribe({
      next: () => {
        this.actionLoading.set(null);
        this.deleteTarget.set(null);
        this.toast.success(this.language.translate('stockReceivings.deleteSuccess'));
        this.items.update((list) => list.filter((row) => row.receivingId !== id));
      },
      error: (e) => {
        this.actionLoading.set(null);
        this.deleteTarget.set(null);
        this.errorMessage.set(
          extractApiErrorMessage(e, this.language.translate('stockReceivings.actionError')),
        );
      },
    });
  }

  isPending(item: StockReceivingListItem): boolean {
    return isStockDocPending(item.status, item.datePosted, { kind: 'receiving' });
  }

  isPosted(item: StockReceivingListItem): boolean {
    return isStockDocPosted(item.status, item.datePosted, { kind: 'receiving' });
  }

  private withResolvedNames(row: StockReceivingListItem): StockReceivingListItem {
    return {
      ...row,
      branchName:
        (row.branchName ?? '').trim() ||
        this.branchNames.get(Number(row.branchId)) ||
        null,
      storeName:
        (row.storeName ?? '').trim() ||
        this.storeNames.get(Number(row.storeId)) ||
        null,
    };
  }
}
