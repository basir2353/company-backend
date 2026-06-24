import { BlogPostStatus, SeoPage, SeoSettings } from '@prisma/client';
import { prisma } from '../utils/prisma';

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}

export async function getSeoSettings(): Promise<SeoSettings> {
  let settings = await prisma.seoSettings.findUnique({ where: { id: 'default' } });
  if (!settings) {
    settings = await prisma.seoSettings.create({ data: { id: 'default' } });
  }
  return settings;
}

export function normalizeGoogleSiteVerification(raw?: string | null): string | null {
  if (!raw?.trim()) return null;

  let token = raw.trim();
  token = token.replace(/^<meta[^>]+content=["']/i, '');
  token = token.replace(/["'][^>]*>/i, '');
  token = token.replace(/^google-site-verification:\s*/i, '');
  token = token.replace(/\.html$/i, '');

  return token.trim() || null;
}

export function normalizeSiteUrl(url?: string | null): string {
  const fallback = 'https://www.creatd.it.com';
  if (!url?.trim()) return fallback;
  return url.trim().replace(/\/+$/, '').replace(/^http:\/\//i, 'https://');
}

export function serializeSeoSettings(settings: SeoSettings) {
  return {
    ...settings,
    siteUrl: `${normalizeSiteUrl(settings.siteUrl)}/`,
    googleSearchConsoleVerification: normalizeGoogleSiteVerification(
      settings.googleSearchConsoleVerification,
    ),
  };
}

export function buildDefaultSchema(
  page: Pick<SeoPage, 'path' | 'title' | 'description'>,
  settings: SeoSettings,
) {
  const url = `${settings.siteUrl.replace(/\/$/, '')}${page.path === '/' ? '' : page.path}`;
  return JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page.title,
      description: page.description,
      url,
      isPartOf: {
        '@type': 'WebSite',
        name: settings.siteName,
        url: settings.siteUrl,
      },
    },
    null,
    2,
  );
}

export function serializeSeoPage(page: SeoPage, settings: SeoSettings) {
  const baseUrl = settings.siteUrl.replace(/\/$/, '');
  const path = page.path.startsWith('/') ? page.path : `/${page.path}`;
  const canonical = page.canonicalUrl || `${baseUrl}${path === '/' ? '' : path}`;

  return {
    ...page,
    canonicalUrl: canonical,
    ogTitle: page.ogTitle || page.title,
    ogDescription: page.ogDescription || page.description,
    ogImage: page.ogImage || settings.defaultOgImage,
    twitterTitle: page.twitterTitle || page.ogTitle || page.title,
    twitterDescription: page.twitterDescription || page.ogDescription || page.description,
    twitterImage: page.twitterImage || page.ogImage || settings.defaultOgImage,
    twitterSite: page.twitterSite || settings.defaultTwitterHandle,
    schemaMarkup: page.schemaMarkup || buildDefaultSchema(page, settings),
    integrations: {
      googleAnalyticsId: settings.googleAnalyticsId,
      googleTagManagerId: settings.googleTagManagerId,
      googleSearchConsoleVerification: settings.googleSearchConsoleVerification,
    },
  };
}

export async function generateSitemapUrls(): Promise<SitemapUrl[]> {
  const settings = await getSeoSettings();
  if (!settings.sitemapAutoGenerate) {
    return [];
  }
  const base = settings.siteUrl.replace(/\/$/, '');
  const urls: SitemapUrl[] = [];

  const pages = await prisma.seoPage.findMany({
    where: { includeInSitemap: true, noIndex: false },
    orderBy: { path: 'asc' },
  });

  for (const page of pages) {
    urls.push({
      loc: `${base}${page.path === '/' ? '' : page.path}`,
      lastmod: page.updatedAt.toISOString(),
      changefreq: page.sitemapChangeFreq,
      priority: page.sitemapPriority,
    });
  }

  const blogPosts = await prisma.blogPost.findMany({
    where: { status: BlogPostStatus.PUBLISHED },
    orderBy: { updatedAt: 'desc' },
  });

  for (const post of blogPosts) {
    urls.push({
      loc: `${base}/blog/${post.slug}`,
      lastmod: post.updatedAt.toISOString(),
      changefreq: 'weekly',
      priority: 0.7,
    });
  }

  const services = await prisma.service.findMany({ where: { published: true } });
  for (const service of services) {
    urls.push({
      loc: `${base}/services/${service.slug}`,
      lastmod: service.updatedAt.toISOString(),
      changefreq: 'monthly',
      priority: 0.6,
    });
  }

  const portfolio = await prisma.portfolioProject.findMany({ where: { published: true } });
  for (const project of portfolio) {
    urls.push({
      loc: `${base}/portfolio#${project.slug}`,
      lastmod: project.updatedAt.toISOString(),
      changefreq: 'monthly',
      priority: 0.5,
    });
  }

  return urls;
}

export function buildSitemapXml(urls: SitemapUrl[]): string {
  const body = urls
    .map(
      (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}${u.changefreq ? `\n    <changefreq>${u.changefreq}</changefreq>` : ''}${u.priority !== undefined ? `\n    <priority>${u.priority.toFixed(1)}</priority>` : ''}
  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

export async function generateRobotsTxt(): Promise<string> {
  const settings = await getSeoSettings();
  const base = settings.siteUrl.replace(/\/$/, '');

  const lines = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${base}/sitemap.xml`,
    `Sitemap: ${base}/sitemap-page.xml`,
    `Sitemap: ${base}/sitemap-post.xml`,
  ];

  if (settings.robotsTxtCustom?.trim()) {
    lines.push('', settings.robotsTxtCustom.trim());
  }

  return `${lines.join('\n')}\n`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
