import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Branch } from '../../../../core/api/models/branch.models';
import { Store } from '../../../../core/api/models/store.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { BranchesService } from '../../../../core/services/branches.service';
import { LanguageService } from '../../../../core/services/language.service';
import { StoresService } from '../../../../core/services/stores.service';

type WarehouseFilter = 'all' | 'active';

@Component({
  selector: 'app-warehouses-list',
  imports: [RouterLink, FormsModule, TranslatePipe, DatePipe],
  templateUrl: './warehouses-list.component.html',
  styleUrl: './warehouses-list.component.scss',
})
export class WarehousesListComponent implements OnInit {
  private storesService = inject(StoresService);
  private branchesService = inject(BranchesService);
  private language = inject(LanguageService);

  stores = signal<Store[]>([]);
  branches = signal<Branch[]>([]);
  loading = signal(true);
  actionLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<WarehouseFilter>('all');
  branchFilter = signal<number | null>(null);
  deleteTarget = signal<Store | null>(null);

  branchNameById = computed(() => {
    const map = new Map<number, string>();
    for (const branch of this.branches()) {
      map.set(branch.branchId, branch.branchName ?? String(branch.branchId));
    }
    return map;
  });

  filteredStores = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    const branchId = this.branchFilter();
    const branchNames = this.branchNameById();
    let list = this.stores();

    if (filter === 'active') {
      list = list.filter((item) => item.status);
    }

    if (branchId != null) {
      list = list.filter((item) => item.branchId === branchId);
    }

    if (!term) {
      return list;
    }

    return list.filter((item) =>
      [
        item.storeName,
        item.locationStore,
        item.storeId,
        item.branchId != null ? branchNames.get(item.branchId) : null,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  });

  stats = computed(() => {
    const list = this.stores();
    let active = 0;

    for (const item of list) {
      if (item.status) {
        active += 1;
      }
    }

    return {
      total: list.length,
      active,
      inactive: list.length - active,
    };
  });

  hasActiveFilters = computed(
    () =>
      this.filter() !== 'all' ||
      this.branchFilter() != null ||
      this.searchTerm().trim().length > 0,
  );

  ngOnInit(): void {
    const navState = history.state as { successMessage?: string };
    if (navState?.successMessage) {
      this.successMessage.set(navState.successMessage);
      history.replaceState({}, '');
    }
    this.loadBranches();
    this.loadStores();
  }

  loadBranches(): void {
    this.branchesService.getAll().subscribe({
      next: (items) => this.branches.set(items),
    });
  }

  loadStores(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.storesService.getAll().subscribe({
      next: (items) => {
        this.stores.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('warehouses.loadError')),
        );
      },
    });
  }

  branchLabel(branchId: number | null | undefined): string {
    if (branchId == null) {
      return '—';
    }
    return this.branchNameById().get(branchId) ?? String(branchId);
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: WarehouseFilter): void {
    this.filter.set(filter);
  }

  onBranchFilterChange(value: string | number | null): void {
    this.branchFilter.set(value ? Number(value) : null);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.filter.set('all');
    this.branchFilter.set(null);
  }

  openDeleteDialog(store: Store): void {
    this.deleteTarget.set(store);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  closeDeleteDialog(): void {
    if (!this.actionLoading()) {
      this.deleteTarget.set(null);
    }
  }

  confirmDelete(): void {
    const store = this.deleteTarget();
    if (!store) {
      return;
    }

    this.actionLoading.set(true);

    this.storesService.delete(store.storeId).subscribe({
      next: () => {
        this.stores.update((list) => list.filter((row) => row.storeId !== store.storeId));
        this.actionLoading.set(false);
        this.deleteTarget.set(null);
        this.successMessage.set(this.language.translate('warehouses.deleteSuccess'));
      },
      error: (error) => {
        this.actionLoading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('warehouses.deleteError')),
        );
      },
    });
  }
}
