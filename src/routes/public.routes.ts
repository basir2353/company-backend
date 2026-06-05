import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { isBlogPublic, serializeBlogPost } from '../services/blog.service';
import {
  buildSitemapXml,
  generateRobotsTxt,
  generateSitemapUrls,
  getSeoSettings,
  serializeSeoPage,
} from '../services/seo.service';
import { getOrCreateHomeSections } from './home-sections.routes';
import { normalizeMediaUrl } from '../utils/media-url';

const router = Router();

router.get(
  '/blog',
  asyncHandler(async (req, res) => {
    const q = req.query.q as string | undefined;
    const category = req.query.category as string | undefined;
    const tag = req.query.tag as string | undefined;

    const posts = await prisma.blogPost.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(tag ? { tags: { has: tag } } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { excerpt: { contains: q, mode: 'insensitive' } },
                { content: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { date: 'desc' },
    });

    const visible = posts.filter((post) => isBlogPublic(post)).map(serializeBlogPost);
    res.json({ posts: visible });
  }),
);

router.get(
  '/blog/:slug',
  asyncHandler(async (req, res) => {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    const post = await prisma.blogPost.findUnique({ where: { slug } });
    if (!post || !isBlogPublic(post)) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    res.json({ post: serializeBlogPost(post) });
  }),
);

router.get(
  '/portfolio',
  asyncHandler(async (_req, res) => {
    const projects = await prisma.portfolioProject.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({
      projects: projects.map((p) => ({
        ...p,
        thumbnail: normalizeMediaUrl(p.thumbnail) ?? p.thumbnail,
      })),
    });
  }),
);

router.get(
  '/services',
  asyncHandler(async (_req, res) => {
    const services = await prisma.service.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
    res.json({ services });
  }),
);

router.get(
  '/testimonials',
  asyncHandler(async (_req, res) => {
    const testimonials = await prisma.testimonial.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({
      testimonials: testimonials.map((t) => ({
        ...t,
        avatar: normalizeMediaUrl(t.avatar) ?? t.avatar,
      })),
    });
  }),
);

router.get(
  '/case-studies',
  asyncHandler(async (_req, res) => {
    const caseStudies = await prisma.caseStudy.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({
      caseStudies: caseStudies.map((c) => ({
        ...c,
        analyticsImage: normalizeMediaUrl(c.analyticsImage) ?? c.analyticsImage,
        beforeImage: normalizeMediaUrl(c.beforeImage) ?? c.beforeImage,
      })),
    });
  }),
);

router.get(
  '/site-content',
  asyncHandler(async (_req, res) => {
    const items = await prisma.siteContent.findMany({
      orderBy: [{ section: 'asc' }, { label: 'asc' }],
    });
    const content = Object.fromEntries(items.map((item) => [item.key, item.value]));
    res.json({ content, items });
  }),
);

router.get(
  '/seo-settings',
  asyncHandler(async (_req, res) => {
    const settings = await getSeoSettings();
    res.json({ settings });
  }),
);

router.get(
  '/sitemap',
  asyncHandler(async (_req, res) => {
    const settings = await getSeoSettings();
    if (!settings.sitemapAutoGenerate) {
      res.json({ urls: [] });
      return;
    }
    const urls = await generateSitemapUrls();
    res.json({ urls });
  }),
);

router.get(
  '/seo/*path',
  asyncHandler(async (req, res) => {
    const raw = req.params.path;
    const segments = Array.isArray(raw) ? raw.join('/') : raw ?? '';
    const path = segments ? `/${segments}` : '/';
    const page = await prisma.seoPage.findUnique({ where: { path } });
    const settings = await getSeoSettings();

    if (!page) {
      res.json({
        page: serializeSeoPage(
          {
            id: 'fallback',
            path,
            title: settings.defaultTitle || settings.siteName,
            description: settings.defaultDescription || settings.siteName,
            keywords: null,
            canonicalUrl: null,
            ogTitle: null,
            ogDescription: null,
            ogImage: settings.defaultOgImage,
            ogType: 'website',
            twitterCard: 'summary_large_image',
            twitterTitle: null,
            twitterDescription: null,
            twitterImage: null,
            twitterSite: settings.defaultTwitterHandle,
            schemaMarkup: null,
            noIndex: false,
            noFollow: false,
            includeInSitemap: true,
            sitemapPriority: 0.8,
            sitemapChangeFreq: 'weekly',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          settings,
        ),
      });
      return;
    }

    res.json({ page: serializeSeoPage(page, settings) });
  }),
);

router.get(
  '/sitemap.xml',
  asyncHandler(async (_req, res) => {
    const urls = await generateSitemapUrls();
    res.type('application/xml').send(buildSitemapXml(urls));
  }),
);

router.get(
  '/robots.txt',
  asyncHandler(async (_req, res) => {
    const content = await generateRobotsTxt();
    res.type('text/plain').send(content);
  }),
);

router.get(
  '/theme',
  asyncHandler(async (_req, res) => {
    let theme = await prisma.themeSettings.findUnique({ where: { id: 'default' } });
    if (!theme) {
      theme = await prisma.themeSettings.create({ data: { id: 'default' } });
    }
    res.json({ theme });
  }),
);

router.get(
  '/home-sections',
  asyncHandler(async (_req, res) => {
    const sections = await getOrCreateHomeSections();
    res.json({ sections });
  }),
);

export default router;
