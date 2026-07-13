import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';

import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import {
  MenuSection,
  SidebarMenuStateService,
} from '../../../core/services/sidebar-menu-state.service';
import { ThemeToggleService } from '../../../partials/theme-toggle/theme-toggle.service';

@Component({
  selector: '[app-sidebar]',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private router = inject(Router);
  private menuState = inject(SidebarMenuStateService);
  protected themeService = inject(ThemeToggleService);

  private readonly sectionRoutes: Record<MenuSection, string[]> = {
    sales: ['/sales'],
    inventory: ['/inventory'],
    accounting: ['/accounting', '/reports'],
    settings: ['/settings'],
  };

  private readonly expandedSections = signal<Set<MenuSection>>(this.buildInitialExpandedSections());

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.ensureActiveSectionExpanded();
    });
  }

  isSectionExpanded(section: MenuSection): boolean {
    return this.expandedSections().has(section);
  }

  toggleSection(section: MenuSection): void {
    this.expandedSections.update((sections) => {
      const next = new Set(sections);

      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }

      this.menuState.save(next);
      return next;
    });
  }

  private buildInitialExpandedSections(): Set<MenuSection> {
    const sections = this.menuState.load();
    const activeSection = this.getActiveSection(this.router.url);

    if (activeSection) {
      sections.add(activeSection);
    }

    if (sections.size > 0) {
      this.menuState.save(sections);
    }

    return sections;
  }

  private ensureActiveSectionExpanded(): void {
    const activeSection = this.getActiveSection(this.router.url);
    if (!activeSection) {
      return;
    }

    this.expandedSections.update((sections) => {
      if (sections.has(activeSection)) {
        return sections;
      }

      const next = new Set(sections);
      next.add(activeSection);
      this.menuState.save(next);
      return next;
    });
  }

  private getActiveSection(url: string): MenuSection | null {
    const entries = Object.entries(this.sectionRoutes) as [MenuSection, string[]][];
    const match = entries.find(([, segments]) => segments.some((segment) => url.includes(segment)));
    return match?.[0] ?? null;
  }
}
