import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { Branch } from '../../../../core/api/models/branch.models';
import {
  CurrentStockDetail,
  CurrentStockReportResult,
} from '../../../../core/api/models/inventory-reports.models';
import { ProductLookup } from '../../../../core/api/models/product.models';
import { Store } from '../../../../core/api/models/store.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { BranchesService } from '../../../../core/services/branches.service';
import { InventoryReportsService } from '../../../../core/services/inventory-reports.service';
import { LanguageService } from '../../../../core/services/language.service';
import { ProductsService } from '../../../../core/services/products.service';
import { StoresService } from '../../../../core/services/stores.service';
import { csvExportFilename } from '../../../../core/utils/csv-export-filename';
import { downloadCsv } from '../../../../core/utils/download-csv';

@Component({
  selector: 'app-current-stock-report',
  imports: [ReactiveFormsModule, TranslatePipe, DecimalPipe],
  templateUrl: './current-stock-report.component.html',
  styleUrl: './current-stock-report.component.scss',
})
export class CurrentStockReportComponent implements OnInit {
  private reportsService = inject(InventoryReportsService);
  private branchesService = inject(BranchesService);
  private storesService = inject(StoresService);
  private productsService = inject(ProductsService);
  private language = inject(LanguageService);

  branches = signal<Branch[]>([]);
  stores = signal<Store[]>([]);
  products = signal<ProductLookup[]>([]);
  report = signal<CurrentStockReportResult | null>(null);
  loading = signal(false);
  errorMessage = signal('');
  hasRun = signal(false);

  items = computed(() => this.report()?.items ?? []);

  filterForm = new FormGroup({
    branchId: new FormControl<number | null>(null),
    storeId: new FormControl<number | null>(null),
    itemId: new FormControl<number | null>(null),
    barcode: new FormControl('', { nonNullable: true }),
    hideZeroes: new FormControl(false, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (items) => this.branches.set(items),
      error: () => this.branches.set([]),
    });
    this.storesService.getAll().subscribe({
      next: (items) => this.stores.set(items),
      error: () => this.stores.set([]),
    });
    this.productsService.getAll().subscribe({
      next: (items) => this.products.set(items),
      error: () => this.products.set([]),
    });
  }

  productLabel(product: ProductLookup): string {
    return [product.productName, product.proCode].filter(Boolean).join(' - ') || String(product.productId);
  }

  runReport(): void {
    const value = this.filterForm.getRawValue();
    this.loading.set(true);
    this.errorMessage.set('');
    this.hasRun.set(true);

    this.reportsService
      .getCurrentStock({
        branchId: value.branchId,
        storeId: value.storeId,
        itemId: value.itemId,
        barcode: value.barcode.trim() || null,
        hideZeroes: value.hideZeroes,
      })
      .subscribe({
        next: (result) => {
          this.report.set(result);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.report.set(null);
          this.errorMessage.set(
            extractApiErrorMessage(error, this.language.translate('inventoryReports.loadError')),
          );
        },
      });
  }

  exportCsv(): void {
    const rows = this.items();
    if (!rows.length) {
      return;
    }

    downloadCsv(
      csvExportFilename('current-stock-report'),
      [
        this.language.translate('inventoryReports.col.itemCode'),
        this.language.translate('inventoryReports.col.itemName'),
        this.language.translate('inventoryReports.col.branch'),
        this.language.translate('inventoryReports.col.store'),
        this.language.translate('inventoryReports.col.unit'),
        this.language.translate('inventoryReports.col.available'),
        this.language.translate('inventoryReports.col.reserved'),
        this.language.translate('inventoryReports.col.value'),
      ],
      rows.map((row) => this.currentStockRow(row)),
    );
  }

  private currentStockRow(row: CurrentStockDetail): Array<string | number> {
    return [
      row.itemCode ?? '',
      row.itemName ?? '',
      row.branchName ?? '',
      row.storeName ?? '',
      row.baseUnitName ?? '',
      row.availableQuantity ?? 0,
      row.reservedQuantity ?? 0,
      row.totalStockValueWAC ?? 0,
    ];
  }
}
