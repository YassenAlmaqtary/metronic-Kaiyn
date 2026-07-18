import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  Account,
  AccountCategory,
  AccountNatureType,
  AccountStructureType,
  AccountTreeNode,
} from '../../../../core/api/models/account.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AccountsService } from '../../../../core/services/accounts.service';
import { LanguageService } from '../../../../core/services/language.service';
import {
  buildAccountTree,
  collectAllParentIds,
  collectAncestorIds,
  flattenVisibleAccountTree,
} from '../../../../core/utils/account-tree.util';

type AccountFilter = 'all' | 'active' | 'stopped';

@Component({
  selector: 'app-accounts-tree',
  imports: [RouterLink, FormsModule, TranslatePipe],
  templateUrl: './accounts-tree.component.html',
  styleUrl: './accounts-tree.component.scss',
})
export class AccountsTreeComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private language = inject(LanguageService);
  private router = inject(Router);

  readonly AccountStructureType = AccountStructureType;

  accounts = signal<Account[]>([]);
  treeRoots = signal<AccountTreeNode[]>([]);
  expandedIds = signal<Set<number>>(new Set());
  selectedId = signal<number | null>(null);
  loading = signal(true);
  deleting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<AccountFilter>('all');
  deleteTarget = signal<AccountTreeNode | null>(null);

  selectedAccount = computed(() => {
    const id = this.selectedId();
    if (id == null) {
      return null;
    }
    return this.accounts().find((account) => account.accId === id) ?? null;
  });

  selectedChildrenCount = computed(() => {
    const id = this.selectedId();
    if (id == null) {
      return 0;
    }
    return this.accounts().filter((account) => account.accParent === id).length;
  });

  visibleNodes = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    let list = this.accounts();

    if (filter === 'active') {
      list = list.filter((account) => account.accStopped !== true);
    } else if (filter === 'stopped') {
      list = list.filter((account) => account.accStopped === true);
    }

    if (term) {
      const matched = list.filter((account) =>
        [account.accCode, account.accName, account.accName2]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term)),
      );
      const matchIds = matched.map((account) => account.accId);
      const keepIds = new Set<number>([
        ...matchIds,
        ...collectAncestorIds(this.accounts(), matchIds),
      ]);
      list = this.accounts().filter((account) => keepIds.has(account.accId));
    }

    const roots = buildAccountTree(list);
    return flattenVisibleAccountTree(roots, this.expandedIds());
  });

  ngOnInit(): void {
    const navState = history.state as { successMessage?: string; selectId?: number };
    if (navState?.successMessage) {
      this.successMessage.set(navState.successMessage);
    }
    if (navState?.selectId) {
      this.selectedId.set(navState.selectId);
    }
    history.replaceState({}, '');
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.accountsService.getAll().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        const roots = buildAccountTree(accounts);
        this.treeRoots.set(roots);

        const currentExpanded = this.expandedIds();
        if (currentExpanded.size === 0) {
          // Expand first two levels by default for ERP readability.
          const initial = new Set<number>();
          for (const root of roots) {
            if (root.hasChildren) {
              initial.add(root.accId);
            }
          }
          this.expandedIds.set(initial);
        }

        const selected = this.selectedId();
        if (selected != null && !accounts.some((account) => account.accId === selected)) {
          this.selectedId.set(null);
        }

        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('accounts.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    const term = value.trim().toLowerCase();
    if (!term) {
      return;
    }

    const matched = this.accounts().filter((account) =>
      [account.accCode, account.accName, account.accName2]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
    const ancestors = collectAncestorIds(
      this.accounts(),
      matched.map((account) => account.accId),
    );
    this.expandedIds.update((current) => new Set([...current, ...ancestors]));
  }

  setFilter(filter: AccountFilter): void {
    this.filter.set(filter);
  }

  toggleExpand(node: AccountTreeNode, event: Event): void {
    event.stopPropagation();
    if (!node.hasChildren) {
      return;
    }

    this.expandedIds.update((current) => {
      const next = new Set(current);
      if (next.has(node.accId)) {
        next.delete(node.accId);
      } else {
        next.add(node.accId);
      }
      return next;
    });
  }

  expandAll(): void {
    this.expandedIds.set(collectAllParentIds(this.treeRoots()));
  }

  collapseAll(): void {
    this.expandedIds.set(new Set());
  }

  selectAccount(node: AccountTreeNode): void {
    this.selectedId.set(node.accId);
  }

  isExpanded(id: number): boolean {
    return this.expandedIds().has(id);
  }

  typeLabel(accType?: number | null): string {
    if (accType === AccountStructureType.Main) {
      return this.language.translate('accounts.accType.main');
    }
    if (accType === AccountStructureType.Sub) {
      return this.language.translate('accounts.accType.sub');
    }
    return accType != null ? String(accType) : '—';
  }

  natureLabel(accDmType?: number | null): string {
    if (accDmType === AccountNatureType.Debit) {
      return this.language.translate('accounts.accDmType.debit');
    }
    if (accDmType === AccountNatureType.Credit) {
      return this.language.translate('accounts.accDmType.credit');
    }
    return accDmType != null ? String(accDmType) : '—';
  }

  categoryLabel(category?: number | null): string {
    const map: Record<number, TranslationKey> = {
      [AccountCategory.Assets]: 'accounts.category.assets',
      [AccountCategory.Liabilities]: 'accounts.category.liabilities',
      [AccountCategory.Equity]: 'accounts.category.equity',
      [AccountCategory.Revenue]: 'accounts.category.revenue',
      [AccountCategory.Expenses]: 'accounts.category.expenses',
    };
    if (category != null && map[category]) {
      return this.language.translate(map[category]);
    }
    return category != null ? String(category) : '—';
  }

  addChild(parent: Account): void {
    void this.router.navigate(['/demo1/accounting/accounts/new'], {
      queryParams: { parentId: parent.accId },
    });
  }

  openDeleteDialog(account: AccountTreeNode): void {
    if (this.accounts().some((item) => item.accParent === account.accId)) {
      this.errorMessage.set(this.language.translate('accounts.deleteBlocked'));
      return;
    }

    this.deleteTarget.set(account);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  closeDeleteDialog(): void {
    if (!this.deleting()) {
      this.deleteTarget.set(null);
    }
  }

  confirmDelete(): void {
    const account = this.deleteTarget();
    if (!account) {
      return;
    }

    this.deleting.set(true);
    this.accountsService.delete(account.accId).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        if (this.selectedId() === account.accId) {
          this.selectedId.set(null);
        }
        this.successMessage.set(this.language.translate('accounts.deleteSuccess'));
        this.loadAccounts();
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('accounts.deleteError')),
        );
      },
    });
  }
}
