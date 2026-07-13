import { environment } from '../../../environments/environment';

export function buildApiUrl(path: string): string {
  const base = environment.apiUrl.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function toApiPath(template: string, params: Record<string, string | number | boolean> = {}): string {
  return Object.entries(params).reduce(
    (path, [key, value]) => path.replace(`{${key}}`, encodeURIComponent(String(value))),
    template,
  );
}
