import { Injectable } from '@angular/core';

import { SIDEBAR_MENU_SECTIONS } from '../navigation/sidebar-menu.config';
import { SidebarMenuSectionId } from '../navigation/sidebar-menu.models';

export type MenuSection = SidebarMenuSectionId;

const STORAGE_KEY = 'kayian-erp-sidebar-sections';

const MENU_SECTIONS: readonly MenuSection[] = SIDEBAR_MENU_SECTIONS.map((section) => section.id);

function isMenuSection(value: unknown): value is MenuSection {
  return typeof value === 'string' && MENU_SECTIONS.includes(value as MenuSection);
}

@Injectable({ providedIn: 'root' })
export class SidebarMenuStateService {
  load(): Set<MenuSection> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return new Set();
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return new Set();
      }

      return new Set(parsed.filter(isMenuSection));
    } catch {
      return new Set();
    }
  }

  save(sections: ReadonlySet<MenuSection>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...sections]));
  }
}
