import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface AppToast {
  id: number;
  kind: ToastKind;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  private readonly _toasts = signal<AppToast[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  readonly toasts = this._toasts.asReadonly();

  success(message: string, durationMs = 4200): void {
    this.push('success', message, durationMs);
  }

  error(message: string, durationMs = 5600): void {
    this.push('error', message, durationMs);
  }

  info(message: string, durationMs = 4200): void {
    this.push('info', message, durationMs);
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this._toasts.set([]);
  }

  private push(kind: ToastKind, message: string, durationMs: number): void {
    const text = String(message ?? '').trim();
    if (!text) {
      return;
    }
    const id = ++this.seq;
    this._toasts.update((list) => [...list, { id, kind, message: text }]);
    if (durationMs > 0) {
      const timer = setTimeout(() => this.dismiss(id), durationMs);
      this.timers.set(id, timer);
    }
  }
}
