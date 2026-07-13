import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { Role } from '../../../../core/api/models/role.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { RolesService } from '../../../../core/services/roles.service';

@Component({
  selector: 'app-roles-list',
  imports: [RouterLink, FormsModule, TranslatePipe],
  templateUrl: './roles-list.component.html',
  styleUrl: './roles-list.component.scss',
})
export class RolesListComponent implements OnInit {
  private rolesService = inject(RolesService);
  private language = inject(LanguageService);

  roles = signal<Role[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  deleteTarget = signal<Role | null>(null);
  deleting = signal(false);

  filteredRoles = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.roles();

    if (!term) {
      return list;
    }

    return list.filter((role) =>
      [role.roleName, role.description, role.roleId]
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
    this.loadRoles();
  }

  loadRoles(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.rolesService.getAll().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('roles.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  canDelete(role: Role): boolean {
    return !role.isSystem;
  }

  openDeleteDialog(role: Role): void {
    if (!this.canDelete(role)) {
      return;
    }

    this.deleteTarget.set(role);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  closeDeleteDialog(): void {
    if (!this.deleting()) {
      this.deleteTarget.set(null);
    }
  }

  confirmDelete(): void {
    const role = this.deleteTarget();
    if (!role) {
      return;
    }

    this.deleting.set(true);
    this.rolesService.delete(role.roleId).subscribe({
      next: () => {
        this.roles.update((list) => list.filter((item) => item.roleId !== role.roleId));
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.successMessage.set(this.language.translate('roles.deleteSuccess'));
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('roles.deleteError')),
        );
      },
    });
  }
}
