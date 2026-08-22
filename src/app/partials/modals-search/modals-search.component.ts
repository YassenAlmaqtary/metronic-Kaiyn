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
  items: GlobalSearchItem[];
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

  activeIndex = signal(0);

  private labeledItems = computed(() =>
    this.globalSearch.allItems().map((item) => ({
      ...item,
      label: this.language.translate(item.labelKey),
      sectionLabel: this.language.translate(item.sectionKey),
    })),
  );

  filteredGroups = computed((): GlobalSearchGroup[] => {
    const term = this.query().trim().toLowerCase();
    const items = this.labeledItems();

    const matched = term
      ? items.filter(
          (item) =>
            item.label.toLowerCase().includes(term) ||
            item.sectionLabel.toLowerCase().includes(term) ||
            item.route.toLowerCase().includes(term) ||
            item.keywords.toLowerCase().includes(term),
        )
      : items;

    const map = new Map<string, GlobalSearchGroup>();
    for (const item of matched) {
      const key = item.sectionKey;
      const group = map.get(key) ?? {
        sectionKey: item.sectionKey,
        sectionIcon: item.sectionIcon,
        items: [],
      };
      group.items.push(item);
      map.set(key, group);
    }

    return [...map.values()];
  });

  recentItems = computed(() => {
    const routes = new Set(this.globalSearch.recentRoutes());
    if (!routes.size) {
      return [] as GlobalSearchItem[];
    }
    return this.globalSearch
      .allItems()
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
  }

  navigate(item: GlobalSearchItem): void {
    this.globalSearch.remember(item.route);
    this.globalSearch.hide();
    void this.router.navigateByUrl(item.route);
  }

  isActive(item: GlobalSearchItem): boolean {
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
}
