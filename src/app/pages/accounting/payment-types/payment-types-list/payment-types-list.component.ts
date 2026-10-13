import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { Account } from '../../../../core/api/models/account.models';
import { PaymentType } from '../../../../core/api/models/payment-type.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AccountsService } from '../../../../core/services/accounts.service';
import { LanguageService } from '../../../../core/services/language.service';
import { PaymentTypesService } from '../../../../core/services/payment-types.service';
import { ToastService } from '../../../../core/services/toast.service';
import { csvExportFilename } from '../../../../core/utils/csv-export-filename';
import { downloadCsv } from '../../../../core/utils/download-csv';

type PaymentTypeFilter = 'all' | 'withAccount' | 'withoutAccount';

@Component({
  selector: 'app-payment-types-list',
  imports: [RouterLink, FormsModule, TranslatePipe],
  templateUrl: './payment-types-list.component.html',
  styleUrl: './payment-types-list.component.scss',
})
export class PaymentTypesListComponent implements OnInit {
  private service = inject(PaymentTypesService);
  private accountsService = inject(AccountsService);
  private language = inject(LanguageService);
  private toast = inject(ToastService);

  items = signal<PaymentType[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  searchTerm = signal('');
  filter = signal<PaymentTypeFilter>('all');
  deleteTarget = signal<PaymentType | null>(null);
  deleting = signal(false);

  private accountLabels = signal(new Map<number, string>());

  filtered = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    return this.items().filter((item) => {
      if (filter === 'withAccount' && item.defaultAccountId == null) {
        return false;
      }
      if (filter === 'withoutAccount' && item.defaultAccountId != null) {
        return false;
      }
      if (!term) {
        return true;
      }
      return [item.paymentTypeName, item.paymentTypeId, this.accountLabel(item)].some((value) =>
        String(value ?? '').toLowerCase().includes(term),
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
      accounts: this.accountsService.getAll().pipe(catchError(() => of([] as Account[]))),
    }).subscribe({
      next: ({ items, accounts }) => {
        this.accountLabels.set(
          new Map(accounts.map((a) => [a.accId, `${a.accCode} — ${a.accName || a.accId}`])),
        );
        this.items.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('paymentTypes.loadError')),
        );
      },
    });
  }

  setFilter(filter: PaymentTypeFilter): void {
    this.filter.set(filter);
  }

  accountLabel(item: PaymentType): string {
    if (item.defaultAccountId == null) {
      return '';
    }
    return this.accountLabels().get(item.defaultAccountId) ?? String(item.defaultAccountId);
  }

  exportCsv(): void {
    downloadCsv(
      csvExportFilename('payment-types'),
      [
        this.language.translate('paymentTypes.paymentTypeId'),
        this.language.translate('paymentTypes.paymentTypeName'),
        this.language.translate('paymentTypes.defaultAccount'),
      ],
      this.filtered().map((item) => [
        item.paymentTypeId,
        item.paymentTypeName ?? '',
        this.accountLabel(item),
      ]),
    );
  }

  openDeleteDialog(item: PaymentType): void {
    this.deleteTarget.set(item);
    this.errorMessage.set('');
  }

  closeDeleteDialog(): void {
    if (!this.deleting()) {
      this.deleteTarget.set(null);
    }
  }

  confirmDelete(): void {
    const item = this.deleteTarget();
    if (!item) {
      return;
    }
    this.deleting.set(true);
    this.service.delete(item.paymentTypeId).subscribe({
      next: () => {
        this.items.update((list) => list.filter((x) => x.paymentTypeId !== item.paymentTypeId));
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.toast.success(this.language.translate('paymentTypes.deleteSuccess'));
      },
      error: (error) => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('paymentTypes.deleteError')),
        );
      },
    });
  }
}
