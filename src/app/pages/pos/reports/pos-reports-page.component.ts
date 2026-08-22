import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PosOrderListItem } from '../../../core/api/models/pos.models';
import { extractApiErrorMessage } from '../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { PosService } from '../../../core/services/pos.service';

@Component({
  selector: 'app-pos-reports-page',
  imports: [FormsModule, TranslatePipe, DecimalPipe, DatePipe, RouterLink],
  templateUrl: './pos-reports-page.component.html',
})
export class PosReportsPageComponent implements OnInit {
  private pos = inject(PosService);
  private language = inject(LanguageService);

  readonly titleKey = input('posAdmin.reports.title');
  readonly subtitleKey = input('posAdmin.reports.subtitle');
  readonly hintKey = input('');

  search = signal('');
  rows = signal<PosOrderListItem[]>([]);
  loading = signal(false);
  errorMessage = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.pos.getPaid(this.search().trim() || undefined).subscribe({
      next: (list) => {
        this.rows.set(list || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(err, this.language.translate('posAdmin.reports.loadError')),
        );
      },
    });
  }

  amount(row: PosOrderListItem): number {
    return Number(row.totalAmount ?? (row as { total?: number }).total ?? 0);
  }
}
