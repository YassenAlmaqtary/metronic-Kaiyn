import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { isStockDocPending, isStockDocPosted } from '../../../../core/api/models/stock-shared.models';
import { StockTransferListItem } from '../../../../core/api/models/stock-transfer.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { StockTransfersService } from '../../../../core/services/stock-transfers.service';

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

  transfers = signal<StockTransferListItem[]>([]);
  loading = signal(false);
  actionLoading = signal<number | null>(null);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<ListFilter>('all');

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
    const state = history.state as { successMessage?: string };
    if (state.successMessage) {
      this.successMessage.set(state.successMessage);
      history.replaceState({}, '');
    }
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
    return isStockDocPending(x.status, x.datePosted);
  }

  statusKey(status?: number, datePosted?: string | null): string {
    return isStockDocPosted(status, datePosted)
      ? 'stockTransfers.status.posted'
      : 'stockTransfers.status.pending';
  }

  routeLabel(x: StockTransferListItem): string {
    const from = [x.fromBranchName || '—', x.fromStoreName || '—'].join(' / ');
    const to = [x.toBranchName || '—', x.toStoreName || '—'].join(' / ');
    return `${from} → ${to}`;
  }

  post(x: StockTransferListItem): void {
    if (!confirm(this.language.translate('stockTransfers.postConfirm'))) {
      return;
    }
    this.run(x.transferId, () => this.service.post(x.transferId), 'stockTransfers.postSuccess');
  }

  delete(x: StockTransferListItem): void {
    if (!confirm(this.language.translate('stockTransfers.deleteConfirm'))) {
      return;
    }
    this.run(x.transferId, () => this.service.delete(x.transferId), 'stockTransfers.deleteSuccess');
  }

  private run(
    id: number,
    action: () => ReturnType<StockTransfersService['post']> | ReturnType<StockTransfersService['delete']>,
    key: string,
  ): void {
    this.actionLoading.set(id);
    this.errorMessage.set('');
    action().subscribe({
      next: () => {
        this.actionLoading.set(null);
        this.successMessage.set(this.language.translate(key));
        this.load();
      },
      error: (e) => {
        this.actionLoading.set(null);
        this.errorMessage.set(
          extractApiErrorMessage(e, this.language.translate('stockTransfers.loadError')),
        );
      },
    });
  }
}
