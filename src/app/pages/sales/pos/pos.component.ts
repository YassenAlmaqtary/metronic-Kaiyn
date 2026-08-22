import { DatePipe, DecimalPipe } from '@angular/common';
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
import {
  catchError,
  finalize,
  forkJoin,
  map,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

import { AuthService } from '../../../core/api/auth.service';
import { Branch } from '../../../core/api/models/branch.models';
import { Currency } from '../../../core/api/models/currency.models';
import { Customer } from '../../../core/api/models/customer.models';
import { PaymentType } from '../../../core/api/models/payment-voucher.models';
import {
  PosCashier,
  PosDevice,
  PosOrderHeader,
  PosOrderListItem,
  PosOrderStatus,
  PosProductTile,
  PosShift,
  ProductBatch,
  SavePosOrderRequest,
  SavePosReturnRequest,
} from '../../../core/api/models/pos.models';
import { StoreLookup } from '../../../core/api/models/store.models';
import { extractApiErrorMessage } from '../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { BranchesService } from '../../../core/services/branches.service';
import { CurrenciesService } from '../../../core/services/currencies.service';
import { CustomersService } from '../../../core/services/customers.service';
import { LanguageService } from '../../../core/services/language.service';
import { PaymentTypesService } from '../../../core/services/payment-types.service';
import { PosService, isPosShiftOpen } from '../../../core/services/pos.service';
import { StoresService } from '../../../core/services/stores.service';

export interface PosCartLine {
  key: string;
  productId: number;
  productName: string;
  unitId: number;
  unitName?: string | null;
  qty: number;
  unitPrice: number;
  taxRate: number;
  discountAmount: number;
  stockQty?: number | null;
  batchNumber?: string | null;
  expiryDate?: string | null;
}

interface PosCatalogItem {
  tile: PosProductTile;
  searchText: string;
}

interface PosSuccessState {
  orderId: number;
  orderNo: string;
  net: number;
  paid: number;
  change: number;
}

@Component({
  selector: 'app-pos',
  imports: [FormsModule, TranslatePipe, DecimalPipe, DatePipe, RouterLink],
  templateUrl: './pos.component.html',
  styleUrl: './pos.component.scss',
})
export class PosComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private auth = inject(AuthService);
  private language = inject(LanguageService);
  private pos = inject(PosService);
  private branchesService = inject(BranchesService);
  private storesService = inject(StoresService);
  private customersService = inject(CustomersService);
  private paymentTypesService = inject(PaymentTypesService);
  private currenciesService = inject(CurrenciesService);

  private searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private paidInput = viewChild<ElementRef<HTMLInputElement>>('paidInput');

  loading = signal(true);
  sessionReady = signal(false);
  catalogLoading = signal(false);
  saving = signal(false);
  scanning = signal(false);
  shiftBusy = signal(false);
  errorMessage = signal('');
  toastMessage = signal('');

  branches = signal<Branch[]>([]);
  stores = signal<StoreLookup[]>([]);
  customers = signal<Customer[]>([]);
  paymentTypes = signal<PaymentType[]>([]);
  catalog = signal<PosCatalogItem[]>([]);
  suspended = signal<PosOrderHeader[]>([]);

  cashier = signal<PosCashier | null>(null);
  device = signal<PosDevice | null>(null);
  shift = signal<PosShift | null>(null);
  currency = signal<Currency | null>(null);
  permissions = signal<Record<string, boolean>>({});
  settings = signal<Record<string, string>>({});

  branchId = signal<number | null>(null);
  storeId = signal<number | null>(null);
  customerId = signal<number | null>(null);
  searchQuery = signal('');
  cart = signal<PosCartLine[]>([]);
  discountAmount = signal(0);
  openingBalance = signal(0);
  closingBalance = signal(0);

  needShiftOpen = signal(false);
  needCloseShift = signal(false);
  /** Active shift found during session prep — user must click resume (not auto). */
  pendingActiveShift = signal<PosShift | null>(null);
  showSuspended = signal(false);
  showReturns = signal(false);
  returnBusy = signal(false);
  returnSearch = signal('');
  paidOrders = signal<PosOrderListItem[]>([]);
  returnOrder = signal<PosOrderHeader | null>(null);
  returnQtys = signal<Record<string, number>>({});
  returnReason = signal('');

  payOpen = signal(false);
  paymentTypeId = signal<number | null>(null);
  amountPaid = signal(0);
  success = signal<PosSuccessState | null>(null);

  private taxCache = new Map<number, number>();
  private sessionGen = 0;

  filteredCatalog = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const items = this.catalog();
    if (!q) {
      return items.slice(0, 80);
    }
    return items.filter((x) => x.searchText.includes(q)).slice(0, 80);
  });

  linesCount = computed(() => this.cart().reduce((s, l) => s + l.qty, 0));

  subtotal = computed(() =>
    this.cart().reduce((s, l) => s + l.qty * l.unitPrice, 0),
  );

  taxAmount = computed(() =>
    this.cart().reduce((s, l) => {
      const base = Math.max(0, l.qty * l.unitPrice - (l.discountAmount || 0));
      return s + base * ((l.taxRate || 0) / 100);
    }, 0),
  );

  netAmount = computed(() => {
    const beforeTax = this.cart().reduce((s, l) => {
      return s + Math.max(0, l.qty * l.unitPrice - (l.discountAmount || 0));
    }, 0);
    return Math.max(0, beforeTax + this.taxAmount() - (this.discountAmount() || 0));
  });

  changeDue = computed(() => Math.max(0, this.amountPaid() - this.netAmount()));
  stillDue = computed(() => Math.max(0, this.netAmount() - this.amountPaid()));

  canOperate = computed(
    () =>
      this.sessionReady() &&
      !!this.shift()?.shiftId &&
      this.branchId() != null &&
      this.storeId() != null,
  );

  hasStoreContext = computed(() => this.branchId() != null && this.storeId() != null);

  /** Permission helpers — missing keys default to allowed. */
  canDiscount = computed(() => this.perm('AllowDiscount', 'discount', 'pos.discount'));
  canHold = computed(() => this.perm('AllowHold', 'hold', 'pos.hold'));
  canReturn = computed(() => this.perm('AllowReturn', 'return', 'pos.return'));
  canCloseShift = computed(() => this.perm('AllowCloseShift', 'closeShift', 'pos.closeShift'));

  shiftLabel = computed(() => {
    const s = this.shift();
    if (!s?.shiftId) {
      return '';
    }
    return `#${s.shiftId}`;
  });

  returnLines = computed(() => {
    const order = this.returnOrder();
    if (!order?.items?.length) {
      return [] as Array<{
        key: string;
        productId: number;
        unitId: number;
        name: string;
        soldQty: number;
        price: number;
      }>;
    }
    return order.items.map((item, idx) => {
      const productId = Number(item.productId ?? item.pro_ID ?? 0);
      const unitId = Number(item.unitId);
      const hit = this.catalog().find((c) => c.tile.productId === productId);
      return {
        key: `${productId}-${unitId}-${idx}`,
        productId,
        unitId,
        name: hit?.tile.productName || `#${productId}`,
        soldQty: Number(item.qty) || 0,
        price: Number(item.price) || 0,
      };
    });
  });

  private perm(...keys: string[]): boolean {
    const map = this.permissions();
    const entries = Object.entries(map);
    if (!entries.length) {
      return true;
    }
    for (const key of keys) {
      const hit = entries.find(([k]) => k.toLowerCase() === key.toLowerCase());
      if (hit) {
        return !!hit[1];
      }
    }
    // Fuzzy contains
    for (const key of keys) {
      const hit = entries.find(([k]) => k.toLowerCase().includes(key.toLowerCase()));
      if (hit) {
        return !!hit[1];
      }
    }
    return true;
  }

  private settingNumber(...keys: string[]): number | null {
    const map = this.settings();
    for (const key of keys) {
      const direct = map[key];
      if (direct != null && String(direct).trim() !== '' && !Number.isNaN(Number(direct))) {
        return Number(direct);
      }
      const found = Object.entries(map).find(([k]) => k.toLowerCase() === key.toLowerCase());
      if (found && !Number.isNaN(Number(found[1]))) {
        return Number(found[1]);
      }
    }
    return null;
  }

  quickTenders = computed(() => {
    const net = this.netAmount();
    if (net <= 0) {
      return [] as number[];
    }
    const rounded = Math.ceil(net / 5) * 5;
    const rounded10 = Math.ceil(net / 10) * 10;
    return [net, rounded, rounded10, net + 50, net + 100]
      .map((n) => Math.round(n * 100) / 100)
      .filter((n, i, arr) => n >= net && arr.indexOf(n) === i)
      .slice(0, 4);
  });

  productInitial(name?: string | null): string {
    return (name || '?').trim().slice(0, 1).toUpperCase();
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
    if (this.success() || this.needShiftOpen() || this.needCloseShift()) {
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
    if (event.key === 'F7') {
      event.preventDefault();
      this.openReturns();
      return;
    }
    if (event.key === 'F8') {
      event.preventDefault();
      this.toggleSuspended();
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
    this.catalog.set([]);
    this.device.set(null);
    this.shift.set(null);
    this.sessionReady.set(false);
    this.needShiftOpen.set(false);
    if (value == null) {
      this.stores.set([]);
      return;
    }
    this.loadStoresForBranch(value);
  }

  private loadStoresForBranch(branchId: number): void {
    this.storesService
      .getByBranch(branchId)
      .pipe(
        catchError(() =>
          this.storesService.getAll().pipe(
            map((all) => all.filter((s) => s.branchId == null || s.branchId === branchId)),
            catchError(() => of([] as StoreLookup[])),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (stores) => {
          const active = stores.filter((s) => s.status !== false);
          this.stores.set(active);
          const branch = this.branches().find((b) => b.branchId === branchId);
          const preferred =
            this.device()?.storeId ?? branch?.defaultWarehouseId ?? null;
          const pick =
            active.find((s) => s.storeId === preferred)?.storeId ??
            (active.length === 1 ? active[0].storeId : null);
          if (pick != null) {
            this.onStoreChange(pick);
          }
        },
        error: () => this.stores.set([]),
      });
  }

  onStoreChange(value: number | null): void {
    this.storeId.set(value);
    this.catalog.set([]);
    if (value == null || this.branchId() == null) {
      return;
    }
    this.prepareSession();
  }

  retrySession(): void {
    if (this.branchId() == null || this.storeId() == null) {
      return;
    }
    this.prepareSession();
  }

  openShift(): void {
    const cashier = this.cashier();
    const device = this.device();
    if (!cashier || !device) {
      this.errorMessage.set(this.language.translate('pos.sessionError'));
      return;
    }

    // Opening is always explicit: balance first, then this button.
    this.shiftBusy.set(true);
    this.errorMessage.set('');

    this.pos
      .openShift({
        cashierId: cashier.cashierId,
        deviceId: device.deviceId,
        openingBalance: this.openingBalance() || 0,
        branchId: this.branchId() ?? device.branchId,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (shift) => {
          this.pendingActiveShift.set(null);
          this.applyOpenedShift(shift, 'pos.shiftOpened');
        },
        error: (err) => {
          const message = extractApiErrorMessage(
            err,
            this.language.translate('pos.shiftOpenError'),
          );
          // If backend says a shift is already open, offer resume instead of failing silently.
          if (this.isActiveShiftConflict(message)) {
            this.resumeExistingShift();
            return;
          }
          this.shiftBusy.set(false);
          this.errorMessage.set(this.humanizeShiftOpenError(message));
        },
      });
  }

  /** User-clicked resume of a shift discovered at session prep. */
  resumePendingShift(): void {
    const pending = this.pendingActiveShift();
    if (!pending?.shiftId) {
      this.resumeExistingShift();
      return;
    }
    const current = this.device();
    if (current && pending.deviceId && current.deviceId !== pending.deviceId) {
      this.device.set({ ...current, deviceId: pending.deviceId });
    }
    this.pendingActiveShift.set(null);
    this.applyOpenedShift(pending, 'pos.shiftResumed');
  }

  private humanizeShiftOpenError(message: string): string {
    const m = (message || '').toLowerCase();
    if (
      m.includes('branchid') ||
      m.includes('branch_id') ||
      m.includes('branch id') ||
      (m.includes('null') && m.includes('branch')) ||
      m.includes('kan de waarde null niet invoegen') || // SQL Dutch locale from server
      m.includes('cannot insert the value null')
    ) {
      return this.language.translate('pos.shiftBranchIdError');
    }
    if (this.isActiveShiftConflict(message)) {
      return this.language.translate('pos.shiftAlreadyOpenHint');
    }
    return message;
  }

  private isActiveShiftConflict(message: string): boolean {
    const m = (message || '').toLowerCase();
    return (
      m.includes('نشطة') ||
      m.includes('نشيطة') ||
      m.includes('يوجد بالفعل') ||
      m.includes('already') ||
      m.includes('active shift') ||
      m.includes('active work')
    );
  }

  private resumeExistingShift(): void {
    const cashierId = this.cashier()?.cashierId;
    if (cashierId == null) {
      this.shiftBusy.set(false);
      this.errorMessage.set(this.language.translate('pos.shiftOpenError'));
      return;
    }
    this.pos
      .findActiveShift(cashierId, this.device()?.deviceId, {
        branchId: this.branchId(),
        storeId: this.storeId(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (found) => {
          if (!found) {
            this.shiftBusy.set(false);
            this.errorMessage.set(this.language.translate('pos.shiftOpenError'));
            return;
          }
          const current = this.device();
          if (current && current.deviceId !== found.deviceId) {
            this.device.set({ ...current, deviceId: found.deviceId });
          }
          this.applyOpenedShift(found.shift, 'pos.shiftResumed');
        },
        error: (err) => {
          this.shiftBusy.set(false);
          this.errorMessage.set(
            extractApiErrorMessage(err, this.language.translate('pos.shiftOpenError')),
          );
        },
      });
  }

  private applyOpenedShift(shift: PosShift, toastKey: string): void {
    this.shift.set(shift);
    this.pendingActiveShift.set(null);
    this.needShiftOpen.set(false);
    this.shiftBusy.set(false);
    this.sessionReady.set(true);
    this.errorMessage.set('');
    if (shift.deviceId) {
      this.pos.rememberDeviceId(shift.deviceId);
    }
    this.loadCatalog();
    this.refreshSuspended();
    this.toastMessage.set(this.language.translate(toastKey));
    setTimeout(() => this.focusSearch(), 60);
  }

  requestCloseShift(): void {
    this.closingBalance.set(this.netAmount() || this.shift()?.openingBalance || 0);
    this.needCloseShift.set(true);
  }

  confirmCloseShift(): void {
    const shift = this.shift();
    if (!shift?.shiftId) {
      return;
    }
    this.shiftBusy.set(true);
    this.pos
      .closeShift(shift.shiftId, { closingBalance: this.closingBalance() || 0 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.shiftBusy.set(false);
          this.needCloseShift.set(false);
          this.shift.set(null);
          this.sessionReady.set(false);
          this.cart.set([]);
          this.needShiftOpen.set(true);
          this.toastMessage.set(this.language.translate('pos.shiftClosed'));
        },
        error: (err) => {
          this.shiftBusy.set(false);
          this.errorMessage.set(
            extractApiErrorMessage(err, this.language.translate('pos.shiftCloseError')),
          );
        },
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
    if (!this.canOperate()) {
      this.errorMessage.set(this.language.translate('pos.shiftRequired'));
      return;
    }
    this.scanning.set(true);
    this.errorMessage.set('');
    try {
      const tile = await this.lookupBarcode(raw);
      if (tile) {
        await this.addTile(tile);
        this.searchQuery.set('');
        this.focusSearch();
        return;
      }

      const matches = this.catalog().filter((x) => x.searchText.includes(raw.toLowerCase()));
      if (matches.length === 1) {
        await this.addTile(matches[0].tile);
        this.searchQuery.set('');
        this.focusSearch();
        return;
      }

      this.errorMessage.set(this.language.translate('pos.barcodeNotFound'));
    } finally {
      this.scanning.set(false);
    }
  }

  async addProduct(productId: number): Promise<void> {
    const item = this.catalog().find((x) => x.tile.productId === productId);
    if (!item) {
      this.errorMessage.set(this.language.translate('pos.productNotFound'));
      return;
    }
    await this.addTile(item.tile);
  }

  async addTile(tile: PosProductTile): Promise<void> {
    if (!this.canOperate()) {
      this.errorMessage.set(this.language.translate('pos.shiftRequired'));
      return;
    }
    if (!tile?.productId || !tile.saleUnitId) {
      this.errorMessage.set(this.language.translate('pos.productNotFound'));
      return;
    }

    const batch = await this.pickBatchIfNeeded(tile.productId);
    if (batch === false) {
      return; // user cancelled / no usable batch
    }

    const key = batch
      ? `${tile.productId}-${tile.saleUnitId}-${batch.batchNumber || 'nobatch'}`
      : `${tile.productId}-${tile.saleUnitId}`;
    const existing = this.cart().find((l) => l.key === key);
    if (existing) {
      this.updateQty(key, existing.qty + 1);
      return;
    }

    const taxRate = await this.ensureTax(tile.productId);
    let price = Number(tile.salePrice ?? 0);
    if (!price && this.branchId() != null) {
      try {
        price = await this.fetchPrice(tile.productId, tile.saleUnitId);
      } catch {
        price = 0;
      }
    }

    let stockQty = tile.stockQty;
    try {
      stockQty = await this.fetchStock(tile.productId, tile.saleUnitId, batch);
    } catch {
      // keep tile stock
    }
    if (stockQty != null && stockQty <= 0) {
      this.errorMessage.set(this.language.translate('pos.outOfStock'));
      return;
    }

    this.cart.update((lines) => [
      ...lines,
      {
        key,
        productId: tile.productId,
        productName: tile.productName || `#${tile.productId}`,
        unitId: tile.saleUnitId,
        unitName: tile.saleUnitName,
        qty: 1,
        unitPrice: price,
        taxRate,
        discountAmount: 0,
        stockQty,
        batchNumber: batch?.batchNumber ?? null,
        expiryDate: batch?.expiryDate ?? null,
      },
    ]);
  }

  updateQty(key: string, qty: number): void {
    const next = Math.max(0, Math.round(qty * 1000) / 1000);
    if (next <= 0) {
      this.removeLine(key);
      return;
    }
    const line = this.cart().find((l) => l.key === key);
    if (line?.stockQty != null && next > line.stockQty) {
      this.errorMessage.set(this.language.translate('pos.stockExceeded'));
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
    this.focusSearch();
  }

  openPayment(): void {
    this.errorMessage.set('');
    if (!this.cart().length) {
      return;
    }
    if (!this.canOperate()) {
      this.errorMessage.set(this.language.translate('pos.shiftRequired'));
      return;
    }
    if (this.paymentTypeId() == null && this.paymentTypes().length) {
      this.paymentTypeId.set(this.paymentTypes()[0].paymentTypeId);
    }
    this.amountPaid.set(this.netAmount());
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
    if (!this.canHold()) {
      this.errorMessage.set(this.language.translate('pos.permissionDenied'));
      return;
    }
    this.submitOrder(PosOrderStatus.Suspended);
  }

  confirmPay(): void {
    this.submitOrder(PosOrderStatus.Paid);
  }

  toggleSuspended(): void {
    if (!this.canHold()) {
      this.errorMessage.set(this.language.translate('pos.permissionDenied'));
      return;
    }
    const next = !this.showSuspended();
    this.showSuspended.set(next);
    if (next) {
      this.refreshSuspended();
    }
  }

  openReturns(): void {
    if (!this.canOperate()) {
      this.errorMessage.set(this.language.translate('pos.shiftRequired'));
      return;
    }
    if (!this.canReturn()) {
      this.errorMessage.set(this.language.translate('pos.permissionDenied'));
      return;
    }
    this.showReturns.set(true);
    this.returnOrder.set(null);
    this.returnQtys.set({});
    this.returnReason.set('');
    this.searchPaidOrders();
  }

  closeReturns(): void {
    if (this.returnBusy()) {
      return;
    }
    this.showReturns.set(false);
    this.returnOrder.set(null);
    this.paidOrders.set([]);
  }

  searchPaidOrders(): void {
    this.returnBusy.set(true);
    this.errorMessage.set('');
    this.pos
      .getPaid(this.returnSearch().trim() || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.paidOrders.set(list || []);
          this.returnBusy.set(false);
        },
        error: (err) => {
          this.returnBusy.set(false);
          this.errorMessage.set(
            extractApiErrorMessage(err, this.language.translate('pos.returnSearchError')),
          );
        },
      });
  }

  selectReturnOrder(item: PosOrderListItem): void {
    this.returnBusy.set(true);
    this.pos
      .getOrder(item.posOrderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          this.returnOrder.set(order);
          const qtys: Record<string, number> = {};
          for (const line of this.returnLines()) {
            qtys[line.key] = 0;
          }
          // recompute after signal set — use order items directly
          for (const [idx, it] of (order.items || []).entries()) {
            const productId = Number(it.productId ?? it.pro_ID ?? 0);
            const unitId = Number(it.unitId);
            qtys[`${productId}-${unitId}-${idx}`] = 0;
          }
          this.returnQtys.set(qtys);
          this.returnBusy.set(false);
        },
        error: (err) => {
          this.returnBusy.set(false);
          this.errorMessage.set(
            extractApiErrorMessage(err, this.language.translate('pos.returnLoadError')),
          );
        },
      });
  }

  setReturnQty(key: string, qty: number, max: number): void {
    const next = Math.max(0, Math.min(max, Number(qty) || 0));
    this.returnQtys.update((m) => ({ ...m, [key]: next }));
  }

  submitReturn(): void {
    const order = this.returnOrder();
    if (!order?.posOrderId) {
      return;
    }
    const items = this.returnLines()
      .map((line) => ({
        productId: line.productId,
        unitId: line.unitId,
        returnQty: Number(this.returnQtys()[line.key] || 0),
        reason: this.returnReason().trim() || null,
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

    this.returnBusy.set(true);
    this.errorMessage.set('');
    this.pos
      .createReturn(body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.returnBusy.set(false);
          this.showReturns.set(false);
          this.returnOrder.set(null);
          this.toastMessage.set(
            res?.message ||
              this.language.translate('pos.returnSuccess') +
                (res?.returnOrderId ? ` #${res.returnOrderId}` : ''),
          );
        },
        error: (err) => {
          this.returnBusy.set(false);
          this.errorMessage.set(
            extractApiErrorMessage(err, this.language.translate('pos.returnError')),
          );
        },
      });
  }

  resumeSuspended(order: PosOrderHeader): void {
    if (this.cart().length && !confirm(this.language.translate('pos.resumeReplaceConfirm'))) {
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    this.pos
      .resumeOrder(order.posOrderId)
      .pipe(
        switchMap((header) => this.pos.getOrder(header.posOrderId || order.posOrderId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (full) => {
          this.saving.set(false);
          this.applyOrderToCart(full);
          this.showSuspended.set(false);
          this.toastMessage.set(this.language.translate('pos.resumeSuccess'));
          this.refreshSuspended();
          this.focusSearch();
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(
            extractApiErrorMessage(err, this.language.translate('pos.resumeError')),
          );
        },
      });
  }

  deleteSuspended(order: PosOrderHeader): void {
    if (!confirm(this.language.translate('pos.deleteSuspendedConfirm'))) {
      return;
    }
    this.pos
      .deleteOrder(order.posOrderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastMessage.set(this.language.translate('pos.deleteSuspendedSuccess'));
          this.refreshSuspended();
        },
        error: (err) => {
          this.errorMessage.set(
            extractApiErrorMessage(err, this.language.translate('pos.deleteSuspendedError')),
          );
        },
      });
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
    const base = Math.max(0, line.qty * line.unitPrice - (line.discountAmount || 0));
    return base + base * ((line.taxRate || 0) / 100);
  }

  trackLine(_: number, line: PosCartLine): string {
    return line.key;
  }

  trackProduct(_: number, item: PosCatalogItem): number {
    return item.tile.productId;
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
      paymentTypes: this.paymentTypesService
        .getAll()
        .pipe(catchError(() => of([] as PaymentType[]))),
      currency: this.currenciesService.getBase().pipe(catchError(() => of(null as Currency | null))),
      cashier: this.pos.getCurrentCashier().pipe(catchError(() => of(null as PosCashier | null))),
      permissions: this.pos.getUserPermissions(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ branches, customers, paymentTypes, currency, cashier, permissions }) => {
          const activeBranches = branches.filter((b) => b.isActive !== false);
          this.branches.set(activeBranches);
          this.customers.set(customers.filter((c) => c.isActive !== false));
          this.paymentTypes.set(paymentTypes);
          this.currency.set(currency);
          this.cashier.set(cashier);
          this.permissions.set(permissions || {});

          if (paymentTypes.length) {
            this.paymentTypeId.set(paymentTypes[0].paymentTypeId);
          }

          // Lookups must load even if cashier is missing — otherwise branch/store stay empty.
          if (!cashier?.cashierId) {
            this.errorMessage.set(this.language.translate('pos.cashierRequired'));
          }

          const user = this.auth.user();
          const defaultBranch =
            user?.defaultBranchId ??
            user?.branches?.find((b) => b.isDefault)?.branchId ??
            activeBranches[0]?.branchId ??
            null;
          this.branchId.set(defaultBranch);
          this.loading.set(false);

          if (defaultBranch != null) {
            this.onBranchChange(defaultBranch);
          }
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set(this.language.translate('pos.loadError'));
        },
      });
  }

  private prepareSession(): void {
    const branchId = this.branchId();
    const storeId = this.storeId();
    const cashier = this.cashier();
    if (branchId == null || storeId == null) {
      return;
    }
    if (!cashier?.cashierId) {
      this.sessionReady.set(false);
      this.needShiftOpen.set(false);
      this.shiftBusy.set(false);
      this.errorMessage.set(this.language.translate('pos.cashierRequired'));
      return;
    }

    const gen = ++this.sessionGen;
    this.sessionReady.set(false);
    this.needShiftOpen.set(false);
    this.shiftBusy.set(true);
    this.errorMessage.set('');

    this.pos
      .ensureDevice(branchId, storeId)
      .pipe(
        tap((device) => {
          if (gen === this.sessionGen) {
            this.device.set(device);
            this.pos.rememberDeviceId(device.deviceId);
          }
        }),
        switchMap((device) =>
          this.pos
            .findActiveShift(cashier.cashierId, device.deviceId, { branchId, storeId })
            .pipe(
              switchMap((found) =>
                forkJoin({
                  device: of(
                    found && found.deviceId !== device.deviceId
                      ? { ...device, deviceId: found.deviceId }
                      : device,
                  ),
                  shift: of(found?.shift ?? null),
                  settings: this.pos.getSettings(branchId, device.deviceId).pipe(
                    catchError(() => of({} as Record<string, string>)),
                  ),
                }),
              ),
            ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ device, shift, settings }) => {
          if (gen !== this.sessionGen) {
            return;
          }
          this.device.set(device);
          this.settings.set(settings || {});
          this.shiftBusy.set(false);
          this.sessionReady.set(false);
          this.shift.set(null);
          this.errorMessage.set('');
          // Never auto-open/resume — user must confirm in the modal.
          this.pendingActiveShift.set(isPosShiftOpen(shift) ? shift : null);
          this.needShiftOpen.set(true);
          if (!this.openingBalance()) {
            this.openingBalance.set(0);
          }
        },
        error: (err) => {
          if (gen !== this.sessionGen) {
            return;
          }
          this.shiftBusy.set(false);
          this.sessionReady.set(false);
          this.needShiftOpen.set(false);
          this.device.set(null);
          this.shift.set(null);
          this.errorMessage.set(
            extractApiErrorMessage(err, this.language.translate('pos.deviceRegisterError')),
          );
        },
      });
  }

  private loadCatalog(): void {
    const branchId = this.branchId();
    const storeId = this.storeId();
    if (branchId == null || storeId == null) {
      return;
    }
    this.catalogLoading.set(true);
    this.pos
      .getProducts({ branchId, storeId })
      .pipe(
        finalize(() => this.catalogLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (tiles) => {
          this.catalog.set(
            (tiles || []).map((tile) => ({
              tile,
              searchText: [tile.productName, String(tile.productId)]
                .filter(Boolean)
                .join(' ')
                .toLowerCase(),
            })),
          );
        },
        error: (err) => {
          this.catalog.set([]);
          this.errorMessage.set(
            extractApiErrorMessage(err, this.language.translate('pos.catalogError')),
          );
        },
      });
  }

  private refreshSuspended(): void {
    const shiftId = this.shift()?.shiftId;
    this.pos
      .getSuspended(shiftId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this.suspended.set(list || []),
        error: () => this.suspended.set([]),
      });
  }

  private lookupBarcode(barcode: string): Promise<PosProductTile | null> {
    return new Promise((resolve) => {
      this.pos
        .lookupBarcode(barcode, {
          storeId: this.storeId() ?? undefined,
          branchId: this.branchId() ?? undefined,
        })
        .subscribe({
          next: (tile) => resolve(tile),
          error: () => resolve(null),
        });
    });
  }

  private ensureTax(productId: number): Promise<number> {
    const cached = this.taxCache.get(productId);
    if (cached != null) {
      return Promise.resolve(cached);
    }
    return new Promise((resolve) => {
      this.pos.getTax(productId).subscribe({
        next: (info) => {
          const rate = Number(info?.taxRate ?? 0);
          this.taxCache.set(productId, rate);
          resolve(rate);
        },
        error: () => {
          this.taxCache.set(productId, 0);
          resolve(0);
        },
      });
    });
  }

  private fetchPrice(productId: number, unitId: number): Promise<number> {
    return new Promise((resolve, reject) => {
      this.pos.getPrice(productId, unitId, this.branchId() ?? undefined).subscribe({
        next: (price) => resolve(Number(price) || 0),
        error: (err) => reject(err),
      });
    });
  }

  private fetchStock(
    productId: number,
    unitId: number,
    batch?: ProductBatch | null,
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      this.pos
        .getStock(productId, {
          storeId: this.storeId() ?? undefined,
          unitId,
          batchNumber: batch?.batchNumber ?? undefined,
          expiryDate: batch?.expiryDate ?? undefined,
        })
        .subscribe({
          next: (qty) => resolve(Number(qty) || 0),
          error: (err) => reject(err),
        });
    });
  }

  /** Returns batch, null if none needed, false if cancelled. */
  private pickBatchIfNeeded(productId: number): Promise<ProductBatch | null | false> {
    return new Promise((resolve) => {
      this.pos.getBatches(productId, this.storeId() ?? undefined).subscribe({
        next: (batches) => {
          const usable = (batches || []).filter((b) => (b.availableQty ?? 0) > 0);
          if (!usable.length) {
            resolve(null);
            return;
          }
          if (usable.length === 1) {
            resolve(usable[0]);
            return;
          }
          const labels = usable
            .map(
              (b, i) =>
                `${i + 1}) ${b.batchNumber || '—'} · ${b.availableQty ?? 0}` +
                (b.expiryDate ? ` · ${String(b.expiryDate).slice(0, 10)}` : ''),
            )
            .join('\n');
          const pick = prompt(
            `${this.language.translate('pos.selectBatch')}\n${labels}`,
            '1',
          );
          if (pick == null) {
            resolve(false);
            return;
          }
          const idx = Math.max(1, Number(pick) || 1) - 1;
          resolve(usable[idx] || usable[0]);
        },
        error: () => resolve(null),
      });
    });
  }

  private applyOrderToCart(order: PosOrderHeader): void {
    const lines: PosCartLine[] = (order.items || []).map((item, idx) => {
      const productId = Number(item.productId ?? item.pro_ID ?? 0);
      const unitId = Number(item.unitId);
      return {
        key: `${productId}-${unitId}-${idx}`,
        productId,
        productName: `#${productId}`,
        unitId,
        unitName: null,
        qty: Number(item.qty) || 0,
        unitPrice: Number(item.price) || 0,
        taxRate: 0,
        discountAmount: Number(item.discountAmount) || 0,
      };
    });

    // Enrich names from catalog when available
    this.cart.set(
      lines.map((line) => {
        const hit = this.catalog().find((c) => c.tile.productId === line.productId);
        if (!hit) {
          return line;
        }
        return {
          ...line,
          productName: hit.tile.productName || line.productName,
          unitName: hit.tile.saleUnitName || line.unitName,
        };
      }),
    );
    this.discountAmount.set(Number(order.discountAmount) || 0);
    if (order.customerId != null) {
      this.customerId.set(order.customerId);
    }
  }

  private submitOrder(status: typeof PosOrderStatus.Paid | typeof PosOrderStatus.Suspended): void {
    if (this.saving() || !this.cart().length) {
      return;
    }

    const branchId = this.branchId();
    const storeId = this.storeId();
    const cashier = this.cashier();
    const device = this.device();
    const shift = this.shift();
    const currency = this.currency();

    if (branchId == null || storeId == null) {
      this.errorMessage.set(this.language.translate('pos.storeRequired'));
      return;
    }
    if (!cashier || !device || !shift?.shiftId) {
      this.errorMessage.set(this.language.translate('pos.shiftRequired'));
      return;
    }
    if (!currency?.id) {
      this.errorMessage.set(this.language.translate('pos.currencyRequired'));
      return;
    }

    const isPaid = status === PosOrderStatus.Paid;
    const net = this.netAmount();
    let paid = isPaid ? Number(this.amountPaid()) || 0 : 0;

    if (isPaid) {
      if (this.paymentTypeId() == null) {
        this.errorMessage.set(this.language.translate('pos.paymentRequired'));
        return;
      }
      if (paid < net - 0.001) {
        this.errorMessage.set(this.language.translate('pos.payAmountInvalid'));
        return;
      }
    }

    if (!this.canDiscount()) {
      const hasLineDiscount = this.cart().some((l) => (l.discountAmount || 0) > 0);
      if (this.discountAmount() > 0 || hasLineDiscount) {
        this.errorMessage.set(this.language.translate('pos.permissionDenied'));
        return;
      }
    }

    if (!isPaid && !this.canHold()) {
      this.errorMessage.set(this.language.translate('pos.permissionDenied'));
      return;
    }

    const paymentTypeId = this.paymentTypeId()!;
    const exchangeRate = Number(currency.valuesCurr ?? 1) || 1;
    const paymentCategoryId =
      this.settingNumber('paymentCategoryId', 'PaymentCategoryId', 'defaultPaymentCategoryId') ??
      paymentTypeId;

    const payload: SavePosOrderRequest = {
      branchId,
      warehouseId: storeId,
      shiftId: shift.shiftId,
      cashierId: cashier.cashierId,
      deviceId: device.deviceId,
      orderDateTime: new Date().toISOString(),
      currencyId: currency.id,
      exchangeRate,
      status,
      customerId: this.customerId(),
      items: this.cart().map((l) => ({
        productId: l.productId,
        unitId: l.unitId,
        qty: l.qty,
        price: l.unitPrice,
        discountAmount: this.canDiscount() ? l.discountAmount || 0 : 0,
        batchNumber: l.batchNumber ?? null,
        expiryDate: l.expiryDate ?? null,
      })),
      payment: isPaid
        ? {
            paymentTypeId,
            paymentCategoryId,
            currencyId: currency.id,
            exchangeRate,
            paidAmount: paid,
          }
        : null,
    };

    this.saving.set(true);
    this.errorMessage.set('');

    this.pos
      .saveOrder(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          this.saving.set(false);
          this.payOpen.set(false);

          if (!isPaid) {
            this.toastMessage.set(this.language.translate('pos.holdSuccess'));
            this.cart.set([]);
            this.discountAmount.set(0);
            this.refreshSuspended();
            this.focusSearch();
            return;
          }

          this.success.set({
            orderId: order.posOrderId,
            orderNo: `#${order.posOrderId}`,
            net: Number(order.totalAmount ?? net),
            paid,
            change: Math.max(0, paid - net),
          });
          this.cart.set([]);
          this.discountAmount.set(0);
          this.loadCatalog();
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
