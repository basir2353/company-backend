import { env } from '../config/env';

const DEFAULT_PUBLIC_BASE = 'https://company-backend-qy0h.onrender.com';

export function getPublicBaseUrl(): string {
  const configured = process.env.PUBLIC_BASE_URL?.trim().replace(/\/+$/, '');
  if (configured) return configured.replace(/^http:\/\//i, 'https://');
  if (env.NODE_ENV === 'production') return DEFAULT_PUBLIC_BASE;
  return `http://localhost:${env.PORT}`;
}

/** Normalize stored media paths for public clients (HTTPS, stable host). */
export function normalizeMediaUrl(url?: string | null): string | null {
  if (!url?.trim()) return null;

  const trimmed = url.trim();
  const base = getPublicBaseUrl();

  if (trimmed.startsWith('/uploads/')) {
    return `${base}${trimmed}`;
  }

  if (trimmed.startsWith('/')) {
    return `${base}${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    const baseHost = new URL(base).host;

    if (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.host === baseHost
    ) {
      if (parsed.pathname.startsWith('/uploads/')) {
        return `${base}${parsed.pathname}`;
      }
    }

    if (env.NODE_ENV === 'production' && parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
      return parsed.toString();
    }

    return trimmed;
  } catch {
    return `${base}/${trimmed.replace(/^\/+/, '')}`;
  }
}
