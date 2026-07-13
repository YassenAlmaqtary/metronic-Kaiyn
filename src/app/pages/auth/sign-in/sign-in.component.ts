import { AfterViewInit, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/api/auth.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { MetronicInitService } from '../../../core/services/metronic-init.service';
import { LanguageToggleComponent } from '../../../partials/language-toggle/language-toggle.component';
import { ThemeToggleComponent } from '../../../partials/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-sign-in',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    TranslatePipe,
    ThemeToggleComponent,
    LanguageToggleComponent,
  ],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.scss',
})
export class SignInComponent implements AfterViewInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private languageService = inject(LanguageService);
  private metronicInitService = inject(MetronicInitService);

  loading = signal(false);
  errorMessage = signal('');

  constructor() {
    if (this.route.snapshot.queryParamMap.get('reason') === 'session-expired') {
      this.errorMessage.set(this.languageService.translate('auth.signIn.sessionExpired'));
    }
  }

  form = new FormGroup({
    userName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    remember: new FormControl(false, { nonNullable: true }),
  });

  ngAfterViewInit(): void {
    this.metronicInitService.initTogglePassword();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const { userName, password } = this.form.getRawValue();

    this.authService.login({ userName, password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/demo1']);
      },
      error: (error: { error?: { message?: string; errors?: string[] }; message?: string }) => {
        this.loading.set(false);
        const apiMessage = error?.error?.message || error?.error?.errors?.join(', ');
        this.errorMessage.set(apiMessage || this.languageService.translate('auth.signIn.error'));
      },
    });
  }
}
