import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, EMPTY, switchMap, throwError } from 'rxjs';

import { AuthService } from '../auth.service';
import { TokenStorageService } from '../token-storage.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const token = tokenStorage.getToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq);
};

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const tokenStorage = inject(TokenStorageService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || req.url.includes('/api/Auth/login')) {
        return throwError(() => error);
      }

      if (req.url.includes('/api/Auth/refresh-token')) {
        authService.forceLogout();
        return EMPTY;
      }

      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        authService.forceLogout();
        return EMPTY;
      }

      return authService.refreshToken().pipe(
        switchMap((auth) => {
          const retryReq = req.clone({
            setHeaders: { Authorization: `Bearer ${auth.token}` },
          });
          return next(retryReq);
        }),
        catchError(() => {
          authService.forceLogout();
          return EMPTY;
        }),
      );
    }),
  );
};
