import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AccountGroup } from '../../../../core/api/models/account-group.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AccountGroupsService } from '../../../../core/services/account-groups.service';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-account-groups-list',
  imports: [RouterLink, FormsModule, TranslatePipe],
  templateUrl: './account-groups-list.component.html',
  styleUrl: './account-groups-list.component.scss',
})
export class AccountGroupsListComponent implements OnInit {
  private accountGroupsService = inject(AccountGroupsService);
  private language = inject(LanguageService);

  accountGroups = signal<AccountGroup[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  deleteTarget = signal<AccountGroup | null>(null);
  deleting = signal(false);

  filteredAccountGroups = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.accountGroups();

    if (!term) {
      return list;
    }

    return list.filter((group) =>
      [group.groupName, group.description, group.groupId]
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
    this.loadAccountGroups();
  }

  loadAccountGroups(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.accountGroupsService.getAll().subscribe({
      next: (groups) => {
        this.accountGroups.set(groups);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('accountGroups.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  openDeleteDialog(group: AccountGroup): void {
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
    this.accountGroupsService.delete(group.groupId).subscribe({
      next: () => {
        this.accountGroups.update((list) => list.filter((item) => item.groupId !== group.groupId));
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.successMessage.set(this.language.translate('accountGroups.deleteSuccess'));
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('accountGroups.deleteError')),
        );
      },
    });
  }
}
