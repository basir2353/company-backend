/**
 * One-time fix: point CMS SEO settings at the live Creatd domain.
 * Run on Render shell: npx tsx scripts/fix-live-urls.ts
 */
import { PrismaClient } from '@prisma/client';

const LIVE_SITE_URL = 'https://www.creatd.it.com';

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.seoSettings.upsert({
    where: { id: 'default' },
    update: { siteUrl: LIVE_SITE_URL },
    create: {
      id: 'default',
      siteUrl: LIVE_SITE_URL,
      siteName: 'Creatd',
      defaultTitle: 'Creatd — Think It. Creatd | AI Solutions',
      defaultDescription:
        'Creatd builds AI automation and software products for teams that want scalable digital experiences.',
      defaultTwitterHandle: '@creatd',
      sitemapAutoGenerate: true,
    },
  });

  console.log('Updated siteUrl:', settings.siteUrl);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
