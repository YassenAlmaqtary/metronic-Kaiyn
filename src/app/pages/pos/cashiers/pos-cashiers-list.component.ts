import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Branch } from '../../../core/api/models/branch.models';
import { PosCashier } from '../../../core/api/models/pos.models';
import { User } from '../../../core/api/models/user.models';
import { extractApiErrorMessage } from '../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { BranchesService } from '../../../core/services/branches.service';
import { LanguageService } from '../../../core/services/language.service';
import { PosService } from '../../../core/services/pos.service';
import { UsersService } from '../../../core/services/users.service';

@Component({
  selector: 'app-pos-cashiers-list',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './pos-cashiers-list.component.html',
})
export class PosCashiersListComponent implements OnInit {
  private pos = inject(PosService);
  private usersService = inject(UsersService);
  private branchesService = inject(BranchesService);
  private language = inject(LanguageService);

  cashiers = signal<PosCashier[]>([]);
  users = signal<User[]>([]);
  branches = signal<Branch[]>([]);
  loading = signal(true);
  saving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  showForm = signal(false);
  formUserId = signal<number | null>(null);
  formBranchId = signal<number | null>(null);

  branchName = computed(() => {
    const map = new Map<number, string>();
    for (const b of this.branches()) {
      map.set(b.branchId, b.branchName ?? String(b.branchId));
    }
    return map;
  });

  availableUsers = computed(() => {
    const taken = new Set(this.cashiers().map((c) => c.userId));
    return this.users().filter((u) => u.isActive !== false && !taken.has(u.userId));
  });

  filtered = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const branches = this.branchName();
    let list = this.cashiers();
    if (!term) {
      return list;
    }
    return list.filter((c) =>
      [c.userName, c.cashierId, c.userId, c.branchId != null ? branches.get(c.branchId) : null]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.usersService.getAll().subscribe({ next: (u) => this.users.set(u) });
    this.branchesService.getAll().subscribe({
      next: (b) => this.branches.set(b.filter((x) => x.isActive !== false)),
    });
    this.pos.getCashiers().subscribe({
      next: (list) => {
        this.cashiers.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(err, this.language.translate('posAdmin.cashiers.loadError')),
        );
      },
    });
  }

  openForm(): void {
    this.formUserId.set(this.availableUsers()[0]?.userId ?? null);
    this.formBranchId.set(this.branches()[0]?.branchId ?? null);
    this.showForm.set(true);
    this.successMessage.set('');
  }

  create(): void {
    const userId = this.formUserId();
    if (userId == null) {
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    this.pos
      .createCashier({
        userId,
        branchId: this.formBranchId(),
        isActive: true,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.showForm.set(false);
          this.successMessage.set(this.language.translate('posAdmin.cashiers.saveSuccess'));
          this.load();
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(
            extractApiErrorMessage(err, this.language.translate('posAdmin.cashiers.saveError')),
          );
        },
      });
  }

  toggle(cashier: PosCashier): void {
    this.saving.set(true);
    this.pos
      .updateCashier(cashier.cashierId, { isActive: cashier.isActive === false })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.successMessage.set(this.language.translate('posAdmin.cashiers.saveSuccess'));
          this.load();
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(
            extractApiErrorMessage(err, this.language.translate('posAdmin.cashiers.saveError')),
          );
        },
      });
  }
}
