import { DatePipe, DecimalPipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/api/auth.service';
import { Branch } from '../../../core/api/models/branch.models';
import { TranslationKey } from '../../../core/i18n';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { BranchesService } from '../../../core/services/branches.service';
import {
  DashboardActionModule,
  DashboardLowStockItem,
  DashboardOverview,
  DashboardOverviewService,
  DashboardPendingAction,
} from '../../../core/services/dashboard-overview.service';
import { LanguageService } from '../../../core/services/language.service';
import { MetronicInitService } from '../../../core/services/metronic-init.service';

declare const ApexCharts: new (
  element: Element,
  options: Record<string, unknown>,
) => { render(): Promise<void>; destroy(): void };

const BRANCH_STORAGE_KEY = 'kayian.dashboard.branchId';

@Component({
  selector: 'app-index',
  imports: [TranslatePipe, RouterLink, DecimalPipe, DatePipe, FormsModule],
  templateUrl: './index.component.html',
  styleUrl: './index.component.scss',
})
export class IndexComponent implements OnInit, AfterViewInit {
  private overviewService = inject(DashboardOverviewService);
  private branchesService = inject(BranchesService);
  private auth = inject(AuthService);
  private language = inject(LanguageService);
  private metronicInit = inject(MetronicInitService);
  private destroyRef = inject(DestroyRef);

  readonly userName = this.auth.userName;

  loading = signal(true);
  errorMessage = signal('');
  overview = signal<DashboardOverview | null>(null);
  branches = signal<Branch[]>([]);
  selectedBranchId = signal<number | null>(this.readStoredBranch());

  private chart: { render(): Promise<void>; destroy(): void } | null = null;
  private viewReady = false;

  constructor() {
    effect(() => {
      this.language.locale();
      const data = this.overview();
      if (!this.viewReady || !data) {
        return;
      }
      setTimeout(() => this.renderSalesChart(data), 0);
    });
  }

  ngOnInit(): void {
    this.branchesService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => this.branches.set(items.filter((b) => b.isActive !== false)),
        error: () => this.branches.set([]),
      });
    this.load();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    setTimeout(() => {
      this.metronicInit.init();
      const data = this.overview();
      if (data) {
        this.renderSalesChart(data);
      }
    }, 0);
  }

  onBranchChange(value: string | number | null): void {
    const id = value === null || value === '' || value === 'null' ? null : Number(value);
    this.selectedBranchId.set(Number.isFinite(id as number) ? (id as number) : null);
    this.persistBranch(this.selectedBranchId());
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.overviewService
      .load(this.selectedBranchId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.overview.set(data);
          this.loading.set(false);
          setTimeout(() => this.renderSalesChart(data), 0);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set(this.language.translate('dashboard.loadError'));
        },
      });
  }

  moduleLabel(module: DashboardActionModule): TranslationKey {
    const map: Record<DashboardActionModule, TranslationKey> = {
      salesInvoice: 'dashboard.module.salesInvoice',
      stockReceiving: 'dashboard.module.stockReceiving',
      stockIssue: 'dashboard.module.stockIssue',
      stockTransfer: 'dashboard.module.stockTransfer',
      stockTaking: 'dashboard.module.stockTaking',
      stockAdjustment: 'dashboard.module.stockAdjustment',
    };
    return map[module];
  }

  moduleIcon(module: DashboardActionModule): string {
    switch (module) {
      case 'salesInvoice':
        return 'ki-filled ki-bill';
      case 'stockReceiving':
        return 'ki-filled ki-entrance-right';
      case 'stockIssue':
        return 'ki-filled ki-exit-right';
      case 'stockTransfer':
        return 'ki-filled ki-arrow-mix';
      case 'stockTaking':
        return 'ki-filled ki-questionnaire-tablet';
      case 'stockAdjustment':
        return 'ki-filled ki-price-tag';
      default:
        return 'ki-filled ki-document';
    }
  }

  trackPending(_: number, item: DashboardPendingAction): string {
    return item.id;
  }

  trackLowStock(_: number, item: DashboardLowStockItem): string {
    return item.id;
  }

  private readStoredBranch(): number | null {
    try {
      const raw = sessionStorage.getItem(BRANCH_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  }

  private persistBranch(branchId: number | null): void {
    try {
      if (branchId == null) {
        sessionStorage.removeItem(BRANCH_STORAGE_KEY);
      } else {
        sessionStorage.setItem(BRANCH_STORAGE_KEY, String(branchId));
      }
    } catch {
      // ignore storage errors
    }
  }

  private renderSalesChart(data: DashboardOverview): void {
    const element = document.querySelector('#erp_sales_chart');
    if (!element || typeof ApexCharts === 'undefined') {
      return;
    }

    this.chart?.destroy();
    this.chart = new ApexCharts(element, {
      series: [
        {
          name: this.language.translate('dashboard.salesChart'),
          data: data.salesSeries.map((p) => p.total),
        },
      ],
      chart: {
        height: 280,
        type: 'area',
        toolbar: { show: false },
        fontFamily: 'inherit',
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      stroke: {
        curve: 'smooth',
        show: true,
        width: 3,
        colors: ['var(--color-primary)'],
      },
      xaxis: {
        categories: data.salesSeries.map((p) => p.label),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: { colors: 'var(--color-muted-foreground)', fontSize: '11px' },
        },
      },
      yaxis: {
        min: 0,
        tickAmount: 4,
        labels: {
          style: { colors: 'var(--color-muted-foreground)', fontSize: '11px' },
          formatter: (value: number) => this.formatCompact(value),
        },
      },
      markers: { size: 0 },
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: 0.28, opacityTo: 0.02, stops: [0, 100] },
      },
      grid: {
        borderColor: 'var(--color-border)',
        strokeDashArray: 4,
        yaxis: { lines: { show: true } },
        xaxis: { lines: { show: false } },
      },
      tooltip: {
        y: {
          formatter: (value: number) => this.formatCompact(value),
        },
      },
    });

    void this.chart.render();
  }

  private formatCompact(value: number): string {
    const n = Number(value) || 0;
    if (n >= 1_000_000) {
      return `${(n / 1_000_000).toFixed(1)}M`;
    }
    if (n >= 1_000) {
      return `${(n / 1_000).toFixed(1)}K`;
    }
    return n.toFixed(0);
  }
}
