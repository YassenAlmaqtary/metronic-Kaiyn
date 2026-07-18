import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { BankAccount } from '../../../../core/api/models/bank-account.models';
import {
  IssuedCheck,
  IssuedCheckStatus,
  IssuedCheckStatusValue,
} from '../../../../core/api/models/issued-check.models';
import { AuthService } from '../../../../core/api/auth.service';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { BankAccountsService } from '../../../../core/services/bank-accounts.service';
import { IssuedChecksService } from '../../../../core/services/issued-checks.service';
import { LanguageService } from '../../../../core/services/language.service';

type StatusFilter = 'all' | IssuedCheckStatusValue;
type CheckAction =
  | 'delete'
  | 'approve'
  | 'reject'
  | 'post'
  | 'pay'
  | 'cancel'
  | 'bounce';

@Component({
  selector: 'app-issued-checks-list',
  imports: [RouterLink, FormsModule, ReactiveFormsModule, TranslatePipe, DatePipe, DecimalPipe],
  templateUrl: './issued-checks-list.component.html',
  styleUrl: './issued-checks-list.component.scss',
})
export class IssuedChecksListComponent implements OnInit {
  private issuedChecksService = inject(IssuedChecksService);
  private bankAccountsService = inject(BankAccountsService);
  private auth = inject(AuthService);
  private language = inject(LanguageService);

  readonly IssuedCheckStatus = IssuedCheckStatus;
  readonly statusFilters: StatusFilter[] = [
    'all',
    IssuedCheckStatus.Draft,
    IssuedCheckStatus.Issued,
    IssuedCheckStatus.Posted,
    IssuedCheckStatus.Paid,
    IssuedCheckStatus.Bounced,
    IssuedCheckStatus.Cancelled,
  ];

  checks = signal<IssuedCheck[]>([]);
  bankAccounts = signal<BankAccount[]>([]);
  loading = signal(true);
  actionLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  statusFilter = signal<StatusFilter>('all');
  bankAccountFilter = signal<number | null>(null);
  dateFrom = signal('');
  dateTo = signal('');
  actionTarget = signal<IssuedCheck | null>(null);
  actionType = signal<CheckAction | null>(null);

  actionForm = new FormGroup({
    reason: new FormControl('', { nonNullable: true }),
    paymentDate: new FormControl(this.todayIso(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    clearingDate: new FormControl('', { nonNullable: true }),
  });

  filteredChecks = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    let list = this.checks();

    const accountId = this.bankAccountFilter();
    if (accountId != null) {
      list = list.filter((item) => item.bankAccountID === accountId);
    }

    if (!term) {
      return list;
    }

    return list.filter((item) =>
      [item.checkNumber, item.payeeName, item.purpose, item.checkBookNumber]
        .filter((value) => value != null && value !== '')
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  });

  stats = computed(() => {
    const list = this.checks();
    let draftIssued = 0;
    let posted = 0;
    let paid = 0;
    let bounced = 0;

    for (const item of list) {
      const status = item.status;
      if (status === IssuedCheckStatus.Draft || status === IssuedCheckStatus.Issued) {
        draftIssued += 1;
      } else if (status === IssuedCheckStatus.Posted) {
        posted += 1;
      } else if (status === IssuedCheckStatus.Paid) {
        paid += 1;
      } else if (status === IssuedCheckStatus.Bounced) {
        bounced += 1;
      }
    }

    return { total: list.length, draftIssued, posted, paid, bounced };
  });

  hasActiveFilters = computed(
    () =>
      this.statusFilter() !== 'all' ||
      this.bankAccountFilter() != null ||
      this.dateFrom().length > 0 ||
      this.dateTo().length > 0 ||
      this.searchTerm().trim().length > 0,
  );

  ngOnInit(): void {
    const navState = history.state as { successMessage?: string };
    if (navState?.successMessage) {
      this.successMessage.set(navState.successMessage);
      history.replaceState({}, '');
    }
    this.bankAccountsService.getAll().subscribe({
      next: (items) => this.bankAccounts.set(items),
      error: () => this.bankAccounts.set([]),
    });
    this.loadChecks();
  }

  todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  loadChecks(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    const from = this.dateFrom();
    const to = this.dateTo();
    const status = this.statusFilter();

    let request$;
    if (from && to) {
      request$ = this.issuedChecksService.getRange(from, to);
    } else if (status !== 'all') {
      request$ = this.issuedChecksService.getByStatus(status);
    } else {
      request$ = this.issuedChecksService.getAll();
    }

    request$.subscribe({
      next: (items) => {
        this.checks.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('issuedChecks.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setStatusFilter(filter: StatusFilter): void {
    if (this.statusFilter() === filter) {
      return;
    }
    this.statusFilter.set(filter);
    this.loadChecks();
  }

  onBankAccountFilterChange(value: string): void {
    this.bankAccountFilter.set(value ? Number(value) : null);
  }

  onDateFromChange(value: string): void {
    this.dateFrom.set(value);
    if (value && this.dateTo()) {
      this.loadChecks();
    }
  }

  onDateToChange(value: string): void {
    this.dateTo.set(value);
    if (this.dateFrom() && value) {
      this.loadChecks();
    }
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.bankAccountFilter.set(null);
    this.dateFrom.set('');
    this.dateTo.set('');
    this.loadChecks();
  }

  statusLabel(check: IssuedCheck): string {
    if (check.statusName) {
      return check.statusName;
    }
    switch (check.status) {
      case IssuedCheckStatus.Draft:
        return this.language.translate('issuedChecks.status.draft');
      case IssuedCheckStatus.Issued:
        return this.language.translate('issuedChecks.status.issued');
      case IssuedCheckStatus.Posted:
        return this.language.translate('issuedChecks.status.posted');
      case IssuedCheckStatus.Paid:
        return this.language.translate('issuedChecks.status.paid');
      case IssuedCheckStatus.Cancelled:
        return this.language.translate('issuedChecks.status.cancelled');
      case IssuedCheckStatus.Bounced:
        return this.language.translate('issuedChecks.status.bounced');
      default:
        return check.status != null ? String(check.status) : '—';
    }
  }

  statusBadgeClass(status: number | null | undefined): string {
    switch (status) {
      case IssuedCheckStatus.Draft:
        return 'kt-badge-secondary';
      case IssuedCheckStatus.Issued:
        return 'kt-badge-info';
      case IssuedCheckStatus.Posted:
        return 'kt-badge-primary';
      case IssuedCheckStatus.Paid:
        return 'kt-badge-success';
      case IssuedCheckStatus.Cancelled:
        return 'kt-badge-warning';
      case IssuedCheckStatus.Bounced:
        return 'kt-badge-destructive';
      default:
        return 'kt-badge-secondary';
    }
  }

  filterLabel(filter: StatusFilter): string {
    if (filter === 'all') {
      return this.language.translate('issuedChecks.filter.all');
    }
    return this.statusLabel({ status: filter } as IssuedCheck);
  }

  isDraftOrIssuedNotPosted(check: IssuedCheck): boolean {
    return (
      !check.isPosted &&
      (check.status === IssuedCheckStatus.Draft || check.status === IssuedCheckStatus.Issued)
    );
  }

  isPostedUnpaid(check: IssuedCheck): boolean {
    return !!check.isPosted && check.status === IssuedCheckStatus.Posted;
  }

  openActionDialog(check: IssuedCheck, action: CheckAction): void {
    this.actionTarget.set(check);
    this.actionType.set(action);
    this.successMessage.set('');
    this.errorMessage.set('');
    this.actionForm.reset({
      reason: '',
      paymentDate: this.todayIso(),
      clearingDate: '',
    });
  }

  closeActionDialog(): void {
    if (!this.actionLoading()) {
      this.actionTarget.set(null);
      this.actionType.set(null);
    }
  }

  actionNeedsReason(): boolean {
    const action = this.actionType();
    return action === 'reject' || action === 'cancel' || action === 'bounce';
  }

  actionNeedsPayDates(): boolean {
    return this.actionType() === 'pay';
  }

  confirmAction(): void {
    const check = this.actionTarget();
    const action = this.actionType();
    const userId = this.auth.user()?.userId;
    if (!check || !action || !userId) {
      this.errorMessage.set(this.language.translate('issuedChecks.saveError'));
      return;
    }

    if (this.actionNeedsPayDates()) {
      this.actionForm.controls.paymentDate.markAsTouched();
      if (this.actionForm.controls.paymentDate.invalid) {
        return;
      }
    }

    this.actionLoading.set(true);

    if (action === 'delete') {
      this.issuedChecksService.delete(check.checkID).subscribe({
        next: () => {
          this.checks.update((list) => list.filter((row) => row.checkID !== check.checkID));
          this.finishAction('issuedChecks.deleteSuccess');
        },
        error: (error) => this.failAction(error, 'issuedChecks.deleteError'),
      });
      return;
    }

    if (action === 'approve') {
      this.issuedChecksService.approve(check.checkID, userId).subscribe({
        next: (updated) => {
          this.replaceCheck(updated);
          this.finishAction('issuedChecks.approveSuccess');
        },
        error: (error) => this.failAction(error, 'issuedChecks.approveError'),
      });
      return;
    }

    if (action === 'reject') {
      this.issuedChecksService
        .reject(check.checkID, {
          userId,
          reason: this.actionForm.controls.reason.value.trim() || null,
        })
        .subscribe({
          next: (updated) => {
            this.replaceCheck(updated);
            this.finishAction('issuedChecks.rejectSuccess');
          },
          error: (error) => this.failAction(error, 'issuedChecks.rejectError'),
        });
      return;
    }

    if (action === 'post') {
      this.issuedChecksService.post(check.checkID, userId).subscribe({
        next: (updated) => {
          this.replaceCheck(updated);
          this.finishAction('issuedChecks.postSuccess');
        },
        error: (error) => this.failAction(error, 'issuedChecks.postError'),
      });
      return;
    }

    if (action === 'pay') {
      const paymentDate = this.actionForm.controls.paymentDate.value;
      const clearingDate = this.actionForm.controls.clearingDate.value.trim();
      this.issuedChecksService
        .pay(check.checkID, {
          userId,
          paymentDate: new Date(`${paymentDate}T00:00:00`).toISOString(),
          clearingDate: clearingDate
            ? new Date(`${clearingDate}T00:00:00`).toISOString()
            : null,
        })
        .subscribe({
          next: (updated) => {
            this.replaceCheck(updated);
            this.finishAction('issuedChecks.paySuccess');
          },
          error: (error) => this.failAction(error, 'issuedChecks.payError'),
        });
      return;
    }

    if (action === 'cancel') {
      this.issuedChecksService
        .cancel(check.checkID, {
          userId,
          reason: this.actionForm.controls.reason.value.trim() || null,
        })
        .subscribe({
          next: (updated) => {
            this.replaceCheck(updated);
            this.finishAction('issuedChecks.cancelSuccess');
          },
          error: (error) => this.failAction(error, 'issuedChecks.cancelError'),
        });
      return;
    }

    this.issuedChecksService
      .bounce(check.checkID, {
        userId,
        reason: this.actionForm.controls.reason.value.trim() || null,
      })
      .subscribe({
        next: (updated) => {
          this.replaceCheck(updated);
          this.finishAction('issuedChecks.bounceSuccess');
        },
        error: (error) => this.failAction(error, 'issuedChecks.bounceError'),
      });
  }

  private replaceCheck(updated: IssuedCheck): void {
    this.checks.update((list) =>
      list.map((row) => (row.checkID === updated.checkID ? updated : row)),
    );
  }

  private finishAction(
    messageKey:
      | 'issuedChecks.deleteSuccess'
      | 'issuedChecks.approveSuccess'
      | 'issuedChecks.rejectSuccess'
      | 'issuedChecks.postSuccess'
      | 'issuedChecks.paySuccess'
      | 'issuedChecks.cancelSuccess'
      | 'issuedChecks.bounceSuccess',
  ): void {
    this.actionLoading.set(false);
    this.actionTarget.set(null);
    this.actionType.set(null);
    this.successMessage.set(this.language.translate(messageKey));
  }

  private failAction(
    error: unknown,
    fallbackKey:
      | 'issuedChecks.deleteError'
      | 'issuedChecks.approveError'
      | 'issuedChecks.rejectError'
      | 'issuedChecks.postError'
      | 'issuedChecks.payError'
      | 'issuedChecks.cancelError'
      | 'issuedChecks.bounceError',
  ): void {
    this.actionLoading.set(false);
    this.errorMessage.set(extractApiErrorMessage(error, this.language.translate(fallbackKey)));
  }
}
