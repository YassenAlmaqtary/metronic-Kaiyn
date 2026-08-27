import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { Branch } from '../../../../core/api/models/branch.models';
import {
  ItemMovementDetail,
  ItemMovementReportResult,
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
  selector: 'app-item-movement-report',
  imports: [ReactiveFormsModule, TranslatePipe, DatePipe, DecimalPipe],
  templateUrl: './item-movement-report.component.html',
  styleUrl: './item-movement-report.component.scss',
})
export class ItemMovementReportComponent implements OnInit {
  private reportsService = inject(InventoryReportsService);
  private branchesService = inject(BranchesService);
  private storesService = inject(StoresService);
  private productsService = inject(ProductsService);
  private language = inject(LanguageService);

  branches = signal<Branch[]>([]);
  stores = signal<Store[]>([]);
  products = signal<ProductLookup[]>([]);
  report = signal<ItemMovementReportResult | null>(null);
  loading = signal(false);
  errorMessage = signal('');
  hasRun = signal(false);

  transactions = computed(() => this.report()?.transactions ?? []);

  filterForm = new FormGroup({
    itemId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    fromDate: new FormControl(this.firstDayOfYear(), { nonNullable: true }),
    toDate: new FormControl(this.todayIso(), { nonNullable: true }),
    branchId: new FormControl<number | null>(null),
    storeId: new FormControl<number | null>(null),
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

  todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  firstDayOfYear(): string {
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  }

  productLabel(product: ProductLookup): string {
    return [product.productName, product.proCode].filter(Boolean).join(' - ') || String(product.productId);
  }

  runReport(): void {
    this.filterForm.markAllAsTouched();
    if (this.filterForm.invalid) {
      return;
    }

    const value = this.filterForm.getRawValue();
    this.loading.set(true);
    this.errorMessage.set('');
    this.hasRun.set(true);

    this.reportsService
      .getItemMovement({
        itemId: value.itemId!,
        fromDate: value.fromDate ? `${value.fromDate}T00:00:00` : null,
        toDate: value.toDate ? `${value.toDate}T23:59:59` : null,
        branchId: value.branchId,
        storeId: value.storeId,
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
    const rows = this.transactions();
    if (!rows.length) {
      return;
    }

    downloadCsv(
      csvExportFilename('item-movement-report'),
      [
        this.language.translate('inventoryReports.col.date'),
        this.language.translate('inventoryReports.col.type'),
        this.language.translate('inventoryReports.col.operation'),
        this.language.translate('inventoryReports.col.store'),
        this.language.translate('inventoryReports.col.unit'),
        this.language.translate('inventoryReports.col.inward'),
        this.language.translate('inventoryReports.col.outward'),
        this.language.translate('inventoryReports.col.runningQty'),
      ],
      rows.map((row) => this.itemMovementRow(row)),
    );
  }

  private itemMovementRow(row: ItemMovementDetail): Array<string | number> {
    return [
      row.movementDate ?? '',
      row.movementTypeName ?? '',
      row.operationNumber ?? row.operationType ?? '',
      row.storeName ?? '',
      row.unitName ?? '',
      row.inward ?? 0,
      row.outward ?? 0,
      row.runningQuantity ?? 0,
    ];
  }
}
