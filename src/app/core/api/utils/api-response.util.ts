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
    const body = error.error as
      | ApiResponse<unknown>
      | {
          message?: string;
          title?: string;
          errors?: string[] | Record<string, string[] | string>;
        }
      | null;

    if (body && typeof body === 'object') {
      if ('message' in body && typeof body.message === 'string' && body.message.trim()) {
        return body.message.trim().replace(/^\.+/, '');
      }

      if ('detail' in body && typeof (body as { detail?: unknown }).detail === 'string') {
        const detail = String((body as { detail: string }).detail).trim();
        if (detail) {
          return detail.replace(/^\.+/, '');
        }
      }

      if ('errors' in body && body.errors) {
        if (Array.isArray(body.errors) && body.errors.length) {
          return body.errors.filter(Boolean).join(', ');
        }

        if (typeof body.errors === 'object') {
          const messages = Object.entries(body.errors).flatMap(([key, value]) => {
            const text = Array.isArray(value) ? value.join(', ') : String(value);
            return text ? `${key}: ${text}` : [];
          });
          if (messages.length) {
            return messages.join(' | ');
          }
        }
      }

      if ('title' in body && body.title) {
        return String(body.title).trim().replace(/^\.+/, '');
      }
    }
    return error.message || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
