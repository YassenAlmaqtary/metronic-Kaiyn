import { Injectable } from '@angular/core';

import { AuthData } from './models/auth.models';

const TOKEN_KEY = 'kayian-erp-token';
const REFRESH_TOKEN_KEY = 'kayian-erp-refresh-token';
const USER_KEY = 'kayian-erp-user';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  getUser(): AuthData | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthData;
    } catch {
      return null;
    }
  }

  save(auth: AuthData): void {
    if (auth.token) {
      localStorage.setItem(TOKEN_KEY, auth.token);
    }
    if (auth.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, auth.refreshToken);
    }
    localStorage.setItem(USER_KEY, JSON.stringify(auth));
  }

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
