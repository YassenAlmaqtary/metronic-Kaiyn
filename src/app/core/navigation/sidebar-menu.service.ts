import { Injectable, computed, inject, signal } from '@angular/core';

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

  private filterSection(section: SidebarMenuSection): SidebarMenuSection | null {
    if (!this.canAccess(section.permission)) {
      return null;
    }

    const children = section.children.filter((child) => this.canAccess(child.permission));
    if (children.length === 0) {
      return null;
    }

    return { ...section, children };
  }

  private canAccess(permission?: string): boolean {
    if (!permission) {
      return true;
    }

    const granted = this.grantedPermissions();
    // Until auth permissions are wired, show all configured items.
    if (!granted) {
      return true;
    }

    return granted.has(permission);
  }
}

export type { SidebarMenuLink, SidebarMenuRootLink, SidebarMenuSection };
