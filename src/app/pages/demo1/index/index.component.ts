import { DatePipe, DecimalPipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { AuthService } from '../../../core/api/auth.service';
import { Branch } from '../../../core/api/models/branch.models';
import { TranslationKey } from '../../../core/i18n';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AccessControlService } from '../../../core/services/access-control.service';
import { BranchesService } from '../../../core/services/branches.service';
import {
  DashboardActionModule,
  DashboardLowStockItem,
  DashboardOverview,
  DashboardOverviewService,
  DashboardPendingAction,
  DashboardRecentKind,
  DashboardRecentOp,
} from '../../../core/services/dashboard-overview.service';
import { LanguageService } from '../../../core/services/language.service';
import { MetronicInitService } from '../../../core/services/metronic-init.service';
import { downloadCsv } from '../../../core/utils/download-csv';

type ApexChartInstance = { render(): Promise<void>; destroy(): void };

declare const ApexCharts: new (element: Element, options: Record<string, unknown>) => ApexChartInstance;

const BRANCH_STORAGE_KEY = 'kayian.dashboard.branchId';

@Component({
  selector: 'app-index',
  imports: [TranslatePipe, RouterLink, DecimalPipe, DatePipe, FormsModule],
  templateUrl: './index.component.html',
  styleUrl: './index.component.scss',
})
export class IndexComponent implements OnInit, AfterViewInit, OnDestroy {
  private overviewService = inject(DashboardOverviewService);
  private branchesService = inject(BranchesService);
  private access = inject(AccessControlService);
  private auth = inject(AuthService);
  private language = inject(LanguageService);
  private metronicInit = inject(MetronicInitService);
  private destroyRef = inject(DestroyRef);

  readonly userName = this.auth.userName;
  readonly today = new Date();

  loading = signal(true);
  errorMessage = signal('');
  overview = signal<DashboardOverview | null>(null);
  branches = signal<Branch[]>([]);
  selectedBranchId = signal<number | null>(this.resolveInitialBranch());

  private charts = new Map<string, ApexChartInstance>();
  private viewReady = false;

  constructor() {
    effect(() => {
      this.language.locale();
      const data = this.overview();
      if (!this.viewReady || !data) {
        return;
      }
      setTimeout(() => this.renderAllCharts(data), 0);
    });
  }

  ngOnInit(): void {
    this.branchesService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          const active = items.filter((b) => b.isActive !== false);
          const allowedIds = new Set(
            (this.auth.user()?.branches ?? []).map((b) => b.branchId).filter(Boolean),
          );
          this.branches.set(
            allowedIds.size ? active.filter((b) => allowedIds.has(b.branchId)) : active,
          );
        },
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
        this.renderAllCharts(data);
      }
    }, 0);
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  greetingKey(): TranslationKey {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'dashboard.greeting.morning';
    }
    if (hour < 17) {
      return 'dashboard.greeting.afternoon';
    }
    return 'dashboard.greeting.evening';
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
    const branchId = this.selectedBranchId();

    this.access
      .load(branchId)
      .pipe(
        switchMap(() => this.overviewService.load(branchId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data) => {
          this.overview.set(data);
          this.loading.set(false);
          setTimeout(() => this.renderAllCharts(data), 0);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set(this.language.translate('dashboard.loadError'));
        },
      });
  }

  weekSalesTotal(data: DashboardOverview): number {
    return data.salesSeries.reduce((sum, p) => sum + p.total, 0);
  }

  kpiShare(part: number, whole: number): number {
    if (!whole || whole <= 0) {
      return part > 0 ? 100 : 0;
    }
    return Math.min(100, Math.round((part / whole) * 100));
  }

  customersMeter(count: number): number {
    return Math.min(100, Math.max(8, count * 12));
  }

  weekPeak(data: DashboardOverview): { label: string; total: number } | null {
    if (!data.salesSeries.length) {
      return null;
    }
    const peak = data.salesSeries.reduce((best, p) => (p.total > best.total ? p : best));
    if (peak.total <= 0) {
      return null;
    }
    return {
      label: this.language.translate(peak.weekday as TranslationKey),
      total: peak.total,
    };
  }

  cashIn(data: DashboardOverview): number {
    return data.recentOperations.filter((x) => x.amount > 0).reduce((s, x) => s + x.amount, 0);
  }

  cashOut(data: DashboardOverview): number {
    return data.recentOperations
      .filter((x) => x.amount < 0)
      .reduce((s, x) => s + Math.abs(x.amount), 0);
  }

  exportPending(data: DashboardOverview): void {
    downloadCsv(
      `pending-docs-${this.toFileStamp()}.csv`,
      [
        this.language.translate('dashboard.export.module'),
        this.language.translate('dashboard.export.title'),
        this.language.translate('dashboard.export.subtitle'),
        this.language.translate('dashboard.export.date'),
        this.language.translate('dashboard.export.ageDays'),
        this.language.translate('dashboard.export.stale'),
      ],
      data.pendingActions.map((item) => [
        this.language.translate(this.moduleLabel(item.module)),
        item.title,
        item.subtitle,
        item.date ?? '',
        item.ageDays,
        item.isStale ? '1' : '0',
      ]),
    );
  }

  exportLowStock(data: DashboardOverview): void {
    downloadCsv(
      `low-stock-${this.toFileStamp()}.csv`,
      [
        this.language.translate('dashboard.export.item'),
        this.language.translate('dashboard.export.code'),
        this.language.translate('dashboard.export.store'),
        this.language.translate('dashboard.lowStockAvailable'),
        this.language.translate('dashboard.lowStockMin'),
      ],
      data.lowStockItems.map((item) => [
        item.itemName,
        item.itemCode ?? '',
        item.storeName ?? item.branchName ?? '',
        item.availableQty,
        item.minQty,
      ]),
    );
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

  recentKindLabel(kind: DashboardRecentKind): TranslationKey {
    const map: Record<DashboardRecentKind, TranslationKey> = {
      salesInvoice: 'dashboard.recent.salesInvoice',
      paymentVoucher: 'dashboard.recent.paymentVoucher',
      receiptVoucher: 'dashboard.recent.receiptVoucher',
      stockReceiving: 'dashboard.recent.stockReceiving',
    };
    return map[kind];
  }

  recentKindIcon(kind: DashboardRecentKind): string {
    switch (kind) {
      case 'salesInvoice':
        return 'ki-filled ki-bill';
      case 'paymentVoucher':
        return 'ki-filled ki-arrow-up-right';
      case 'receiptVoucher':
        return 'ki-filled ki-arrow-down-left';
      case 'stockReceiving':
        return 'ki-filled ki-entrance-right';
      default:
        return 'ki-filled ki-document';
    }
  }

  relativeTime(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) {
      return this.language.translate('dashboard.time.justNow');
    }
    if (mins < 60) {
      return `${mins} ${this.language.translate('dashboard.time.minutesAgo')}`;
    }
    const hours = Math.floor(mins / 60);
    if (hours < 24) {
      return `${hours} ${this.language.translate('dashboard.time.hoursAgo')}`;
    }
    const days = Math.floor(hours / 24);
    return `${days} ${this.language.translate('dashboard.time.daysAgo')}`;
  }

  formatSigned(amount: number): string {
    const n = Number(amount) || 0;
    const abs = Math.abs(n).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return n >= 0 ? `+${abs}` : `-${abs}`;
  }

  stockRatio(item: DashboardLowStockItem): number {
    if (!item.minQty) {
      return 0;
    }
    return Math.min(100, Math.round((item.availableQty / item.minQty) * 100));
  }

  trackPending(_: number, item: DashboardPendingAction): string {
    return item.id;
  }

  trackLowStock(_: number, item: DashboardLowStockItem): string {
    return item.id;
  }

  trackRecent(_: number, item: DashboardRecentOp): string {
    return item.id;
  }

  private resolveInitialBranch(): number | null {
    const stored = this.readStoredBranch();
    if (stored != null) {
      return stored;
    }
    const user = this.auth.user();
    return user?.defaultBranchId ?? user?.branches?.find((b) => b.isDefault)?.branchId ?? null;
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
      // ignore
    }
  }

  private toFileStamp(): string {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }

  private destroyCharts(): void {
    for (const chart of this.charts.values()) {
      try {
        chart.destroy();
      } catch {
        // ignore
      }
    }
    this.charts.clear();
  }

  private upsertChart(id: string, options: Record<string, unknown>): void {
    const element = document.querySelector(`#${id}`);
    if (!element || typeof ApexCharts === 'undefined') {
      return;
    }
    this.charts.get(id)?.destroy();
    const chart = new ApexCharts(element, options);
    this.charts.set(id, chart);
    void chart.render();
  }

  private renderAllCharts(data: DashboardOverview): void {
    if (typeof ApexCharts === 'undefined') {
      return;
    }
    this.renderSparkline('erp_spark_sales', data.salesSeries.map((p) => p.total), '#22c55e');
    this.renderSalesChart(data);
    this.renderCashflowChart(data);
    this.renderAttentionChart(data);
    this.renderLowStockChart(data);
  }

  private renderSparkline(id: string, data: number[], color: string): void {
    this.upsertChart(id, {
      series: [{ data }],
      chart: {
        type: 'area',
        height: 54,
        sparkline: { enabled: true },
        animations: { enabled: true, speed: 700 },
      },
      stroke: { curve: 'smooth', width: 2.5 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.02,
          stops: [0, 100],
        },
      },
      colors: [color],
      tooltip: { enabled: false },
    });
  }

  private renderSalesChart(data: DashboardOverview): void {
    const categories = data.salesSeries.map((p) =>
      this.language.translate(p.weekday as TranslationKey),
    );

    this.upsertChart('erp_sales_chart', {
      series: [
        {
          name: this.language.translate('dashboard.salesChartAmount'),
          type: 'area',
          data: data.salesSeries.map((p) => p.total),
        },
        {
          name: this.language.translate('dashboard.salesChartCount'),
          type: 'column',
          data: data.salesSeries.map((p) => p.count),
        },
      ],
      chart: {
        height: 340,
        type: 'line',
        toolbar: { show: false },
        fontFamily: 'inherit',
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800,
          animateGradually: { enabled: true, delay: 120 },
        },
        dropShadow: {
          enabled: true,
          top: 8,
          left: 0,
          blur: 12,
          opacity: 0.12,
          color: '#2563eb',
        },
      },
      colors: ['#2563eb', '#93c5fd'],
      stroke: {
        width: [3.5, 0],
        curve: 'smooth',
      },
      fill: {
        type: ['gradient', 'solid'],
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 90, 100],
        },
        opacity: [1, 0.7],
      },
      plotOptions: {
        bar: {
          borderRadius: 7,
          columnWidth: '38%',
        },
      },
      dataLabels: { enabled: false },
      markers: {
        size: 0,
        hover: { size: 6 },
        strokeWidth: 2,
        strokeColors: '#fff',
      },
      legend: {
        show: true,
        position: 'top',
        horizontalAlign: 'start',
        fontSize: '12px',
        labels: { colors: 'var(--color-muted-foreground)' },
        markers: { size: 5, shape: 'circle' },
        itemMargin: { horizontal: 12 },
      },
      xaxis: {
        categories,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: { colors: 'var(--color-muted-foreground)', fontSize: '12px', fontWeight: 500 },
        },
      },
      yaxis: [
        {
          min: 0,
          tickAmount: 4,
          labels: {
            style: { colors: 'var(--color-muted-foreground)', fontSize: '11px' },
            formatter: (value: number) => this.formatCompact(value),
          },
        },
        {
          opposite: true,
          min: 0,
          tickAmount: 4,
          labels: {
            style: { colors: 'var(--color-muted-foreground)', fontSize: '11px' },
            formatter: (value: number) => String(Math.round(value)),
          },
        },
      ],
      grid: {
        borderColor: 'var(--color-border)',
        strokeDashArray: 5,
        padding: { left: 6, right: 6, top: 0 },
        yaxis: { lines: { show: true } },
        xaxis: { lines: { show: false } },
      },
      tooltip: {
        shared: true,
        intersect: false,
        theme: 'light',
        style: { fontSize: '12px' },
        y: {
          formatter: (value: number, opts?: { seriesIndex?: number }) =>
            opts?.seriesIndex === 1 ? String(Math.round(value)) : this.formatMoney(value),
        },
      },
    });
  }

  private renderCashflowChart(data: DashboardOverview): void {
    const inflow = this.cashIn(data);
    const outflow = this.cashOut(data);
    if (inflow <= 0 && outflow <= 0) {
      this.charts.get('erp_cashflow_chart')?.destroy();
      this.charts.delete('erp_cashflow_chart');
      return;
    }

    this.upsertChart('erp_cashflow_chart', {
      series: [inflow || 0.01, outflow || 0.01],
      labels: [
        this.language.translate('dashboard.chart.cashIn'),
        this.language.translate('dashboard.chart.cashOut'),
      ],
      chart: {
        type: 'donut',
        height: 280,
        fontFamily: 'inherit',
        animations: { enabled: true, speed: 700 },
      },
      colors: ['#22c55e', '#ef4444'],
      stroke: { width: 0 },
      legend: {
        position: 'bottom',
        fontSize: '12px',
        labels: { colors: 'var(--color-muted-foreground)' },
      },
      dataLabels: { enabled: false },
      plotOptions: {
        pie: {
          donut: {
            size: '74%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '12px',
                color: 'var(--color-muted-foreground)',
              },
              value: {
                show: true,
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--color-foreground)',
                formatter: (val: string) => this.formatCompact(Number(val)),
              },
              total: {
                show: true,
                label: this.language.translate('dashboard.chart.cashNet'),
                fontSize: '12px',
                color: 'var(--color-muted-foreground)',
                formatter: () => this.formatCompact(inflow - outflow),
              },
            },
          },
        },
      },
      tooltip: {
        y: { formatter: (value: number) => this.formatMoney(value) },
      },
    });
  }

  private renderAttentionChart(data: DashboardOverview): void {
    if (!data.attentionMix.length) {
      this.charts.get('erp_attention_chart')?.destroy();
      this.charts.delete('erp_attention_chart');
      return;
    }

    const labelMap: Record<string, TranslationKey> = {
      drafts: 'dashboard.chart.attention.drafts',
      pending: 'dashboard.chart.attention.pending',
      lowStock: 'dashboard.chart.attention.lowStock',
      stale: 'dashboard.chart.attention.stale',
    };

    this.upsertChart('erp_attention_chart', {
      series: [{ name: this.language.translate('dashboard.chart.attentionSeries'), data: data.attentionMix.map((x) => x.value) }],
      chart: {
        type: 'bar',
        height: 280,
        toolbar: { show: false },
        fontFamily: 'inherit',
        animations: { enabled: true, speed: 700 },
      },
      colors: ['#6366f1', '#f59e0b', '#ef4444', '#0ea5e9'],
      plotOptions: {
        bar: {
          distributed: true,
          borderRadius: 8,
          columnWidth: '52%',
          dataLabels: { position: 'top' },
        },
      },
      dataLabels: {
        enabled: true,
        offsetY: -18,
        style: { fontSize: '11px', colors: ['var(--color-muted-foreground)'], fontWeight: 600 },
      },
      legend: { show: false },
      xaxis: {
        categories: data.attentionMix.map((x) =>
          this.language.translate(labelMap[x.key] ?? 'dashboard.chart.attentionSeries'),
        ),
        labels: {
          style: { colors: 'var(--color-muted-foreground)', fontSize: '11px' },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        min: 0,
        tickAmount: 4,
        labels: {
          style: { colors: 'var(--color-muted-foreground)', fontSize: '11px' },
          formatter: (v: number) => String(Math.round(v)),
        },
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 0.25,
          opacityFrom: 0.95,
          opacityTo: 0.7,
          stops: [0, 100],
        },
      },
      grid: {
        borderColor: 'var(--color-border)',
        strokeDashArray: 5,
        yaxis: { lines: { show: true } },
        xaxis: { lines: { show: false } },
      },
      tooltip: {
        y: { formatter: (v: number) => String(v) },
      },
    });
  }

  private renderLowStockChart(data: DashboardOverview): void {
    if (!data.lowStockBars.length) {
      this.charts.get('erp_low_stock_chart')?.destroy();
      this.charts.delete('erp_low_stock_chart');
      return;
    }

    this.upsertChart('erp_low_stock_chart', {
      series: [
        {
          name: this.language.translate('dashboard.lowStockAvailable'),
          data: data.lowStockBars.map((x) => x.available),
        },
        {
          name: this.language.translate('dashboard.lowStockMin'),
          data: data.lowStockBars.map((x) => x.min),
        },
      ],
      chart: {
        type: 'bar',
        height: Math.max(280, data.lowStockBars.length * 40),
        toolbar: { show: false },
        fontFamily: 'inherit',
        animations: { enabled: true, speed: 700 },
      },
      colors: ['#f59e0b', '#94a3b8'],
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 5,
          barHeight: '64%',
        },
      },
      dataLabels: { enabled: false },
      legend: {
        position: 'top',
        horizontalAlign: 'start',
        fontSize: '12px',
        labels: { colors: 'var(--color-muted-foreground)' },
      },
      xaxis: {
        categories: data.lowStockBars.map((x) => x.name),
        labels: {
          style: { colors: 'var(--color-muted-foreground)', fontSize: '11px' },
        },
      },
      yaxis: {
        labels: {
          style: { colors: 'var(--color-foreground)', fontSize: '11px' },
          maxWidth: 120,
        },
      },
      grid: {
        borderColor: 'var(--color-border)',
        strokeDashArray: 5,
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: { formatter: (v: number) => this.formatCompact(v) },
      },
    });
  }

  private formatMoney(value: number): string {
    return (Number(value) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  private formatCompact(value: number): string {
    const n = Number(value) || 0;
    if (Math.abs(n) >= 1_000_000) {
      return `${(n / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(n) >= 1_000) {
      return `${(n / 1_000).toFixed(1)}K`;
    }
    return n.toFixed(0);
  }
}
