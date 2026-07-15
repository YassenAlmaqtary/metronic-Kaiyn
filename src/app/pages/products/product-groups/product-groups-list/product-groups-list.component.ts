import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ProductGroup } from '../../../../core/api/models/product-group.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { ProductGroupsService } from '../../../../core/services/product-groups.service';
import { LanguageService } from '../../../../core/services/language.service';

type ProductGroupFilter = 'all' | 'active';

@Component({
  selector: 'app-product-groups-list',
  imports: [RouterLink, FormsModule, TranslatePipe],
  templateUrl: './product-groups-list.component.html',
  styleUrl: './product-groups-list.component.scss',
})
export class ProductGroupsListComponent implements OnInit {
  private productGroupsService = inject(ProductGroupsService);
  private language = inject(LanguageService);

  productGroups = signal<ProductGroup[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<ProductGroupFilter>('all');
  deleteTarget = signal<ProductGroup | null>(null);
  deleting = signal(false);

  filteredProductGroups = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    let list = this.productGroups();

    if (filter === 'active') {
      list = list.filter((group) => group.status !== false);
    }

    if (!term) {
      return list;
    }

    return list.filter((group) =>
      [group.groupName, group.groupId]
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
    this.loadProductGroups();
  }

  loadProductGroups(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.productGroupsService.getAll().subscribe({
      next: (groups) => {
        this.productGroups.set(groups);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('productGroups.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: ProductGroupFilter): void {
    this.filter.set(filter);
  }

  openDeleteDialog(group: ProductGroup): void {
    this.deleteTarget.set(group);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  closeDeleteDialog(): void {
    if (!this.deleting()) {
      this.deleteTarget.set(null);
    }
  }

  confirmDelete(): void {
    const group = this.deleteTarget();
    if (!group) {
      return;
    }

    this.deleting.set(true);
    this.productGroupsService.delete(group.groupId).subscribe({
      next: () => {
        this.productGroups.update((list) => list.filter((item) => item.groupId !== group.groupId));
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.successMessage.set(this.language.translate('productGroups.deleteSuccess'));
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('productGroups.deleteError')),
        );
      },
    });
  }
}
