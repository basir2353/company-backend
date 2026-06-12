import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

function normalizeDatabaseUrl(url: string): string {
  if (!url) return url;
  if (url.includes('sslmode=')) return url;

  // Render private-network URLs (e.g. @dpg-xxx-a/db) must not force SSL
  const isRenderInternal =
    /@dpg-[a-z0-9]+-a(\/|:)/i.test(url) && !/\.render\.com/i.test(url);
  if (isRenderInternal) return url;

  const needsSsl =
    process.env.DATABASE_SSL === 'true' ||
    url.includes('render.com') ||
    (process.env.NODE_ENV === 'production' && url.includes('@dpg-'));

  if (!needsSsl) return url;

  return `${url}${url.includes('?') ? '&' : '?'}sslmode=require`;
}

const rawDatabaseUrl = process.env.DATABASE_URL ?? '';
const databaseUrl = normalizeDatabaseUrl(rawDatabaseUrl);
if (databaseUrl && databaseUrl !== rawDatabaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z
    .string()
    .default(
      'http://localhost:3000,http://localhost:3001,https://admin.creatd.it.com,https://creatd.it.com,https://www.creatd.it.com,https://company-frontend-liart.vercel.app,https://compnay-admin.vercel.app',
    ),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.coerce.number().default(10_485_760),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = envSchema.parse({
  ...process.env,
  DATABASE_URL: databaseUrl || process.env.DATABASE_URL,
});
