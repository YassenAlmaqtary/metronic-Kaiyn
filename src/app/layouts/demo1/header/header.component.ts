import { Component, inject } from '@angular/core';

import { AuthService } from '../../../core/api/auth.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageToggleComponent } from '../../../partials/language-toggle/language-toggle.component';
import { ThemeToggleComponent } from '../../../partials/theme-toggle/theme-toggle.component';
import { ThemeToggleService } from '../../../partials/theme-toggle/theme-toggle.service';

@Component({
  selector: '[app-header]',
  imports: [TranslatePipe, LanguageToggleComponent, ThemeToggleComponent],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  protected themeService = inject(ThemeToggleService);
  protected authService = inject(AuthService);

  onThemeToggle(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (input) {
      this.themeService.setThemeMode(input.checked ? 'dark' : 'light');
    }
  }

  onLogout(): void {
    this.authService.logoutAndRedirect();
  }
}
