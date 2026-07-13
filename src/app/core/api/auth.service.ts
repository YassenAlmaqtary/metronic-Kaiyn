import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, tap, throwError } from 'rxjs';

import { buildApiUrl } from './api-url';
import { ApiResponse, AuthData, AuthResponse, LoginRequest, RefreshTokenRequest } from './models/auth.models';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private tokenStorage = inject(TokenStorageService);

  private readonly userState = signal<AuthData | null>(this.tokenStorage.getUser());

  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => !!this.userState()?.token || this.tokenStorage.isAuthenticated());
  readonly userName = computed(() => this.userState()?.userName ?? '');

  login(request: LoginRequest): Observable<AuthData> {
    return this.http
      .post<AuthResponse>(buildApiUrl('/api/Auth/login'), request)
      .pipe(
        map((response) => this.unwrap(response)),
        tap((auth) => this.persist(auth)),
      );
  }

  refreshToken(): Observable<AuthData> {
    const token = this.tokenStorage.getToken();
    const refreshToken = this.tokenStorage.getRefreshToken();

    if (!token || !refreshToken) {
      return throwError(() => new Error('Missing refresh token'));
    }

    const body: RefreshTokenRequest = { token, refreshToken };

    return this.http
      .post<AuthResponse>(buildApiUrl('/api/Auth/refresh-token'), body)
      .pipe(
        map((response) => this.unwrap(response)),
        tap((auth) => this.persist(auth)),
      );
  }

  logout(): Observable<void> {
    const request$ = this.tokenStorage.isAuthenticated()
      ? this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/Auth/logout'), {}).pipe(
          catchError(() => []),
          map(() => undefined),
        )
      : new Observable<void>((subscriber) => {
          subscriber.next();
          subscriber.complete();
        });

    return request$.pipe(tap(() => this.clearSession()));
  }

  logoutAndRedirect(): void {
    this.logout().subscribe({
      complete: () => this.router.navigate(['/auth/sign-in']),
    });
  }

  initFromStorage(): void {
    const user = this.tokenStorage.getUser();
    this.userState.set(user);

    if (this.isTokenExpired()) {
      this.clearSession();
      if (!this.router.url.startsWith('/auth/sign-in')) {
        this.router.navigate(['/auth/sign-in'], {
          queryParams: { reason: 'session-expired' },
        });
      }
    }
  }

  isTokenExpired(): boolean {
    if (!this.tokenStorage.isAuthenticated()) {
      return false;
    }

    const user = this.tokenStorage.getUser();
    if (!user?.tokenExpiration) {
      return false;
    }

    return new Date(user.tokenExpiration) <= new Date();
  }

  forceLogout(showSessionExpiredMessage = true): void {
    this.clearSession();

    if (this.router.url.startsWith('/auth/sign-in')) {
      return;
    }

    const queryParams = showSessionExpiredMessage
      ? { reason: 'session-expired' }
      : undefined;

    this.router.navigate(['/auth/sign-in'], { queryParams });
  }

  clearSession(): void {
    this.tokenStorage.clear();
    this.userState.set(null);
  }

  private persist(auth: AuthData): void {
    this.tokenStorage.save(auth);
    this.userState.set(auth);
  }

  private unwrap(response: AuthResponse): AuthData {
    if (!response.success || !response.data) {
      throw new Error(response.message || response.errors?.join(', ') || 'Request failed');
    }
    return response.data;
  }
}
