import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  ItemAccountingItemType,
  ItemAccountingPolicy,
} from '../../../../core/api/models/item-accounting-policy.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { ItemAccountingPoliciesService } from '../../../../core/services/item-accounting-policies.service';
import { LanguageService } from '../../../../core/services/language.service';
import { csvExportFilename } from '../../../../core/utils/csv-export-filename';
import { downloadCsv } from '../../../../core/utils/download-csv';

type PolicyFilter = 'all' | 'active';

@Component({
  selector: 'app-item-accounting-policies-list',
  imports: [RouterLink, FormsModule, TranslatePipe],
  templateUrl: './item-accounting-policies-list.component.html',
})
export class ItemAccountingPoliciesListComponent implements OnInit {
  private policiesService = inject(ItemAccountingPoliciesService);
  private language = inject(LanguageService);

  policies = signal<ItemAccountingPolicy[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<PolicyFilter>('all');
  deleteTarget = signal<ItemAccountingPolicy | null>(null);
  deleting = signal(false);

  filteredPolicies = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    let list = this.policies();

    if (filter === 'active') {
      list = list.filter((item) => item.isActive);
    }

    if (!term) {
      return list;
    }

    return list.filter((item) =>
      [
        item.policyCode,
        item.policyName,
        item.notes,
        this.itemTypeLabel(item.itemType),
        item.policyId,
      ]
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
    this.loadPolicies();
  }

  policyLabel(item: ItemAccountingPolicy): string {
    return item.policyName || item.policyCode || String(item.policyId);
  }

  itemTypeLabel(itemType: number): string {
    switch (itemType) {
      case ItemAccountingItemType.Inventory:
        return this.t('itemAccountingPolicies.itemType.inventory');
      case ItemAccountingItemType.Service:
        return this.t('itemAccountingPolicies.itemType.service');
      case ItemAccountingItemType.Asset:
        return this.t('itemAccountingPolicies.itemType.asset');
      case ItemAccountingItemType.Other:
        return this.t('itemAccountingPolicies.itemType.other');
      default:
        return String(itemType);
    }
  }

  private t(key: string): string {
    return this.language.translate(key as TranslationKey);
  }

  loadPolicies(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.policiesService.getAll().subscribe({
      next: (policies) => {
        this.policies.set(policies);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.t('itemAccountingPolicies.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: PolicyFilter): void {
    this.filter.set(filter);
  }

  exportCsv(): void {
    downloadCsv(
      csvExportFilename('item-accounting-policies'),
      [
        this.t('itemAccountingPolicies.policyCode'),
        this.t('itemAccountingPolicies.policyName'),
        this.t('itemAccountingPolicies.itemType'),
        this.t('itemAccountingPolicies.status'),
      ],
      this.filteredPolicies().map((item) => [
        item.policyCode ?? '',
        item.policyName ?? '',
        this.itemTypeLabel(item.itemType),
        item.isActive
          ? this.t('itemAccountingPolicies.active')
          : this.t('itemAccountingPolicies.inactive'),
      ]),
    );
  }

  openDeleteDialog(item: ItemAccountingPolicy): void {
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
    this.policiesService.delete(item.policyId).subscribe({
      next: () => {
        this.policies.update((list) =>
          list.filter((entry) => entry.policyId !== item.policyId),
        );
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.successMessage.set(this.t('itemAccountingPolicies.deleteSuccess'));
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.t('itemAccountingPolicies.deleteError')),
        );
      },
    });
  }
}
