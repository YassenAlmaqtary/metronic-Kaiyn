import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CostCenter } from '../../../../core/api/models/cost-center.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { CostCentersService } from '../../../../core/services/cost-centers.service';
import { LanguageService } from '../../../../core/services/language.service';

type CostCenterFilter = 'all' | 'active';

@Component({
  selector: 'app-cost-centers-list',
  imports: [RouterLink, FormsModule, TranslatePipe],
  templateUrl: './cost-centers-list.component.html',
  styleUrl: './cost-centers-list.component.scss',
})
export class CostCentersListComponent implements OnInit {
  private costCentersService = inject(CostCentersService);
  private language = inject(LanguageService);

  costCenters = signal<CostCenter[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<CostCenterFilter>('all');
  deleteTarget = signal<CostCenter | null>(null);
  deleting = signal(false);

  filteredCostCenters = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    let list = this.costCenters();

    if (filter === 'active') {
      list = list.filter((item) => item.isActive);
    }

    if (!term) {
      return list;
    }

    return list.filter((item) =>
      [item.costCenterCode, item.costCenterName, item.fullPath, item.costCenterId]
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
    this.loadCostCenters();
  }

  loadCostCenters(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.costCentersService.getAll().subscribe({
      next: (items) => {
        this.costCenters.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('costCenters.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: CostCenterFilter): void {
    this.filter.set(filter);
  }

  openDeleteDialog(item: CostCenter): void {
    this.deleteTarget.set(item);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  closeDeleteDialog(): void {
    if (!this.deleting()) {
      this.deleteTarget.set(null);
    }
  }

  confirmDelete(): void {
    const item = this.deleteTarget();
    if (!item) {
      return;
    }

    this.deleting.set(true);
    this.costCentersService.delete(item.costCenterId).subscribe({
      next: () => {
        this.costCenters.update((list) =>
          list.filter((row) => row.costCenterId !== item.costCenterId),
        );
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.successMessage.set(this.language.translate('costCenters.deleteSuccess'));
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('costCenters.deleteError')),
        );
      },
    });
  }
}
