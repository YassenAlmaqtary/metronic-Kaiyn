import { Injectable, computed, signal } from '@angular/core';

import { SIDEBAR_MENU_SECTIONS, SIDEBAR_ROOT_LINKS } from './sidebar-menu.config';
import {
  SidebarMenuLink,
  SidebarMenuRootLink,
  SidebarMenuSection,
} from './sidebar-menu.models';

/**
 * Central menu source for the sidebar.
 * Permission filtering is prepared here; currently all items are visible.
 */
@Injectable({ providedIn: 'root' })
export class SidebarMenuService {
  /** Replace later with permissions loaded from AuthService / API. */
  private readonly grantedPermissions = signal<ReadonlySet<string> | null>(null);

  readonly rootLinks = computed(() =>
    SIDEBAR_ROOT_LINKS.filter((item) => this.canAccess(item.permission)),
  );

  readonly sections = computed(() =>
    SIDEBAR_MENU_SECTIONS.map((section) => this.filterSection(section)).filter(
      (section): section is SidebarMenuSection => section !== null,
    ),
  );

  setGrantedPermissions(permissions: readonly string[] | null): void {
    this.grantedPermissions.set(permissions ? new Set(permissions) : null);
  }

  /** Public check used by dashboard cards / quick actions. */
  hasPermission(permission?: string): boolean {
    return this.canAccess(permission);
  }

  private filterSection(section: SidebarMenuSection): SidebarMenuSection | null {
    if (!this.canAccess(section.permission)) {
      return null;
    }

    const filtered = section.children.filter((child) => {
      if (child.kind === 'group') {
        return true;
      }
      return this.canAccess(child.permission);
    });

    // Drop group headers that have no following visible links before the next group.
    const children: SidebarMenuLink[] = [];
    for (let i = 0; i < filtered.length; i++) {
      const item = filtered[i];
      if (item.kind === 'group') {
        const hasLinkAfter = filtered
          .slice(i + 1)
          .some((next) => next.kind !== 'group' && !!next.route);
        if (hasLinkAfter) {
          children.push(item);
        }
        continue;
      }
      children.push(item);
    }

    if (!children.some((c) => c.kind !== 'group')) {
      return null;
    }

    return { ...section, children };
  }

  private canAccess(permission?: string): boolean {
    if (!permission) {
      return true;
    }

    const granted = this.grantedPermissions();
    // Until auth permissions are wired / loaded, show all configured items.
    if (!granted) {
      return true;
    }

    return granted.has(permission) || granted.has(permission.toLowerCase());
  }
}

export type { SidebarMenuLink, SidebarMenuRootLink, SidebarMenuSection };
