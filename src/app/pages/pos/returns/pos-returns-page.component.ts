import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  PosOrderHeader,
  PosOrderListItem,
  SavePosReturnRequest,
} from '../../../core/api/models/pos.models';
import { extractApiErrorMessage } from '../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { PosService } from '../../../core/services/pos.service';

interface ReturnLine {
  key: string;
  productId: number;
  unitId: number;
  name: string;
  soldQty: number;
  price: number;
}

@Component({
  selector: 'app-pos-returns-page',
  imports: [FormsModule, TranslatePipe, DecimalPipe, RouterLink],
  templateUrl: './pos-returns-page.component.html',
})
export class PosReturnsPageComponent {
  private pos = inject(PosService);
  private language = inject(LanguageService);

  search = signal('');
  paid = signal<PosOrderListItem[]>([]);
  order = signal<PosOrderHeader | null>(null);
  lines = signal<ReturnLine[]>([]);
  qtys = signal<Record<string, number>>({});
  reason = signal('');
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  doSearch(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.order.set(null);
    this.pos.getPaid(this.search().trim() || undefined).subscribe({
      next: (list) => {
        this.paid.set(list || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(err, this.language.translate('pos.returnSearchError')),
        );
      },
    });
  }

  selectOrder(item: PosOrderListItem): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.pos.getOrder(item.posOrderId).subscribe({
      next: (full) => {
        this.order.set(full);
        const items = (full.items || []).map((it, idx) => {
          const productId = Number(it.productId ?? (it as { pro_ID?: number }).pro_ID ?? 0);
          const unitId = Number(it.unitId);
          const key = `${productId}-${unitId}-${idx}`;
          return {
            key,
            productId,
            unitId,
            name: `#${productId}`,
            soldQty: Number(it.qty) || 0,
            price: Number(it.price) || 0,
          } satisfies ReturnLine;
        });
        this.lines.set(items);
        const qtys: Record<string, number> = {};
        for (const line of items) {
          qtys[line.key] = 0;
        }
        this.qtys.set(qtys);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(err, this.language.translate('pos.returnLoadError')),
        );
      },
    });
  }

  setQty(key: string, value: number): void {
    this.qtys.update((m) => ({ ...m, [key]: Math.max(0, value || 0) }));
  }

  confirm(): void {
    const order = this.order();
    if (!order?.posOrderId) {
      return;
    }
    const items = this.lines()
      .map((line) => ({
        productId: line.productId,
        unitId: line.unitId,
        returnQty: Number(this.qtys()[line.key] || 0),
        reason: this.reason().trim() || null,
      }))
      .filter((x) => x.returnQty > 0);
    if (!items.length) {
      this.errorMessage.set(this.language.translate('pos.returnQtyRequired'));
      return;
    }
    const body: SavePosReturnRequest = {
      originalOrderId: order.posOrderId,
      items,
    };
    this.saving.set(true);
    this.errorMessage.set('');
    this.pos.createReturn(body).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.successMessage.set(
          res?.message ||
            this.language.translate('pos.returnSuccess') +
              (res?.returnOrderId ? ` #${res.returnOrderId}` : ''),
        );
        this.order.set(null);
        this.lines.set([]);
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(err, this.language.translate('pos.returnError')),
        );
      },
    });
  }
}
