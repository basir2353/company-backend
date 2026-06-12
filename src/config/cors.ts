/** Normalize CORS origins — browsers send Origin without a trailing slash. */
export function parseCorsOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

const DEFAULT_PRODUCTION_ORIGINS = [
  'https://admin.creatd.it.com',
  'https://creatd.it.com',
  'https://www.creatd.it.com',
  'https://gemivora.com',
  'https://www.gemivora.com',
  'https://company-frontend-liart.vercel.app',
  'https://compnay-admin.vercel.app',
];

const DEFAULT_DEV_ORIGINS = ['http://localhost:3000', 'http://localhost:3001'];

/** Merge env CORS list with known production admin/frontend domains. */
export function getAllowedOrigins(envRaw: string, nodeEnv: string): string[] {
  const fromEnv = parseCorsOrigins(envRaw);
  const extras = [process.env.ADMIN_URL, process.env.SITE_URL]
    .map((url) => url?.trim().replace(/\/+$/, ''))
    .filter(Boolean) as string[];

  const defaults =
    nodeEnv === 'production'
      ? [...DEFAULT_PRODUCTION_ORIGINS, ...DEFAULT_DEV_ORIGINS]
      : [...DEFAULT_DEV_ORIGINS, ...DEFAULT_PRODUCTION_ORIGINS];

  return [...new Set([...fromEnv, ...defaults, ...extras])];
}

export function createCorsOriginChecker(allowed: string[]) {
  const allowedSet = new Set(allowed);

  return (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalized = origin.replace(/\/+$/, '');
    if (allowedSet.has(normalized)) {
      callback(null, true);
      return;
    }

    console.warn('[CORS] Blocked origin:', origin, '| Allowed:', [...allowedSet].join(', '));
    callback(null, false);
  };
}
