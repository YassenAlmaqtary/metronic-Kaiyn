import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
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

/** Permission key for the smart assistant (must exist in backend catalog to grant). */
export const AI_ASSISTANT_PERMISSION = 'aiAssistant.use';

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
   * - Super users: always allowed
   * - requirePermission=false: any signed-in user
   * - requirePermission=true: needs `aiAssistant.use` (or fail-open if catalog unreadable)
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
    const set = this.rawGranted();
    if (!set) {
      // Permissions payload unknown/unusable — fail-open so ERP stays usable.
      return true;
    }
    return this.matches(set, AI_ASSISTANT_PERMISSION);
  }

  clear(): void {
    this.apply(null);
    this.rawGranted.set(null);
    this.loaded.set(false);
  }

  load(branchId?: number | null): Observable<void> {
    const user = this.auth.user();
    if (!user?.userId) {
      this.apply(null);
      this.rawGranted.set(null);
      return of(undefined);
    }

    if (user.isSuperUser) {
      this.apply(null);
      this.rawGranted.set(null);
      this.loaded.set(true);
      return of(undefined);
    }

    const effectiveBranch =
      branchId ??
      user.defaultBranchId ??
      user.branches?.find((b) => b.isDefault)?.branchId ??
      user.branches?.[0]?.branchId;

    if (effectiveBranch != null) {
      return this.getByUserAndBranch(user.userId, effectiveBranch).pipe(
        tap((data) => this.ingestPermissions(this.flatten(data.permissions))),
        map(() => undefined),
        catchError(() => {
          this.ingestPermissions(null);
          return of(undefined);
        }),
      );
    }

    return this.getCurrentUser(user.userId).pipe(
      tap((data) => {
        const branch = data.branches?.find((b) => b.isDefault) ?? data.branches?.[0] ?? null;
        this.ingestPermissions(this.flatten(branch?.permissions ?? null));
      }),
      map(() => undefined),
      catchError(() => {
        this.ingestPermissions(null);
        return of(undefined);
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
