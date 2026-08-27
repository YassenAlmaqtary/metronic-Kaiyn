import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { Branch } from '../../../../core/api/models/branch.models';
import {
  StockIssueReportResult,
  StockIssueReportRow,
} from '../../../../core/api/models/inventory-reports.models';
import { StockDocStatus } from '../../../../core/api/models/stock-shared.models';
import { Store } from '../../../../core/api/models/store.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { BranchesService } from '../../../../core/services/branches.service';
import { InventoryReportsService } from '../../../../core/services/inventory-reports.service';
import { LanguageService } from '../../../../core/services/language.service';
import { StoresService } from '../../../../core/services/stores.service';
import { csvExportFilename } from '../../../../core/utils/csv-export-filename';
import { downloadCsv } from '../../../../core/utils/download-csv';

@Component({
  selector: 'app-stock-issue-report',
  imports: [ReactiveFormsModule, TranslatePipe, DatePipe, DecimalPipe],
  templateUrl: './stock-issue-report.component.html',
  styleUrl: './stock-issue-report.component.scss',
})
export class StockIssueReportComponent implements OnInit {
  private reportsService = inject(InventoryReportsService);
  private branchesService = inject(BranchesService);
  private storesService = inject(StoresService);
  private language = inject(LanguageService);

  readonly StockDocStatus = StockDocStatus;

  branches = signal<Branch[]>([]);
  stores = signal<Store[]>([]);
  report = signal<StockIssueReportResult | null>(null);
  loading = signal(false);
  errorMessage = signal('');
  hasRun = signal(false);

  items = computed(() => this.report()?.items ?? []);

  filterForm = new FormGroup({
    fromDate: new FormControl(this.firstDayOfYear(), { nonNullable: true }),
    toDate: new FormControl(this.todayIso(), { nonNullable: true }),
    branchId: new FormControl<number | null>(null),
    storeId: new FormControl<number | null>(null),
    status: new FormControl(0, { nonNullable: true }),
    searchTerm: new FormControl('', { nonNullable: true }),
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
  }

  todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  firstDayOfYear(): string {
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  }

  runReport(): void {
    const value = this.filterForm.getRawValue();
    this.loading.set(true);
    this.errorMessage.set('');
    this.hasRun.set(true);

    this.reportsService
      .getStockIssueReport({
        fromDate: value.fromDate ? `${value.fromDate}T00:00:00` : null,
        toDate: value.toDate ? `${value.toDate}T23:59:59` : null,
        branchId: value.branchId,
        storeId: value.storeId,
        status: value.status,
        searchTerm: value.searchTerm.trim() || null,
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
      csvExportFilename('stock-issue-report'),
      [
        this.language.translate('inventoryReports.col.issueNo'),
        this.language.translate('inventoryReports.col.date'),
        this.language.translate('inventoryReports.col.branch'),
        this.language.translate('inventoryReports.col.store'),
        this.language.translate('inventoryReports.col.issueTo'),
        this.language.translate('inventoryReports.col.itemName'),
        this.language.translate('inventoryReports.col.unit'),
        this.language.translate('inventoryReports.col.qty'),
        this.language.translate('inventoryReports.col.price'),
        this.language.translate('inventoryReports.col.total'),
        this.language.translate('inventoryReports.col.status'),
      ],
      rows.map((row) => this.stockIssueRow(row)),
    );
  }

  private stockIssueRow(row: StockIssueReportRow): Array<string | number> {
    return [
      row.issueNumber ?? '',
      row.issueDate ?? '',
      row.branchName ?? '',
      row.storeName ?? '',
      row.issueToName ?? '',
      row.itemName ?? '',
      row.unitName ?? '',
      row.quantity ?? 0,
      row.price ?? 0,
      row.total ?? 0,
      row.statusName ?? '',
    ];
  }
}
