import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Branch } from '../../../../core/api/models/branch.models';
import { ReceiptVoucher } from '../../../../core/api/models/payment-voucher.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { BranchesService } from '../../../../core/services/branches.service';
import { LanguageService } from '../../../../core/services/language.service';
import { ReceiptVouchersService } from '../../../../core/services/receipt-vouchers.service';

type VoucherFilter = 'all' | 'pending' | 'approved';
type VoucherAction = 'delete' | 'approve';

@Component({
  selector: 'app-receipt-vouchers-list',
  imports: [RouterLink, FormsModule, TranslatePipe, DatePipe, DecimalPipe],
  templateUrl: './receipt-vouchers-list.component.html',
  styleUrl: './receipt-vouchers-list.component.scss',
})
export class ReceiptVouchersListComponent implements OnInit {
  private receiptVouchersService = inject(ReceiptVouchersService);
  private branchesService = inject(BranchesService);
  private language = inject(LanguageService);

  vouchers = signal<ReceiptVoucher[]>([]);
  branches = signal<Branch[]>([]);
  loading = signal(true);
  actionLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<VoucherFilter>('all');
  branchFilter = signal<number | null>(null);
  actionTarget = signal<ReceiptVoucher | null>(null);
  actionType = signal<VoucherAction | null>(null);

  filteredVouchers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    let list = this.vouchers();

    const filter = this.filter();
    if (filter === 'pending') {
      list = list.filter((item) => !item.isApproved);
    } else if (filter === 'approved') {
      list = list.filter((item) => item.isApproved);
    }

    const branchId = this.branchFilter();
    if (branchId != null) {
      list = list.filter((item) => item.branchId === branchId);
    }

    if (!term) {
      return list;
    }

    return list.filter((item) =>
      [item.voucherNumber, item.voucherId, item.payerName, item.reference, item.paymentTypeName, item.debitAccountName]
        .filter((value) => value != null && value !== '')
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  });

  stats = computed(() => {
    const list = this.vouchers();
    let pending = 0;
    let approved = 0;
    let amount = 0;

    for (const item of list) {
      if (item.isApproved) {
        approved += 1;
      } else {
        pending += 1;
      }
      amount += item.totalAmount || 0;
    }

    return { total: list.length, pending, approved, amount };
  });

  hasActiveFilters = computed(
    () =>
      this.filter() !== 'all' ||
      this.branchFilter() != null ||
      this.searchTerm().trim().length > 0,
  );

  ngOnInit(): void {
    const navState = history.state as { successMessage?: string };
    if (navState?.successMessage) {
      this.successMessage.set(navState.successMessage);
      history.replaceState({}, '');
    }
    this.branchesService.getAll().subscribe({
      next: (items) => this.branches.set(items),
      error: () => this.branches.set([]),
    });
    this.loadVouchers();
  }

  loadVouchers(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.receiptVouchersService.getAll().subscribe({
      next: (items) => {
        this.vouchers.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('receiptVouchers.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: VoucherFilter): void {
    this.filter.set(filter);
  }

  onBranchFilterChange(value: string): void {
    this.branchFilter.set(value ? Number(value) : null);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.filter.set('all');
    this.branchFilter.set(null);
  }

  openActionDialog(voucher: ReceiptVoucher, action: VoucherAction): void {
    this.actionTarget.set(voucher);
    this.actionType.set(action);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  closeActionDialog(): void {
    if (!this.actionLoading()) {
      this.actionTarget.set(null);
      this.actionType.set(null);
    }
  }

  confirmAction(): void {
    const voucher = this.actionTarget();
    const action = this.actionType();
    if (!voucher || !action) {
      return;
    }

    this.actionLoading.set(true);

    if (action === 'delete') {
      this.receiptVouchersService.delete(voucher.voucherId).subscribe({
        next: () => {
          this.vouchers.update((list) => list.filter((row) => row.voucherId !== voucher.voucherId));
          this.finishAction('receiptVouchers.deleteSuccess');
        },
        error: (error) => this.failAction(error, 'receiptVouchers.deleteError'),
      });
      return;
    }

    this.receiptVouchersService.approve(voucher.voucherId).subscribe({
      next: () => {
        this.vouchers.update((list) =>
          list.map((row) =>
            row.voucherId === voucher.voucherId ? { ...row, isApproved: true } : row,
          ),
        );
        this.finishAction('receiptVouchers.approveSuccess');
      },
      error: (error) => this.failAction(error, 'receiptVouchers.approveError'),
    });
  }

  private finishAction(
    messageKey: 'receiptVouchers.deleteSuccess' | 'receiptVouchers.approveSuccess',
  ): void {
    this.actionLoading.set(false);
    this.actionTarget.set(null);
    this.actionType.set(null);
    this.successMessage.set(this.language.translate(messageKey));
  }

  private failAction(
    error: unknown,
    fallbackKey: 'receiptVouchers.deleteError' | 'receiptVouchers.approveError',
  ): void {
    this.actionLoading.set(false);
    this.errorMessage.set(extractApiErrorMessage(error, this.language.translate(fallbackKey)));
  }
}
