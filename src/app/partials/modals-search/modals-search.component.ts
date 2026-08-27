import { DOCUMENT } from '@angular/common';
import {
  Component,
  HostListener,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { TranslationKey } from '../../core/i18n';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import {
  GlobalSearchItem,
  GlobalSearchService,
} from '../../core/services/global-search.service';
import { LanguageService } from '../../core/services/language.service';

interface GlobalSearchGroup {
  sectionKey: TranslationKey;
  sectionIcon: string;
  items: GlobalSearchDisplayItem[];
}

interface GlobalSearchDisplayItem extends GlobalSearchItem {
  displayLabel: string;
  sectionLabel: string;
}

@Component({
  selector: 'app-modals-search',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './modals-search.component.html',
  styleUrl: './modals-search.component.scss',
})
export class ModalsSearchComponent {
  private globalSearch = inject(GlobalSearchService);
  private language = inject(LanguageService);
  private router = inject(Router);
  private document = inject(DOCUMENT);

  readonly open = this.globalSearch.open;
  readonly query = this.globalSearch.query;
  readonly dataLoading = this.globalSearch.dataLoading;

  activeIndex = signal(0);
  private searchDebounce: ReturnType<typeof setTimeout> | undefined;

  private labeledMenuItems = computed(() =>
    this.globalSearch.menuItems().map((item) => this.toDisplayItem(item)),
  );

  private labeledRecordItems = computed(() =>
    this.globalSearch.recordItems().map((item) => this.toDisplayItem(item)),
  );

  filteredGroups = computed((): GlobalSearchGroup[] => {
    const term = this.query().trim().toLowerCase();
    const menuItems = this.labeledMenuItems();
    const recordItems = this.labeledRecordItems();

    const matchedMenu = term
      ? menuItems.filter(
          (item) =>
            item.displayLabel.toLowerCase().includes(term) ||
            item.sectionLabel.toLowerCase().includes(term) ||
            item.route.toLowerCase().includes(term) ||
            item.keywords.toLowerCase().includes(term),
        )
      : menuItems;

    const groups: GlobalSearchGroup[] = [];
    const menuMap = new Map<string, GlobalSearchGroup>();

    for (const item of matchedMenu) {
      const key = item.sectionKey;
      const group = menuMap.get(key) ?? {
        sectionKey: item.sectionKey,
        sectionIcon: item.sectionIcon,
        items: [],
      };
      group.items.push(item);
      menuMap.set(key, group);
    }
    groups.push(...menuMap.values());

    if (term.length >= 2 && recordItems.length) {
      const recordMap = new Map<string, GlobalSearchGroup>();
      for (const item of recordItems) {
        const key = item.sectionKey;
        const group = recordMap.get(key) ?? {
          sectionKey: item.sectionKey,
          sectionIcon: item.sectionIcon,
          items: [],
        };
        group.items.push(item);
        recordMap.set(key, group);
      }
      groups.push(...recordMap.values());
    }

    return groups;
  });

  recentItems = computed(() => {
    const routes = new Set(this.globalSearch.recentRoutes());
    if (!routes.size) {
      return [] as GlobalSearchDisplayItem[];
    }

    const all = [...this.labeledMenuItems(), ...this.labeledRecordItems()];
    return all
      .filter((item) => routes.has(item.route))
      .sort(
        (a, b) =>
          this.globalSearch.recentRoutes().indexOf(a.route) -
          this.globalSearch.recentRoutes().indexOf(b.route),
      );
  });

  flatResults = computed(() => this.filteredGroups().flatMap((g) => g.items));

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.globalSearch.toggle();
      return;
    }

    if (!this.open()) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.globalSearch.hide();
      return;
    }

    const results = this.flatResults();
    if (!results.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update((i) => (i + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = results[this.activeIndex()];
      if (item) {
        this.navigate(item);
      }
    }
  }

  constructor() {
    effect(() => {
      if (this.open()) {
        this.focusInput();
      }
    });
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    this.activeIndex.set(0);

    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.globalSearch.searchRecords(value);
    }, 280);
  }

  navigate(item: GlobalSearchDisplayItem): void {
    this.globalSearch.remember(item.route);
    this.globalSearch.hide();
    void this.router.navigateByUrl(item.route);
  }

  isActive(item: GlobalSearchDisplayItem): boolean {
    const results = this.flatResults();
    const idx = results.findIndex((x) => x.id === item.id);
    return idx === this.activeIndex();
  }

  focusInput(): void {
    setTimeout(() => {
      const el = this.document.getElementById('global_search_input') as HTMLInputElement | null;
      el?.focus();
      el?.select();
    }, 0);
  }

  onBackdropClick(): void {
    this.globalSearch.hide();
  }

  private toDisplayItem(item: GlobalSearchItem): GlobalSearchDisplayItem {
    const displayLabel =
      item.label ?? (item.labelKey ? this.language.translate(item.labelKey) : item.route);
    const sectionLabel = this.language.translate(item.sectionKey);

    return {
      ...item,
      displayLabel,
      sectionLabel,
    };
  }
}
