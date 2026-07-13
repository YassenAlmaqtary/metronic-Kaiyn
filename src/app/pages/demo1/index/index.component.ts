import { AfterViewInit, Component, effect, inject } from '@angular/core';

import { TranslationKey } from '../../../core/i18n';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { MetronicInitService } from '../../../core/services/metronic-init.service';
import {
  DASHBOARD_MONTH_KEYS,
  DASHBOARD_RATING_STARS,
  DASHBOARD_TEAMS,
  DashboardTeamRow,
} from './dashboard-teams.data';

declare const ApexCharts: new (
  element: Element,
  options: Record<string, unknown>,
) => { render(): Promise<void>; destroy(): void };

@Component({
  selector: 'app-index',
  imports: [TranslatePipe],
  templateUrl: './index.component.html',
  styleUrl: './index.component.scss',
})
export class IndexComponent implements AfterViewInit {
  private metronicInitService = inject(MetronicInitService);
  private languageService = inject(LanguageService);

  readonly teams: DashboardTeamRow[] = DASHBOARD_TEAMS;
  readonly ratingStars = DASHBOARD_RATING_STARS;

  private earningsChart: { render(): Promise<void>; destroy(): void } | null = null;
  private viewInitialized = false;

  constructor() {
    effect(() => {
      this.languageService.locale();

      if (!this.viewInitialized) {
        return;
      }

      setTimeout(() => {
        this.metronicInitService.init();
        this.initEarningsChart();
      }, 0);
    });
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;

    setTimeout(() => {
      this.metronicInitService.init();
      this.initEarningsChart();
    }, 0);
  }

  isStarChecked(rating: number, star: number): boolean {
    return rating >= star;
  }

  isStarHalf(rating: number, star: number): boolean {
    return rating >= star - 0.5 && rating < star;
  }

  private initEarningsChart(): void {
    const element = document.querySelector('#earnings_chart');
    if (!element || typeof ApexCharts === 'undefined') {
      return;
    }

    this.earningsChart?.destroy();

    const data = [75, 25, 45, 15, 85, 35, 70, 25, 35, 15, 45, 30];
    const categories = DASHBOARD_MONTH_KEYS.map((key) =>
      this.languageService.translate(key as TranslationKey),
    );

    this.earningsChart = new ApexCharts(element, {
      series: [{ name: 'series1', data }],
      chart: { height: 250, type: 'area', toolbar: { show: false } },
      dataLabels: { enabled: false },
      legend: { show: false },
      stroke: { curve: 'smooth', show: true, width: 3, colors: ['var(--color-primary)'] },
      xaxis: {
        categories,
        axisBorder: { show: false },
        maxTicks: 12,
        axisTicks: { show: false },
        labels: { style: { colors: 'var(--color-muted-foreground)', fontSize: '12px' } },
      },
      yaxis: {
        min: 0,
        max: 100,
        tickAmount: 5,
        axisTicks: { show: false },
        labels: {
          style: { colors: 'var(--color-muted-foreground)', fontSize: '12px' },
          formatter: (value: number) => `$${value}K`,
        },
      },
      markers: { size: 0 },
      fill: { gradient: { enabled: true, opacityFrom: 0.25, opacityTo: 0 } },
      grid: {
        borderColor: 'var(--color-border)',
        strokeDashArray: 5,
        yaxis: { lines: { show: true } },
        xaxis: { lines: { show: false } },
      },
    });

    void this.earningsChart.render();
  }
}
