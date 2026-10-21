import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';

/** Fast responses finish before the bar appears, so it never flickers. */
const SHOW_DELAY_MS = 150;

@Injectable({ providedIn: 'root' })
export class LoadingBarService {
  private router = inject(Router);

  private readonly pendingRequests = signal(0);
  private readonly navigating = signal(false);
  private readonly active = computed(() => this.navigating() || this.pendingRequests() > 0);
  private showTimer: ReturnType<typeof setTimeout> | null = null;

  readonly visible = signal(false);

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.navigating.set(true);
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.navigating.set(false);
      }
    });

    effect(() => {
      const active = this.active();
      untracked(() => this.sync(active));
    });
  }

  begin(): void {
    this.pendingRequests.update((count) => count + 1);
  }

  end(): void {
    this.pendingRequests.update((count) => Math.max(0, count - 1));
  }

  private sync(active: boolean): void {
    if (active) {
      if (!this.visible() && !this.showTimer) {
        this.showTimer = setTimeout(() => {
          this.showTimer = null;
          this.visible.set(true);
        }, SHOW_DELAY_MS);
      }
      return;
    }

    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    this.visible.set(false);
  }
}
