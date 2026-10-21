import { HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';

const TTL_MS = 30_000;
/** Cached responses are only served to requests issued while a page is being entered. */
const NAVIGATION_WINDOW_MS = 3_000;
const MAX_ENTRIES = 300;

/** Live values that must never be served from cache. */
const UNCACHEABLE_FRAGMENTS = [
  '/api/auth',
  '/next-number',
  '/available',
  '/reports/',
  '/sql-agent',
  ':8050',
  'kayianagent.',
];

interface CacheEntry {
  response: HttpResponse<unknown>;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class HttpCacheService {
  private router = inject(Router);

  private readonly entries = new Map<string, CacheEntry>();
  private generation = 0;
  private navigating = false;
  private lastNavigationEndAt = 0;

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.navigating = true;
      } else if (event instanceof NavigationEnd) {
        this.navigating = false;
        this.lastNavigationEndAt = Date.now();
      }
    });
  }

  isCacheable(req: HttpRequest<unknown>): boolean {
    if (req.method !== 'GET' || req.responseType !== 'json' || req.reportProgress) {
      return false;
    }
    const url = req.url.toLowerCase();
    return url.includes('/api/') && !UNCACHEABLE_FRAGMENTS.some((fragment) => url.includes(fragment));
  }

  keyFor(req: HttpRequest<unknown>): string {
    return `${req.headers.get('Authorization') ?? ''}|${req.urlWithParams}`;
  }

  /** Explicit reloads (refresh buttons, polling) happen outside the navigation window and always hit the server. */
  get(key: string): HttpResponse<unknown> | null {
    if (!this.navigating && Date.now() - this.lastNavigationEndAt > NAVIGATION_WINDOW_MS) {
      return null;
    }
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.response.clone({ body: structuredClone(entry.response.body) });
  }

  currentGeneration(): number {
    return this.generation;
  }

  /** Responses from requests started before the last mutation are discarded. */
  set(key: string, response: HttpResponse<unknown>, generation: number): void {
    if (generation !== this.generation || response.status !== 200) {
      return;
    }
    if (this.entries.size >= MAX_ENTRIES) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey !== undefined) {
        this.entries.delete(oldestKey);
      }
    }
    this.entries.set(key, {
      response: response.clone({ body: structuredClone(response.body) }),
      expiresAt: Date.now() + TTL_MS,
    });
  }

  clear(): void {
    this.generation += 1;
    this.entries.clear();
  }
}
