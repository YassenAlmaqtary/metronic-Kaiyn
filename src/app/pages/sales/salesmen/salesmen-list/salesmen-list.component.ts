import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Salesman } from '../../../../core/api/models/salesman.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { SalesmenService } from '../../../../core/services/salesmen.service';

type SalesmanFilter = 'all' | 'active';

@Component({
  selector: 'app-salesmen-list',
  imports: [RouterLink, FormsModule, TranslatePipe],
  templateUrl: './salesmen-list.component.html',
  styleUrl: './salesmen-list.component.scss',
})
export class SalesmenListComponent implements OnInit {
  private salesmenService = inject(SalesmenService);
  private language = inject(LanguageService);

  salesmen = signal<Salesman[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<SalesmanFilter>('all');
  deleteTarget = signal<Salesman | null>(null);
  deleting = signal(false);

  filteredSalesmen = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    let list = this.salesmen();

    if (filter === 'active') {
      list = list.filter((salesman) => salesman.isActive);
    }

    if (!term) {
      return list;
    }

    return list.filter((salesman) =>
      [salesman.salesmanNameAr, salesman.salesmanNameEn, salesman.phone, salesman.salesmanId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  });

  ngOnInit(): void {
    const navState = history.state as { successMessage?: string };
    if (navState?.successMessage) {
      this.successMessage.set(navState.successMessage);
      history.replaceState({}, '');
    }
    this.loadSalesmen();
  }

  salesmanLabel(salesman: Salesman): string {
    if (this.language.locale() === 'ar') {
      return salesman.salesmanNameAr || salesman.salesmanNameEn || String(salesman.salesmanId);
    }
    return salesman.salesmanNameEn || salesman.salesmanNameAr || String(salesman.salesmanId);
  }

  loadSalesmen(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.salesmenService.getAll().subscribe({
      next: (salesmen) => {
        this.salesmen.set(salesmen);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('salesmen.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: SalesmanFilter): void {
    this.filter.set(filter);
  }

  openDeleteDialog(salesman: Salesman): void {
    this.deleteTarget.set(salesman);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  closeDeleteDialog(): void {
    if (!this.deleting()) {
      this.deleteTarget.set(null);
    }
  }

  confirmDelete(): void {
    const salesman = this.deleteTarget();
    if (!salesman) {
      return;
    }

    this.deleting.set(true);
    this.salesmenService.delete(salesman.salesmanId).subscribe({
      next: () => {
        this.salesmen.update((list) =>
          list.filter((item) => item.salesmanId !== salesman.salesmanId),
        );
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.successMessage.set(this.language.translate('salesmen.deleteSuccess'));
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('salesmen.deleteError')),
        );
      },
    });
  }
}
