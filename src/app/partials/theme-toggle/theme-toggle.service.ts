import { Injectable, computed, signal } from '@angular/core';

export type SidebarTheme = 'light' | 'dark';

const STORAGE_KEY = 'kayian-sidebar-theme';

@Injectable({ providedIn: 'root' })
export class ThemeToggleService {
  readonly sidebarTheme = signal<SidebarTheme>('dark');
  readonly sidebarDark = computed(() => this.sidebarTheme() === 'dark');
  readonly effectiveTheme = computed(() => this.sidebarTheme());

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      this.sidebarTheme.set(stored);
    } else {
      this.sidebarTheme.set('dark');
      localStorage.setItem(STORAGE_KEY, 'dark');
    }
    this.applyPageTheme();
  }

  private applyPageTheme(): void {
    const html = document.documentElement;
    const isDark = this.sidebarTheme() === 'dark';
    html.classList.toggle('dark', isDark);
    html.classList.toggle('light', !isDark);
    html.setAttribute('data-kt-theme-mode', isDark ? 'dark' : 'light');
    html.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  setSidebarTheme(theme: SidebarTheme): void {
    this.sidebarTheme.set(theme);
    localStorage.setItem(STORAGE_KEY, theme);
    this.applyPageTheme();
  }

  toggleTheme(): void {
    this.setSidebarTheme(this.sidebarDark() ? 'light' : 'dark');
  }

  setThemeMode(mode: 'light' | 'dark'): void {
    this.setSidebarTheme(mode);
  }
}
