import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { isStockDocPending, isStockDocPosted } from '../../../../core/api/models/stock-shared.models';
import { StockTransferListItem } from '../../../../core/api/models/stock-transfer.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StockTransfersService } from '../../../../core/services/stock-transfers.service';
import { csvExportFilename } from '../../../../core/utils/csv-export-filename';
import { downloadCsv } from '../../../../core/utils/download-csv';

type ListFilter = 'all' | 'pending';

@Component({
  selector: 'app-stock-transfers-list',
  imports: [RouterLink, FormsModule, DatePipe, DecimalPipe, TranslatePipe],
  templateUrl: './stock-transfers-list.component.html',
  styleUrl: './stock-transfers-list.component.scss',
})
export class StockTransfersListComponent implements OnInit {
  private service = inject(StockTransfersService);
  private language = inject(LanguageService);
  private toast = inject(ToastService);

  transfers = signal<StockTransferListItem[]>([]);
  loading = signal(false);
  actionLoading = signal<number | null>(null);
  actionBusy = signal(false);
  errorMessage = signal('');
  searchTerm = signal('');
  filter = signal<ListFilter>('all');
  actionType = signal<'post' | 'delete' | null>(null);
  actionTarget = signal<StockTransferListItem | null>(null);

  filtered = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.transfers().filter(
      (x) =>
        !term ||
        [
          x.transferNumber,
          x.fromBranchName,
          x.fromStoreName,
          x.toBranchName,
          x.toStoreName,
        ].some((v) =>
          String(v ?? '')
            .toLowerCase()
            .includes(term),
        ),
    );
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    const request = this.filter() === 'pending' ? this.service.getPending() : this.service.getAll();
    request.subscribe({
      next: (x) => {
        this.transfers.set(x);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(e, this.language.translate('stockTransfers.loadError')),
        );
      },
    });
  }

  setFilter(filter: ListFilter): void {
    if (this.filter() === filter) {
      return;
    }
    this.filter.set(filter);
    this.load();
  }

  isPending(x: StockTransferListItem): boolean {
    return isStockDocPending(x.status, x.datePosted, { kind: 'transfer' });
  }

  statusKey(status?: number, datePosted?: string | null): string {
    return isStockDocPosted(status, datePosted, { kind: 'transfer' })
      ? 'stockTransfers.status.posted'
      : 'stockTransfers.status.pending';
  }

  routeLabel(x: StockTransferListItem): string {
    const from = [x.fromBranchName || '—', x.fromStoreName || '—'].join(' / ');
    const to = [x.toBranchName || '—', x.toStoreName || '—'].join(' / ');
    return `${from} → ${to}`;
  }

  exportCsv(): void {
    downloadCsv(
      csvExportFilename('stock-transfers'),
      [
        this.language.translate('stockTransfers.number'),
        this.language.translate('stockTransfers.date'),
        `${this.language.translate('stockTransfers.fromStore')} → ${this.language.translate('stockTransfers.toStore')}`,
        this.language.translate('stockTransfers.total'),
        this.language.translate('stockTransfers.status'),
      ],
      this.filtered().map((x) => [
        x.transferNumber ?? x.transferId,
        x.transferDate ?? '',
        this.routeLabel(x),
        x.totalAmount ?? 0,
        this.language.translate(this.statusKey(x.status, x.datePosted)),
      ]),
    );
  }

  post(x: StockTransferListItem): void {
    this.openActionDialog(x, 'post');
  }

  delete(x: StockTransferListItem): void {
    this.openActionDialog(x, 'delete');
  }

  openActionDialog(x: StockTransferListItem, action: 'post' | 'delete'): void {
    this.actionTarget.set(x);
    this.actionType.set(action);
  }

  closeActionDialog(): void {
    if (this.actionBusy()) {
      return;
    }
    this.actionType.set(null);
    this.actionTarget.set(null);
  }

  confirmAction(): void {
    const action = this.actionType();
    const x = this.actionTarget();
    if (!action || !x) {
      return;
    }
    const id = x.transferId;
    const request = action === 'post' ? this.service.post(id) : this.service.delete(id);
    const key = action === 'post' ? 'stockTransfers.postSuccess' : 'stockTransfers.deleteSuccess';
    this.actionBusy.set(true);
    this.errorMessage.set('');
    
    request.subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.actionType.set(null);
        this.actionTarget.set(null);
        this.toast.success(this.language.translate(key));
        this.load();
      },
      error: (e) => {
        this.actionBusy.set(false);
        this.actionType.set(null);
        this.actionTarget.set(null);
        this.errorMessage.set(
          extractApiErrorMessage(e, this.language.translate('stockTransfers.loadError')),
        );
      },
    });
  }
}
