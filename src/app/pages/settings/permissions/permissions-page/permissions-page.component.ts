import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

import {
  BulkSetRolePermissionsRequest,
  ModulePermissions,
  Permission,
} from '../../../../core/api/models/permission.models';
import { Role } from '../../../../core/api/models/role.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { RolesService } from '../../../../core/services/roles.service';

@Component({
  selector: 'app-permissions-page',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './permissions-page.component.html',
  styleUrl: './permissions-page.component.scss',
})
export class PermissionsPageComponent implements OnInit {
  private permissionsService = inject(PermissionsService);
  private rolesService = inject(RolesService);
  private language = inject(LanguageService);
  private route = inject(ActivatedRoute);

  permissions = signal<Permission[]>([]);
  roles = signal<Role[]>([]);
  modules = signal<ModulePermissions[]>([]);

  loadingCatalog = signal(true);
  loadingMatrix = signal(false);
  saving = signal(false);

  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');

  selectedRoleId = signal<number | null>(null);

  permissionColumns = computed(() =>
    [...this.permissions()].sort((a, b) =>
      (a.permissionKey ?? '').localeCompare(b.permissionKey ?? '', undefined, { sensitivity: 'base' }),
    ),
  );

  filteredPermissions = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.permissions();

    if (!term) {
      return list;
    }

    return list.filter((permission) =>
      [permission.permissionKey, permission.description, permission.permissionId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  });

  ngOnInit(): void {
    const roleIdParam = this.route.snapshot.queryParamMap.get('roleId');
    if (roleIdParam) {
      this.selectedRoleId.set(Number(roleIdParam));
    }

    this.loadCatalog();
    this.loadRoles();
  }

  loadCatalog(): void {
    this.loadingCatalog.set(true);
    this.errorMessage.set('');

    this.permissionsService.getAll().subscribe({
      next: (permissions) => {
        this.permissions.set(permissions);
        this.loadingCatalog.set(false);
        if (this.selectedRoleId()) {
          this.loadRoleMatrix(this.selectedRoleId()!);
        }
      },
      error: (error) => {
        this.loadingCatalog.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('permissions.loadError')),
        );
      },
    });
  }

  loadRoles(): void {
    this.rolesService.getAll().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => this.roles.set([]),
    });
  }

  onRoleChange(value: number | null): void {
    this.selectedRoleId.set(value);
    this.successMessage.set('');

    if (value) {
      this.loadRoleMatrix(value);
    } else {
      this.modules.set([]);
    }
  }

  loadRoleMatrix(roleId: number): void {
    this.loadingMatrix.set(true);
    this.errorMessage.set('');

    this.permissionsService.getRoleMatrix(roleId).subscribe({
      next: (matrix) => {
        this.modules.set(this.cloneModules(matrix.modules ?? []));
        this.loadingMatrix.set(false);
      },
      error: (error) => {
        this.loadingMatrix.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('permissions.matrixLoadError')),
        );
      },
    });
  }

  isAllowed(module: ModulePermissions, permissionKey: string): boolean {
    return module.permissions?.[permissionKey] ?? false;
  }

  togglePermission(module: ModulePermissions, permissionKey: string): void {
    this.modules.update((list) =>
      list.map((item) => {
        if (item.moduleId !== module.moduleId) {
          return item;
        }

        return {
          ...item,
          permissions: {
            ...(item.permissions ?? {}),
            [permissionKey]: !(item.permissions?.[permissionKey] ?? false),
          },
        };
      }),
    );
  }

  saveRolePermissions(): void {
    const roleId = this.selectedRoleId();
    if (!roleId) {
      return;
    }

    const catalog = this.permissions();
    const moduleList = this.modules();

    if (!catalog.length || !moduleList.length) {
      return;
    }

    const request: BulkSetRolePermissionsRequest = {
      roleId,
      permissions: moduleList.flatMap((module) =>
        catalog
          .filter((permission) => permission.permissionKey)
          .map((permission) => ({
            moduleId: module.moduleId,
            permissionId: permission.permissionId,
            isAllowed: module.permissions?.[permission.permissionKey!] ?? false,
          })),
      ),
    };

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.permissionsService.setRolePermissionsBulk(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMessage.set(this.language.translate('permissions.saveSuccess'));
        this.loadRoleMatrix(roleId);
      },
      error: (error) => {
        this.saving.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('permissions.saveError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  permissionLabel(permission: Permission): string {
    return permission.description || permission.permissionKey || String(permission.permissionId);
  }

  private cloneModules(modules: ModulePermissions[]): ModulePermissions[] {
    return modules.map((module) => ({
      ...module,
      permissions: { ...(module.permissions ?? {}) },
    }));
  }
}
