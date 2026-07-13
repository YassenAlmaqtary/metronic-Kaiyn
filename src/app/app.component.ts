import { Component, inject, signal, Renderer2, DOCUMENT } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';

import { filter } from 'rxjs/operators';
import { MetronicInitService } from './core/services/metronic-init.service';
import { LanguageService } from './core/services/language.service';
import { AuthService } from './core/api/auth.service';
import { ThemeToggleService } from './partials/theme-toggle/theme-toggle.service';

@Component({
  selector: 'body[app-root]',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'kayianErp';

  private router = inject(Router);
  private document = inject(DOCUMENT);
  private renderer = inject(Renderer2);
  private metronicInitService = inject(MetronicInitService);
  private languageService = inject(LanguageService);
  private authService = inject(AuthService);
  private themeService = inject(ThemeToggleService);

  private demoClassMap: Record<string, string> = {
    demo1: 'demo1 kt-sidebar-fixed kt-header-fixed',
  };
  private currentDemo = signal('demo1');

  constructor() {
    this.languageService.init();
    this.authService.initFromStorage();
    this.renderer.removeClass(this.document.body, 'kt-sidebar-collapse');
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.updateDemo();
      // Delay initialization to ensure view is rendered
      setTimeout(() => {
        this.metronicInitService.init();
      }, 0);
    });
    this.updateDemo();
  }

  private updateDemo() {
    const url = this.router.url;
    const firstSegment = url.split('/').filter(Boolean)[0] || 'demo1';
    this.clearDemoClasses();

    if (firstSegment in this.demoClassMap) {
      this.currentDemo.set(firstSegment);
      this.applyDemoClass(this.demoClassMap[firstSegment]);
    } else {
      this.currentDemo.set('');
    }
  }

  private clearDemoClasses() {
    // Remove all possible demo classes from body
    Object.values(this.demoClassMap).forEach(classString => {
      const classes = classString.split(' ');
      classes.forEach(className => {
        if (className.trim()) {
          this.renderer.removeClass(this.document.body, className.trim());
        }
      });
    });
  }

  private applyDemoClass(classString: string) {
    const classes = classString.split(' ');
    classes.forEach(className => {
      if (className.trim()) {
        this.renderer.addClass(this.document.body, className.trim());
      }
    });
  }
}
