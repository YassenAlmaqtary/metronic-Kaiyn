import { HttpContextToken, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of, tap } from 'rxjs';

import { HttpCacheService } from '../../services/http-cache.service';

export const SKIP_HTTP_CACHE = new HttpContextToken<boolean>(() => false);

export const httpCacheInterceptor: HttpInterceptorFn = (req, next) => {
  const cache = inject(HttpCacheService);

  if (req.method !== 'GET') {
    if (req.url.toLowerCase().includes('/api/')) {
      cache.clear();
    }
    return next(req);
  }

  if (req.context.get(SKIP_HTTP_CACHE) || !cache.isCacheable(req)) {
    return next(req);
  }

  const key = cache.keyFor(req);
  const cached = cache.get(key);
  if (cached) {
    return of(cached);
  }

  const generation = cache.currentGeneration();
  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        cache.set(key, event, generation);
      }
    }),
  );
};
