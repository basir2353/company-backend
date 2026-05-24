import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

function normalizeDatabaseUrl(url: string): string {
  if (!url) return url;
  if (url.includes('sslmode=')) return url;

  const needsSsl =
    process.env.DATABASE_SSL === 'true' ||
    process.env.NODE_ENV === 'production' ||
    url.includes('render.com') ||
    url.includes('@dpg-');

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
  CORS_ORIGIN: z.string().default('http://localhost:3001'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.coerce.number().default(10_485_760),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = envSchema.parse({
  ...process.env,
  DATABASE_URL: databaseUrl || process.env.DATABASE_URL,
});
