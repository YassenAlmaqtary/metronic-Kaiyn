import { DatePipe, DecimalPipe, DOCUMENT } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';

import { AuthService } from '../../../core/api/auth.service';
import { Branch } from '../../../core/api/models/branch.models';
import { Currency } from '../../../core/api/models/currency.models';
import { Customer } from '../../../core/api/models/customer.models';
import { PaymentType } from '../../../core/api/models/payment-type.models';
import {
  PosOrderHeader,
  PosOrderListItem,
  PosOrderStatus,
  PosCashier,
  PosDevice,
  PosProductTile,
  PosShift,
  ProductBatch,
  ProductTaxInfo,
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
import { ProductGroupsService } from '../../../core/services/product-groups.service';
import { StoresService } from '../../../core/services/stores.service';
import { ProductGroup } from '../../../core/api/models/product-group.models';
import { loadStylesheet } from '../../../core/utils/load-stylesheet';

// Set to true to re-enable API integration; false keeps all preview actions local.
const USE_POS_PREVIEW_API = false;

interface PreviewProduct {
  id: number;
  name: string;
  category: number | null;
  price: number;
  unitId: number;
  unit: string;
  stock: number | null;
  taxRate: number;
  taxInclusive: boolean;
  icon: string;
  batchNumber?: string | null;
  expiryDate?: string | null;
}

interface PreviewCategory {
  id: number;
  name: string;
  icon: string;
}

interface PreviewCartLine {
  product: PreviewProduct;
  quantity: number;
}

type PreviewDialog =
  | 'products'
  | 'payment'
  | 'suspended'
  | 'returns'
  | 'customers'
  | 'discount'
  | 'quantity'
  | 'print'
  | 'shift'
  | 'batches';

interface PreviewReturnLine {
  key: string;
  productId: number;
  unitId: number;
  name: string;
  soldQuantity: number;
  price: number;
}

@Component({
  selector: 'app-pos-terminal-preview',
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './pos-terminal-preview.component.html',
  styleUrl: './pos-terminal-preview.component.scss',
})
export class PosTerminalPreviewComponent implements OnInit {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly pos = inject(PosService);
  private readonly branchesService = inject(BranchesService);
  private readonly storesService = inject(StoresService);
  private readonly customersService = inject(CustomersService);
  private readonly paymentTypesService = inject(PaymentTypesService);
  private readonly currenciesService = inject(CurrenciesService);
  private readonly productGroupsService = inject(ProductGroupsService);
  readonly language = inject(LanguageService);

  readonly loading = signal(true);
  readonly catalogLoading = signal(false);
  readonly saving = signal(false);
  readonly returnBusy = signal(false);
  readonly shiftBusy = signal(false);
  readonly categories = signal<PreviewCategory[]>([]);
  readonly products = signal<PreviewProduct[]>([]);
  readonly branches = signal<Branch[]>([]);
  readonly stores = signal<StoreLookup[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly paymentTypes = signal<PaymentType[]>([]);
  readonly cashier = signal<PosCashier | null>(null);
  readonly device = signal<PosDevice | null>(null);
  readonly shift = signal<PosShift | null>(null);
  readonly pendingShift = signal<PosShift | null>(null);
  readonly currency = signal<Currency | null>(null);
  readonly settings = signal<Record<string, string>>({});
  readonly permissions = signal<Record<string, boolean>>({});
  readonly branchId = signal<number | null>(null);
  readonly storeId = signal<number | null>(null);
  readonly selectedCategory = signal<number | 'all'>('all');
  readonly search = signal('');
  readonly customer = signal<number | null>(null);
  readonly paymentTypeId = signal<number | null>(null);
  readonly openingBalance = signal(0);
  readonly cashReceived = signal('');
  readonly keypadFresh = signal(true);
  readonly dialog = signal<PreviewDialog | null>(null);
  readonly productSearch = signal('');
  readonly customerSearch = signal('');
  readonly returnSearch = signal('');
  readonly paidOrders = signal<PosOrderListItem[]>([]);
  readonly selectedReturnOrder = signal<PosOrderHeader | null>(null);
  readonly returnQuantities = signal<Record<string, number>>({});
  readonly returnAll = signal(true);
  readonly returnReason = signal('');
  readonly discountMode = signal<'percent' | 'amount'>('percent');
  readonly discountValue = signal(10);
  readonly discountActive = signal(false);
  readonly editingProductId = signal<number | null>(null);
  readonly printSettings = signal({ receipt: true, invoice: true, openDrawer: true });
  readonly message = signal('');
  readonly stylesheetError = signal(false);
  readonly suspendedSales = signal<PosOrderHeader[]>([]);
  readonly cart = signal<PreviewCartLine[]>([]);
  readonly currentDate = new Date();

  readonly filteredProducts = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    return this.products().filter(
      (product) =>
        (this.selectedCategory() === 'all' || product.category === this.selectedCategory()) &&
        (!query || `${product.name} ${product.id}`.toLocaleLowerCase().includes(query)),
    );
  });

  readonly searchedProducts = computed(() => {
    const query = this.productSearch().trim().toLocaleLowerCase();
    return this.products().filter(
      (product) =>
        !query ||
        `${product.name} ${product.id} ${this.categoryName(product.category)}`
          .toLocaleLowerCase()
          .includes(query),
    );
  });
  readonly searchedCustomers = computed(() => {
    const query = this.customerSearch().trim().toLocaleLowerCase();
    return this.customers().filter(
      (customer) =>
        !query ||
        `${this.customerName(customer)} ${customer.customerId} ${customer.phone ?? ''}`
          .toLocaleLowerCase()
          .includes(query),
    );
  });
  readonly searchedOrders = computed(() => {
    const query = this.returnSearch().trim().toLocaleLowerCase();
    return this.paidOrders().filter(
      (order) =>
        !query ||
        `${order.posOrderId} ${this.orderCustomerName(order)}`
          .toLocaleLowerCase().includes(query),
    );
  });
  readonly returnLines = computed<PreviewReturnLine[]>(() => {
    const items = this.selectedReturnOrder()?.items ?? [];
    return items.map((item, index) => {
      const productId = Number(item.productId ?? item.pro_ID ?? 0);
      const unitId = Number(item.unitId);
      const product = this.products().find((entry) => entry.id === productId);
      return {
        key: `${productId}-${unitId}-${index}`,
        productId,
        unitId,
        name: product?.name ?? `#${productId}`,
        soldQuantity: Number(item.qty) || 0,
        price: Number(item.price) || 0,
      };
    });
  });
  readonly selectedLine = computed(
    () => this.cart().find((line) => line.product.id === this.editingProductId()) ?? null,
  );
  readonly discountAmount = computed(() =>
    !this.discountActive()
      ? 0
      : this.discountMode() === 'percent'
        ? Math.min(this.subtotal(), this.subtotal() * (Math.max(0, this.discountValue()) / 100))
        : Math.min(this.subtotal(), Math.max(0, this.discountValue())),
  );
  readonly subtotal = computed(() =>
    this.cart().reduce((sum, line) => sum + line.product.price * line.quantity, 0),
  );
  readonly tax = computed(
    () =>
      Math.round(
        this.cart().reduce(
          (sum, line) => sum + this.lineTax(line),
          0,
        ) * 100,
      ) / 100,
  );
  readonly exclusiveTax = computed(() =>
    this.cart().reduce(
      (sum, line) => sum + (line.product.taxInclusive ? 0 : this.lineTax(line)),
      0,
    ),
  );
  readonly total = computed(
    () => Math.round((this.subtotal() - this.discountAmount() + this.exclusiveTax()) * 100) / 100,
  );
  readonly paid = computed(() => Number(this.cashReceived()) || 0);
  readonly remaining = computed(() => Math.max(0, this.total() - this.paid()));
  readonly change = computed(() => Math.max(0, this.paid() - this.total()));
  readonly selectedCustomerName = computed(() => {
    const id = this.customer();
    const customer = this.customers().find((item) => item.customerId === id);
    return customer ? this.customerName(customer) : this.language.translate('posPreview.customerCash');
  });

  productName(product: PreviewProduct): string {
    return product.name;
  }

  productUnit(product: PreviewProduct): string {
    return product.unit;
  }

  categoryName(id: number | null): string {
    return this.categories().find((item) => item.id === id)?.name ?? '';
  }

  customerName(customer: Customer): string {
    return this.language.isRtl()
      ? customer.customerName || customer.customerNameEn || String(customer.customerId)
      : customer.customerNameEn || customer.customerName || String(customer.customerId);
  }

  orderCustomerName(order: PosOrderListItem): string {
    const customer = this.customers().find((entry) => entry.customerId === order.customerId);
    return customer ? this.customerName(customer) : String(order.customerId ?? '');
  }

  orderDate(order: PosOrderListItem): string {
    return order.orderDateTime ?? '';
  }

  orderTotal(order: PosOrderListItem): number {
    return Number(order.totalAmount) || 0;
  }

  orderNumber(order: PosOrderListItem): number {
    return order.posOrderId;
  }

  today(): Date {
    return this.currentDate;
  }

  currencyLabel(): string {
    return (
      this.currency()?.currencyShorcut ||
      this.currency()?.currencyName ||
      this.language.translate('posPreview.currency')
    );
  }

  lineTax(line: PreviewCartLine): number {
    const gross = line.product.price * line.quantity;
    const taxable = Math.max(0, gross - this.lineDiscount(line));
    if (line.product.taxInclusive && line.product.taxRate > 0) {
      return taxable - taxable / (1 + line.product.taxRate / 100);
    }
    return taxable * (line.product.taxRate / 100);
  }

  private lineDiscount(line: PreviewCartLine): number {
    const subtotal = this.subtotal();
    return subtotal > 0
      ? (this.discountAmount() * line.product.price * line.quantity) / subtotal
      : 0;
  }

  paymentTypeIcon(paymentType: PaymentType): string {
    const name = (paymentType.paymentTypeName || '').toLocaleLowerCase();
    if (name.includes('cash') || name.includes('نقد')) {
      return 'ki-wallet';
    }
    if (name.includes('card') || name.includes('بطاق') || name.includes('مدى')) {
      return 'ki-card';
    }
    return 'ki-bank';
  }

  get canOperate(): boolean {
    return (
      !USE_POS_PREVIEW_API ||
      (!!this.shift()?.shiftId && this.branchId() != null && this.storeId() != null)
    );
  }

  ngOnInit(): void {
    void loadStylesheet(this.document, 'assets/css/pos-terminal-preview.css')
      .then(() => (USE_POS_PREVIEW_API ? this.bootstrap() : this.bootstrapMockData()))
      .catch((error: unknown) => {
        console.error('Failed to load POS terminal preview styles.', error);
        this.stylesheetError.set(true);
        this.loading.set(false);
      });
  }

  private bootstrapMockData(): void {
    const rtl = this.language.isRtl();
    const categoryNames = rtl
      ? ['سوا', 'موبايلي', 'زين', 'الأسر المنتجة', 'خضار وفواكه', 'مخبز', 'ألبان', 'بطاقات', 'مكسرات وبقوليات', 'أواني منزلية']
      : ['Sawa', 'Mobily', 'Zain', 'Home-made', 'Produce', 'Bakery', 'Dairy', 'Cards', 'Nuts & legumes', 'Homeware'];
    const categoryIcons = ['ki-phone', 'ki-phone', 'ki-phone', 'ki-home', 'ki-apple', 'ki-burger', 'ki-cup', 'ki-card', 'ki-package', 'ki-shop'];
    this.categories.set(
      categoryNames.map((name, index) => ({ id: index + 1, name, icon: categoryIcons[index] })),
    );

    const names: Array<[string, string, number, number, string, string]> = rtl
      ? [
          ['بطاقة شحن سوا 20', 'Sawa 20 Recharge Card', 8, 20, 'بطاقة', 'ki-card'],
          ['بطاقة شحن موبايلي 30', 'Mobily 30 Recharge Card', 8, 30, 'بطاقة', 'ki-card'],
          ['بطاقة شحن زين 20', 'Zain 20 Recharge Card', 8, 20, 'بطاقة', 'ki-card'],
          ['خبز بر', 'Brown Bread', 6, 4.5, 'قطعة', 'ki-burger'],
          ['حليب طازج 1 لتر', 'Fresh Milk 1L', 7, 7.5, 'عبوة', 'ki-cup'],
          ['تمر خلاص فاخر', 'Premium Khalas Dates', 4, 18, 'علبة', 'ki-package'],
          ['تفاح أحمر', 'Red Apples', 5, 9.95, 'كيلو', 'ki-apple'],
          ['مكسرات مشكلة', 'Mixed Nuts', 9, 24, 'عبوة', 'ki-package'],
          ['طقم أكواب', 'Cup Set', 10, 32, 'طقم', 'ki-shop'],
          ['بطاقة هدية 50', 'Gift Card 50', 8, 50, 'بطاقة', 'ki-card'],
        ]
      : [
          ['Sawa 20 Recharge Card', 'Sawa 20 Recharge Card', 8, 20, 'Card', 'ki-card'],
          ['Mobily 30 Recharge Card', 'Mobily 30 Recharge Card', 8, 30, 'Card', 'ki-card'],
          ['Zain 20 Recharge Card', 'Zain 20 Recharge Card', 8, 20, 'Card', 'ki-card'],
          ['Brown Bread', 'Brown Bread', 6, 4.5, 'Piece', 'ki-burger'],
          ['Fresh Milk 1L', 'Fresh Milk 1L', 7, 7.5, 'Bottle', 'ki-cup'],
          ['Premium Khalas Dates', 'Premium Khalas Dates', 4, 18, 'Box', 'ki-package'],
          ['Red Apples', 'Red Apples', 5, 9.95, 'Kg', 'ki-apple'],
          ['Mixed Nuts', 'Mixed Nuts', 9, 24, 'Pack', 'ki-package'],
          ['Cup Set', 'Cup Set', 10, 32, 'Set', 'ki-shop'],
          ['Gift Card 50', 'Gift Card 50', 8, 50, 'Card', 'ki-card'],
        ];
    this.products.set(
      names.map(([arName, enName, category, price, unit, icon], index) => ({
        id: 1001 + index,
        name: rtl ? arName : enName,
        category,
        price,
        unitId: 1,
        unit: unit,
        stock: 12 + index * 3,
        taxRate: 15,
        taxInclusive: true,
        icon,
      })),
    );

    this.branches.set([
      {
        id: 1,
        branchId: 1,
        branchName: rtl ? 'فرع الروضة' : 'Al Rawdah Branch',
        separateInventory: false,
        allowNegativeStock: false,
        useBranchPricing: false,
        useBranchVAT: false,
        isActive: true,
        defaultWarehouseId: 1,
      },
    ]);
    this.stores.set([
      {
        storeId: 1,
        storeName: rtl ? 'المخزن الرئيسي' : 'Main Store',
        status: true,
        branchId: 1,
      },
    ]);
    this.branchId.set(1);
    this.storeId.set(1);
    this.cashier.set({
      cashierId: 1001,
      userId: 1,
      userName: rtl ? 'مدير النظام' : 'Administrator',
    });
    this.device.set({ deviceId: 1, deviceName: 'Preview POS', branchId: 1, storeId: 1 });
    this.shift.set({ shiftId: 970, cashierId: 1001, deviceId: 1, branchId: 1, status: 'Open' });
    this.currency.set({
      id: 1,
      currencyName: rtl ? 'ريال سعودي' : 'Saudi Riyal',
      currencyShorcut: rtl ? 'ر.س' : 'SAR',
      valuesCurr: 1,
      isBaseCurrency: true,
    });
    this.customers.set([
      { customerId: 1005, customerName: rtl ? 'عميل نقدي' : 'Walk-in Customer', customerNameEn: 'Walk-in Customer', phone: '', isActive: true },
      { customerId: 1006, customerName: rtl ? 'أحمد محمد' : 'Ahmed Mohammed', customerNameEn: 'Ahmed Mohammed', phone: '0501234567', isActive: true },
      { customerId: 1007, customerName: rtl ? 'سارة علي' : 'Sara Ali', customerNameEn: 'Sara Ali', phone: '0557654321', isActive: true },
    ]);
    this.paymentTypes.set([
      { paymentTypeId: 1, paymentTypeName: rtl ? 'نقدي' : 'Cash' },
      { paymentTypeId: 2, paymentTypeName: rtl ? 'بطاقة' : 'Card' },
      { paymentTypeId: 3, paymentTypeName: rtl ? 'تحويل' : 'Transfer' },
    ]);
    this.paymentTypeId.set(1);
    this.permissions.set({ AllowDiscount: true, AllowHold: true, AllowReturn: true });
    this.settings.set({});
    const suspendedProduct = this.products()[5];
    this.suspendedSales.set([
      {
        posOrderId: 97065,
        branchId: 1,
        warehouseId: 1,
        shiftId: 970,
        cashierId: 1001,
        deviceId: 1,
        orderDateTime: new Date().toISOString(),
        currencyId: 1,
        status: PosOrderStatus.Suspended,
        totalAmount: suspendedProduct.price * 2,
        customerId: 1006,
        items: [
          {
            productId: suspendedProduct.id,
            unitId: suspendedProduct.unitId,
            qty: 2,
            price: suspendedProduct.price,
          },
        ],
      },
    ]);
    this.paidOrders.set([
      {
        posOrderId: 97066,
        orderDateTime: new Date().toISOString(),
        status: PosOrderStatus.Paid,
        totalAmount: 63.5,
        customerId: 1006,
      },
    ]);
    this.cart.set([
      { product: this.products()[3], quantity: 2 },
      { product: this.products()[4], quantity: 1 },
    ]);
    this.customer.set(1005);
    this.cashReceived.set('20');
    this.loading.set(false);
    this.dialog.set(null);
  }

  private bootstrap(): void {
    this.loading.set(true);
    forkJoin({
      branches: this.branchesService.getAll(),
      customers: this.customersService.getAll(),
      paymentTypes: this.paymentTypesService.getAll(),
      currency: this.currenciesService.getBase(),
      cashier: this.pos.getCurrentCashier(),
      groups: this.productGroupsService.getAll(),
      permissions: this.pos.getUserPermissions(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ branches, customers, paymentTypes, currency, cashier, groups, permissions }) => {
          const activeBranches = branches.filter((branch) => branch.isActive !== false);
          this.branches.set(activeBranches);
          this.customers.set(customers.filter((customer) => customer.isActive !== false));
          this.paymentTypes.set(paymentTypes);
          this.paymentTypeId.set(paymentTypes[0]?.paymentTypeId ?? null);
          this.currency.set(currency);
          this.cashier.set(cashier);
          this.permissions.set(permissions ?? {});
          this.categories.set(
            groups
              .filter((group) => group.status !== false)
              .map((group) => ({
                id: group.groupId,
                name: group.groupName || String(group.groupId),
                icon: this.groupIcon(group),
              })),
          );
          this.loading.set(false);

          const user = this.auth.user();
          const branchId =
            user?.defaultBranchId ??
            user?.branches?.find((branch) => branch.isDefault)?.branchId ??
            activeBranches[0]?.branchId ??
            null;
          if (branchId == null) {
            this.message.set(this.language.translate('posPreview.noBranches'));
            return;
          }
          this.onBranchChange(branchId);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.message.set(
            extractApiErrorMessage(error, this.language.translate('posPreview.apiLoadFailed')),
          );
        },
      });
  }

  private groupIcon(group: ProductGroup): string {
    const icons = ['ki-package', 'ki-shop', 'ki-apple', 'ki-burger', 'ki-cup', 'ki-card'];
    return icons[Math.abs(group.groupId) % icons.length] ?? 'ki-package';
  }

  onBranchChange(branchId: number | null): void {
    if (!USE_POS_PREVIEW_API) {
      this.branchId.set(branchId);
      this.storeId.set(this.stores()[0]?.storeId ?? null);
      return;
    }
    this.branchId.set(branchId);
    this.storeId.set(null);
    this.stores.set([]);
    this.device.set(null);
    this.shift.set(null);
    this.pendingShift.set(null);
    this.products.set([]);
    this.cart.set([]);
    if (branchId == null) {
      return;
    }

    this.storesService
      .getByBranch(branchId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stores) => {
          const activeStores = stores.filter((store) => store.status !== false);
          this.stores.set(activeStores);
          const branch = this.branches().find((item) => item.branchId === branchId);
          const preferredStoreId = branch?.defaultWarehouseId ?? null;
          const selectedStoreId =
            activeStores.find((store) => store.storeId === preferredStoreId)?.storeId ??
            (activeStores.length === 1 ? activeStores[0].storeId : null);
          if (selectedStoreId != null) {
            this.onStoreChange(selectedStoreId);
          } else if (!activeStores.length) {
            this.message.set(this.language.translate('posPreview.noStores'));
          }
        },
        error: (error: unknown) => {
          this.message.set(
            extractApiErrorMessage(error, this.language.translate('posPreview.storesLoadFailed')),
          );
        },
      });
  }

  onStoreChange(storeId: number | null): void {
    if (!USE_POS_PREVIEW_API) {
      this.storeId.set(storeId);
      return;
    }
    this.storeId.set(storeId);
    this.device.set(null);
    this.shift.set(null);
    this.pendingShift.set(null);
    this.products.set([]);
    this.cart.set([]);
    if (storeId != null) {
      this.prepareSession();
    }
  }

  private prepareSession(): void {
    if (!USE_POS_PREVIEW_API) {
      return;
    }
    const branchId = this.branchId();
    const storeId = this.storeId();
    const cashier = this.cashier();
    if (branchId == null || storeId == null || !cashier?.cashierId) {
      this.message.set(this.language.translate('posPreview.sessionContextRequired'));
      return;
    }

    this.shiftBusy.set(true);
    this.pos
      .ensureDevice(branchId, storeId)
      .pipe(
        switchMap((device) =>
          this.pos
            .findActiveShift(cashier.cashierId, device.deviceId, { branchId, storeId })
            .pipe(
              switchMap((found) =>
                this.pos.getSettings(branchId, device.deviceId).pipe(
                  catchError(() => of({} as Record<string, string>)),
                  switchMap((settings) =>
                    of({ device, shift: found?.shift ?? null, settings }),
                  ),
                ),
              ),
            ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ device, shift, settings }) => {
          this.shiftBusy.set(false);
          this.device.set(device);
          this.settings.set(settings);
          this.pendingShift.set(isPosShiftOpen(shift) ? shift : null);
          this.dialog.set('shift');
        },
        error: (error: unknown) => {
          this.shiftBusy.set(false);
          this.message.set(
            extractApiErrorMessage(error, this.language.translate('posPreview.sessionFailed')),
          );
        },
      });
  }

  openShift(): void {
    const cashier = this.cashier();
    const device = this.device();
    const branchId = this.branchId();
    if (!cashier?.cashierId || !device?.deviceId || branchId == null) {
      this.message.set(this.language.translate('posPreview.sessionContextRequired'));
      return;
    }
    this.shiftBusy.set(true);
    this.pos
      .openShift({
        cashierId: cashier.cashierId,
        deviceId: device.deviceId,
        branchId,
        openingBalance: Number(this.openingBalance()) || 0,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (shift) => this.activateShift(shift),
        error: (error: unknown) => {
          this.shiftBusy.set(false);
          this.message.set(
            extractApiErrorMessage(error, this.language.translate('posPreview.shiftOpenFailed')),
          );
        },
      });
  }

  resumeShift(): void {
    const shift = this.pendingShift();
    if (!shift?.shiftId) {
      return;
    }
    this.activateShift(shift);
  }

  private activateShift(shift: PosShift): void {
    this.shift.set(shift);
    this.pendingShift.set(null);
    if (shift.deviceId) {
      this.pos.rememberDeviceId(shift.deviceId);
    }
    this.shiftBusy.set(false);
    this.dialog.set(null);
    this.message.set('');
    this.loadCatalog();
    this.refreshSuspended();
  }

  selectCategory(categoryId: number | 'all'): void {
    this.selectedCategory.set(categoryId);
    this.search.set('');
    this.loadCatalog(categoryId === 'all' ? undefined : categoryId);
  }

  private loadCatalog(groupId?: number): void {
    if (!USE_POS_PREVIEW_API) {
      this.catalogLoading.set(false);
      return;
    }
    const branchId = this.branchId();
    const storeId = this.storeId();
    if (branchId == null || storeId == null || !this.canOperate) {
      return;
    }
    this.catalogLoading.set(true);
    this.pos
      .getProducts({ branchId, storeId, groupId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tiles) => {
          this.products.set(
            tiles.map((tile) => this.mapProductTile(tile, groupId ?? null)),
          );
          this.catalogLoading.set(false);
        },
        error: (error: unknown) => {
          this.products.set([]);
          this.catalogLoading.set(false);
          this.message.set(
            extractApiErrorMessage(error, this.language.translate('posPreview.catalogLoadFailed')),
          );
        },
      });
  }

  private mapProductTile(tile: PosProductTile, groupId: number | null): PreviewProduct {
    const icons = ['ki-package', 'ki-coffee', 'ki-apple', 'ki-cup', 'ki-card', 'ki-shop'];
    return {
      id: tile.productId,
      name: tile.productName || `#${tile.productId}`,
      category: groupId,
      price: Number(tile.salePrice) || 0,
      unitId: tile.saleUnitId,
      unit: tile.saleUnitName || '',
      stock: tile.stockQty ?? null,
      taxRate: 0,
      taxInclusive: false,
      icon: icons[Math.abs(tile.productId) % icons.length] ?? 'ki-package',
    };
  }

  lookupBarcode(): void {
    if (!USE_POS_PREVIEW_API) {
      const barcode = this.search().trim().toLocaleLowerCase();
      const product = this.products().find(
        (item) => String(item.id) === barcode || item.name.toLocaleLowerCase().includes(barcode),
      );
      if (product) {
        this.addProduct(product);
        this.search.set('');
      } else if (barcode) {
        this.message.set(this.language.translate('posPreview.barcodeNotFound'));
      }
      return;
    }
    const barcode = this.search().trim();
    if (!this.canOperate) {
      this.message.set(this.language.translate('posPreview.shiftRequired'));
      return;
    }
    if (!barcode) {
      return;
    }
    this.pos
      .lookupBarcode(barcode, {
        storeId: this.storeId() ?? undefined,
        branchId: this.branchId() ?? undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tile) => {
          if (!tile) {
            this.message.set(this.language.translate('posPreview.barcodeNotFound'));
            return;
          }
          this.addProduct(this.mapProductTile(tile, null));
          this.search.set('');
        },
        error: (error: unknown) => {
          this.message.set(
            extractApiErrorMessage(error, this.language.translate('posPreview.barcodeLookupFailed')),
          );
        },
      });
  }

  private refreshSuspended(): void {
    if (!USE_POS_PREVIEW_API) {
      return;
    }
    this.pos
      .getSuspended(this.shift()?.shiftId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orders) => this.suspendedSales.set(orders),
        error: (error: unknown) => {
          this.message.set(
            extractApiErrorMessage(error, this.language.translate('posPreview.suspendedLoadFailed')),
          );
        },
      });
  }

  private loadPaidOrders(): void {
    if (!USE_POS_PREVIEW_API) {
      return;
    }
    this.returnBusy.set(true);
    this.pos
      .getPaid(this.returnSearch().trim() || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orders) => {
          this.paidOrders.set(orders);
          this.returnBusy.set(false);
        },
        error: (error: unknown) => {
          this.returnBusy.set(false);
          this.message.set(
            extractApiErrorMessage(error, this.language.translate('posPreview.paidOrdersLoadFailed')),
          );
        },
      });
  }

  private mapOrderToCart(order: PosOrderHeader): void {
    const lines: PreviewCartLine[] = (order.items ?? []).map((item) => {
      const productId = Number(item.productId ?? item.pro_ID ?? 0);
      const unitId = Number(item.unitId);
      const product =
        this.products().find((entry) => entry.id === productId) ??
        this.mapProductTile(
          {
            productId,
            productName: `#${productId}`,
            saleUnitId: unitId,
            salePrice: Number(item.price) || 0,
          },
          null,
        );
      return {
        product: {
          ...product,
          unitId,
          price: Number(item.price) || product.price,
          taxRate: Number(item.taxAmount) && Number(item.lineTotal)
            ? (Number(item.taxAmount) / Math.max(0.01, Number(item.lineTotal) - Number(item.taxAmount))) * 100
            : product.taxRate,
          batchNumber: item.batchNumber ?? null,
          expiryDate: item.expiryDate ?? null,
        },
        quantity: Number(item.qty) || 0,
      };
    });
    this.cart.set(lines);
    this.discountValue.set(Number(order.discountAmount) || 0);
    this.discountMode.set('amount');
    this.discountActive.set((Number(order.discountAmount) || 0) > 0);
    this.customer.set(order.customerId ?? null);
  }

  addProduct(product: PreviewProduct): void {
    if (!this.canOperate) {
      this.message.set(this.language.translate('posPreview.shiftRequired'));
      return;
    }
    if (!USE_POS_PREVIEW_API) {
      const existing = this.cart().find((line) => line.product.id === product.id);
      if (existing) {
        this.setQuantity(product.id, existing.quantity + 1);
      } else {
        this.cart.update((lines) => [...lines, { product, quantity: 1 }]);
      }
      this.message.set(`${product.name}: ${this.language.translate('posPreview.add')}`);
      return;
    }
    this.pos
      .getBatches(product.id, this.storeId() ?? undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (batches) => {
          const available = batches.filter((batch) => (batch.availableQty ?? 0) > 0);
          if (available.length > 1) {
            this.batchOptions.set(available);
            this.pendingBatchProduct.set(product);
            this.dialog.set('batches');
            return;
          }
          this.addProductWithBatch(product, available[0] ?? null);
        },
        error: (error: unknown) => {
          this.message.set(
            extractApiErrorMessage(error, this.language.translate('posPreview.productAddFailed')),
          );
        },
      });
  }

  readonly pendingBatchProduct = signal<PreviewProduct | null>(null);
  readonly batchOptions = signal<ProductBatch[]>([]);

  selectBatch(batch: ProductBatch): void {
    const product = this.pendingBatchProduct();
    if (product) {
      this.addProductWithBatch(product, batch);
    }
    this.pendingBatchProduct.set(null);
    this.batchOptions.set([]);
    this.dialog.set(null);
  }

  cancelBatchSelection(): void {
    this.pendingBatchProduct.set(null);
    this.batchOptions.set([]);
    this.dialog.set(null);
  }

  private addProductWithBatch(product: PreviewProduct, batch: ProductBatch | null): void {
    const price$ = product.price > 0
      ? of(product.price)
      : this.pos.getPrice(product.id, product.unitId, this.branchId() ?? undefined);
    forkJoin({
      tax: this.pos.getTax(product.id),
      price: price$,
      stock: this.pos.getStock(product.id, {
        storeId: this.storeId() ?? undefined,
        unitId: product.unitId,
        batchNumber: batch?.batchNumber ?? undefined,
        expiryDate: batch?.expiryDate ?? undefined,
      }),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ tax, price, stock }) => {
          const stockQty = Number(stock) || 0;
          const nextProduct: PreviewProduct = {
            ...product,
            price: Number(price) || 0,
            stock: stockQty,
            taxRate: Number(tax.taxRate) || 0,
            taxInclusive: tax.isPriceInclusive === true,
            batchNumber: batch?.batchNumber ?? null,
            expiryDate: batch?.expiryDate ?? null,
          };
          if (stockQty <= 0) {
            this.message.set(this.language.translate('posPreview.outOfStock'));
            return;
          }
          const existing = this.cart().find(
            (line) =>
              line.product.id === nextProduct.id &&
              line.product.batchNumber === nextProduct.batchNumber,
          );
          if (existing && existing.quantity + 1 > stockQty) {
            this.message.set(this.language.translate('posPreview.stockExceeded'));
            return;
          }
          this.cart.update((lines) =>
            existing
              ? lines.map((line) =>
                  line.product.id === nextProduct.id &&
                  line.product.batchNumber === nextProduct.batchNumber
                    ? { ...line, quantity: line.quantity + 1 }
                    : line,
                )
              : [...lines, { product: nextProduct, quantity: 1 }],
          );
          this.message.set(
            `${nextProduct.name}: ${this.language.translate('posPreview.add')}`,
          );
        },
        error: (error: unknown) => {
          this.message.set(
            extractApiErrorMessage(error, this.language.translate('posPreview.productAddFailed')),
          );
        },
      });
  }

  changeQuantity(productId: number, amount: number): void {
    this.cart.update((lines) =>
      lines
        .map((line) =>
          line.product.id === productId
            ? {
                ...line,
                quantity: Math.max(
                  0,
                  Math.min(line.product.stock ?? Number.MAX_SAFE_INTEGER, line.quantity + amount),
                ),
              }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  setQuantity(productId: number, quantity: number): void {
    this.cart.update((lines) =>
      lines
        .map((line) =>
          line.product.id === productId
            ? {
                ...line,
                quantity: Math.max(
                  0,
                  Math.min(
                    line.product.stock ?? Number.MAX_SAFE_INTEGER,
                    Number(quantity) || 0,
                  ),
                ),
              }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  removeLine(productId: number): void {
    this.cart.update((lines) => lines.filter((line) => line.product.id !== productId));
  }

  focusSearch(): void {
    this.productSearch.set('');
    if (this.selectedCategory() !== 'all') {
      this.selectCategory('all');
    }
    this.dialog.set('products');
  }

  openDialog(dialog: PreviewDialog): void {
    this.message.set('');
    if (dialog === 'products' && !this.canOperate) {
      this.message.set(this.language.translate('posPreview.shiftRequired'));
      return;
    }
    if (dialog === 'suspended') {
      if (!this.canOperate) {
        this.message.set(this.language.translate('posPreview.shiftRequired'));
        return;
      }
      if (!this.hasPermission('AllowHold', 'hold', 'pos.hold')) {
        this.message.set(this.language.translate('posPreview.holdNotAllowed'));
        return;
      }
    }
    if (dialog === 'returns') {
      if (!this.canOperate) {
        this.message.set(this.language.translate('posPreview.shiftRequired'));
        return;
      }
      if (!this.hasPermission('AllowReturn', 'return', 'pos.return')) {
        this.message.set(this.language.translate('posPreview.returnNotAllowed'));
        return;
      }
      this.returnAll.set(true);
      this.returnReason.set('');
      this.returnQuantities.set({});
      this.selectedReturnOrder.set(null);
    }
    this.dialog.set(dialog);
    if (dialog === 'products' && this.products().length === 0) {
      this.loadCatalog();
    } else if (dialog === 'suspended') {
      this.refreshSuspended();
    } else if (dialog === 'returns') {
      this.returnSearch.set('');
      this.paidOrders.set([]);
      this.loadPaidOrders();
    }
  }

  closeDialog(): void {
    if (this.dialog() === 'shift') {
      return;
    }
    this.dialog.set(null);
    this.selectedReturnOrder.set(null);
  }

  selectPreviewProduct(product: PreviewProduct): void {
    this.dialog.set(null);
    this.addProduct(product);
  }

  chooseCustomer(customer: Customer): void {
    this.customer.set(customer.customerId);
    this.message.set(
      `${this.language.translate('posPreview.customerSelected')}: ${this.customerName(customer)}`,
    );
    this.closeDialog();
  }

  selectNewCustomer(): void {
    this.message.set(this.language.translate('posPreview.customerCreateUnavailable'));
  }

  openQuantityEditor(productId?: number): void {
    this.editingProductId.set(productId ?? this.cart()[0]?.product.id ?? null);
    this.openDialog('quantity');
  }

  changeEditedLine(amount: number): void {
    const line = this.selectedLine();
    if (line) {
      this.setQuantity(line.product.id, line.quantity + amount);
    }
  }

  setPaymentType(paymentTypeId: number): void {
    this.paymentTypeId.set(paymentTypeId);
    this.cashReceived.set(this.total().toString());
  }

  togglePrintSetting(setting: 'receipt' | 'invoice' | 'openDrawer'): void {
    this.printSettings.update((current) => ({ ...current, [setting]: !current[setting] }));
  }

  confirmPayment(): void {
    if (!this.cart().length) {
      this.message.set(this.language.translate('posPreview.addItemFirst'));
      return;
    }
    if (!this.canOperate || !this.currency()?.id || this.paymentTypeId() == null) {
      this.message.set(this.language.translate('posPreview.sessionContextRequired'));
      return;
    }
    if (this.remaining() > 0) {
      this.message.set(this.language.translate('posPreview.paymentTooLow'));
      return;
    }
    if (!this.hasPermission('AllowDiscount', 'discount', 'pos.discount') && this.discountAmount() > 0) {
      this.message.set(this.language.translate('posPreview.discountNotAllowed'));
      return;
    }
    this.saveOrder(PosOrderStatus.Paid);
  }

  confirmReturn(): void {
    const order = this.selectedReturnOrder();
    if (!this.canOperate) {
      this.message.set(this.language.translate('posPreview.shiftRequired'));
      return;
    }
    if (!this.hasPermission('AllowReturn', 'return', 'pos.return')) {
      this.message.set(this.language.translate('posPreview.returnNotAllowed'));
      return;
    }
    if (!order?.posOrderId) {
      this.message.set(this.language.translate('posPreview.noInvoiceSelected'));
      return;
    }
    if (!USE_POS_PREVIEW_API) {
      const selectedCount = Object.values(this.returnQuantities()).reduce(
        (total, quantity) => total + quantity,
        0,
      );
      if (selectedCount <= 0) {
        this.message.set(this.language.translate('posPreview.returnQtyRequired'));
        return;
      }
      this.dialog.set(null);
      this.selectedReturnOrder.set(null);
      this.message.set(this.language.translate('posPreview.returnSimulated'));
      return;
    }
    const items = this.returnLines()
      .map((line) => ({
        productId: line.productId,
        unitId: line.unitId,
        returnQty: Number(this.returnQuantities()[line.key]) || 0,
        reason: this.returnReason().trim() || null,
      }))
      .filter((line) => line.returnQty > 0);
    if (!items.length) {
      this.message.set(this.language.translate('posPreview.returnQtyRequired'));
      return;
    }

    const request: SavePosReturnRequest = { originalOrderId: order.posOrderId, items };
    this.returnBusy.set(true);
    this.pos
      .createReturn(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.returnBusy.set(false);
          this.dialog.set(null);
          this.selectedReturnOrder.set(null);
          this.paidOrders.set([]);
          this.message.set(
            result?.message ||
              `${this.language.translate('posPreview.returnSaved')} ${result?.returnOrderId ?? ''}`,
          );
        },
        error: (error: unknown) => {
          this.returnBusy.set(false);
          this.message.set(
            extractApiErrorMessage(error, this.language.translate('posPreview.returnSaveFailed')),
          );
        },
      });
  }

  selectReturnOrder(order: PosOrderListItem): void {
    if (!this.canOperate || !this.hasPermission('AllowReturn', 'return', 'pos.return')) {
      this.message.set(
        this.language.translate(
          this.canOperate ? 'posPreview.returnNotAllowed' : 'posPreview.shiftRequired',
        ),
      );
      return;
    }
    if (!USE_POS_PREVIEW_API) {
      const product = this.products()[5];
      this.selectedReturnOrder.set({
        posOrderId: order.posOrderId,
        branchId: 1,
        warehouseId: 1,
        shiftId: 970,
        cashierId: 1001,
        deviceId: 1,
        orderDateTime: order.orderDateTime,
        currencyId: 1,
        status: PosOrderStatus.Paid,
        totalAmount: order.totalAmount,
        customerId: order.customerId,
        items: [
          {
            productId: product.id,
            unitId: product.unitId,
            qty: 2,
            price: product.price,
            taxAmount: 4.7,
            lineTotal: product.price * 2,
          },
        ],
      });
      this.setReturnAll(this.returnAll());
      return;
    }
    this.returnBusy.set(true);
    this.pos
      .getOrder(order.posOrderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (fullOrder) => {
          this.selectedReturnOrder.set(fullOrder);
          const quantities: Record<string, number> = {};
          const items = fullOrder.items ?? [];
          items.forEach((item, index) => {
            const productId = Number(item.productId ?? item.pro_ID ?? 0);
            const unitId = Number(item.unitId);
            quantities[`${productId}-${unitId}-${index}`] = this.returnAll()
              ? Number(item.qty) || 0
              : 0;
          });
          this.returnQuantities.set(quantities);
          this.returnBusy.set(false);
        },
        error: (error: unknown) => {
          this.returnBusy.set(false);
          this.message.set(
            extractApiErrorMessage(error, this.language.translate('posPreview.returnOrderLoadFailed')),
          );
        },
      });
  }

  resumeSuspendedSale(index: number): void {
    if (!this.canOperate || !this.hasPermission('AllowHold', 'hold', 'pos.hold')) {
      this.message.set(
        this.language.translate(
          this.canOperate ? 'posPreview.holdNotAllowed' : 'posPreview.shiftRequired',
        ),
      );
      return;
    }
    const sales = this.suspendedSales();
    const order = sales[index];
    if (!order?.posOrderId) {
      return;
    }
    if (!USE_POS_PREVIEW_API) {
      this.mapOrderToCart(order);
      this.suspendedSales.update((sales) => sales.filter((item) => item.posOrderId !== order.posOrderId));
      this.dialog.set(null);
      this.message.set(this.language.translate('posPreview.saleResumed'));
      return;
    }
    this.saving.set(true);
    this.pos
      .resumeOrder(order.posOrderId)
      .pipe(
        switchMap((resumed) => this.pos.getOrder(resumed.posOrderId || order.posOrderId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (fullOrder) => {
          this.mapOrderToCart(fullOrder);
          this.saving.set(false);
          this.dialog.set(null);
          this.refreshSuspended();
          this.message.set(this.language.translate('posPreview.saleResumed'));
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.message.set(
            extractApiErrorMessage(error, this.language.translate('posPreview.resumeFailed')),
          );
        },
      });
  }

  deleteSuspendedSale(index: number): void {
    if (!this.canOperate || !this.hasPermission('AllowHold', 'hold', 'pos.hold')) {
      this.message.set(
        this.language.translate(
          this.canOperate ? 'posPreview.holdNotAllowed' : 'posPreview.shiftRequired',
        ),
      );
      return;
    }
    const order = this.suspendedSales()[index];
    if (!order?.posOrderId || !window.confirm(this.language.translate('posPreview.confirmDeleteSuspended'))) {
      return;
    }
    if (!USE_POS_PREVIEW_API) {
      this.suspendedSales.update((sales) => sales.filter((item) => item.posOrderId !== order.posOrderId));
      this.message.set(this.language.translate('posPreview.suspendedDeleted'));
      return;
    }
    this.pos
      .deleteOrder(order.posOrderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.refreshSuspended();
          this.message.set(this.language.translate('posPreview.suspendedDeleted'));
        },
        error: (error: unknown) => {
          this.message.set(
            extractApiErrorMessage(error, this.language.translate('posPreview.suspendedDeleteFailed')),
          );
        },
      });
  }

  suspendedTotal(order: PosOrderHeader): number {
    return Number(order.totalAmount) || 0;
  }

  suspendedItemCount(order: PosOrderHeader): number {
    return (order.items ?? []).reduce((total, item) => total + (Number(item.qty) || 0), 0);
  }

  setReturnAll(returnAll: boolean): void {
    this.returnAll.set(returnAll);
    const quantities: Record<string, number> = {};
    for (const line of this.returnLines()) {
      quantities[line.key] = returnAll ? line.soldQuantity : 0;
    }
    this.returnQuantities.set(quantities);
  }

  setReturnQuantity(line: PreviewReturnLine, quantity: number): void {
    this.returnQuantities.update((current) => ({
      ...current,
      [line.key]: Math.max(0, Math.min(line.soldQuantity, Number(quantity) || 0)),
    }));
  }

  returnLineAmount(line: PreviewReturnLine): number {
    return line.price * (Number(this.returnQuantities()[line.key]) || 0);
  }

  applyDiscount(): void {
    if (!this.hasPermission('AllowDiscount', 'discount', 'pos.discount')) {
      this.message.set(this.language.translate('posPreview.discountNotAllowed'));
      return;
    }
    this.discountActive.set(true);
    this.closeDialog();
    this.message.set(
      `${this.language.translate('posPreview.discountApplied')} ${this.discountAmount().toFixed(2)}`,
    );
  }

  confirmPrint(): void {
    this.closeDialog();
    this.message.set(this.language.translate('posPreview.localPrintNotice'));
  }

  pressKey(key: string): void {
    if (key === 'search') {
      this.focusSearch();
      return;
    }
    if (key === 'up' || key === 'down') {
      this.changeQuantity(this.cart()[0]?.product.id ?? -1, key === 'up' ? 1 : -1);
      return;
    }
    if (!/^\d$/.test(key) && key !== '.' && key !== 'clear' && key !== 'backspace') {
      return;
    }
    if (key === 'clear') {
      this.cashReceived.set('');
      this.keypadFresh.set(true);
      return;
    }
    if (key === 'backspace') {
      this.cashReceived.update((value) => value.slice(0, -1));
      this.keypadFresh.set(false);
      return;
    }
    if (key === '.' && this.cashReceived().includes('.')) {
      return;
    }
    this.cashReceived.update((value) =>
      this.keypadFresh() ? (key === '.' ? '0.' : key) : `${value}${key}`,
    );
    this.keypadFresh.set(false);
  }

  completeSale(): void {
    if (!this.cart().length) {
      this.message.set(this.language.translate('posPreview.addItemFirst'));
      return;
    }
    if (!this.canOperate) {
      this.message.set(this.language.translate('posPreview.shiftRequired'));
      return;
    }
    this.cashReceived.set(String(this.total()));
    this.keypadFresh.set(true);
    this.openDialog('payment');
  }

  holdSale(): void {
    if (!this.cart().length) {
      this.message.set(this.language.translate('posPreview.noItemsToHold'));
      return;
    }
    if (!this.canOperate) {
      this.message.set(this.language.translate('posPreview.shiftRequired'));
      return;
    }
    if (!this.hasPermission('AllowHold', 'hold', 'pos.hold')) {
      this.message.set(this.language.translate('posPreview.holdNotAllowed'));
      return;
    }
    this.saveOrder(PosOrderStatus.Suspended);
  }

  private saveOrder(status: typeof PosOrderStatus.Paid | typeof PosOrderStatus.Suspended): void {
    if (!USE_POS_PREVIEW_API) {
      this.saveMockOrder(status);
      return;
    }
    const branchId = this.branchId();
    const storeId = this.storeId();
    const cashier = this.cashier();
    const device = this.device();
    const shift = this.shift();
    const currency = this.currency();
    if (
      branchId == null ||
      storeId == null ||
      !cashier?.cashierId ||
      !device?.deviceId ||
      !shift?.shiftId ||
      !currency?.id
    ) {
      this.message.set(this.language.translate('posPreview.sessionContextRequired'));
      return;
    }
    const isPaid = status === PosOrderStatus.Paid;
    const paymentTypeId = this.paymentTypeId();
    if (isPaid && paymentTypeId == null) {
      this.message.set(this.language.translate('posPreview.paymentTypeRequired'));
      return;
    }
    const exchangeRate = Number(currency.valuesCurr) || 1;
    const paymentCategoryId =
      this.settingNumber('paymentCategoryId', 'PaymentCategoryId', 'defaultPaymentCategoryId') ??
      paymentTypeId ??
      0;
    const payableSubtotal = this.subtotal();
    const discount = this.discountAmount();
    let remainingDiscount = discount;
    const items = this.cart().map((line, index, lines) => {
      const lineTotal = line.product.price * line.quantity;
      const lineDiscount =
        index === lines.length - 1
          ? remainingDiscount
          : payableSubtotal > 0
            ? Math.min(remainingDiscount, (discount * lineTotal) / payableSubtotal)
            : 0;
      remainingDiscount = Math.max(0, remainingDiscount - lineDiscount);
      return {
        productId: line.product.id,
        unitId: line.product.unitId,
        qty: line.quantity,
        price: line.product.price,
        discountAmount: lineDiscount,
        batchNumber: line.product.batchNumber ?? null,
        expiryDate: line.product.expiryDate ?? null,
      };
    });
    const request: SavePosOrderRequest = {
      branchId,
      warehouseId: storeId,
      shiftId: shift.shiftId,
      cashierId: cashier.cashierId,
      deviceId: device.deviceId,
      orderDateTime: new Date().toISOString(),
      currencyId: currency.id,
      exchangeRate,
      status,
      customerId: this.customer(),
      items,
      payment: isPaid
        ? {
            paymentTypeId: paymentTypeId!,
            paymentCategoryId,
            currencyId: currency.id,
            exchangeRate,
            paidAmount: this.paid(),
          }
        : null,
    };

    this.saving.set(true);
    this.pos
      .saveOrder(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          this.saving.set(false);
          this.dialog.set(null);
          this.cart.set([]);
          this.discountActive.set(false);
          this.discountValue.set(0);
          this.customer.set(null);
          this.message.set(
            `${this.language.translate(
              isPaid ? 'posPreview.saleSaved' : 'posPreview.saleHeld',
            )} #${order.posOrderId}`,
          );
          this.refreshSuspended();
          const category = this.selectedCategory();
          this.loadCatalog(category === 'all' ? undefined : category);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.message.set(
            extractApiErrorMessage(
              error,
              this.language.translate('posPreview.orderSaveFailed'),
            ),
          );
        },
      });
  }

  private saveMockOrder(status: typeof PosOrderStatus.Paid | typeof PosOrderStatus.Suspended): void {
      const orderId =
        Math.max(
          97066,
          ...this.paidOrders().map((order) => order.posOrderId),
          ...this.suspendedSales().map((order) => order.posOrderId),
        ) + 1;
      const discount = this.discountAmount();
      const items = this.cart().map((line) => ({
        productId: line.product.id,
        unitId: line.product.unitId,
        qty: line.quantity,
        price: line.product.price,
        discountAmount:
          this.subtotal() > 0
            ? (discount * line.product.price * line.quantity) / this.subtotal()
            : 0,
        taxAmount: this.lineTax(line),
        lineTotal: line.product.price * line.quantity,
        batchNumber: line.product.batchNumber ?? null,
        expiryDate: line.product.expiryDate ?? null,
      }));
      const order: PosOrderHeader = {
        posOrderId: orderId,
        branchId: 1,
        warehouseId: 1,
        shiftId: 970,
        cashierId: 1001,
        deviceId: 1,
        orderDateTime: new Date().toISOString(),
        currencyId: 1,
        status,
        subTotal: this.subtotal(),
        discountAmount: discount,
        taxAmount: this.tax(),
        totalAmount: this.total(),
        customerId: this.customer(),
        items,
      };

      if (status === PosOrderStatus.Suspended) {
        this.suspendedSales.update((sales) => [order, ...sales]);
      } else {
        this.paidOrders.update((orders) => [
          {
            posOrderId: orderId,
            orderDateTime: order.orderDateTime,
            status,
            totalAmount: order.totalAmount,
            customerId: order.customerId,
          },
          ...orders,
        ]);
      }
      this.saving.set(false);
      this.dialog.set(null);
      this.cart.set([]);
      this.discountActive.set(false);
      this.discountValue.set(0);
      this.customer.set(null);
      this.cashReceived.set('');
      this.message.set(
        `${this.language.translate(
          status === PosOrderStatus.Paid ? 'posPreview.saleSimulated' : 'posPreview.saleHeld',
        )} #${orderId}`,
      );
  }

  private settingNumber(...keys: string[]): number | null {
    const settings = this.settings();
    for (const key of keys) {
      const match = Object.entries(settings).find(
        ([name]) => name.toLowerCase() === key.toLowerCase(),
      )?.[1];
      const value = Number(match);
      if (Number.isFinite(value) && value > 0) {
        return value;
      }
    }
    return null;
  }

  private hasPermission(...keys: string[]): boolean {
    const permissions = this.permissions();
    const entries = Object.entries(permissions);
    if (!entries.length) {
      return true;
    }
    return keys.some(
      (key) =>
        entries.find(([name]) => name.toLowerCase() === key.toLowerCase())?.[1] === true,
    );
  }
}
