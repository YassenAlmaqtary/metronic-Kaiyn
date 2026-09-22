import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../api/auth.service';
import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import { AppModule } from '../api/models/module.models';
import { Permission } from '../api/models/permission.models';
import {
  CurrentUserPermissions,
  UserPermissionsByBranch,
} from '../api/models/user-permissions.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';
import { SIDEBAR_MENU_SECTIONS } from '../navigation/sidebar-menu.config';
import { SidebarMenuService } from '../navigation/sidebar-menu.service';

/** Flattened permission: module `aiAssistant` + catalog action `view`. */
export const AI_ASSISTANT_PERMISSION = 'aiAssistant.view';
export const AI_ASSISTANT_MODULE_KEY = 'aiAssistant';

/**
 * Loads the current user's effective permissions and exposes can(permissionKey).
 *
 * Important: if the API key shape does not match the menu keys (e.g. stores.view),
 * we fail-open so the UI does not disappear.
 */
@Injectable({ providedIn: 'root' })
export class AccessControlService {
  /**
   * Keep false until permission keys from the API are confirmed to match
   * sidebar keys like `salesInvoices.view` / `stores.view`.
   * When false: menu/dashboard stay unrestricted; assistant can still be gated.
   */
  private static readonly ENFORCE = false;

  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private menu = inject(SidebarMenuService);

  private readonly granted = signal<ReadonlySet<string> | null>(null);
  /** Raw keys from API — used by assistant even when menu ENFORCE is off. */
  private readonly rawGranted = signal<ReadonlySet<string> | null>(null);
  /** All permission keys known in the system catalog. */
  private readonly catalogKeys = signal<ReadonlySet<string> | null>(null);
  /** True when Modules catalog contains `aiAssistant`. */
  private readonly aiAssistantModuleReady = signal(false);
  private readonly loaded = signal(false);

  readonly isReady = computed(() => this.loaded());
  readonly isSuperUser = computed(() => !!this.auth.user()?.isSuperUser);

  can(permission?: string | null): boolean {
    if (!permission || !AccessControlService.ENFORCE) {
      return true;
    }
    if (this.isSuperUser()) {
      return true;
    }
    const set = this.granted();
    // Not loaded / fail-open mode
    if (!set) {
      return true;
    }
    return this.matches(set, permission);
  }

  /**
   * Smart assistant access (independent of sidebar ENFORCE).
   * Create module `aiAssistant` via Permissions page, then grant `view` on the role matrix.
   */
  canUseAiAssistant(): boolean {
    if (!this.auth.user()) {
      return false;
    }
    if (this.isSuperUser()) {
      return true;
    }
    if (!environment.sqlAgent.requirePermission) {
      return true;
    }
    if (!this.loaded()) {
      return false;
    }
    // Module not created yet → keep assistant available until admin configures it.
    if (!this.aiAssistantModuleReady()) {
      return true;
    }
    const set = this.rawGranted();
    if (!set) {
      return true;
    }
    return this.matches(set, AI_ASSISTANT_PERMISSION);
  }

  clear(): void {
    this.apply(null);
    this.rawGranted.set(null);
    this.catalogKeys.set(null);
    this.aiAssistantModuleReady.set(false);
    this.loaded.set(false);
  }

  load(branchId?: number | null): Observable<void> {
    const user = this.auth.user();
    if (!user?.userId) {
      this.apply(null);
      this.rawGranted.set(null);
      this.catalogKeys.set(null);
      this.aiAssistantModuleReady.set(false);
      return of(undefined);
    }

    const catalog$ = this.getPermissionCatalog().pipe(
      tap((keys) => this.catalogKeys.set(keys)),
      catchError(() => {
        this.catalogKeys.set(null);
        return of(null);
      }),
    );

    const modules$ = this.getModules().pipe(
      tap((modules) => {
        const ready = modules.some(
          (module) => (module.moduleKey ?? '').toLowerCase() === AI_ASSISTANT_MODULE_KEY.toLowerCase(),
        );
        this.aiAssistantModuleReady.set(ready);
      }),
      catchError(() => {
        this.aiAssistantModuleReady.set(false);
        return of([]);
      }),
    );

    if (user.isSuperUser) {
      return forkJoin({ catalog: catalog$, modules: modules$ }).pipe(
        tap(() => {
          this.apply(null);
          this.rawGranted.set(null);
          this.loaded.set(true);
        }),
        map(() => undefined),
      );
    }

    const effectiveBranch =
      branchId ??
      user.defaultBranchId ??
      user.branches?.find((b) => b.isDefault)?.branchId ??
      user.branches?.[0]?.branchId;

    const userPerms$: Observable<string[] | null> =
      effectiveBranch != null
        ? this.getByUserAndBranch(user.userId, effectiveBranch).pipe(
            map((data) => this.flatten(data.permissions)),
            catchError(() => of(null)),
          )
        : this.getCurrentUser(user.userId).pipe(
            map((data) => {
              const branch =
                data.branches?.find((b) => b.isDefault) ?? data.branches?.[0] ?? null;
              return this.flatten(branch?.permissions ?? null);
            }),
            catchError(() => of(null)),
          );

    return forkJoin({ catalog: catalog$, modules: modules$, userPerms: userPerms$ }).pipe(
      tap(({ userPerms }) => this.ingestPermissions(userPerms)),
      map(() => undefined),
    );
  }

  private getModules(): Observable<AppModule[]> {
    return this.http
      .get<ApiResponse<AppModule[]>>(buildApiUrl('/api/Modules'))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  private getPermissionCatalog(): Observable<ReadonlySet<string>> {
    return this.http.get<ApiResponse<Permission[]>>(buildApiUrl('/api/Permissions')).pipe(
      map((response) => unwrapApiResponse(response)),
      map((list) => {
        const keys = new Set<string>();
        for (const item of list ?? []) {
          const key = item.permissionKey?.trim();
          if (key) {
            keys.add(key);
            keys.add(key.toLowerCase());
          }
        }
        return keys;
      }),
    );
  }

  private ingestPermissions(keys: string[] | null): void {
    if (!keys) {
      this.rawGranted.set(null);
      this.apply(null);
      return;
    }
    this.rawGranted.set(new Set(keys));
    if (AccessControlService.ENFORCE) {
      this.applySafe(keys);
    } else {
      // Menu unrestricted, but keep rawGranted for assistant checks.
      this.apply(null);
      this.loaded.set(true);
    }
  }

  private getByUserAndBranch(userId: number, branchId: number): Observable<UserPermissionsByBranch> {
    return this.http
      .get<ApiResponse<UserPermissionsByBranch>>(
        buildApiUrl(
          toApiPath(`/api/Permissions/users/{userId}/branches/{branchId}`, { userId, branchId }),
        ),
      )
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  private getCurrentUser(userId: number): Observable<CurrentUserPermissions> {
    return this.http
      .get<ApiResponse<CurrentUserPermissions>>(
        buildApiUrl(toApiPath(`/api/Permissions/users/{userId}`, { userId })),
      )
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  /** Flatten nested or flat permission payloads into `module.action` keys. */
  private flatten(permissions: unknown): string[] {
    if (!permissions || typeof permissions !== 'object') {
      return [];
    }

    const keys: string[] = [];
    const push = (value: string) => {
      const v = value.trim();
      if (!v) {
        return;
      }
      keys.push(v, v.toLowerCase());
    };

    // Flat map: { "salesInvoices.view": true }
    const asRecord = permissions as Record<string, unknown>;
    const values = Object.values(asRecord);
    const looksFlat = values.every((v) => typeof v === 'boolean');
    if (looksFlat) {
      for (const [key, allowed] of Object.entries(asRecord)) {
        if (allowed) {
          push(key);
        }
      }
      return keys;
    }

    // Nested map: { salesInvoices: { view: true } } or { SalesInvoices: { View: true } }
    for (const [moduleKey, perms] of Object.entries(asRecord)) {
      if (!perms || typeof perms !== 'object') {
        continue;
      }
      for (const [permKey, allowed] of Object.entries(perms as Record<string, unknown>)) {
        if (!allowed) {
          continue;
        }
        if (permKey.includes('.')) {
          push(permKey);
        }
        push(`${moduleKey}.${permKey}`);
      }
    }
    return keys;
  }

  /**
   * Only enforce when at least one known menu permission key is recognizable.
   * Otherwise fail-open to avoid an empty sidebar/dashboard.
   */
  private applySafe(keys: string[]): void {
    if (!keys.length) {
      this.apply(null);
      return;
    }

    const knownMenuKeys = SIDEBAR_MENU_SECTIONS.flatMap((section) =>
      section.children.map((child) => child.permission).filter((p): p is string => !!p),
    );
    const set = new Set(keys);
    const overlap = knownMenuKeys.some((key) => this.matches(set, key));
    if (!overlap) {
      this.apply(null);
      return;
    }

    this.apply(keys);
  }

  private matches(set: ReadonlySet<string>, permission: string): boolean {
    if (set.has(permission) || set.has(permission.toLowerCase())) {
      return true;
    }

    const [mod, action] = permission.toLowerCase().split('.');
    if (!mod || !action) {
      return false;
    }

    for (const key of set) {
      const lower = key.toLowerCase();
      if (lower === permission.toLowerCase()) {
        return true;
      }
      const parts = lower.split('.');
      if (parts.length < 2) {
        continue;
      }
      const keyAction = parts[parts.length - 1];
      const keyMod = parts.slice(0, -1).join('.');
      if (keyAction !== action) {
        continue;
      }
      if (
        keyMod === mod ||
        keyMod === `${mod}s` ||
        `${keyMod}s` === mod ||
        keyMod.replace(/s$/, '') === mod.replace(/s$/, '')
      ) {
        return true;
      }
    }
    return false;
  }

  private apply(keys: string[] | null): void {
    const set = keys ? new Set(keys) : null;
    this.granted.set(set);
    this.menu.setGrantedPermissions(AccessControlService.ENFORCE ? keys : null);
    this.loaded.set(true);
  }
}
