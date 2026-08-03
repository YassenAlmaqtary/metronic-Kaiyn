import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { AuthService } from '../api/auth.service';
import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CurrentUserPermissions,
  UserPermissionsByBranch,
} from '../api/models/user-permissions.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';
import { SIDEBAR_MENU_SECTIONS } from '../navigation/sidebar-menu.config';
import { SidebarMenuService } from '../navigation/sidebar-menu.service';

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
   * When false: load still runs, but UI is not restricted.
   */
  private static readonly ENFORCE = false;

  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private menu = inject(SidebarMenuService);

  private readonly granted = signal<ReadonlySet<string> | null>(null);
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

  clear(): void {
    this.apply(null);
    this.loaded.set(false);
  }

  load(branchId?: number | null): Observable<void> {
    const user = this.auth.user();
    if (!user?.userId) {
      this.apply(null);
      return of(undefined);
    }

    if (user.isSuperUser || !AccessControlService.ENFORCE) {
      // Super user, or enforcement disabled: never hide menu/dashboard.
      this.apply(null);
      return of(undefined);
    }

    const effectiveBranch =
      branchId ??
      user.defaultBranchId ??
      user.branches?.find((b) => b.isDefault)?.branchId ??
      user.branches?.[0]?.branchId;

    if (effectiveBranch != null) {
      return this.getByUserAndBranch(user.userId, effectiveBranch).pipe(
        tap((data) => this.applySafe(this.flatten(data.permissions))),
        map(() => undefined),
        catchError(() => {
          this.apply(null);
          return of(undefined);
        }),
      );
    }

    return this.getCurrentUser(user.userId).pipe(
      tap((data) => {
        const branch = data.branches?.find((b) => b.isDefault) ?? data.branches?.[0] ?? null;
        this.applySafe(this.flatten(branch?.permissions ?? null));
      }),
      map(() => undefined),
      catchError(() => {
        this.apply(null);
        return of(undefined);
      }),
    );
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
