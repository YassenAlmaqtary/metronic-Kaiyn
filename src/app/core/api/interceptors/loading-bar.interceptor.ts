import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';

import { LoadingBarService } from '../../services/loading-bar.service';

/** AI assistant / SQL agent calls stream for a long time and have their own indicators. */
const UNTRACKED_FRAGMENTS = ['/sql-agent', ':8050', 'kayianagent.'];

export const loadingBarInterceptor: HttpInterceptorFn = (req, next) => {
  const url = req.url.toLowerCase();
  if (!url.includes('/api/') || UNTRACKED_FRAGMENTS.some((fragment) => url.includes(fragment))) {
    return next(req);
  }

  const loadingBar = inject(LoadingBarService);
  loadingBar.begin();
  return next(req).pipe(finalize(() => loadingBar.end()));
};
