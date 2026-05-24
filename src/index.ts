import { createApp } from './app';
import { env } from './config/env';
import { ensureDatabaseReady } from './db/setup';
import { prisma } from './utils/prisma';

async function main() {
  try {
    await ensureDatabaseReady();
  } catch (error) {
    console.error('[db] Startup setup failed:', error);
  }

  const app = createApp();

  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`Gemivora CMS API running on port ${env.PORT}`);
  });
}

main().catch((error) => {
  console.error('Fatal startup error:', error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  void prisma.$disconnect();
});
