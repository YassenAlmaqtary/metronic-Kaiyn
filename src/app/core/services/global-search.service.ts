import { Injectable, computed, signal } from '@angular/core';

import { TranslationKey } from '../i18n';
import { SIDEBAR_MENU_SECTIONS, SIDEBAR_ROOT_LINKS } from '../navigation/sidebar-menu.config';

export interface GlobalSearchItem {
  id: string;
  labelKey: TranslationKey;
  route: string;
  sectionKey: TranslationKey;
  sectionIcon: string;
  keywords: string;
}

const RECENT_KEY = 'kayian.globalSearch.recent';
const RECENT_LIMIT = 8;

@Injectable({ providedIn: 'root' })
export class GlobalSearchService {
  readonly open = signal(false);
  readonly query = signal('');

  readonly allItems = computed((): GlobalSearchItem[] => {
    const items: GlobalSearchItem[] = [];

    for (const root of SIDEBAR_ROOT_LINKS) {
      items.push({
        id: root.id,
        labelKey: root.labelKey,
        route: root.route,
        sectionKey: 'menu.dashboard',
        sectionIcon: root.icon,
        keywords: root.id,
      });
    }

    for (const section of SIDEBAR_MENU_SECTIONS) {
      for (const child of section.children) {
        if (child.kind === 'group' || child.kind === 'comingSoon' || !child.route) {
          continue;
        }
        items.push({
          id: child.id,
          labelKey: child.labelKey,
          route: child.route,
          sectionKey: section.labelKey,
          sectionIcon: section.icon,
          keywords: `${section.id} ${child.id}`,
        });
      }
    }

    return items;
  });

  readonly recentRoutes = signal<string[]>(this.readRecent());

  show(): void {
    this.query.set('');
    this.open.set(true);
  }

  hide(): void {
    this.open.set(false);
    this.query.set('');
  }

  toggle(): void {
    if (this.open()) {
      this.hide();
    } else {
      this.show();
    }
  }

  remember(route: string): void {
    const next = [route, ...this.recentRoutes().filter((r) => r !== route)].slice(0, RECENT_LIMIT);
    this.recentRoutes.set(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  private readRecent(): string[] {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }
}
