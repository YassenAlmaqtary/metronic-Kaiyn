import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { concatMap, from, map, toArray } from 'rxjs';

import {
  ModulePermissions,
  Permission,
  SetRolePermissionRequest,
} from '../../../../core/api/models/permission.models';
import { Role } from '../../../../core/api/models/role.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { RolesService } from '../../../../core/services/roles.service';

@Component({
  selector: 'app-permissions-page',
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './permissions-page.component.html',
  styleUrl: './permissions-page.component.scss',
})
export class PermissionsPageComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private permissionsService = inject(PermissionsService);
  private rolesService = inject(RolesService);
  private language = inject(LanguageService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);

  permissions = signal<Permission[]>([]);
  roles = signal<Role[]>([]);
  modules = signal<ModulePermissions[]>([]);
  private loadedModules: ModulePermissions[] = [];

  loadingCatalog = signal(true);
  loadingMatrix = signal(false);
  saving = signal(false);

  errorMessage = signal('');
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
    this.loadedModules = [];
    this.modules.set([]);

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
        this.loadedModules = this.cloneModules(matrix.modules ?? []);
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
    return this.permissionValue(module, permissionKey);
  }

  togglePermission(module: ModulePermissions, permissionKey: string): void {
    this.modules.update((list) =>
      list.map((item) => {
        if (item.moduleId !== module.moduleId) {
          return item;
        }

        const permissions = { ...(item.permissions ?? {}) };
        const matchingKey = Object.keys(permissions).find(
          (key) => key.toLowerCase() === permissionKey.toLowerCase(),
        );
        const nextValue = !this.permissionValue(item, permissionKey);
        if (matchingKey && matchingKey !== permissionKey) {
          delete permissions[matchingKey];
        }
        permissions[permissionKey] = nextValue;

        return {
          ...item,
          permissions,
        };
      }),
    );
  }

  saveRolePermissions(): void {
    const roleId = this.selectedRoleId();
    if (!roleId) {
      return;
    }

    const changedAssignments = this.getChangedAssignments(roleId);
    if (!changedAssignments.length) {
      this.toast.info(this.language.translate('permissions.noChanges'));
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    from(changedAssignments)
      .pipe(
        concatMap((request) => this.permissionsService.setRolePermission(request)),
        toArray(),
        map((results) => results.every((saved) => saved === true)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (saved) => {
          this.saving.set(false);
          if (!saved) {
            this.errorMessage.set(this.language.translate('permissions.saveRejected'));
            return;
          }
          this.loadedModules = this.cloneModules(this.modules());
          this.toast.success(this.language.translate('permissions.saveSuccess'));
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

  private permissionValue(module: ModulePermissions, permissionKey: string): boolean {
    const key = Object.keys(module.permissions ?? {}).find(
      (candidate) => candidate.toLowerCase() === permissionKey.toLowerCase(),
    );
    return key ? module.permissions?.[key] ?? false : false;
  }

  private getChangedAssignments(roleId: number): SetRolePermissionRequest[] {
    const catalog = this.permissions().filter(
      (permission): permission is Permission & { permissionKey: string } =>
        !!permission.permissionKey && permission.permissionId > 0,
    );
    const originalByModule = new Map(
      this.loadedModules.map((module) => [module.moduleId, module]),
    );

    return this.modules().flatMap((module) => {
      const original = originalByModule.get(module.moduleId);
      if (!original || module.moduleId <= 0) {
        return [];
      }

      return catalog.flatMap((permission) => {
        const isAllowed = this.permissionValue(module, permission.permissionKey);
        if (isAllowed === this.permissionValue(original, permission.permissionKey)) {
          return [];
        }
        return [{
          roleId,
          moduleId: module.moduleId,
          permissionId: permission.permissionId,
          isAllowed,
        }];
      });
    });
  }
}
