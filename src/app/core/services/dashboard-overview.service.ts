import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';

import { CurrentStockDetail } from '../api/models/inventory-reports.models';
import { Product } from '../api/models/product.models';
import { SalesInvoiceListItem, SalesInvoiceStatus } from '../api/models/sales-invoice.models';
import { CustomersService } from './customers.service';
import { InventoryReportsService } from './inventory-reports.service';
import { ProductsService } from './products.service';
import { SalesInvoicesService } from './sales-invoices.service';
import { StockAdjustmentsService } from './stock-adjustments.service';
import { StockIssuesService } from './stock-issues.service';
import { StockReceivingsService } from './stock-receivings.service';
import { StockTakingsService } from './stock-takings.service';
import { StockTransfersService } from './stock-transfers.service';

export interface DashboardKpis {
  salesMonthTotal: number;
  salesMonthCount: number;
  salesTodayTotal: number;
  draftInvoices: number;
  pendingStockDocs: number;
  lowStockCount: number;
  productsCount: number;
  customersCount: number;
}

export interface DashboardSalesPoint {
  dateKey: string;
  label: string;
  total: number;
}

export type DashboardActionModule =
  | 'salesInvoice'
  | 'stockReceiving'
  | 'stockIssue'
  | 'stockTransfer'
  | 'stockTaking'
  | 'stockAdjustment';

export interface DashboardPendingAction {
  id: string;
  module: DashboardActionModule;
  title: string;
  subtitle: string;
  date?: string | null;
  route: string;
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

export interface DashboardOverview {
  kpis: DashboardKpis;
  salesSeries: DashboardSalesPoint[];
  pendingActions: DashboardPendingAction[];
  lowStockItems: DashboardLowStockItem[];
}

@Injectable({ providedIn: 'root' })
export class DashboardOverviewService {
  private salesInvoices = inject(SalesInvoicesService);
  private products = inject(ProductsService);
  private customers = inject(CustomersService);
  private inventoryReports = inject(InventoryReportsService);
  private stockReceivings = inject(StockReceivingsService);
  private stockIssues = inject(StockIssuesService);
  private stockTransfers = inject(StockTransfersService);
  private stockTakings = inject(StockTakingsService);
  private stockAdjustments = inject(StockAdjustmentsService);

  load(branchId: number | null = null): Observable<DashboardOverview> {
    return forkJoin({
      invoices: this.safeList(() =>
        branchId != null ? this.salesInvoices.getAll(undefined, branchId) : this.salesInvoices.getAll(),
      ),
      draftInvoices: this.safeList(() => this.salesInvoices.getDrafts()),
      products: this.safeList(() => this.products.getAll() as Observable<Product[]>),
      customers: this.safeList(() => this.customers.getAll()),
      pendingReceivings: this.safeList(() => this.stockReceivings.getPending()),
      pendingIssues: this.safeList(() => this.stockIssues.getPending()),
      pendingTransfers: this.safeList(() => this.stockTransfers.getPending()),
      draftTakings: this.safeList(() => this.stockTakings.getDrafts()),
      draftAdjustments: this.safeList(() => this.stockAdjustments.getDrafts()),
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
      currentStock: { items?: CurrentStockDetail[] | null };
    },
    branchId: number | null,
  ): DashboardOverview {
    const now = new Date();
    const todayKey = this.toDateKey(now);
    const month = now.getMonth();
    const year = now.getFullYear();

    const matchBranch = (id?: number | null) => branchId == null || id == null || id === branchId;

    const invoices = data.invoices.filter((inv) => matchBranch(inv.branchId));
    const draftInvoices = data.draftInvoices.filter((inv) => matchBranch(inv.branchId));
    const pendingReceivings = data.pendingReceivings.filter((x) => matchBranch(x.branchId));
    const pendingIssues = data.pendingIssues.filter((x) => matchBranch(x.branchId));
    const pendingTransfers = data.pendingTransfers.filter(
      (x) => matchBranch(x.fromBranchId) || matchBranch(x.toBranchId),
    );
    const draftTakings = data.draftTakings.filter((x) => matchBranch(x.branchId));
    const draftAdjustments = data.draftAdjustments.filter((x) => matchBranch(x.branchId));

    const monthInvoices = invoices.filter((inv) => {
      const d = this.parseDate(inv.invoiceDate);
      return d && d.getFullYear() === year && d.getMonth() === month;
    });
    const todayInvoices = invoices.filter((inv) => {
      const d = this.parseDate(inv.invoiceDate);
      return d && this.toDateKey(d) === todayKey;
    });

    const pendingStockDocs =
      pendingReceivings.length +
      pendingIssues.length +
      pendingTransfers.length +
      draftTakings.length +
      draftAdjustments.length;

    const pendingActions: DashboardPendingAction[] = [
      ...draftInvoices.slice(0, 8).map((inv) => ({
        id: `inv-${inv.invoiceId}`,
        module: 'salesInvoice' as const,
        title: inv.invoiceNo || `#${inv.invoiceId}`,
        subtitle: '',
        date: inv.invoiceDate,
        route: `/demo1/sales/sales-invoices/${inv.invoiceId}`,
      })),
      ...pendingReceivings.slice(0, 5).map((x) => ({
        id: `rcv-${x.receivingId}`,
        module: 'stockReceiving' as const,
        title: x.receivingNumber || `#${x.receivingId}`,
        subtitle: x.storeName || '',
        date: x.receivingDate,
        route: `/demo1/inventory/stock-receivings/${x.receivingId}`,
      })),
      ...pendingIssues.slice(0, 5).map((x) => ({
        id: `iss-${x.issueId}`,
        module: 'stockIssue' as const,
        title: x.issueNumber || `#${x.issueId}`,
        subtitle: x.storeName || '',
        date: x.issueDate,
        route: `/demo1/inventory/stock-issues/${x.issueId}`,
      })),
      ...pendingTransfers.slice(0, 5).map((x) => ({
        id: `tr-${x.transferId}`,
        module: 'stockTransfer' as const,
        title: x.transferNumber || `#${x.transferId}`,
        subtitle: [x.fromStoreName, x.toStoreName].filter(Boolean).join(' → '),
        date: x.transferDate,
        route: `/demo1/inventory/stock-transfers/${x.transferId}`,
      })),
      ...draftTakings.slice(0, 5).map((x) => ({
        id: `tk-${x.takingId}`,
        module: 'stockTaking' as const,
        title: x.takingNo || `#${x.takingId}`,
        subtitle: x.storeName || '',
        date: x.takingDate,
        route: `/demo1/inventory/stock-takings/${x.takingId}`,
      })),
      ...draftAdjustments.slice(0, 5).map((x) => ({
        id: `adj-${x.adjId}`,
        module: 'stockAdjustment' as const,
        title: x.adjNo || `#${x.adjId}`,
        subtitle: x.storeName || '',
        date: x.adjDate,
        route: `/demo1/inventory/stock-adjustments/${x.adjId}`,
      })),
    ]
      .sort((a, b) => this.dateValue(b.date) - this.dateValue(a.date))
      .slice(0, 12);

    const lowStockItems = this.buildLowStock(data.currentStock.items ?? [], data.products);

    return {
      kpis: {
        salesMonthTotal: this.sumAmount(monthInvoices),
        salesMonthCount: monthInvoices.length,
        salesTodayTotal: this.sumAmount(todayInvoices),
        draftInvoices: draftInvoices.length,
        pendingStockDocs,
        lowStockCount: lowStockItems.length,
        productsCount: data.products.length,
        customersCount: data.customers.length,
      },
      salesSeries: this.buildSalesSeries(invoices, 14),
      pendingActions,
      lowStockItems: lowStockItems.slice(0, 10),
    };
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

    // Aggregate available qty by item+store (batches may repeat)
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

  private buildSalesSeries(invoices: SalesInvoiceListItem[], days: number): DashboardSalesPoint[] {
    const mapTotals = new Map<string, number>();
    for (const inv of invoices) {
      if (inv.status === SalesInvoiceStatus.Cancelled) {
        continue;
      }
      const d = this.parseDate(inv.invoiceDate);
      if (!d) {
        continue;
      }
      const key = this.toDateKey(d);
      mapTotals.set(key, (mapTotals.get(key) ?? 0) + Number(inv.netAmount || 0));
    }

    const points: DashboardSalesPoint[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = this.toDateKey(d);
      points.push({
        dateKey: key,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        total: mapTotals.get(key) ?? 0,
      });
    }

    return points;
  }

  private sumAmount(items: SalesInvoiceListItem[]): number {
    return items
      .filter((x) => x.status !== SalesInvoiceStatus.Cancelled)
      .reduce((sum, x) => sum + Number(x.netAmount || 0), 0);
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
