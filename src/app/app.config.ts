import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withPreloading } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor, errorInterceptor } from './core/api/interceptors/api.interceptors';
import { httpCacheInterceptor } from './core/api/interceptors/http-cache.interceptor';
import { loadingBarInterceptor } from './core/api/interceptors/loading-bar.interceptor';
import { IdlePreloadingStrategy } from './core/navigation/idle-preloading.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withPreloading(IdlePreloadingStrategy)),
    provideHttpClient(
      withInterceptors([loadingBarInterceptor, authInterceptor, httpCacheInterceptor, errorInterceptor]),
    ),
  ],
};
