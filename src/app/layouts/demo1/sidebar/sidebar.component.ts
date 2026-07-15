import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';

import { SidebarMenuSectionId, SidebarMenuService } from '../../../core/navigation';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { SidebarMenuStateService } from '../../../core/services/sidebar-menu-state.service';
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
  private sidebarMenu = inject(SidebarMenuService);
  protected themeService = inject(ThemeToggleService);

  protected readonly rootLinks = this.sidebarMenu.rootLinks;
  protected readonly sections = this.sidebarMenu.sections;

  private readonly expandedSections = signal<Set<SidebarMenuSectionId>>(
    this.buildInitialExpandedSections(),
  );

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.ensureActiveSectionExpanded();
    });
  }

  isSectionExpanded(sectionId: SidebarMenuSectionId): boolean {
    return this.expandedSections().has(sectionId);
  }

  toggleSection(sectionId: SidebarMenuSectionId): void {
    this.expandedSections.update((sections) => {
      const next = new Set(sections);

      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }

      this.menuState.save(next);
      return next;
    });
  }

  private buildInitialExpandedSections(): Set<SidebarMenuSectionId> {
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

  private getActiveSection(url: string): SidebarMenuSectionId | null {
    const match = this.sections().find((section) =>
      section.matchPaths.some((path) => url.includes(path)),
    );
    return match?.id ?? null;
  }
}
