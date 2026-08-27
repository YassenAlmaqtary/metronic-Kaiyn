import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';

import {
  SidebarMenuLink,
  SidebarMenuSection,
  SidebarMenuSectionId,
  SidebarMenuService,
} from '../../../core/navigation';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { SidebarMenuStateService } from '../../../core/services/sidebar-menu-state.service';
import { ThemeToggleService } from '../../../partials/theme-toggle/theme-toggle.service';

type SidebarMenuBlock =
  | { type: 'link'; item: SidebarMenuLink }
  | { type: 'group'; item: SidebarMenuLink; children: SidebarMenuLink[] }
  | { type: 'comingSoon'; item: SidebarMenuLink };

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
  private readonly expandedGroups = signal<Set<string>>(this.buildInitialExpandedGroups());

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.ensureActiveSectionExpanded();
      this.ensureActiveGroupExpanded();
    });
  }

  isSectionExpanded(sectionId: SidebarMenuSectionId): boolean {
    return this.expandedSections().has(sectionId);
  }

  sectionBlocks(section: SidebarMenuSection): SidebarMenuBlock[] {
    return this.buildSectionBlocks(section.children);
  }

  isGroupExpanded(sectionId: SidebarMenuSectionId, groupId: string): boolean {
    return this.expandedGroups().has(this.groupKey(sectionId, groupId));
  }

  toggleGroup(sectionId: SidebarMenuSectionId, groupId: string): void {
    const key = this.groupKey(sectionId, groupId);
    this.expandedGroups.update((groups) => {
      const next = new Set(groups);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      this.menuState.saveGroups(next);
      return next;
    });
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

  private buildInitialExpandedGroups(): Set<string> {
    const groups = this.menuState.loadGroups();
    this.ensureActiveGroupExpandedInSet(groups, this.router.url);

    if (groups.size === 0) {
      for (const section of this.sections()) {
        for (const child of section.children) {
          if (child.kind === 'group') {
            groups.add(this.groupKey(section.id, child.id));
          }
        }
      }
      this.menuState.saveGroups(groups);
    }

    return groups;
  }

  private ensureActiveGroupExpanded(): void {
    this.expandedGroups.update((groups) => {
      const next = new Set(groups);
      const changed = this.ensureActiveGroupExpandedInSet(next, this.router.url);

      if (!changed) {
        return groups;
      }

      this.menuState.saveGroups(next);
      return next;
    });
  }

  private ensureActiveGroupExpandedInSet(groups: Set<string>, url: string): boolean {
    let changed = false;

    for (const section of this.sections()) {
      let currentGroupId: string | null = null;

      for (const child of section.children) {
        if (child.kind === 'group') {
          currentGroupId = child.id;
          continue;
        }

        if (currentGroupId && child.route && url.startsWith(child.route)) {
          const key = this.groupKey(section.id, currentGroupId);
          if (!groups.has(key)) {
            groups.add(key);
            changed = true;
          }
        }
      }
    }

    return changed;
  }

  private groupKey(sectionId: SidebarMenuSectionId, groupId: string): string {
    return `${sectionId}:${groupId}`;
  }

  private buildSectionBlocks(children: readonly SidebarMenuLink[]): SidebarMenuBlock[] {
    const blocks: SidebarMenuBlock[] = [];

    for (let index = 0; index < children.length; index += 1) {
      const item = children[index];

      if (item.kind === 'group') {
        const groupChildren: SidebarMenuLink[] = [];

        for (let nextIndex = index + 1; nextIndex < children.length; nextIndex += 1) {
          const nextItem = children[nextIndex];
          if (nextItem.kind === 'group') {
            break;
          }

          groupChildren.push(nextItem);

          index = nextIndex;
        }

        blocks.push({ type: 'group', item, children: groupChildren });
        continue;
      }

      if (item.kind === 'comingSoon') {
        blocks.push({ type: 'comingSoon', item });
        continue;
      }

      blocks.push({ type: 'link', item });
    }

    return blocks;
  }
}
