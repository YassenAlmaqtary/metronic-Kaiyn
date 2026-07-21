import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { StockReceivingListItem, isStockDocPending } from '../../../../core/api/models/stock-receiving.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { StockReceivingsService } from '../../../../core/services/stock-receivings.service';

@Component({
  selector: 'app-stock-receivings-list',
  imports: [FormsModule, RouterLink, TranslatePipe, DatePipe, DecimalPipe],
  templateUrl: './stock-receivings-list.component.html',
  styleUrl: './stock-receivings-list.component.scss',
})
export class StockReceivingsListComponent implements OnInit {
  private service = inject(StockReceivingsService);
  private language = inject(LanguageService);
  items = signal<StockReceivingListItem[]>([]);
  loading = signal(false); actionLoading = signal<number | null>(null); errorMessage = signal(''); successMessage = signal('');
  searchTerm = signal(''); pendingOnly = signal(false);
  filtered = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    return this.items().filter(x => (!this.pendingOnly() || isStockDocPending(x.status, x.datePosted)) &&
      (!term || [x.receivingNumber, x.storeName, x.branchName, x.supplierId].some(v => String(v ?? '').toLowerCase().includes(term))));
  });
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading.set(true); this.errorMessage.set('');
    (this.pendingOnly() ? this.service.getPending() : this.service.getAll()).subscribe({
      next: x => { this.items.set(x); this.loading.set(false); },
      error: e => { this.loading.set(false); this.errorMessage.set(extractApiErrorMessage(e, this.language.translate('stockReceivings.loadError'))); },
    });
  }
  setFilter(pending: boolean): void { this.pendingOnly.set(pending); this.load(); }
  post(item: StockReceivingListItem): void { this.run(item.receivingId, () => this.service.post(item.receivingId), 'stockReceivings.postSuccess'); }
  delete(item: StockReceivingListItem): void {
    if (confirm(this.language.translate('stockReceivings.deleteConfirm'))) this.run(item.receivingId, () => this.service.delete(item.receivingId), 'stockReceivings.deleteSuccess');
  }
  private run(id: number, action: () => ReturnType<StockReceivingsService['post']>, key: string): void {
    this.actionLoading.set(id); this.errorMessage.set('');
    action().subscribe({ next: () => { this.actionLoading.set(null); this.successMessage.set(this.language.translate(key)); this.load(); },
      error: e => { this.actionLoading.set(null); this.errorMessage.set(extractApiErrorMessage(e, this.language.translate('stockReceivings.actionError'))); } });
  }
  isPending(item: StockReceivingListItem): boolean {
    return isStockDocPending(item.status, item.datePosted);
  }
}
