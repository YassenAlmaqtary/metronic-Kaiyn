import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin, Observable, of, tap } from 'rxjs';

import { TranslationKey } from '../i18n';
import { Customer } from '../api/models/customer.models';
import { ProductLookup } from '../api/models/product.models';
import { SalesInvoiceListItem } from '../api/models/sales-invoice.models';
import { Supplier } from '../api/models/supplier.models';
import { SIDEBAR_MENU_SECTIONS, SIDEBAR_ROOT_LINKS } from '../navigation/sidebar-menu.config';
import { CustomersService } from './customers.service';
import { LanguageService } from './language.service';
import { ProductsService } from './products.service';
import { SalesInvoicesService } from './sales-invoices.service';
import { SuppliersService } from './suppliers.service';

export type GlobalSearchItemKind = 'menu' | 'record';

export interface GlobalSearchItem {
  id: string;
  kind: GlobalSearchItemKind;
  labelKey?: TranslationKey;
  label?: string;
  subtitle?: string;
  route: string;
  sectionKey: TranslationKey;
  sectionIcon: string;
  keywords: string;
}

interface GlobalSearchCache {
  customers: Customer[];
  products: ProductLookup[];
  invoices: SalesInvoiceListItem[];
  suppliers: Supplier[];
}

const RECENT_KEY = 'kayian.globalSearch.recent';
const RECENT_LIMIT = 8;
const RECORD_LIMIT = 24;

@Injectable({ providedIn: 'root' })
export class GlobalSearchService {
  private customersService = inject(CustomersService);
  private productsService = inject(ProductsService);
  private salesInvoicesService = inject(SalesInvoicesService);
  private suppliersService = inject(SuppliersService);
  private language = inject(LanguageService);

  readonly open = signal(false);
  readonly query = signal('');
  readonly dataLoading = signal(false);
  readonly recordItems = signal<GlobalSearchItem[]>([]);

  private cache: GlobalSearchCache | null = null;

  readonly menuItems = computed((): GlobalSearchItem[] => {
    const items: GlobalSearchItem[] = [];

    for (const root of SIDEBAR_ROOT_LINKS) {
      items.push({
        id: root.id,
        kind: 'menu',
        labelKey: root.labelKey,
        route: root.route,
        sectionKey: 'menu.dashboard',
        sectionIcon: root.icon,
        keywords: root.id,
      });
    }

    for (const section of SIDEBAR_MENU_SECTIONS) {
      for (const child of section.children) {
        if (child.kind === 'group' || child.kind === 'comingSoon' || !child.route) {
          continue;
        }
        items.push({
          id: child.id,
          kind: 'menu',
          labelKey: child.labelKey,
          route: child.route,
          sectionKey: section.labelKey,
          sectionIcon: section.icon,
          keywords: `${section.id} ${child.id}`,
        });
      }
    }

    return items;
  });

  /** @deprecated use menuItems — kept for compatibility */
  readonly allItems = this.menuItems;

  readonly recentRoutes = signal<string[]>(this.readRecent());

  show(): void {
    this.query.set('');
    this.recordItems.set([]);
    this.open.set(true);
  }

  hide(): void {
    this.open.set(false);
    this.query.set('');
    this.recordItems.set([]);
    this.dataLoading.set(false);
  }

  toggle(): void {
    if (this.open()) {
      this.hide();
    } else {
      this.show();
    }
  }

  remember(route: string): void {
    const next = [route, ...this.recentRoutes().filter((r) => r !== route)].slice(0, RECENT_LIMIT);
    this.recentRoutes.set(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  searchRecords(term: string): void {
    const q = term.trim().toLowerCase();
    if (q.length < 2) {
      this.recordItems.set([]);
      this.dataLoading.set(false);
      return;
    }

    this.dataLoading.set(true);
    this.ensureCache().subscribe({
      next: (cache) => {
        this.recordItems.set(this.buildRecordItems(cache, q));
        this.dataLoading.set(false);
      },
      error: () => {
        this.recordItems.set([]);
        this.dataLoading.set(false);
      },
    });
  }

  private ensureCache(): Observable<GlobalSearchCache> {
    if (this.cache) {
      return of(this.cache);
    }

    return forkJoin({
      customers: this.customersService.getAll(),
      products: this.productsService.getAll(),
      invoices: this.salesInvoicesService.getAll(),
      suppliers: this.suppliersService.getAll(),
    }).pipe(
      tap((data) => {
        this.cache = data;
      }),
    );
  }

  private buildRecordItems(cache: GlobalSearchCache, term: string): GlobalSearchItem[] {
    const items: GlobalSearchItem[] = [];
    const isAr = this.language.locale() === 'ar';

    for (const customer of cache.customers) {
      const label = isAr
        ? customer.customerName || customer.customerNameEn || String(customer.customerId)
        : customer.customerNameEn || customer.customerName || String(customer.customerId);
      const haystack = [label, customer.phone, customer.taxNumber, customer.customerId]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(term)) {
        continue;
      }
      items.push({
        id: `customer-${customer.customerId}`,
        kind: 'record',
        label,
        subtitle: customer.phone ?? undefined,
        route: `/demo1/sales/customers/${customer.customerId}/edit`,
        sectionKey: 'globalSearch.section.customers',
        sectionIcon: 'ki-people',
        keywords: `customer ${customer.customerId}`,
      });
    }

    for (const product of cache.products) {
      const label = product.productName || product.proCode || String(product.productId);
      const haystack = [label, product.proCode, product.productId].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(term)) {
        continue;
      }
      items.push({
        id: `product-${product.productId}`,
        kind: 'record',
        label,
        subtitle: product.proCode ?? undefined,
        route: `/demo1/products/items/${product.productId}/edit`,
        sectionKey: 'globalSearch.section.products',
        sectionIcon: 'ki-capsule',
        keywords: `product ${product.productId}`,
      });
    }

    for (const invoice of cache.invoices) {
      const label = invoice.invoiceNo || `#${invoice.invoiceId}`;
      const haystack = [label, invoice.invoiceId, invoice.netAmount, invoice.invoiceDate]
        .filter((v) => v != null)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(term)) {
        continue;
      }
      items.push({
        id: `invoice-${invoice.invoiceId}`,
        kind: 'record',
        label,
        subtitle: invoice.invoiceDate,
        route: `/demo1/sales/sales-invoices/${invoice.invoiceId}`,
        sectionKey: 'globalSearch.section.invoices',
        sectionIcon: 'ki-bill',
        keywords: `invoice ${invoice.invoiceId}`,
      });
    }

    for (const supplier of cache.suppliers) {
      const label = supplier.supplierName || String(supplier.supplierId);
      const haystack = [label, supplier.phone, supplier.email, supplier.taxNumber, supplier.supplierId]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(term)) {
        continue;
      }
      items.push({
        id: `supplier-${supplier.supplierId}`,
        kind: 'record',
        label,
        subtitle: supplier.phone ?? undefined,
        route: `/demo1/purchasing/suppliers/${supplier.supplierId}/edit`,
        sectionKey: 'globalSearch.section.suppliers',
        sectionIcon: 'ki-delivery',
        keywords: `supplier ${supplier.supplierId}`,
      });
    }

    return items.slice(0, RECORD_LIMIT);
  }

  private readRecent(): string[] {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }
}
