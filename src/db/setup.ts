import { execSync } from 'child_process';
import { prisma } from '../utils/prisma';
import { env } from '../config/env';

function shouldAutoSetup(): boolean {
  if (process.env.AUTO_DB_SETUP === 'false') return false;
  if (process.env.AUTO_DB_SETUP === 'true') return true;
  return env.NODE_ENV === 'production';
}

function runPrisma(command: string): void {
  execSync(`npx prisma ${command}`, {
    stdio: 'inherit',
    env: process.env,
  });
}

async function schemaReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.user.findFirst({ select: { id: true } });
    return true;
  } catch {
    return false;
  }
}

export async function ensureDatabaseReady(): Promise<void> {
  if (!shouldAutoSetup()) {
    console.log('[db] Auto setup disabled');
    return;
  }

  if (!(await schemaReady())) {
    console.log('[db] Schema missing or unreachable — running prisma db push...');
    runPrisma('db push --skip-generate');
  }

  const userCount = await prisma.user.count().catch(() => 0);
  if (userCount === 0) {
    console.log('[db] No users found — running prisma db seed...');
    runPrisma('db seed');
  }

  console.log('[db] Database ready');
}
