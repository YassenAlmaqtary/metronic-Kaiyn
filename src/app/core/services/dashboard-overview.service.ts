import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';

import { CurrentStockDetail } from '../api/models/inventory-reports.models';
import { PaymentVoucher, ReceiptVoucher } from '../api/models/payment-voucher.models';
import { Product } from '../api/models/product.models';
import {
  SalesInvoiceListItem,
  SalesInvoiceStatus,
} from '../api/models/sales-invoice.models';
import { StockReceivingListItem } from '../api/models/stock-receiving.models';
import { CustomersService } from './customers.service';
import { InventoryReportsService } from './inventory-reports.service';
import { PaymentVouchersService } from './payment-vouchers.service';
import { ProductsService } from './products.service';
import { ReceiptVouchersService } from './receipt-vouchers.service';
import { SalesInvoicesService } from './sales-invoices.service';
import { StockAdjustmentsService } from './stock-adjustments.service';
import { StockIssuesService } from './stock-issues.service';
import { StockReceivingsService } from './stock-receivings.service';
import { StockTakingsService } from './stock-takings.service';
import { StockTransfersService } from './stock-transfers.service';

export interface DashboardKpis {
  salesTotal: number;
  salesGrowthPct: number | null;
  purchasesTotal: number;
  purchasesCount: number;
  customerDebts: number;
  customersCount: number;
  salesMonthTotal: number;
  salesMonthCount: number;
  salesTodayTotal: number;
  draftInvoices: number;
  pendingStockDocs: number;
  stalePendingCount: number;
  lowStockCount: number;
  productsCount: number;
}

export interface DashboardSalesPoint {
  dateKey: string;
  label: string;
  weekday: string;
  total: number;
  count: number;
}

export interface DashboardChartSlice {
  key: string;
  value: number;
}

export interface DashboardLowStockBar {
  name: string;
  available: number;
  min: number;
}

export type DashboardActionModule =
  | 'salesInvoice'
  | 'stockReceiving'
  | 'stockIssue'
  | 'stockTransfer'
  | 'stockTaking'
  | 'stockAdjustment';

export type DashboardRecentKind =
  | 'salesInvoice'
  | 'paymentVoucher'
  | 'receiptVoucher'
  | 'stockReceiving';

export interface DashboardPendingAction {
  id: string;
  module: DashboardActionModule;
  title: string;
  subtitle: string;
  date?: string | null;
  route: string;
  ageDays: number;
  isStale: boolean;
}

export interface DashboardLowStockItem {
  id: string;
  itemId: number;
  itemName: string;
  itemCode?: string | null;
  storeName?: string | null;
  branchName?: string | null;
  availableQty: number;
  minQty: number;
  unitName?: string | null;
  route: string;
}

export interface DashboardRecentOp {
  id: string;
  kind: DashboardRecentKind;
  title: string;
  amount: number;
  date: string;
  route: string;
}

export interface DashboardOverview {
  kpis: DashboardKpis;
  salesSeries: DashboardSalesPoint[];
  recentOperations: DashboardRecentOp[];
  documentsMix: DashboardChartSlice[];
  attentionMix: DashboardChartSlice[];
  lowStockBars: DashboardLowStockBar[];
  pendingActions: DashboardPendingAction[];
  lowStockItems: DashboardLowStockItem[];
}

type InvoiceRow = SalesInvoiceListItem & {
  remainingAmount?: number | null;
  paidAmount?: number | null;
  invoiceType?: number | null;
};

@Injectable({ providedIn: 'root' })
export class DashboardOverviewService {
  static readonly STALE_DAYS = 3;

  private salesInvoices = inject(SalesInvoicesService);
  private products = inject(ProductsService);
  private customers = inject(CustomersService);
  private inventoryReports = inject(InventoryReportsService);
  private stockReceivings = inject(StockReceivingsService);
  private stockIssues = inject(StockIssuesService);
  private stockTransfers = inject(StockTransfersService);
  private stockTakings = inject(StockTakingsService);
  private stockAdjustments = inject(StockAdjustmentsService);
  private paymentVouchers = inject(PaymentVouchersService);
  private receiptVouchers = inject(ReceiptVouchersService);

  load(branchId: number | null = null): Observable<DashboardOverview> {
    return forkJoin({
      invoices: this.safeList(() =>
        branchId != null ? this.salesInvoices.getAll(undefined, branchId) : this.salesInvoices.getAll(),
      ),
      draftInvoices: this.safeList(() => this.salesInvoices.getDrafts()),
      products: this.safeList(() => this.products.getAll() as Observable<Product[]>),
      customers: this.safeList(() => this.customers.getAll()),
      receivings: this.safeList(() => this.stockReceivings.getAll()),
      pendingReceivings: this.safeList(() => this.stockReceivings.getPending()),
      pendingIssues: this.safeList(() => this.stockIssues.getPending()),
      pendingTransfers: this.safeList(() => this.stockTransfers.getPending()),
      draftTakings: this.safeList(() => this.stockTakings.getDrafts()),
      draftAdjustments: this.safeList(() => this.stockAdjustments.getDrafts()),
      payments: this.safeList(() => this.paymentVouchers.getAll()),
      receipts: this.safeList(() => this.receiptVouchers.getAll()),
      currentStock: this.inventoryReports
        .getCurrentStock({ branchId, hideZeroes: false })
        .pipe(catchError(() => of({ items: [] as CurrentStockDetail[] }))),
    }).pipe(map((data) => this.buildOverview(data, branchId)));
  }

  private safeList<T>(loader: () => Observable<T[]>): Observable<T[]> {
    return loader().pipe(catchError(() => of([] as T[])));
  }

  private buildOverview(
    data: {
      invoices: SalesInvoiceListItem[];
      draftInvoices: SalesInvoiceListItem[];
      products: Product[];
      customers: unknown[];
      receivings: StockReceivingListItem[];
      pendingReceivings: Array<{
        receivingId: number;
        receivingNumber?: string | null;
        receivingDate?: string | null;
        storeName?: string | null;
        branchId?: number | null;
      }>;
      pendingIssues: Array<{
        issueId: number;
        issueNumber?: string | null;
        issueDate?: string | null;
        storeName?: string | null;
        branchId?: number | null;
      }>;
      pendingTransfers: Array<{
        transferId: number;
        transferNumber?: string | null;
        transferDate?: string | null;
        fromStoreName?: string | null;
        toStoreName?: string | null;
        fromBranchId?: number | null;
        toBranchId?: number | null;
      }>;
      draftTakings: Array<{
        takingId: number;
        takingNo?: string | null;
        takingDate?: string | null;
        storeName?: string | null;
        branchId?: number | null;
      }>;
      draftAdjustments: Array<{
        adjId: number;
        adjNo?: string | null;
        adjDate?: string | null;
        storeName?: string | null;
        branchId?: number | null;
      }>;
      payments: PaymentVoucher[];
      receipts: ReceiptVoucher[];
      currentStock: { items?: CurrentStockDetail[] | null };
    },
    branchId: number | null,
  ): DashboardOverview {
    const now = new Date();
    const todayKey = this.toDateKey(now);
    const month = now.getMonth();
    const year = now.getFullYear();
    const matchBranch = (id?: number | null) => branchId == null || id == null || id === branchId;

    const invoices = (data.invoices as InvoiceRow[]).filter((inv) => matchBranch(inv.branchId));
    const draftInvoices = data.draftInvoices.filter((inv) => matchBranch(inv.branchId));
    const receivings = data.receivings.filter((x) => matchBranch(x.branchId));
    const pendingReceivings = data.pendingReceivings.filter((x) => matchBranch(x.branchId));
    const pendingIssues = data.pendingIssues.filter((x) => matchBranch(x.branchId));
    const pendingTransfers = data.pendingTransfers.filter(
      (x) => matchBranch(x.fromBranchId) || matchBranch(x.toBranchId),
    );
    const draftTakings = data.draftTakings.filter((x) => matchBranch(x.branchId));
    const draftAdjustments = data.draftAdjustments.filter((x) => matchBranch(x.branchId));
    const payments = data.payments.filter((x) => matchBranch(x.branchId));
    const receipts = data.receipts.filter((x) => matchBranch(x.branchId));

    const activeInvoices = invoices.filter((inv) => inv.status !== SalesInvoiceStatus.Cancelled);
    const monthInvoices = activeInvoices.filter((inv) => {
      const d = this.parseDate(inv.invoiceDate);
      return d && d.getFullYear() === year && d.getMonth() === month;
    });
    const todayInvoices = activeInvoices.filter((inv) => {
      const d = this.parseDate(inv.invoiceDate);
      return d && this.toDateKey(d) === todayKey;
    });

    const salesTotal = this.sumAmount(activeInvoices);
    const salesSeries = this.buildSalesSeries(activeInvoices, 7);
    const salesGrowthPct = this.calcGrowthPct(activeInvoices);

    const purchasesTotal = receivings.reduce((sum, x) => sum + Number(x.totalAmount || 0), 0);
    const purchasesCount = receivings.length;

    const remainingFromInvoices = activeInvoices.reduce((sum, inv) => {
      const remaining = Number(inv.remainingAmount);
      if (Number.isFinite(remaining) && remaining >= 0) {
        return sum + remaining;
      }
      return sum;
    }, 0);
    const hasRemaining = activeInvoices.some((inv) => {
      const remaining = Number(inv.remainingAmount);
      return Number.isFinite(remaining) && remaining >= 0;
    });
    const receiptsTotal = receipts.reduce((sum, x) => sum + Number(x.totalAmount || 0), 0);
    const customerDebts = hasRemaining
      ? remainingFromInvoices
      : Math.max(0, salesTotal - receiptsTotal);

    const pendingStockDocs =
      pendingReceivings.length +
      pendingIssues.length +
      pendingTransfers.length +
      draftTakings.length +
      draftAdjustments.length;

    const pendingActions: DashboardPendingAction[] = [
      ...draftInvoices.slice(0, 8).map((inv) =>
        this.toPendingAction({
          id: `inv-${inv.invoiceId}`,
          module: 'salesInvoice',
          title: inv.invoiceNo || `#${inv.invoiceId}`,
          subtitle: '',
          date: inv.invoiceDate,
          route: `/demo1/sales/sales-invoices/${inv.invoiceId}`,
        }),
      ),
      ...pendingReceivings.slice(0, 5).map((x) =>
        this.toPendingAction({
          id: `rcv-${x.receivingId}`,
          module: 'stockReceiving',
          title: x.receivingNumber || `#${x.receivingId}`,
          subtitle: x.storeName || '',
          date: x.receivingDate,
          route: `/demo1/inventory/stock-receivings/${x.receivingId}`,
        }),
      ),
      ...pendingIssues.slice(0, 5).map((x) =>
        this.toPendingAction({
          id: `iss-${x.issueId}`,
          module: 'stockIssue',
          title: x.issueNumber || `#${x.issueId}`,
          subtitle: x.storeName || '',
          date: x.issueDate,
          route: `/demo1/inventory/stock-issues/${x.issueId}`,
        }),
      ),
      ...pendingTransfers.slice(0, 5).map((x) =>
        this.toPendingAction({
          id: `tr-${x.transferId}`,
          module: 'stockTransfer',
          title: x.transferNumber || `#${x.transferId}`,
          subtitle: [x.fromStoreName, x.toStoreName].filter(Boolean).join(' → '),
          date: x.transferDate,
          route: `/demo1/inventory/stock-transfers/${x.transferId}`,
        }),
      ),
      ...draftTakings.slice(0, 5).map((x) =>
        this.toPendingAction({
          id: `tk-${x.takingId}`,
          module: 'stockTaking',
          title: x.takingNo || `#${x.takingId}`,
          subtitle: x.storeName || '',
          date: x.takingDate,
          route: `/demo1/inventory/stock-takings/${x.takingId}`,
        }),
      ),
      ...draftAdjustments.slice(0, 5).map((x) =>
        this.toPendingAction({
          id: `adj-${x.adjId}`,
          module: 'stockAdjustment',
          title: x.adjNo || `#${x.adjId}`,
          subtitle: x.storeName || '',
          date: x.adjDate,
          route: `/demo1/inventory/stock-adjustments/${x.adjId}`,
        }),
      ),
    ]
      .sort((a, b) => this.dateValue(b.date) - this.dateValue(a.date))
      .slice(0, 12);

    const lowStockItems = this.buildLowStock(data.currentStock.items ?? [], data.products);
    const stalePendingCount = pendingActions.filter((x) => x.isStale).length;

    const documentsMix: DashboardChartSlice[] = [
      { key: 'salesInvoice', value: draftInvoices.length },
      { key: 'stockReceiving', value: pendingReceivings.length },
      { key: 'stockIssue', value: pendingIssues.length },
      { key: 'stockTransfer', value: pendingTransfers.length },
      { key: 'stockTaking', value: draftTakings.length },
      { key: 'stockAdjustment', value: draftAdjustments.length },
    ].filter((x) => x.value > 0);

    const attentionMix: DashboardChartSlice[] = [
      { key: 'drafts', value: draftInvoices.length },
      { key: 'pending', value: pendingStockDocs },
      { key: 'lowStock', value: lowStockItems.length },
      { key: 'stale', value: stalePendingCount },
    ].filter((x) => x.value > 0);

    const lowStockBars: DashboardLowStockBar[] = lowStockItems.slice(0, 8).map((item) => ({
      name: item.itemName.length > 22 ? `${item.itemName.slice(0, 20)}…` : item.itemName,
      available: item.availableQty,
      min: item.minQty,
    }));

    const recentOperations = this.buildRecentOperations(activeInvoices, payments, receipts, receivings);

    return {
      kpis: {
        salesTotal,
        salesGrowthPct,
        purchasesTotal,
        purchasesCount,
        customerDebts,
        customersCount: data.customers.length,
        salesMonthTotal: this.sumAmount(monthInvoices),
        salesMonthCount: monthInvoices.length,
        salesTodayTotal: this.sumAmount(todayInvoices),
        draftInvoices: draftInvoices.length,
        pendingStockDocs,
        stalePendingCount,
        lowStockCount: lowStockItems.length,
        productsCount: data.products.length,
      },
      salesSeries,
      recentOperations,
      documentsMix,
      attentionMix,
      lowStockBars,
      pendingActions,
      lowStockItems: lowStockItems.slice(0, 10),
    };
  }

  private buildRecentOperations(
    invoices: InvoiceRow[],
    payments: PaymentVoucher[],
    receipts: ReceiptVoucher[],
    receivings: StockReceivingListItem[],
  ): DashboardRecentOp[] {
    const ops: DashboardRecentOp[] = [
      ...invoices.map((inv) => ({
        id: `inv-${inv.invoiceId}`,
        kind: 'salesInvoice' as const,
        title: inv.invoiceNo || `#${inv.invoiceId}`,
        amount: Number(inv.netAmount || 0),
        date: inv.invoiceDate,
        route: `/demo1/sales/sales-invoices/${inv.invoiceId}`,
      })),
      ...payments.map((v) => ({
        id: `pay-${v.voucherId}`,
        kind: 'paymentVoucher' as const,
        title: v.voucherNumber || `#${v.voucherId}`,
        amount: -Math.abs(Number(v.totalAmount || 0)),
        date: v.voucherDate || v.createdDate || '',
        route: `/demo1/accounting/payment-vouchers/${v.voucherId}/edit`,
      })),
      ...receipts.map((v) => ({
        id: `rcp-${v.voucherId}`,
        kind: 'receiptVoucher' as const,
        title: v.voucherNumber || `#${v.voucherId}`,
        amount: Math.abs(Number(v.totalAmount || 0)),
        date: v.voucherDate || v.createdDate || '',
        route: `/demo1/accounting/receipt-vouchers/${v.voucherId}/edit`,
      })),
      ...receivings.slice(0, 20).map((x) => ({
        id: `rcv-${x.receivingId}`,
        kind: 'stockReceiving' as const,
        title: x.receivingNumber || `#${x.receivingId}`,
        amount: -Math.abs(Number(x.totalAmount || 0)),
        date: x.receivingDate || x.dateCreated || '',
        route: `/demo1/inventory/stock-receivings/${x.receivingId}`,
      })),
    ];

    return ops
      .filter((x) => !!x.date)
      .sort((a, b) => this.dateValue(b.date) - this.dateValue(a.date))
      .slice(0, 10);
  }

  private calcGrowthPct(invoices: InvoiceRow[]): number | null {
    const last7 = this.sumInRange(invoices, 0, 6);
    const prev7 = this.sumInRange(invoices, 7, 13);
    if (prev7 <= 0) {
      return last7 > 0 ? 100 : null;
    }
    return ((last7 - prev7) / prev7) * 100;
  }

  private sumInRange(invoices: InvoiceRow[], fromDaysAgo: number, toDaysAgo: number): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let sum = 0;
    for (const inv of invoices) {
      const d = this.parseDate(inv.invoiceDate);
      if (!d) {
        continue;
      }
      const day = new Date(d);
      day.setHours(0, 0, 0, 0);
      const age = Math.floor((today.getTime() - day.getTime()) / 86_400_000);
      if (age >= fromDaysAgo && age <= toDaysAgo) {
        sum += Number(inv.netAmount || 0);
      }
    }
    return sum;
  }

  private toPendingAction(input: {
    id: string;
    module: DashboardActionModule;
    title: string;
    subtitle: string;
    date?: string | null;
    route: string;
  }): DashboardPendingAction {
    const ageDays = this.ageInDays(input.date);
    return {
      ...input,
      ageDays,
      isStale: ageDays >= DashboardOverviewService.STALE_DAYS,
    };
  }

  private ageInDays(value?: string | null): number {
    const d = this.parseDate(value);
    if (!d) {
      return 0;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((today.getTime() - day.getTime()) / 86_400_000));
  }

  private buildLowStock(
    stockItems: CurrentStockDetail[],
    products: Product[],
  ): DashboardLowStockItem[] {
    const minByProduct = new Map<number, number>();
    for (const p of products) {
      const min = Number(p.minQty ?? 0);
      if (p.productId && min > 0) {
        minByProduct.set(p.productId, min);
      }
    }

    const aggregated = new Map<string, CurrentStockDetail & { availableQuantity: number }>();
    for (const row of stockItems) {
      if (!row.itemId) {
        continue;
      }
      const key = `${row.itemId}-${row.storeId ?? 0}`;
      const prev = aggregated.get(key);
      const qty = Number(row.availableQuantity ?? row.actualQuantity ?? 0);
      if (prev) {
        prev.availableQuantity += qty;
      } else {
        aggregated.set(key, { ...row, availableQuantity: qty });
      }
    }

    const alerts: DashboardLowStockItem[] = [];
    for (const row of aggregated.values()) {
      const minQty = minByProduct.get(row.itemId);
      if (minQty == null) {
        continue;
      }
      const available = Number(row.availableQuantity ?? 0);
      if (available > minQty) {
        continue;
      }
      alerts.push({
        id: `ls-${row.itemId}-${row.storeId}`,
        itemId: row.itemId,
        itemName: row.itemName || `#${row.itemId}`,
        itemCode: row.itemCode,
        storeName: row.storeName,
        branchName: row.branchName,
        availableQty: available,
        minQty,
        unitName: row.baseUnitName,
        route: `/demo1/products/items/${row.itemId}/edit`,
      });
    }

    return alerts.sort((a, b) => a.availableQty / a.minQty - b.availableQty / b.minQty);
  }

  private buildSalesSeries(invoices: InvoiceRow[], days: number): DashboardSalesPoint[] {
    const mapTotals = new Map<string, { total: number; count: number }>();
    for (const inv of invoices) {
      const d = this.parseDate(inv.invoiceDate);
      if (!d) {
        continue;
      }
      const key = this.toDateKey(d);
      const prev = mapTotals.get(key) ?? { total: 0, count: 0 };
      prev.total += Number(inv.netAmount || 0);
      prev.count += 1;
      mapTotals.set(key, prev);
    }

    const weekdayKeys = [
      'dashboard.weekday.sun',
      'dashboard.weekday.mon',
      'dashboard.weekday.tue',
      'dashboard.weekday.wed',
      'dashboard.weekday.thu',
      'dashboard.weekday.fri',
      'dashboard.weekday.sat',
    ] as const;

    const points: DashboardSalesPoint[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = this.toDateKey(d);
      const bucket = mapTotals.get(key);
      points.push({
        dateKey: key,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        weekday: weekdayKeys[d.getDay()],
        total: bucket?.total ?? 0,
        count: bucket?.count ?? 0,
      });
    }

    return points;
  }

  private sumAmount(items: InvoiceRow[]): number {
    return items.reduce((sum, x) => sum + Number(x.netAmount || 0), 0);
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) {
      return null;
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private toDateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private dateValue(value?: string | null): number {
    const d = this.parseDate(value);
    return d ? d.getTime() : 0;
  }
}
