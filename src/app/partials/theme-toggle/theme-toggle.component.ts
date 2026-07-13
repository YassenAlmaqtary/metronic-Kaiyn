import { Component, inject } from '@angular/core';

import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { ThemeToggleService } from './theme-toggle.service';

@Component({
  selector: 'app-theme-toggle',
  imports: [TranslatePipe],
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss',
})
export class ThemeToggleComponent {
  themeService = inject(ThemeToggleService);

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
