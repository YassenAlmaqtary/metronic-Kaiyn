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
import { catchError, merge, of } from 'rxjs';

import { Branch } from '../../../../core/api/models/branch.models';
import { Currency } from '../../../../core/api/models/currency.models';
import { Customer } from '../../../../core/api/models/customer.models';
import { ProductLookup, ProductUnit } from '../../../../core/api/models/product.models';
import { ProductBatch } from '../../../../core/api/models/pos.models';
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
import { PosService } from '../../../../core/services/pos.service';
import { ProductsService } from '../../../../core/services/products.service';
import { SalesInvoicesService } from '../../../../core/services/sales-invoices.service';
import { SalesmenService } from '../../../../core/services/salesmen.service';
import { StoresService } from '../../../../core/services/stores.service';
import { DocumentPrintService } from '../../../../core/services/document-print.service';

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
  batchNumber: FormControl<string>;
  expiryDate: FormControl<string>;
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
  private posService = inject(PosService);
  private language = inject(LanguageService);
  private documentPrint = inject(DocumentPrintService);

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
  /** Per-line product flags for batch/expiry UI */
  lineMeta = signal<Array<{ isBatchManaged: boolean; hasExpiry: boolean }>>([]);
  lineBatches = signal<ProductBatch[][]>([]);

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
    currencyId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    exchangeRate: new FormControl(1, { nonNullable: true }),
    discountAmount: new FormControl(0, { nonNullable: true }),
    details: new FormArray<SalesInvoiceLineGroup>([]),
  });

  ngOnInit(): void {
    this.loadLookups();

    this.form.controls.branchId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((branchId) => this.onBranchChange(branchId));

    this.form.controls.currencyId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((currencyId) => this.onCurrencyChange(currencyId));

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
      next: (branches) => {
        this.branches.set(branches ?? []);
        if (!this.isEditMode() && !this.form.controls.branchId.value && branches?.length) {
          const first = branches[0];
          this.form.controls.branchId.setValue(first.branchId);
        }
      },
      error: () => this.branches.set([]),
    });
    this.customersService.getAll().subscribe({
      next: (customers) => this.customers.set(customers ?? []),
      error: () => this.customers.set([]),
    });
    this.salesmenService.getAll().subscribe({
      next: (salesmen) => this.salesmen.set(salesmen ?? []),
      error: () => this.salesmen.set([]),
    });
    this.currenciesService.getAll().subscribe({
      next: (currencies) => {
        this.currencies.set(currencies ?? []);
        this.applyDefaultCurrency(currencies ?? []);
      },
      error: () => {
        this.currencies.set([]);
        this.currenciesService.getBase().subscribe({
          next: (base) => {
            this.currencies.set([base]);
            this.applyDefaultCurrency([base]);
          },
          error: () => undefined,
        });
      },
    });
    this.productsService.getAll().subscribe({
      next: (products) => this.products.set(this.normalizeProducts(products)),
      error: () => this.products.set([]),
    });
  }

  onCurrencyChange(currencyId: number | null): void {
    if (this.isReadOnly() || currencyId == null) {
      return;
    }
    const currency = this.currencies().find((c) => c.id === currencyId);
    if (currency?.valuesCurr != null && Number(currency.valuesCurr) > 0) {
      this.form.controls.exchangeRate.setValue(Number(currency.valuesCurr));
    } else if (currency?.isBaseCurrency) {
      this.form.controls.exchangeRate.setValue(1);
    }
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
        batchNumber: detail.batchNumber ?? '',
        expiryDate: detail.expiryDate ? String(detail.expiryDate).slice(0, 10) : '',
      });
      this.details.push(line);
      this.lineUnits.update((units) => [...units, []]);
      this.lineMeta.update((metas) => [
        ...metas,
        {
          isBatchManaged: !!detail.isBatchManaged,
          hasExpiry: !!detail.hasExpiry,
        },
      ]);
      this.lineBatches.update((all) => [...all, []]);
      this.bindLineChanges(line);
      this.loadUnitsForLine(this.details.controls.indexOf(line), detail.productId, detail.uomId);
      this.loadProductLineMeta(this.details.controls.indexOf(line), detail.productId);
      this.loadBatchesForLine(this.details.controls.indexOf(line), detail.productId, false);
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
      batchNumber: new FormControl('', { nonNullable: true }),
      expiryDate: new FormControl('', { nonNullable: true }),
    });
  }

  addLine(): void {
    const line = this.createLineGroup();
    this.details.push(line);
    this.lineUnits.update((units) => [...units, []]);
    this.lineMeta.update((metas) => [...metas, { isBatchManaged: false, hasExpiry: false }]);
    this.lineBatches.update((all) => [...all, []]);
    this.bindLineChanges(line);
    this.recalculateHeaderTotals();
  }

  removeLine(index: number): void {
    this.details.removeAt(index);
    this.lineUnits.update((units) => units.filter((_, i) => i !== index));
    this.lineMeta.update((metas) => metas.filter((_, i) => i !== index));
    this.lineBatches.update((all) => all.filter((_, i) => i !== index));
    this.recalculateHeaderTotals();
  }

  lineNeedsBatch(index: number): boolean {
    return !!this.lineMeta()[index]?.isBatchManaged;
  }

  lineNeedsExpiry(index: number): boolean {
    return !!this.lineMeta()[index]?.hasExpiry;
  }

  batchesForLine(index: number): ProductBatch[] {
    return this.lineBatches()[index] ?? [];
  }

  onBatchPick(index: number, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const line = this.details.at(index);
    if (!line) {
      return;
    }
    if (!value) {
      line.patchValue({ batchNumber: '', expiryDate: '' }, { emitEvent: false });
      return;
    }
    const batch = this.batchesForLine(index).find((b) => this.batchKey(b) === value);
    if (!batch) {
      return;
    }
    line.patchValue(
      {
        batchNumber: batch.batchNumber ?? '',
        expiryDate: batch.expiryDate ? String(batch.expiryDate).slice(0, 10) : '',
      },
      { emitEvent: false },
    );
  }

  batchKey(batch: ProductBatch): string {
    return `${batch.batchNumber ?? ''}|${batch.expiryDate ? String(batch.expiryDate).slice(0, 10) : ''}`;
  }

  batchLabel(batch: ProductBatch): string {
    const batchNo = batch.batchNumber?.trim() || 'بدون تشغيلة';
    const expiry = batch.expiryDate ? String(batch.expiryDate).slice(0, 10) : 'بدون صلاحية';
    const qty = Number(batch.availableQty ?? 0);
    return `${batchNo} — ${expiry} (متاح ${qty})`;
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
          this.setLineUnits(index, []);
          this.setLineMeta(index, { isBatchManaged: false, hasExpiry: false });
          line.patchValue(
            {
              uomId: null,
              unitPrice: 0,
              discountRate: 0,
              taxRate: 0,
              batchNumber: '',
              expiryDate: '',
            },
            { emitEvent: false },
          );
          this.recalculateLine(line);
          return;
        }

        // إعادة ضبط الحقول المرتبطة قبل الجلب حتى لا تبقى قيم صنف سابق
        line.patchValue(
          {
            unitPrice: 0,
            discountRate: 0,
            batchNumber: '',
            expiryDate: '',
          },
          { emitEvent: false },
        );

        const product = this.products().find((item) => Number(item.productId) === Number(productId));
        if (product?.taxRate != null) {
          line.controls.taxRate.setValue(Number(product.taxRate), { emitEvent: false });
        }

        this.loadUnitsForLine(index, Number(productId));
        this.fillTaxForLine(line, Number(productId));
        this.loadProductLineMeta(index, Number(productId));
        this.loadBatchesForLine(index, Number(productId), true);
      });

    line.controls.uomId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((uomId) => {
        const productId = Number(line.controls.productId.value);
        if (!productId || uomId == null) {
          return;
        }
        this.fillPriceForLine(line, productId, Number(uomId));
      });
  }

  loadUnitsForLine(index: number, productId: number, preserveUomId?: number): void {
    this.productsService
      .getUnitsById(productId)
      .pipe(catchError(() => of([] as ProductUnit[])))
      .subscribe((raw) => {
        const units = this.normalizeUnits(raw);
        this.setLineUnits(index, units);

        const line = this.details.at(index);
        if (!line || Number(line.controls.productId.value) !== productId) {
          return;
        }

        if (preserveUomId != null && units.some((unit) => unit.unitId === preserveUomId)) {
          line.controls.uomId.setValue(preserveUomId, { emitEvent: false });
          return;
        }

        const preferred =
          units.find((unit) => unit.isSalesUnit) ??
          units.find((unit) => unit.isBaseUnit) ??
          units[0];
        const uomId = preferred?.unitId ?? null;
        line.controls.uomId.setValue(uomId, { emitEvent: false });
        if (uomId != null) {
          this.fillPriceForLine(line, productId, uomId);
        }
        this.recalculateLine(line);
      });
  }

  private fillPriceForLine(line: SalesInvoiceLineGroup, productId: number, unitId: number): void {
    const branchId = this.form.controls.branchId.value ?? undefined;
    this.posService
      .getPrice(productId, unitId, branchId ?? undefined)
      .pipe(catchError(() => of(0)))
      .subscribe((posPrice) => {
        if (Number(line.controls.productId.value) !== productId) {
          return;
        }
        const price = Number(posPrice) || 0;
        if (price > 0) {
          line.controls.unitPrice.setValue(price);
          this.recalculateLine(line);
          return;
        }

        this.productsService
          .getById(productId)
          .pipe(catchError(() => of(null)))
          .subscribe((product) => {
            if (!product || Number(line.controls.productId.value) !== productId) {
              return;
            }
            const fallback = Number(product.defaultSalesPrice ?? 0);
            if (fallback > 0) {
              line.controls.unitPrice.setValue(fallback);
              this.recalculateLine(line);
            }
          });
      });
  }

  private fillTaxForLine(line: SalesInvoiceLineGroup, productId: number): void {
    const fromLookup = this.products().find((p) => Number(p.productId) === productId);
    if (fromLookup?.taxRate != null && Number(fromLookup.taxRate) > 0) {
      line.controls.taxRate.setValue(Number(fromLookup.taxRate), { emitEvent: false });
      this.recalculateLine(line);
      return;
    }

    this.posService
      .getTax(productId)
      .pipe(catchError(() => of({ taxRate: 0, isPriceInclusive: false })))
      .subscribe((tax) => {
        if (Number(line.controls.productId.value) !== productId) {
          return;
        }
        line.controls.taxRate.setValue(Number(tax?.taxRate ?? 0), { emitEvent: false });
        this.recalculateLine(line);
      });
  }

  private loadProductLineMeta(index: number, productId: number): void {
    this.productsService
      .getById(productId)
      .pipe(catchError(() => of(null)))
      .subscribe((product) => {
        if (!product || Number(this.details.at(index)?.controls.productId.value) !== productId) {
          return;
        }
        this.setLineMeta(index, {
          isBatchManaged: !!product.isBatchManaged,
          hasExpiry: !!product.hasExpiry,
        });
      });
  }

  private loadBatchesForLine(index: number, productId: number, autoSelect: boolean): void {
    const storeId = this.form.controls.storeId.value;
    if (!storeId) {
      this.setLineBatches(index, []);
      return;
    }

    this.posService.getBatches(productId, storeId).subscribe((batches) => {
      if (Number(this.details.at(index)?.controls.productId.value) !== productId) {
        return;
      }
      const list = Array.isArray(batches) ? batches : [];
      this.setLineBatches(index, list);
      const line = this.details.at(index);
      if (!autoSelect || !line || list.length === 0) {
        return;
      }
      if (line.controls.batchNumber.value || line.controls.expiryDate.value) {
        return;
      }
      const first = list[0];
      line.patchValue(
        {
          batchNumber: first.batchNumber ?? '',
          expiryDate: first.expiryDate ? String(first.expiryDate).slice(0, 10) : '',
        },
        { emitEvent: false },
      );
    });
  }

  private setLineBatches(index: number, batches: ProductBatch[]): void {
    this.lineBatches.update((all) => {
      const next = [...all];
      while (next.length <= index) {
        next.push([]);
      }
      next[index] = batches;
      return next;
    });
  }

  private setLineMeta(
    index: number,
    meta: { isBatchManaged: boolean; hasExpiry: boolean },
  ): void {
    this.lineMeta.update((all) => {
      const next = [...all];
      while (next.length <= index) {
        next.push({ isBatchManaged: false, hasExpiry: false });
      }
      next[index] = meta;
      return next;
    });
  }

  private applyDefaultCurrency(currencies: Currency[]): void {
    if (this.isEditMode() || this.form.controls.currencyId.value != null) {
      return;
    }
    const base = currencies.find((c) => c.isBaseCurrency) ?? currencies[0];
    if (!base) {
      return;
    }
    this.form.controls.currencyId.setValue(base.id);
    this.form.controls.exchangeRate.setValue(
      base.isBaseCurrency ? 1 : Number(base.valuesCurr ?? 1) || 1,
    );
  }

  private setLineUnits(index: number, units: ProductUnit[]): void {
    this.lineUnits.update((all) => {
      const next = [...all];
      while (next.length <= index) {
        next.push([]);
      }
      next[index] = units;
      return next;
    });
  }

  private normalizeUnits(raw: unknown): ProductUnit[] {
    const list = this.asArray<ProductUnit>(raw);
    return list
      .map((u) => {
        const r = u as ProductUnit & Record<string, unknown>;
        return {
          unitId: Number(r.unitId ?? r['UnitId'] ?? 0),
          unitName: String(r.unitName ?? r['UnitName'] ?? ''),
          conversionFactor: Number(r.conversionFactor ?? r['ConversionFactor'] ?? 1) || 1,
          isBaseUnit: Boolean(r.isBaseUnit ?? r['IsBaseUnit'] ?? false),
          isPurchasingUnit: Boolean(r.isPurchasingUnit ?? r['IsPurchasingUnit'] ?? false),
          isSalesUnit: Boolean(r.isSalesUnit ?? r['IsSalesUnit'] ?? false),
          barcode: (r.barcode ?? r['Barcode'] ?? null) as string | null,
        };
      })
      .filter((u) => u.unitId > 0);
  }

  private normalizeProducts(raw: unknown): ProductLookup[] {
    return this.asArray<ProductLookup>(raw).map((p) => {
      const r = p as ProductLookup & Record<string, unknown>;
      return {
        productId: Number(r.productId ?? r['ProductId'] ?? r['Pro_ID'] ?? 0),
        productName: String(r.productName ?? r['ProductName'] ?? r['Pro_Name'] ?? ''),
        proCode: (r.proCode ?? r['ProCode'] ?? null) as string | null,
        taxRate: (r.taxRate ?? r['TaxRate'] ?? null) as number | null,
        groupId: (r.groupId ?? r['GroupId'] ?? null) as number | null,
        isTax: (r.isTax ?? r['IsTax'] ?? null) as boolean | null,
      };
    }).filter((p) => p.productId > 0);
  }

  private asArray<T>(raw: unknown): T[] {
    if (Array.isArray(raw)) {
      return raw;
    }
    if (raw && typeof raw === 'object') {
      const o = raw as Record<string, unknown>;
      if (Array.isArray(o['$values'])) {
        return o['$values'] as T[];
      }
    }
    return [];
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

  printDocument(): void {
    const raw = this.form.getRawValue();
    const branch = this.branches().find((item) => item.branchId === raw.branchId);
    const store = this.stores().find((item) => item.storeId === raw.storeId);
    const customer = this.customers().find((item) => item.customerId === raw.customerId);
    const salesman = this.salesmen().find((item) => item.salesmanId === raw.salesmanId);
    const currency = this.currencies().find((item) => item.id === raw.currencyId);

    const invoiceTypeKey =
      raw.invoiceType === SalesInvoiceType.Cash
        ? 'salesInvoices.type.cash'
        : 'salesInvoices.type.credit';

    this.documentPrint.print({
      title: this.language.translate('salesInvoices.title'),
      subtitle: raw.invoiceNo || undefined,
      fields: [
        { label: this.language.translate('salesInvoices.invoiceNo'), value: raw.invoiceNo || '—' },
        { label: this.language.translate('salesInvoices.invoiceDate'), value: raw.invoiceDate || '—' },
        { label: this.language.translate('salesInvoices.status'), value: this.invoiceStatusLabel() },
        { label: this.language.translate('salesInvoices.branch'), value: branch ? this.branchLabel(branch) : '—' },
        { label: this.language.translate('salesInvoices.store'), value: store?.storeName || '—' },
        { label: this.language.translate('salesInvoices.customer'), value: customer ? this.customerLabel(customer) : '—' },
        { label: this.language.translate('salesInvoices.salesman'), value: salesman ? this.salesmanLabel(salesman) : '—' },
        { label: this.language.translate('salesInvoices.invoiceType'), value: this.language.translate(invoiceTypeKey) },
        { label: this.language.translate('salesInvoices.currency'), value: currency ? this.currencyLabel(currency) : '—' },
      ],
      columns: [
        { key: 'product', header: this.language.translate('salesInvoices.product') },
        { key: 'qty', header: this.language.translate('salesInvoices.qty'), align: 'end' },
        { key: 'unitPrice', header: this.language.translate('salesInvoices.unitPrice'), align: 'end' },
        { key: 'discount', header: this.language.translate('salesInvoices.discountAmount'), align: 'end' },
        { key: 'tax', header: this.language.translate('salesInvoices.taxAmount'), align: 'end' },
        { key: 'total', header: this.language.translate('salesInvoices.lineTotal'), align: 'end' },
      ],
      rows: this.details.controls.map((line, index) => {
        const product = this.products().find((item) => item.productId === line.controls.productId.value);
        return {
          product: product ? this.productLabel(product) : '—',
          qty: this.formatPrintAmount(line.controls.qty.value),
          unitPrice: this.formatPrintAmount(line.controls.unitPrice.value),
          discount: this.formatPrintAmount(line.controls.discountAmount.value),
          tax: this.formatPrintAmount(line.controls.taxAmount.value),
          total: this.formatPrintAmount(line.controls.netAmount.value),
        };
      }),
      totals: [
        {
          label: this.language.translate('salesInvoices.totalBeforeDiscount'),
          value: this.formatPrintAmount(this.headerTotalBeforeDiscount()),
        },
        {
          label: this.language.translate('salesInvoices.taxAmount'),
          value: this.formatPrintAmount(this.headerTaxAmount()),
        },
        {
          label: this.language.translate('salesInvoices.netAmount'),
          value: this.formatPrintAmount(this.headerNetAmount()),
        },
      ],
    });
  }

  private invoiceStatusLabel(): string {
    switch (this.invoiceStatus()) {
      case SalesInvoiceStatus.Draft:
        return this.language.translate('salesInvoices.status.draft');
      case SalesInvoiceStatus.Posted:
        return this.language.translate('salesInvoices.status.posted');
      case SalesInvoiceStatus.Cancelled:
        return this.language.translate('salesInvoices.status.cancelled');
      default:
        return this.language.translate('salesInvoices.status.unknown');
    }
  }

  private formatPrintAmount(value: number | null | undefined): string {
    return (value ?? 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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

    for (let i = 0; i < this.details.length; i++) {
      const line = this.details.at(i);
      if (!line) {
        continue;
      }
      if (this.lineNeedsBatch(i) && !String(line.controls.batchNumber.value || '').trim()) {
        this.errorMessage.set(this.language.translate('salesInvoices.batchRequired'));
        return;
      }
      if (this.lineNeedsExpiry(i) && !String(line.controls.expiryDate.value || '').trim()) {
        this.errorMessage.set(this.language.translate('salesInvoices.expiryRequired'));
        return;
      }
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
        batchNumber: String(line.batchNumber || '').trim() || null,
        expiryDate: String(line.expiryDate || '').trim() || null,
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
