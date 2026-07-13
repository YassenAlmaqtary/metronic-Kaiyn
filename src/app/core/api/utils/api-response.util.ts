import { HttpErrorResponse } from '@angular/common/http';

import { ApiResponse } from '../models/api-response.model';

export function unwrapApiResponse<T>(response: ApiResponse<T>): T {
  if (!response.success || response.data === undefined || response.data === null) {
    throw new Error(response.message || response.errors?.join(', ') || 'Request failed');
  }
  return response.data;
}

export function extractApiErrorMessage(error: unknown, fallback = 'Request failed'): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as ApiResponse<unknown> | { message?: string; errors?: string[] } | null;
    if (body && typeof body === 'object') {
      if ('message' in body && body.message) {
        return body.message;
      }
      if ('errors' in body && Array.isArray(body.errors) && body.errors.length) {
        return body.errors.join(', ');
      }
    }
    return error.message || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
