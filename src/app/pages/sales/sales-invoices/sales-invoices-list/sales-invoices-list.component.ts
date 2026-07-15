import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Branch } from '../../../../core/api/models/branch.models';
import { Customer } from '../../../../core/api/models/customer.models';
import { AccountingPeriodLookup } from '../../../../core/api/models/accounting-period.models';
import {
  SalesInvoiceListItem,
  SalesInvoiceStatus,
} from '../../../../core/api/models/sales-invoice.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AccountingPeriodsService } from '../../../../core/services/accounting-periods.service';
import { BranchesService } from '../../../../core/services/branches.service';
import { CustomersService } from '../../../../core/services/customers.service';
import { LanguageService } from '../../../../core/services/language.service';
import { SalesInvoicesService } from '../../../../core/services/sales-invoices.service';

type InvoiceFilter = 'all' | 'drafts';

@Component({
  selector: 'app-sales-invoices-list',
  imports: [RouterLink, FormsModule, ReactiveFormsModule, DatePipe, DecimalPipe, TranslatePipe],
  templateUrl: './sales-invoices-list.component.html',
  styleUrl: './sales-invoices-list.component.scss',
})
export class SalesInvoicesListComponent implements OnInit {
  private salesInvoicesService = inject(SalesInvoicesService);
  private branchesService = inject(BranchesService);
  private customersService = inject(CustomersService);
  private accountingPeriodsService = inject(AccountingPeriodsService);
  private language = inject(LanguageService);

  readonly SalesInvoiceStatus = SalesInvoiceStatus;

  invoices = signal<SalesInvoiceListItem[]>([]);
  branches = signal<Branch[]>([]);
  customers = signal<Customer[]>([]);
  openPeriods = signal<AccountingPeriodLookup[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<InvoiceFilter>('all');
  statusFilter = signal<number | null>(null);
  postTarget = signal<SalesInvoiceListItem | null>(null);
  cancelTarget = signal<SalesInvoiceListItem | null>(null);
  posting = signal(false);
  cancelling = signal(false);
  loadingPeriods = signal(false);

  postForm = new FormGroup({
    periodId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    responsibleName: new FormControl('', { nonNullable: true }),
  });

  filteredInvoices = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const statusFilter = this.statusFilter();
    let list = this.invoices();

    if (statusFilter != null) {
      list = list.filter((invoice) => invoice.status === statusFilter);
    }

    if (!term) {
      return list;
    }

    return list.filter((invoice) =>
      String(invoice.invoiceNo ?? '')
        .toLowerCase()
        .includes(term),
    );
  });

  ngOnInit(): void {
    const navState = history.state as { successMessage?: string };
    if (navState?.successMessage) {
      this.successMessage.set(navState.successMessage);
      history.replaceState({}, '');
    }
    this.loadBranches();
    this.loadCustomers();
    this.loadInvoices();
  }

  loadBranches(): void {
    this.branchesService.getAll().subscribe({
      next: (branches) => this.branches.set(branches),
      error: () => this.branches.set([]),
    });
  }

  loadCustomers(): void {
    this.customersService.getAll().subscribe({
      next: (customers) => this.customers.set(customers),
      error: () => this.customers.set([]),
    });
  }

  loadInvoices(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    const request =
      this.filter() === 'drafts'
        ? this.salesInvoicesService.getDrafts()
        : this.salesInvoicesService.getAll();

    request.subscribe({
      next: (invoices) => {
        this.invoices.set(invoices);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('salesInvoices.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: InvoiceFilter): void {
    if (this.filter() === filter) {
      return;
    }
    this.filter.set(filter);
    this.loadInvoices();
  }

  onStatusFilterChange(value: string): void {
    if (!value) {
      this.statusFilter.set(null);
      return;
    }
    this.statusFilter.set(Number(value));
  }

  branchLabel(branchId: number): string {
    const branch = this.branches().find((item) => item.branchId === branchId);
    return branch?.branchName || String(branchId);
  }

  customerLabel(customerId: number): string {
    const customer = this.customers().find((item) => item.customerId === customerId);
    if (!customer) {
      return String(customerId);
    }
    if (this.language.locale() === 'ar') {
      return customer.customerName || customer.customerNameEn || String(customerId);
    }
    return customer.customerNameEn || customer.customerName || String(customerId);
  }

  statusLabel(status: number): TranslationKey {
    switch (status) {
      case SalesInvoiceStatus.Draft:
        return 'salesInvoices.status.draft';
      case SalesInvoiceStatus.Posted:
        return 'salesInvoices.status.posted';
      case SalesInvoiceStatus.Cancelled:
        return 'salesInvoices.status.cancelled';
      default:
        return 'salesInvoices.status.unknown';
    }
  }

  statusBadgeClass(status: number): string {
    switch (status) {
      case SalesInvoiceStatus.Draft:
        return 'kt-badge-warning';
      case SalesInvoiceStatus.Posted:
        return 'kt-badge-success';
      case SalesInvoiceStatus.Cancelled:
        return 'kt-badge-secondary';
      default:
        return 'kt-badge-outline';
    }
  }

  isDraft(invoice: SalesInvoiceListItem): boolean {
    return invoice.status === SalesInvoiceStatus.Draft;
  }

  openPostDialog(invoice: SalesInvoiceListItem): void {
    this.postTarget.set(invoice);
    this.postForm.reset({ periodId: null, responsibleName: '' });
    this.successMessage.set('');
    this.errorMessage.set('');
    this.loadOpenPeriods();
  }

  closePostDialog(): void {
    if (!this.posting()) {
      this.postTarget.set(null);
    }
  }

  loadOpenPeriods(): void {
    this.loadingPeriods.set(true);
    this.accountingPeriodsService.getOpen().subscribe({
      next: (periods) => {
        this.openPeriods.set(periods);
        this.loadingPeriods.set(false);
      },
      error: () => {
        this.openPeriods.set([]);
        this.loadingPeriods.set(false);
      },
    });
  }

  confirmPost(): void {
    const invoice = this.postTarget();
    if (!invoice) {
      return;
    }

    if (this.postForm.invalid) {
      this.postForm.markAllAsTouched();
      return;
    }

    const raw = this.postForm.getRawValue();
    const periodId = raw.periodId;
    if (periodId === null) {
      return;
    }

    this.posting.set(true);
    this.salesInvoicesService
      .post(invoice.invoiceId, {
        periodId,
        responsibleName: raw.responsibleName.trim() || null,
      })
      .subscribe({
        next: () => {
          this.posting.set(false);
          this.postTarget.set(null);
          this.successMessage.set(this.language.translate('salesInvoices.postSuccess'));
          this.loadInvoices();
        },
        error: (error) => {
          this.posting.set(false);
          this.errorMessage.set(
            extractApiErrorMessage(error, this.language.translate('salesInvoices.postError')),
          );
        },
      });
  }

  openCancelDialog(invoice: SalesInvoiceListItem): void {
    this.cancelTarget.set(invoice);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  closeCancelDialog(): void {
    if (!this.cancelling()) {
      this.cancelTarget.set(null);
    }
  }

  confirmCancel(): void {
    const invoice = this.cancelTarget();
    if (!invoice) {
      return;
    }

    this.cancelling.set(true);
    this.salesInvoicesService.cancel(invoice.invoiceId).subscribe({
      next: () => {
        this.cancelling.set(false);
        this.cancelTarget.set(null);
        this.successMessage.set(this.language.translate('salesInvoices.cancelSuccess'));
        this.loadInvoices();
      },
      error: (error) => {
        this.cancelling.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('salesInvoices.cancelError')),
        );
      },
    });
  }
}
