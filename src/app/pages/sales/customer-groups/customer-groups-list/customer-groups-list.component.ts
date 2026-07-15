import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CustomerGroup } from '../../../../core/api/models/customer-group.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { CustomerGroupsService } from '../../../../core/services/customer-groups.service';
import { LanguageService } from '../../../../core/services/language.service';

type CustomerGroupFilter = 'all' | 'active';

@Component({
  selector: 'app-customer-groups-list',
  imports: [RouterLink, FormsModule, TranslatePipe],
  templateUrl: './customer-groups-list.component.html',
  styleUrl: './customer-groups-list.component.scss',
})
export class CustomerGroupsListComponent implements OnInit {
  private customerGroupsService = inject(CustomerGroupsService);
  private language = inject(LanguageService);

  customerGroups = signal<CustomerGroup[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<CustomerGroupFilter>('all');
  deleteTarget = signal<CustomerGroup | null>(null);
  deleting = signal(false);

  filteredCustomerGroups = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    let list = this.customerGroups();

    if (filter === 'active') {
      list = list.filter((group) => group.isActive);
    }

    if (!term) {
      return list;
    }

    return list.filter((group) =>
      [group.groupNameAr, group.groupNameEn, group.accountName, group.groupId]
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
    this.loadCustomerGroups();
  }

  groupLabel(group: CustomerGroup): string {
    if (this.language.locale() === 'ar') {
      return group.groupNameAr || group.groupNameEn || String(group.groupId);
    }
    return group.groupNameEn || group.groupNameAr || String(group.groupId);
  }

  loadCustomerGroups(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.customerGroupsService.getAll().subscribe({
      next: (groups) => {
        this.customerGroups.set(groups);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('customerGroups.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: CustomerGroupFilter): void {
    this.filter.set(filter);
  }

  openDeleteDialog(group: CustomerGroup): void {
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
    this.customerGroupsService.delete(group.groupId).subscribe({
      next: () => {
        this.customerGroups.update((list) => list.filter((item) => item.groupId !== group.groupId));
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.successMessage.set(this.language.translate('customerGroups.deleteSuccess'));
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('customerGroups.deleteError')),
        );
      },
    });
  }
}
