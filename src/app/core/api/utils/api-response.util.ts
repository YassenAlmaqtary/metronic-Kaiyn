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
          detail?: string;
          errors?: string[] | Record<string, string[] | string>;
        }
      | string
      | null;

    if (typeof body === 'string' && body.trim()) {
      const text = body.trim();
      // ASP.NET HTML/generic 500 pages are useless — prefer fallback.
      if (!text.includes('<') && text.length < 300) {
        return text.replace(/^\.+/, '');
      }
    }

    if (body && typeof body === 'object') {
      const errorsDetail = (() => {
        if (!('errors' in body) || !body.errors) {
          return '';
        }
        if (Array.isArray(body.errors) && body.errors.length) {
          return body.errors.filter(Boolean).join(' · ');
        }
        if (typeof body.errors === 'object') {
          return Object.entries(body.errors)
            .flatMap(([key, value]) => {
              const text = Array.isArray(value) ? value.join(', ') : String(value);
              return text ? `${key}: ${text}` : [];
            })
            .join(' | ');
        }
        return '';
      })();

      if ('message' in body && typeof body.message === 'string' && body.message.trim()) {
        let msg = body.message.trim().replace(/^\.+/, '');
        msg = msg.replace(/^an error occurred:\s*/i, '').trim();
        // Generic ASP.NET message → keep fallback if we have a better one.
        if (
          msg.toLowerCase() === 'an error occurred while processing your request' ||
          msg.toLowerCase() === 'an error occurred while processing your request.'
        ) {
          return errorsDetail || fallback;
        }
        // Append API detail (e.g. required permission key) when present.
        if (errorsDetail && !msg.includes(errorsDetail)) {
          return `${msg} — ${errorsDetail}`;
        }
        return msg;
      }

      if ('detail' in body && typeof (body as { detail?: unknown }).detail === 'string') {
        const detail = String((body as { detail: string }).detail).trim();
        if (detail) {
          return detail.replace(/^\.+/, '');
        }
      }

      if (errorsDetail) {
        return errorsDetail;
      }

      if ('title' in body && body.title) {
        return String(body.title).trim().replace(/^\.+/, '');
      }
    }
    return error.message || fallback;
  }

  if (error instanceof Error && error.message) {
    const msg = error.message.trim();
    if (
      msg.toLowerCase() === 'an error occurred while processing your request' ||
      msg.toLowerCase() === 'an error occurred while processing your request.'
    ) {
      return fallback;
    }
    return msg;
  }

  return fallback;
}
