import { Component, inject } from '@angular/core';

import { AuthService } from '../../../core/api/auth.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AccessControlService } from '../../../core/services/access-control.service';
import { AiAssistantService } from '../../../core/services/ai-assistant.service';
import { GlobalSearchService } from '../../../core/services/global-search.service';
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
  protected globalSearch = inject(GlobalSearchService);
  protected aiAssistant = inject(AiAssistantService);
  protected access = inject(AccessControlService);

  onThemeToggle(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (input) {
      this.themeService.setThemeMode(input.checked ? 'dark' : 'light');
    }
  }

  onLogout(): void {
    this.authService.logoutAndRedirect();
  }

  openAiAssistant(): void {
    if (!this.access.canUseAiAssistant()) {
      return;
    }
    this.aiAssistant.toggle();
  }
}
