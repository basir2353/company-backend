/**
 * One-time fix: point CMS SEO settings at the live Creatd domain.
 * Run on Render shell: npx tsx scripts/fix-live-urls.ts
 */
import { PrismaClient } from '@prisma/client';

const LIVE_SITE_URL = 'https://www.creatd.it.com';
const GSC_VERIFICATION = 'googleb923836d3b59de5b';

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.seoSettings.upsert({
    where: { id: 'default' },
    update: {
      siteUrl: LIVE_SITE_URL,
      googleSearchConsoleVerification: GSC_VERIFICATION,
    },
    create: {
      id: 'default',
      siteUrl: LIVE_SITE_URL,
      siteName: 'Creatd',
      defaultTitle: 'Creatd — Think It. Creatd | AI Solutions',
      defaultDescription:
        'Creatd builds AI automation and software products for teams that want scalable digital experiences.',
      defaultTwitterHandle: '@creatd',
      googleSearchConsoleVerification: GSC_VERIFICATION,
      sitemapAutoGenerate: true,
    },
  });

  console.log('Updated siteUrl:', settings.siteUrl);
  console.log('Updated GSC verification token:', settings.googleSearchConsoleVerification);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
