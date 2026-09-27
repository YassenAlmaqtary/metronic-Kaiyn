import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  templateUrl: './toast-host.component.html',
  styleUrl: './toast-host.component.scss',
})
export class ToastHostComponent implements OnInit {
  private toast = inject(ToastService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly toasts = this.toast.toasts;

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.consumeNavigationFlash());

    // First paint / hard reload with leftover state
    queueMicrotask(() => this.consumeNavigationFlash());
  }

  dismiss(id: number): void {
    this.toast.dismiss(id);
  }

  private consumeNavigationFlash(): void {
    const state = history.state as {
      successMessage?: string;
      errorMessage?: string;
      infoMessage?: string;
    } | null;
    if (!state || typeof state !== 'object') {
      return;
    }

    let changed = false;
    if (state.successMessage) {
      this.toast.success(state.successMessage);
      delete state.successMessage;
      changed = true;
    }
    if (state.errorMessage) {
      this.toast.error(state.errorMessage);
      delete state.errorMessage;
      changed = true;
    }
    if (state.infoMessage) {
      this.toast.info(state.infoMessage);
      delete state.infoMessage;
      changed = true;
    }
    if (changed) {
      history.replaceState({ ...state }, '');
    }
  }
}
