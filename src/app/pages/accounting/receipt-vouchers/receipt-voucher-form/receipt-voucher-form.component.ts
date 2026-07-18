import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Account, AccountStructureType } from '../../../../core/api/models/account.models';
import { Branch } from '../../../../core/api/models/branch.models';
import { CostCenter } from '../../../../core/api/models/cost-center.models';
import { Currency } from '../../../../core/api/models/currency.models';
import {
  CreateReceiptVoucherLineRequest,
  CreateReceiptVoucherRequest,
  PaymentType,
  ReceiptVoucherLine,
  UpdateReceiptVoucherRequest,
} from '../../../../core/api/models/payment-voucher.models';
import { TaxSetup } from '../../../../core/api/models/tax-setup.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AccountsService } from '../../../../core/services/accounts.service';
import { BranchesService } from '../../../../core/services/branches.service';
import { CostCentersService } from '../../../../core/services/cost-centers.service';
import { CurrenciesService } from '../../../../core/services/currencies.service';
import { LanguageService } from '../../../../core/services/language.service';
import { PaymentTypesService } from '../../../../core/services/payment-types.service';
import { ReceiptVouchersService } from '../../../../core/services/receipt-vouchers.service';
import { TaxSetupsService } from '../../../../core/services/tax-setups.service';

type ReceiptLineGroup = FormGroup<{
  creditAccountId: FormControl<number | null>;
  amount: FormControl<number>;
  description: FormControl<string>;
  costCenterId: FormControl<number | null>;
  branchId: FormControl<number | null>;
  isTaxable: FormControl<boolean>;
  taxSetupId: FormControl<number | null>;
}>;

@Component({
  selector: 'app-receipt-voucher-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe, DecimalPipe],
  templateUrl: './receipt-voucher-form.component.html',
  styleUrl: './receipt-voucher-form.component.scss',
})
export class ReceiptVoucherFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private receiptVouchersService = inject(ReceiptVouchersService);
  private paymentTypesService = inject(PaymentTypesService);
  private branchesService = inject(BranchesService);
  private costCentersService = inject(CostCentersService);
  private currenciesService = inject(CurrenciesService);
  private accountsService = inject(AccountsService);
  private taxSetupsService = inject(TaxSetupsService);
  private language = inject(LanguageService);

  isEditMode = signal(false);
  isReadOnly = signal(false);
  voucherId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  private totalsTick = signal(0);

  branches = signal<Branch[]>([]);
  costCenters = signal<CostCenter[]>([]);
  currencies = signal<Currency[]>([]);
  accounts = signal<Account[]>([]);
  paymentTypes = signal<PaymentType[]>([]);
  taxSetups = signal<TaxSetup[]>([]);

  postingAccounts = computed(() => {
    const active = this.accounts().filter((account) => !account.accStopped);
    const leaves = active.filter((account) => account.accType === AccountStructureType.Sub);
    return leaves.length > 0 ? leaves : active;
  });

  form = new FormGroup({
    voucherNumber: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    voucherDate: new FormControl(this.todayIso(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    description: new FormControl('', { nonNullable: true }),
    payerName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    paymentTypeId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    debitAccountId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    branchId: new FormControl<number | null>(null),
    currencyId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    exchangeRate: new FormControl(1, { nonNullable: true, validators: [Validators.min(0.000001)] }),
    reference: new FormControl('', { nonNullable: true }),
    lines: new FormArray<ReceiptLineGroup>([]),
  });

  totalAmount = computed(() => {
    this.totalsTick();
    return this.lines.controls.reduce((sum, group) => sum + (group.controls.amount.value || 0), 0);
  });

  totalAmountLc = computed(() => {
    const rate = this.form.controls.exchangeRate.value || 1;
    return this.totalAmount() * rate;
  });

  ngOnInit(): void {
    this.loadLookups();
    this.form.controls.exchangeRate.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshTotals());
    this.form.controls.paymentTypeId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((typeId) => this.onPaymentTypeChange(typeId));

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.loadNextNumber();
      this.addLine();
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.voucherId.set(id);
    this.loadVoucher(id);
  }

  get lines(): FormArray<ReceiptLineGroup> {
    return this.form.controls.lines;
  }

  todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  loadLookups(): void {
    this.branchesService.getAll().subscribe({ next: (items) => this.branches.set(items), error: () => this.branches.set([]) });
    this.costCentersService.getAll().subscribe({ next: (items) => this.costCenters.set(items.filter((item) => item.isActive)), error: () => this.costCenters.set([]) });
    this.currenciesService.getAll().subscribe({ next: (items) => this.currencies.set(items), error: () => this.currencies.set([]) });
    this.accountsService.getAll().subscribe({ next: (items) => this.accounts.set(items), error: () => this.accounts.set([]) });
    this.paymentTypesService.getAll().subscribe({ next: (items) => this.paymentTypes.set(items), error: () => this.paymentTypes.set([]) });
    this.taxSetupsService.getActive().subscribe({
      next: (items) => this.taxSetups.set(items),
      error: () => this.taxSetupsService.getAll().subscribe({ next: (all) => this.taxSetups.set(all.filter((item) => item.isActive)), error: () => this.taxSetups.set([]) }),
    });
  }

  loadNextNumber(): void {
    this.receiptVouchersService.getNextNumber().subscribe({
      next: (next) => this.form.controls.voucherNumber.setValue(next),
      error: () => this.form.controls.voucherNumber.setValue(''),
    });
  }

  loadVoucher(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.receiptVouchersService.getById(id).subscribe({
      next: (voucher) => {
        this.isReadOnly.set(voucher.isApproved);
        this.form.patchValue({
          voucherNumber: voucher.voucherNumber || '',
          voucherDate: voucher.voucherDate?.slice(0, 10) || this.todayIso(),
          description: voucher.description || '',
          payerName: voucher.payerName || '',
          paymentTypeId: voucher.paymentTypeId,
          debitAccountId: voucher.debitAccountId,
          branchId: voucher.branchId ?? null,
          currencyId: voucher.currencyId,
          exchangeRate: voucher.exchangeRate ?? 1,
          reference: voucher.reference || '',
        });
        this.lines.clear();
        const voucherLines = voucher.lines ?? [];
        if (voucherLines.length === 0) {
          this.addLine();
        } else {
          voucherLines.forEach((line) => this.lines.push(this.createLine(line)));
        }
        if (voucher.isApproved) {
          this.form.disable({ emitEvent: false });
        } else {
          this.form.controls.voucherNumber.disable({ emitEvent: false });
        }
        this.loading.set(false);
        this.refreshTotals();
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(error, this.language.translate('receiptVouchers.notFound')));
      },
    });
  }

  createLine(line?: Partial<ReceiptVoucherLine>): ReceiptLineGroup {
    const group = new FormGroup({
      creditAccountId: new FormControl<number | null>(line?.creditAccountId ?? null, { validators: [Validators.required] }),
      amount: new FormControl(line?.amount ?? 0, { nonNullable: true, validators: [Validators.required, Validators.min(0.000001)] }),
      description: new FormControl(line?.description ?? '', { nonNullable: true }),
      costCenterId: new FormControl<number | null>(line?.costCenterId ?? null),
      branchId: new FormControl<number | null>(line?.branchId ?? this.form.controls.branchId.value),
      isTaxable: new FormControl(!!line?.isTaxable, { nonNullable: true }),
      taxSetupId: new FormControl<number | null>(line?.taxSetupId ?? null),
    });
    group.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refreshTotals());
    return group;
  }

  addLine(): void {
    this.lines.push(this.createLine({ branchId: this.form.controls.branchId.value }));
    this.refreshTotals();
  }

  removeLine(index: number): void {
    if (this.lines.length <= 1) {
      this.errorMessage.set(this.language.translate('receiptVouchers.validation.minLines'));
      return;
    }
    this.lines.removeAt(index);
    this.refreshTotals();
  }

  accountLabel(account: Account): string {
    return `${account.accCode} — ${account.accName || account.accId}`;
  }

  onPaymentTypeChange(typeId: number | null): void {
    if (typeId == null || this.isReadOnly()) return;
    const paymentType = this.paymentTypes().find((item) => item.paymentTypeId === typeId);
    if (paymentType?.defaultAccountId != null) {
      this.form.controls.debitAccountId.setValue(paymentType.defaultAccountId, { emitEvent: false });
    }
  }

  onSubmit(): void {
    if (this.isReadOnly()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.errorMessage.set(this.language.translate('receiptVouchers.validation.form'));
      return;
    }
    if (this.lines.length < 1) {
      this.errorMessage.set(this.language.translate('receiptVouchers.validation.minLines'));
      return;
    }

    const value = this.form.getRawValue();
    const linePayload: CreateReceiptVoucherLineRequest[] = value.lines
      .filter((line) => line.creditAccountId != null)
      .map((line) => ({
        creditAccountId: line.creditAccountId!,
        amount: line.amount || 0,
        description: line.description || null,
        costCenterId: line.costCenterId,
        branchId: line.branchId,
        isTaxable: line.isTaxable,
        taxSetupId: line.isTaxable ? line.taxSetupId : null,
        amountLc: (line.amount || 0) * (value.exchangeRate || 1),
      }));

    const payloadBase = {
      voucherDate: value.voucherDate,
      description: value.description || null,
      payerName: value.payerName,
      paymentTypeId: value.paymentTypeId!,
      debitAccountId: value.debitAccountId!,
      branchId: value.branchId,
      currencyId: value.currencyId!,
      exchangeRate: value.exchangeRate || 1,
      totalAmount: this.totalAmount(),
      totalAmountLc: this.totalAmountLc(),
      reference: value.reference || null,
      lines: linePayload,
    };

    this.saving.set(true);
    this.errorMessage.set('');

    if (this.isEditMode() && this.voucherId() != null) {
      const updatePayload: UpdateReceiptVoucherRequest = payloadBase;
      this.receiptVouchersService.update(this.voucherId()!, updatePayload).subscribe({
        next: () => this.navigateSuccess('receiptVouchers.updateSuccess'),
        error: (error) => this.failSave(error),
      });
      return;
    }

    const createPayload: CreateReceiptVoucherRequest = { ...payloadBase, voucherNumber: value.voucherNumber };
    this.receiptVouchersService.create(createPayload).subscribe({
      next: () => this.navigateSuccess('receiptVouchers.createSuccess'),
      error: (error) => this.failSave(error),
    });
  }

  private refreshTotals(): void {
    this.totalsTick.update((value) => value + 1);
  }

  private navigateSuccess(messageKey: 'receiptVouchers.createSuccess' | 'receiptVouchers.updateSuccess'): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/accounting/receipt-vouchers'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private failSave(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(extractApiErrorMessage(error, this.language.translate('receiptVouchers.saveError')));
  }
}
