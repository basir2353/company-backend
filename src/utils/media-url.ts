import { env } from '../config/env';

const DEFAULT_PUBLIC_BASE = 'https://company-backend-qy0h.onrender.com';

export function getPublicBaseUrl(): string {
  const configured = process.env.PUBLIC_BASE_URL?.trim().replace(/\/+$/, '');
  if (configured) return configured.replace(/^http:\/\//i, 'https://');
  if (env.NODE_ENV === 'production') return DEFAULT_PUBLIC_BASE;
  return `http://localhost:${env.PORT}`;
}

/** Prefer storing `/uploads/...` in the database so URLs survive host changes. */
export function toStoredMediaPath(url?: string | null): string | null {
  if (!url?.trim()) return null;

  const trimmed = url.trim();
  if (trimmed.startsWith('/uploads/')) return trimmed;

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return path.startsWith('/uploads/') ? path : trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith('/uploads/')) {
      return parsed.pathname;
    }
  } catch {
    /* keep original */
  }

  return trimmed;
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
      parsed.host === baseHost ||
      parsed.pathname.startsWith('/uploads/')
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

/** Rewrite inline `<img src>` in blog HTML to the current public backend host. */
export function normalizeHtmlMediaUrls(html?: string | null): string {
  if (!html?.trim()) return html ?? '';

  const base = getPublicBaseUrl();

  return html.replace(
    /(<img[^>]+src=["'])([^"']+)(["'])/gi,
    (_match, prefix: string, src: string, suffix: string) => {
      const normalized = normalizeMediaUrl(src) ?? src;
      return `${prefix}${normalized}${suffix}`;
    },
  );
}

export function serializeMediaRecord<T extends { url: string }>(media: T): T {
  return {
    ...media,
    url: normalizeMediaUrl(media.url) ?? media.url,
  };
}
