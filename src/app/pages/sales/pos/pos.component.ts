import { DecimalPipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';

import { AuthService } from '../../../core/api/auth.service';
import { AccountingPeriodLookup } from '../../../core/api/models/accounting-period.models';
import { Branch } from '../../../core/api/models/branch.models';
import { Customer } from '../../../core/api/models/customer.models';
import { PaymentType } from '../../../core/api/models/payment-voucher.models';
import { Product, ProductUnit } from '../../../core/api/models/product.models';
import {
  SalesInvoiceType,
  SaveSalesInvoiceRequest,
} from '../../../core/api/models/sales-invoice.models';
import { StoreLookup } from '../../../core/api/models/store.models';
import { extractApiErrorMessage } from '../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AccountingPeriodsService } from '../../../core/services/accounting-periods.service';
import { BranchesService } from '../../../core/services/branches.service';
import { CustomersService } from '../../../core/services/customers.service';
import { LanguageService } from '../../../core/services/language.service';
import { PaymentTypesService } from '../../../core/services/payment-types.service';
import { ProductsService } from '../../../core/services/products.service';
import { SalesInvoicesService } from '../../../core/services/sales-invoices.service';
import { StockIssuesService } from '../../../core/services/stock-issues.service';
import { StoresService } from '../../../core/services/stores.service';

export interface PosCartLine {
  key: string;
  productId: number;
  productName: string;
  productCode?: string | null;
  uomId: number;
  unitName?: string | null;
  qty: number;
  unitPrice: number;
  taxRate: number;
  discountRate: number;
}

interface PosCatalogItem {
  product: Product;
  searchText: string;
}

interface PosSuccessState {
  invoiceId: number;
  invoiceNo: string;
  net: number;
  paid: number;
  change: number;
  posted: boolean;
}

@Component({
  selector: 'app-pos',
  imports: [FormsModule, TranslatePipe, DecimalPipe, RouterLink],
  templateUrl: './pos.component.html',
  styleUrl: './pos.component.scss',
})
export class PosComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private auth = inject(AuthService);
  private language = inject(LanguageService);
  private branchesService = inject(BranchesService);
  private storesService = inject(StoresService);
  private customersService = inject(CustomersService);
  private productsService = inject(ProductsService);
  private paymentTypesService = inject(PaymentTypesService);
  private salesInvoicesService = inject(SalesInvoicesService);
  private stockIssuesService = inject(StockIssuesService);
  private accountingPeriodsService = inject(AccountingPeriodsService);

  private searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private paidInput = viewChild<ElementRef<HTMLInputElement>>('paidInput');

  loading = signal(true);
  saving = signal(false);
  scanning = signal(false);
  errorMessage = signal('');
  toastMessage = signal('');

  branches = signal<Branch[]>([]);
  stores = signal<StoreLookup[]>([]);
  customers = signal<Customer[]>([]);
  paymentTypes = signal<PaymentType[]>([]);
  openPeriods = signal<AccountingPeriodLookup[]>([]);
  catalog = signal<PosCatalogItem[]>([]);

  branchId = signal<number | null>(null);
  storeId = signal<number | null>(null);
  customerId = signal<number | null>(null);
  searchQuery = signal('');
  cart = signal<PosCartLine[]>([]);
  discountAmount = signal(0);

  payOpen = signal(false);
  invoiceType = signal<number>(SalesInvoiceType.Cash);
  paymentTypeId = signal<number | null>(null);
  amountPaid = signal(0);

  success = signal<PosSuccessState | null>(null);

  private unitsCache = new Map<number, ProductUnit[]>();
  private barcodeIndex = new Map<string, { productId: number; uomId: number }>();

  readonly SalesInvoiceType = SalesInvoiceType;

  filteredCatalog = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const items = this.catalog();
    if (!q) {
      return items.slice(0, 60);
    }
    return items.filter((x) => x.searchText.includes(q)).slice(0, 60);
  });

  linesCount = computed(() => this.cart().reduce((s, l) => s + l.qty, 0));

  subtotal = computed(() =>
    this.cart().reduce((s, l) => s + l.qty * l.unitPrice, 0),
  );

  taxAmount = computed(() =>
    this.cart().reduce((s, l) => {
      const line = l.qty * l.unitPrice * (1 - (l.discountRate || 0) / 100);
      return s + line * ((l.taxRate || 0) / 100);
    }, 0),
  );

  netAmount = computed(() => {
    const beforeTax = this.cart().reduce((s, l) => {
      return s + l.qty * l.unitPrice * (1 - (l.discountRate || 0) / 100);
    }, 0);
    return Math.max(0, beforeTax + this.taxAmount() - (this.discountAmount() || 0));
  });

  changeDue = computed(() => Math.max(0, this.amountPaid() - this.netAmount()));
  stillDue = computed(() => Math.max(0, this.netAmount() - this.amountPaid()));

  quickTenders = computed(() => {
    const net = this.netAmount();
    if (net <= 0) {
      return [] as number[];
    }
    const rounded = Math.ceil(net / 5) * 5;
    const rounded10 = Math.ceil(net / 10) * 10;
    const extras = [net, rounded, rounded10, net + 50, net + 100]
      .map((n) => Math.round(n * 100) / 100)
      .filter((n, i, arr) => n >= net && arr.indexOf(n) === i)
      .slice(0, 4);
    return extras;
  });

  productInitial(name?: string | null): string {
    const t = (name || '?').trim();
    return t.slice(0, 1).toUpperCase();
  }

  productTone(productId: number): number {
    return productId % 6;
  }

  setQuickTender(amount: number): void {
    this.amountPaid.set(amount);
  }

  ngOnInit(): void {
    this.bootstrap();
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.success()) {
      return;
    }
    if (event.key === 'F2') {
      event.preventDefault();
      this.focusSearch();
      return;
    }
    if (event.key === 'F4') {
      event.preventDefault();
      this.openPayment();
      return;
    }
    if (event.key === 'F9') {
      event.preventDefault();
      this.resetSale();
    }
  }

  onBranchChange(value: number | null): void {
    this.branchId.set(value);
    this.storeId.set(null);
    if (value == null) {
      this.stores.set([]);
      return;
    }
    this.storesService.getByBranch(value).subscribe({
      next: (stores) => {
        this.stores.set(stores);
        if (stores.length === 1) {
          this.storeId.set(stores[0].storeId);
        }
      },
      error: () => this.stores.set([]),
    });
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    const q = this.searchQuery().trim();
    if (!q) {
      return;
    }
    void this.tryAddByBarcodeOrSearch(q);
  }

  async tryAddByBarcodeOrSearch(raw: string): Promise<void> {
    this.scanning.set(true);
    this.errorMessage.set('');
    try {
      const hit = this.barcodeIndex.get(raw.toLowerCase());
      if (hit) {
        await this.addProduct(hit.productId, hit.uomId);
        this.searchQuery.set('');
        this.focusSearch();
        return;
      }

      const fromApi = await this.lookupBarcodeApi(raw);
      if (fromApi) {
        await this.addProduct(fromApi.productId, fromApi.uomId);
        this.searchQuery.set('');
        this.focusSearch();
        return;
      }

      const matches = this.catalog().filter((x) => x.searchText.includes(raw.toLowerCase()));
      if (matches.length === 1) {
        await this.addProduct(matches[0].product.productId);
        this.searchQuery.set('');
        this.focusSearch();
        return;
      }

      this.errorMessage.set(this.language.translate('pos.barcodeNotFound'));
    } finally {
      this.scanning.set(false);
    }
  }

  async addProduct(productId: number, preferredUomId?: number): Promise<void> {
    const item = this.catalog().find((x) => x.product.productId === productId);
    if (!item) {
      this.errorMessage.set(this.language.translate('pos.productNotFound'));
      return;
    }

    const units = await this.ensureUnits(productId);
    const salesUnit =
      units.find((u) => u.unitId === preferredUomId) ||
      units.find((u) => u.isSalesUnit) ||
      units.find((u) => u.isBaseUnit) ||
      units[0];

    if (!salesUnit) {
      this.errorMessage.set(this.language.translate('pos.productNotFound'));
      return;
    }

    const key = `${productId}-${salesUnit.unitId}`;
    const existing = this.cart().find((l) => l.key === key);
    if (existing) {
      this.updateQty(key, existing.qty + 1);
      return;
    }

    const price = Number(item.product.defaultSalesPrice ?? 0);
    const taxRate = item.product.isTax ? Number(item.product.taxRate ?? 0) : 0;

    this.cart.update((lines) => [
      ...lines,
      {
        key,
        productId,
        productName: item.product.productName || item.product.proCode || `#${productId}`,
        productCode: item.product.proCode,
        uomId: salesUnit.unitId,
        unitName: salesUnit.unitName,
        qty: 1,
        unitPrice: price,
        taxRate,
        discountRate: 0,
      },
    ]);
  }

  updateQty(key: string, qty: number): void {
    const next = Math.max(0, Math.round(qty * 1000) / 1000);
    if (next <= 0) {
      this.removeLine(key);
      return;
    }
    this.cart.update((lines) => lines.map((l) => (l.key === key ? { ...l, qty: next } : l)));
  }

  bumpQty(key: string, delta: number): void {
    const line = this.cart().find((l) => l.key === key);
    if (!line) {
      return;
    }
    this.updateQty(key, line.qty + delta);
  }

  removeLine(key: string): void {
    this.cart.update((lines) => lines.filter((l) => l.key !== key));
  }

  clearCart(): void {
    if (!this.cart().length) {
      return;
    }
    if (!confirm(this.language.translate('pos.clearConfirm'))) {
      return;
    }
    this.cart.set([]);
    this.discountAmount.set(0);
  }

  resetSale(): void {
    this.cart.set([]);
    this.discountAmount.set(0);
    this.searchQuery.set('');
    this.errorMessage.set('');
    this.toastMessage.set('');
    this.success.set(null);
    this.payOpen.set(false);
    this.amountPaid.set(0);
    this.invoiceType.set(SalesInvoiceType.Cash);
    this.focusSearch();
  }

  openPayment(): void {
    this.errorMessage.set('');
    if (!this.cart().length) {
      return;
    }
    if (this.branchId() == null) {
      this.errorMessage.set(this.language.translate('pos.branchRequired'));
      return;
    }
    if (this.storeId() == null) {
      this.errorMessage.set(this.language.translate('pos.storeRequired'));
      return;
    }
    if (this.customerId() == null) {
      this.errorMessage.set(this.language.translate('pos.customerRequired'));
      return;
    }

    if (this.paymentTypeId() == null && this.paymentTypes().length) {
      this.paymentTypeId.set(this.paymentTypes()[0].paymentTypeId);
    }
    this.amountPaid.set(
      this.invoiceType() === SalesInvoiceType.Cash ? this.netAmount() : 0,
    );
    this.payOpen.set(true);
    setTimeout(() => this.paidInput()?.nativeElement.focus(), 50);
  }

  closePayment(): void {
    if (this.saving()) {
      return;
    }
    this.payOpen.set(false);
  }

  holdDraft(): void {
    this.submitSale({ post: false, draftOnly: true });
  }

  confirmPay(post: boolean): void {
    this.submitSale({ post, draftOnly: false });
  }

  printReceipt(): void {
    window.print();
  }

  closeSuccess(): void {
    this.resetSale();
  }

  customerLabel(c: Customer): string {
    return c.customerName || c.customerNameEn || String(c.customerId);
  }

  lineNet(line: PosCartLine): number {
    const base = line.qty * line.unitPrice * (1 - (line.discountRate || 0) / 100);
    return base + base * ((line.taxRate || 0) / 100);
  }

  trackLine(_: number, line: PosCartLine): string {
    return line.key;
  }

  trackProduct(_: number, item: PosCatalogItem): number {
    return item.product.productId;
  }

  private focusSearch(): void {
    this.searchInput()?.nativeElement.focus();
    this.searchInput()?.nativeElement.select();
  }

  private bootstrap(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    forkJoin({
      branches: this.branchesService.getAll().pipe(catchError(() => of([] as Branch[]))),
      customers: this.customersService.getAll().pipe(catchError(() => of([] as Customer[]))),
      products: this.productsService.getAll().pipe(catchError(() => of([] as Product[]))),
      paymentTypes: this.paymentTypesService.getAll().pipe(catchError(() => of([] as PaymentType[]))),
      periods: this.accountingPeriodsService.getOpen().pipe(catchError(() => of([] as AccountingPeriodLookup[]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ branches, customers, products, paymentTypes, periods }) => {
          const activeBranches = branches.filter((b) => b.isActive !== false);
          this.branches.set(activeBranches);
          this.customers.set(customers.filter((c) => c.isActive !== false));
          this.paymentTypes.set(paymentTypes);
          this.openPeriods.set(periods);

          const catalog = (products as Product[])
            .filter((p) => p.status !== false)
            .map((p) => ({
              product: p,
              searchText: [p.productName, p.proCode, p.productNameScientific]
                .filter(Boolean)
                .join(' ')
                .toLowerCase(),
            }));
          this.catalog.set(catalog);

          if (paymentTypes.length) {
            this.paymentTypeId.set(paymentTypes[0].paymentTypeId);
          }
          if (customers.length) {
            this.customerId.set(customers[0].customerId);
          }

          const user = this.auth.user();
          const defaultBranch =
            user?.defaultBranchId ??
            user?.branches?.find((b) => b.isDefault)?.branchId ??
            activeBranches[0]?.branchId ??
            null;
          this.branchId.set(defaultBranch);
          if (defaultBranch != null) {
            this.onBranchChange(defaultBranch);
          }

          this.prefetchUnits(catalog.map((c) => c.product.productId).slice(0, 40));
          this.loading.set(false);
          setTimeout(() => this.focusSearch(), 80);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set(this.language.translate('pos.loadError'));
        },
      });
  }

  private prefetchUnits(ids: number[]): void {
    for (const id of ids) {
      void this.ensureUnits(id);
    }
  }

  private ensureUnits(productId: number): Promise<ProductUnit[]> {
    const cached = this.unitsCache.get(productId);
    if (cached) {
      return Promise.resolve(cached);
    }
    return new Promise((resolve) => {
      this.productsService.getUnitsById(productId).subscribe({
        next: (units) => {
          this.unitsCache.set(productId, units);
          for (const u of units) {
            if (u.barcode) {
              this.barcodeIndex.set(u.barcode.trim().toLowerCase(), {
                productId,
                uomId: u.unitId,
              });
            }
          }
          resolve(units);
        },
        error: () => {
          this.unitsCache.set(productId, []);
          resolve([]);
        },
      });
    });
  }

  private lookupBarcodeApi(barcode: string): Promise<{ productId: number; uomId: number } | null> {
    return new Promise((resolve) => {
      this.stockIssuesService.lookupBarcode(barcode).subscribe({
        next: (res) => {
          if (res?.itemId && res.unitId) {
            this.barcodeIndex.set(barcode.toLowerCase(), {
              productId: res.itemId,
              uomId: res.unitId,
            });
            resolve({ productId: res.itemId, uomId: res.unitId });
            return;
          }
          resolve(null);
        },
        error: () => resolve(null),
      });
    });
  }

  private submitSale(opts: { post: boolean; draftOnly: boolean }): void {
    if (this.saving() || !this.cart().length) {
      return;
    }

    const branchId = this.branchId();
    const storeId = this.storeId();
    const customerId = this.customerId();
    if (branchId == null) {
      this.errorMessage.set(this.language.translate('pos.branchRequired'));
      return;
    }
    if (storeId == null) {
      this.errorMessage.set(this.language.translate('pos.storeRequired'));
      return;
    }
    if (customerId == null) {
      this.errorMessage.set(this.language.translate('pos.customerRequired'));
      return;
    }

    const invoiceType = opts.draftOnly ? SalesInvoiceType.Cash : this.invoiceType();
    const isCash = invoiceType === SalesInvoiceType.Cash;
    const net = this.netAmount();
    let paid = opts.draftOnly ? 0 : Number(this.amountPaid()) || 0;

    if (!opts.draftOnly) {
      if (isCash) {
        if (this.paymentTypeId() == null) {
          this.errorMessage.set(this.language.translate('pos.paymentRequired'));
          return;
        }
        if (paid < net) {
          this.errorMessage.set(this.language.translate('pos.payAmountInvalid'));
          return;
        }
        paid = net;
      } else if (paid < 0) {
        this.errorMessage.set(this.language.translate('pos.payAmountInvalid'));
        return;
      }
    }

    const subtotal = this.subtotal();
    const tax = this.taxAmount();
    const discount = Number(this.discountAmount()) || 0;
    const remaining = Math.max(0, net - paid);

    const payload: SaveSalesInvoiceRequest = {
      invoiceDate: new Date().toISOString().slice(0, 10),
      branchId,
      storeId,
      customerId,
      invoiceType,
      exchangeRate: 1,
      status: 1,
      totalBeforeDiscount: subtotal,
      discountAmount: discount,
      additionalCharges: 0,
      taxAmount: tax,
      netAmount: net,
      paidAmount: paid,
      remainingAmount: remaining,
      payments:
        !opts.draftOnly && paid > 0 && this.paymentTypeId() != null
          ? [{ paymentTypeId: this.paymentTypeId()!, amount: paid }]
          : [],
      details: this.cart().map((l) => {
        const beforeDiscount = l.qty * l.unitPrice;
        const discountAmount = beforeDiscount * ((l.discountRate || 0) / 100);
        const afterDiscount = beforeDiscount - discountAmount;
        const taxAmount = afterDiscount * ((l.taxRate || 0) / 100);
        return {
          productId: l.productId,
          uomId: l.uomId,
          qty: l.qty,
          unitPrice: l.unitPrice,
          discountRate: l.discountRate,
          discountAmount,
          taxRate: l.taxRate,
          taxAmount,
          totalBeforeDiscount: beforeDiscount,
          netAmount: afterDiscount + taxAmount,
        };
      }),
    };

    this.saving.set(true);
    this.errorMessage.set('');

    this.salesInvoicesService
      .save(payload)
      .pipe(
        switchMap((invoice) => {
          const periodId = this.openPeriods()[0]?.periodId;
          if (opts.post && periodId != null && invoice.invoiceId) {
            return this.salesInvoicesService.post(invoice.invoiceId, { periodId }).pipe(
              catchError(() => of({ __postFailed: true as const, invoice })),
              switchMap((result) => {
                if (result && typeof result === 'object' && '__postFailed' in result) {
                  return of({ invoice, posted: false, postFailed: true });
                }
                return of({ invoice, posted: true, postFailed: false });
              }),
            );
          }
          return of({ invoice, posted: false, postFailed: false });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ invoice, posted, postFailed }) => {
          this.saving.set(false);
          this.payOpen.set(false);

          if (opts.draftOnly) {
            this.toastMessage.set(this.language.translate('pos.holdSuccess'));
            this.cart.set([]);
            this.discountAmount.set(0);
            this.focusSearch();
            return;
          }

          if (postFailed) {
            this.toastMessage.set(this.language.translate('pos.postError'));
          }

          this.success.set({
            invoiceId: invoice.invoiceId,
            invoiceNo: invoice.invoiceNo || `#${invoice.invoiceId}`,
            net,
            paid,
            change: Math.max(0, (Number(this.amountPaid()) || 0) - net),
            posted,
          });
        },
        error: (error) => {
          this.saving.set(false);
          this.errorMessage.set(
            extractApiErrorMessage(error, this.language.translate('pos.saveError')),
          );
        },
      });
  }
}
