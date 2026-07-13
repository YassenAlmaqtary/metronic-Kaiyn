import { Component, inject } from '@angular/core';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { ThemeToggleService } from '../theme-toggle/theme-toggle.service';

@Component({
  selector: 'app-topbar-user-dropdown',
  imports: [TranslatePipe],
  templateUrl: './topbar-user-dropdown.component.html',
  styleUrl: './topbar-user-dropdown.component.scss'
})
export class TopbarUserDropdownComponent {
  themeService = inject(ThemeToggleService);

  onThemeToggle(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (input) {
      this.themeService.setThemeMode(input.checked ? 'dark' : 'light');
    }
  }
}
