import { Component, inject, OnInit, signal } from '@angular/core';

import { AuthService } from '../../../core/api/auth.service';
import { UsersApiService } from '../../../core/api/generated/users-api.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-index',
  imports: [TranslatePipe],
  templateUrl: './index.component.html',
  styleUrl: './index.component.scss',
})
export class IndexComponent implements OnInit {
  private authService = inject(AuthService);
  private usersApi = inject(UsersApiService);

  usersCount = signal<number | null>(null);
  apiStatus = signal<'loading' | 'connected' | 'error'>('loading');

  protected userName = this.authService.userName;

  ngOnInit(): void {
    this.usersApi.getAll().subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          this.usersCount.set(response.data.length);
          this.apiStatus.set('connected');
          return;
        }
        this.apiStatus.set('error');
      },
      error: () => this.apiStatus.set('error'),
    });
  }
}
