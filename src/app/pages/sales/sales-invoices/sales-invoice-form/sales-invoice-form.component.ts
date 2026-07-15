import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { merge } from 'rxjs';

import { Branch } from '../../../../core/api/models/branch.models';
import { Currency } from '../../../../core/api/models/currency.models';
import { Customer } from '../../../../core/api/models/customer.models';
import { ProductLookup, ProductUnit } from '../../../../core/api/models/product.models';
import {
  SalesInvoiceDetail,
  SalesInvoiceStatus,
  SalesInvoiceType,
  SaveSalesInvoiceRequest,
} from '../../../../core/api/models/sales-invoice.models';
import { Salesman } from '../../../../core/api/models/salesman.models';
import { StoreLookup } from '../../../../core/api/models/store.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { BranchesService } from '../../../../core/services/branches.service';
import { CurrenciesService } from '../../../../core/services/currencies.service';
import { CustomersService } from '../../../../core/services/customers.service';
import { LanguageService } from '../../../../core/services/language.service';
import { ProductsService } from '../../../../core/services/products.service';
import { SalesInvoicesService } from '../../../../core/services/sales-invoices.service';
import { SalesmenService } from '../../../../core/services/salesmen.service';
import { StoresService } from '../../../../core/services/stores.service';

type SalesInvoiceLineGroup = FormGroup<{
  productId: FormControl<number | null>;
  uomId: FormControl<number | null>;
  qty: FormControl<number>;
  unitPrice: FormControl<number>;
  discountRate: FormControl<number>;
  taxRate: FormControl<number>;
  totalBeforeDiscount: FormControl<number>;
  discountAmount: FormControl<number>;
  taxAmount: FormControl<number>;
  netAmount: FormControl<number>;
}>;

@Component({
  selector: 'app-sales-invoice-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe, DecimalPipe],
  templateUrl: './sales-invoice-form.component.html',
  styleUrl: './sales-invoice-form.component.scss',
})
export class SalesInvoiceFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private salesInvoicesService = inject(SalesInvoicesService);
  private branchesService = inject(BranchesService);
  private storesService = inject(StoresService);
  private customersService = inject(CustomersService);
  private salesmenService = inject(SalesmenService);
  private currenciesService = inject(CurrenciesService);
  private productsService = inject(ProductsService);
  private language = inject(LanguageService);

  readonly SalesInvoiceType = SalesInvoiceType;
  readonly SalesInvoiceStatus = SalesInvoiceStatus;

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  isReadOnly = signal(false);
  invoiceId = signal<number | null>(null);
  invoiceStatus = signal<number>(SalesInvoiceStatus.Draft);

  branches = signal<Branch[]>([]);
  stores = signal<StoreLookup[]>([]);
  customers = signal<Customer[]>([]);
  salesmen = signal<Salesman[]>([]);
  currencies = signal<Currency[]>([]);
  products = signal<ProductLookup[]>([]);
  lineUnits = signal<ProductUnit[][]>([]);

  headerTotalBeforeDiscount = signal(0);
  headerTaxAmount = signal(0);
  headerNetAmount = signal(0);
  headerRemainingAmount = signal(0);

  form = new FormGroup({
    invoiceNo: new FormControl({ value: '', disabled: true }, { nonNullable: true }),
    invoiceDate: new FormControl(this.todayIso(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    branchId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    storeId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    customerId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    salesmanId: new FormControl<number | null>(null),
    invoiceType: new FormControl<number>(SalesInvoiceType.Cash, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    currencyId: new FormControl<number | null>(null),
    exchangeRate: new FormControl(1, { nonNullable: true }),
    discountAmount: new FormControl(0, { nonNullable: true }),
    details: new FormArray<SalesInvoiceLineGroup>([]),
  });

  ngOnInit(): void {
    this.loadLookups();

    this.form.controls.branchId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((branchId) => this.onBranchChange(branchId));

    this.form.controls.discountAmount.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalculateHeaderTotals());

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.addLine();
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.invoiceId.set(id);
    this.loadInvoice(id);
  }

  get details(): FormArray<SalesInvoiceLineGroup> {
    return this.form.controls.details;
  }

  todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  loadLookups(): void {
    this.branchesService.getAll().subscribe({
      next: (branches) => this.branches.set(branches),
      error: () => this.branches.set([]),
    });
    this.customersService.getAll().subscribe({
      next: (customers) => this.customers.set(customers),
      error: () => this.customers.set([]),
    });
    this.salesmenService.getAll().subscribe({
      next: (salesmen) => this.salesmen.set(salesmen),
      error: () => this.salesmen.set([]),
    });
    this.currenciesService.getAll().subscribe({
      next: (currencies) => this.currencies.set(currencies),
      error: () => this.currencies.set([]),
    });
    this.productsService.getAll().subscribe({
      next: (products) => this.products.set(products),
      error: () => this.products.set([]),
    });
  }

  loadInvoice(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.salesInvoicesService.getById(id).subscribe({
      next: (invoice) => {
        this.invoiceStatus.set(invoice.status);
        const readOnly =
          invoice.status === SalesInvoiceStatus.Posted ||
          invoice.status === SalesInvoiceStatus.Cancelled;
        this.isReadOnly.set(readOnly);

        this.form.patchValue({
          invoiceNo: invoice.invoiceNo ?? '',
          invoiceDate: invoice.invoiceDate?.slice(0, 10) ?? this.todayIso(),
          branchId: invoice.branchId,
          storeId: invoice.storeId,
          customerId: invoice.customerId,
          salesmanId: invoice.salesmanId ?? null,
          invoiceType: invoice.invoiceType,
          currencyId: invoice.currencyId ?? null,
          exchangeRate: invoice.exchangeRate ?? 1,
          discountAmount: invoice.discountAmount ?? 0,
        });

        this.loadStoresForBranch(invoice.branchId, invoice.storeId);
        this.rebuildDetails(invoice.details ?? []);

        if (readOnly) {
          this.form.disable();
        }

        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('salesInvoices.notFound')),
        );
      },
    });
  }

  onBranchChange(branchId: number | null): void {
    if (this.isReadOnly()) {
      return;
    }

    this.form.controls.storeId.setValue(null);

    if (branchId == null) {
      this.stores.set([]);
      return;
    }

    this.loadStoresForBranch(branchId);

    if (!this.isEditMode()) {
      this.salesInvoicesService.getNextNumber(branchId).subscribe({
        next: (result) => {
          this.form.controls.invoiceNo.setValue(result.invoiceNo ?? '');
        },
        error: () => this.form.controls.invoiceNo.setValue(''),
      });
    }
  }

  loadStoresForBranch(branchId: number, preserveStoreId?: number | null): void {
    this.storesService.getByBranch(branchId).subscribe({
      next: (stores) => {
        if (stores.length > 0) {
          this.stores.set(stores);
          if (preserveStoreId != null) {
            this.form.controls.storeId.setValue(preserveStoreId);
          }
          return;
        }
        this.storesService.getAll().subscribe({
          next: (allStores) => this.stores.set(allStores),
          error: () => this.stores.set([]),
        });
      },
      error: () => {
        this.storesService.getAll().subscribe({
          next: (allStores) => this.stores.set(allStores),
          error: () => this.stores.set([]),
        });
      },
    });
  }

  rebuildDetails(details: SalesInvoiceDetail[]): void {
    while (this.details.length > 0) {
      this.removeLine(0);
    }

    if (details.length === 0) {
      this.addLine();
      return;
    }

    details.forEach((detail) => {
      const line = this.createLineGroup();
      line.patchValue({
        productId: detail.productId,
        uomId: detail.uomId,
        qty: detail.qty,
        unitPrice: detail.unitPrice,
        discountRate: detail.discountRate ?? 0,
        taxRate: detail.taxRate ?? 0,
        totalBeforeDiscount: detail.totalBeforeDiscount ?? 0,
        discountAmount: detail.discountAmount ?? 0,
        taxAmount: detail.taxAmount ?? 0,
        netAmount: detail.netAmount ?? 0,
      });
      this.details.push(line);
      this.lineUnits.update((units) => [...units, []]);
      this.bindLineChanges(line);
      this.loadUnitsForLine(this.details.controls.indexOf(line), detail.productId, detail.uomId);
    });

    this.recalculateHeaderTotals();
  }

  createLineGroup(): SalesInvoiceLineGroup {
    return new FormGroup({
      productId: new FormControl<number | null>(null, { validators: [Validators.required] }),
      uomId: new FormControl<number | null>(null, { validators: [Validators.required] }),
      qty: new FormControl(1, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0.0001)],
      }),
      unitPrice: new FormControl(0, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0)],
      }),
      discountRate: new FormControl(0, { nonNullable: true }),
      taxRate: new FormControl(0, { nonNullable: true }),
      totalBeforeDiscount: new FormControl(0, { nonNullable: true }),
      discountAmount: new FormControl(0, { nonNullable: true }),
      taxAmount: new FormControl(0, { nonNullable: true }),
      netAmount: new FormControl(0, { nonNullable: true }),
    });
  }

  addLine(): void {
    const line = this.createLineGroup();
    this.details.push(line);
    this.lineUnits.update((units) => [...units, []]);
    this.bindLineChanges(line);
    this.recalculateHeaderTotals();
  }

  removeLine(index: number): void {
    this.details.removeAt(index);
    this.lineUnits.update((units) => units.filter((_, i) => i !== index));
    this.recalculateHeaderTotals();
  }

  bindLineChanges(line: SalesInvoiceLineGroup): void {
    merge(
      line.controls.productId.valueChanges,
      line.controls.qty.valueChanges,
      line.controls.unitPrice.valueChanges,
      line.controls.discountRate.valueChanges,
      line.controls.taxRate.valueChanges,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalculateLine(line));

    line.controls.productId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((productId) => {
        const index = this.details.controls.indexOf(line);
        if (index < 0) {
          return;
        }

        if (productId == null) {
          this.lineUnits.update((units) => {
            const next = [...units];
            next[index] = [];
            return next;
          });
          line.controls.uomId.setValue(null);
          return;
        }
        const product = this.products().find((item) => item.productId === productId);
        if (product?.taxRate != null) {
          line.controls.taxRate.setValue(product.taxRate);
        }
        this.loadUnitsForLine(index, productId);
      });
  }

  loadUnitsForLine(index: number, productId: number, preserveUomId?: number): void {
    this.productsService.getUnitsById(productId).subscribe({
      next: (units) => {
        this.lineUnits.update((all) => {
          const next = [...all];
          next[index] = units;
          return next;
        });

        const line = this.details.at(index);
        if (!line) {
          return;
        }

        if (preserveUomId != null && units.some((unit) => unit.unitId === preserveUomId)) {
          line.controls.uomId.setValue(preserveUomId);
          return;
        }

        const preferred =
          units.find((unit) => unit.isSalesUnit) ??
          units.find((unit) => unit.isBaseUnit) ??
          units[0];
        line.controls.uomId.setValue(preferred?.unitId ?? null);
        this.recalculateLine(line);
      },
      error: () => {
        this.lineUnits.update((all) => {
          const next = [...all];
          next[index] = [];
          return next;
        });
      },
    });
  }

  recalculateLine(line: SalesInvoiceLineGroup): void {
    const qty = line.controls.qty.value ?? 0;
    const unitPrice = line.controls.unitPrice.value ?? 0;
    const discountRate = line.controls.discountRate.value ?? 0;
    const taxRate = line.controls.taxRate.value ?? 0;

    const totalBeforeDiscount = qty * unitPrice;
    const discountAmount = totalBeforeDiscount * (discountRate / 100);
    const taxable = totalBeforeDiscount - discountAmount;
    const taxAmount = taxable * (taxRate / 100);
    const netAmount = taxable + taxAmount;

    line.patchValue(
      {
        totalBeforeDiscount,
        discountAmount,
        taxAmount,
        netAmount,
      },
      { emitEvent: false },
    );

    this.recalculateHeaderTotals();
  }

  recalculateHeaderTotals(): void {
    let totalBeforeDiscount = 0;
    let taxAmount = 0;
    let lineNetAmount = 0;

    for (const line of this.details.controls) {
      totalBeforeDiscount += line.controls.totalBeforeDiscount.value;
      taxAmount += line.controls.taxAmount.value;
      lineNetAmount += line.controls.netAmount.value;
    }

    const headerDiscount = this.form.controls.discountAmount.value ?? 0;
    const netAmount = lineNetAmount - headerDiscount;

    this.headerTotalBeforeDiscount.set(totalBeforeDiscount);
    this.headerTaxAmount.set(taxAmount);
    this.headerNetAmount.set(netAmount);
    this.headerRemainingAmount.set(netAmount);
  }

  branchLabel(branch: Branch): string {
    return branch.branchName || String(branch.branchId);
  }

  customerLabel(customer: Customer): string {
    if (this.language.locale() === 'ar') {
      return customer.customerName || customer.customerNameEn || String(customer.customerId);
    }
    return customer.customerNameEn || customer.customerName || String(customer.customerId);
  }

  salesmanLabel(salesman: Salesman): string {
    if (this.language.locale() === 'ar') {
      return salesman.salesmanNameAr || salesman.salesmanNameEn || String(salesman.salesmanId);
    }
    return salesman.salesmanNameEn || salesman.salesmanNameAr || String(salesman.salesmanId);
  }

  currencyLabel(currency: Currency): string {
    return currency.currencyName || currency.currencyShorcut || String(currency.id);
  }

  productLabel(product: ProductLookup): string {
    return product.productName || product.proCode || String(product.productId);
  }

  unitsForLine(index: number): ProductUnit[] {
    return this.lineUnits()[index] ?? [];
  }

  onSubmit(): void {
    if (this.isReadOnly()) {
      return;
    }

    if (this.details.length < 1) {
      this.errorMessage.set(this.language.translate('salesInvoices.required.details'));
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const raw = this.form.getRawValue();
    const branchId = raw.branchId;
    const storeId = raw.storeId;
    const customerId = raw.customerId;

    if (branchId == null || storeId == null || customerId == null) {
      this.saving.set(false);
      return;
    }

    const payload: SaveSalesInvoiceRequest = {
      invoiceId: this.invoiceId() ?? undefined,
      invoiceNo: raw.invoiceNo || null,
      invoiceDate: raw.invoiceDate,
      branchId,
      storeId,
      customerId,
      salesmanId: raw.salesmanId,
      invoiceType: raw.invoiceType,
      currencyId: raw.currencyId,
      exchangeRate: raw.exchangeRate,
      status: SalesInvoiceStatus.Draft,
      totalBeforeDiscount: this.headerTotalBeforeDiscount(),
      discountAmount: raw.discountAmount,
      additionalCharges: 0,
      taxAmount: this.headerTaxAmount(),
      netAmount: this.headerNetAmount(),
      paidAmount: 0,
      remainingAmount: this.headerRemainingAmount(),
      details: raw.details.map((line) => ({
        productId: line.productId!,
        uomId: line.uomId!,
        qty: line.qty,
        unitPrice: line.unitPrice,
        discountRate: line.discountRate,
        discountAmount: line.discountAmount,
        taxRate: line.taxRate,
        taxAmount: line.taxAmount,
        netAmount: line.netAmount,
        totalBeforeDiscount: line.totalBeforeDiscount,
      })),
    };

    this.salesInvoicesService.save(payload).subscribe({
      next: () => {
        const messageKey: TranslationKey = this.isEditMode()
          ? 'salesInvoices.updateSuccess'
          : 'salesInvoices.createSuccess';
        this.navigateBack(messageKey);
      },
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: TranslationKey): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/sales/sales-invoices'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('salesInvoices.saveError')),
    );
  }
}
