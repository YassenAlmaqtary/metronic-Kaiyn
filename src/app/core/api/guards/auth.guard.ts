import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/auth/sign-in']);
  }

  if (authService.isTokenExpired()) {
    authService.forceLogout();
    return false;
  }

  return true;
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isTokenExpired()) {
    authService.clearSession();
    return true;
  }

  if (!authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/demo1']);
};
