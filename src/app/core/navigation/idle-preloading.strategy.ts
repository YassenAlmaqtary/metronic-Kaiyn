import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, catchError, of, switchMap, timer } from 'rxjs';

/** Let the first page and its API calls finish before downloading other pages. */
const START_DELAY_MS = 2_500;
/** Spread chunk downloads so they never compete with API calls for bandwidth. */
const STAGGER_MS = 60;

@Injectable({ providedIn: 'root' })
export class IdlePreloadingStrategy implements PreloadingStrategy {
  private scheduled = 0;

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (route.data?.['preload'] === false || connection?.saveData) {
      return of(null);
    }

    const delay = START_DELAY_MS + this.scheduled * STAGGER_MS;
    this.scheduled += 1;

    return timer(delay).pipe(
      switchMap(() => load()),
      catchError(() => of(null)),
    );
  }
}
