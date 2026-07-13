import { Injectable, computed, signal } from '@angular/core';

export type SidebarTheme = 'light' | 'dark';

const STORAGE_KEY = 'kayian-sidebar-theme';

@Injectable({ providedIn: 'root' })
export class ThemeToggleService {
  readonly sidebarTheme = signal<SidebarTheme>('light');
  readonly sidebarDark = computed(() => this.sidebarTheme() === 'dark');
  readonly effectiveTheme = computed(() => this.sidebarTheme());

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      this.sidebarTheme.set(stored);
    }
    this.applyLightPageTheme();
  }

  private applyLightPageTheme(): void {
    const html = document.documentElement;
    html.classList.remove('dark');
    html.classList.add('light');
    html.setAttribute('data-kt-theme-mode', 'light');
    html.setAttribute('data-theme', 'light');
  }

  setSidebarTheme(theme: SidebarTheme): void {
    this.sidebarTheme.set(theme);
    localStorage.setItem(STORAGE_KEY, theme);
    this.applyLightPageTheme();
  }

  toggleTheme(): void {
    this.setSidebarTheme(this.sidebarDark() ? 'light' : 'dark');
  }

  setThemeMode(mode: 'light' | 'dark'): void {
    this.setSidebarTheme(mode);
  }
}
