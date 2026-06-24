import { createApp } from './app';
import { env } from './config/env';
import { ensureDatabaseReady } from './db/setup';
import { prisma } from './utils/prisma';

async function main() {
  const app = createApp();

  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`Gemivora CMS API running on port ${env.PORT} (${env.NODE_ENV})`);
    console.log(`Health: http://0.0.0.0:${env.PORT}/health`);
  });

  // Run DB migrations/seed in background so Railway health checks pass immediately.
  void ensureDatabaseReady().catch((error) => {
    console.error('[db] Startup setup failed:', error);
  });
}

main().catch((error) => {
  console.error('Fatal startup error:', error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  void prisma.$disconnect();
});
