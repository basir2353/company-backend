import { Router, Response } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { paramId } from '../utils/helpers';
import {
  buildSitemapXml,
  generateRobotsTxt,
  generateSitemapUrls,
  getSeoSettings,
  serializeSeoPage,
  buildDefaultSchema,
} from '../services/seo.service';

const router = Router();

const seoPageSchema = z.object({
  path: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  keywords: z.string().optional().nullable(),
  canonicalUrl: z.string().optional().nullable(),
  ogTitle: z.string().optional().nullable(),
  ogDescription: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
  ogType: z.string().optional(),
  twitterCard: z.string().optional(),
  twitterTitle: z.string().optional().nullable(),
  twitterDescription: z.string().optional().nullable(),
  twitterImage: z.string().optional().nullable(),
  twitterSite: z.string().optional().nullable(),
  schemaMarkup: z.string().optional().nullable(),
  noIndex: z.boolean().optional(),
  noFollow: z.boolean().optional(),
  includeInSitemap: z.boolean().optional(),
  sitemapPriority: z.number().min(0).max(1).optional(),
  sitemapChangeFreq: z.string().optional(),
});

const seoSettingsSchema = z.object({
  siteUrl: z.string().url().optional(),
  siteName: z.string().optional(),
  defaultTitle: z.string().optional().nullable(),
  defaultDescription: z.string().optional().nullable(),
  defaultOgImage: z.string().optional().nullable(),
  defaultTwitterHandle: z.string().optional().nullable(),
  googleAnalyticsId: z.string().optional().nullable(),
  googleTagManagerId: z.string().optional().nullable(),
  googleSearchConsoleVerification: z.string().optional().nullable(),
  robotsTxtCustom: z.string().optional().nullable(),
  sitemapAutoGenerate: z.boolean().optional(),
});

router.get(
  '/settings',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (_req, res) => {
    const settings = await getSeoSettings();
    res.json({ settings });
  }),
);

router.put(
  '/settings',
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = seoSettingsSchema.parse(req.body);
    const settings = await prisma.seoSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...data },
      update: data,
    });
    res.json({ settings });
  }),
);

router.get(
  '/tools/sitemap',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (_req, res) => {
    const urls = await generateSitemapUrls();
    res.json({ urls, xml: buildSitemapXml(urls) });
  }),
);

router.get(
  '/tools/robots',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (_req, res) => {
    const content = await generateRobotsTxt();
    res.json({ content });
  }),
);

router.get(
  '/',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (req, res) => {
    const q = req.query.q as string | undefined;
    const pages = await prisma.seoPage.findMany({
      where: q
        ? {
            OR: [
              { path: { contains: q, mode: 'insensitive' } },
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { keywords: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { path: 'asc' },
    });
    res.json({ pages });
  }),
);

router.get(
  '/:id',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const page = await prisma.seoPage.findFirst({
      where: { OR: [{ id }, { path: id }] },
    });
    if (!page) throw new ApiError(404, 'SEO page not found');
    const settings = await getSeoSettings();
    res.json({ page: serializeSeoPage(page, settings) });
  }),
);

router.post(
  '/',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const data = seoPageSchema.parse(req.body);
    const settings = await getSeoSettings();
    const path = data.path.startsWith('/') ? data.path : `/${data.path}`;

    const page = await prisma.seoPage.create({
      data: {
        path,
        title: data.title,
        description: data.description,
        keywords: data.keywords,
        canonicalUrl: data.canonicalUrl,
        ogTitle: data.ogTitle,
        ogDescription: data.ogDescription,
        ogImage: data.ogImage,
        ogType: data.ogType ?? 'website',
        twitterCard: data.twitterCard ?? 'summary_large_image',
        twitterTitle: data.twitterTitle,
        twitterDescription: data.twitterDescription,
        twitterImage: data.twitterImage,
        twitterSite: data.twitterSite,
        schemaMarkup: data.schemaMarkup ?? buildDefaultSchema({ path, title: data.title, description: data.description }, settings),
        noIndex: data.noIndex ?? false,
        noFollow: data.noFollow ?? false,
        includeInSitemap: data.includeInSitemap ?? true,
        sitemapPriority: data.sitemapPriority ?? 0.8,
        sitemapChangeFreq: data.sitemapChangeFreq ?? 'weekly',
      },
    });

    res.status(201).json({ page: serializeSeoPage(page, settings) });
  }),
);

router.put(
  '/:id',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const data = seoPageSchema.partial().parse(req.body);
    if (data.path && !data.path.startsWith('/')) data.path = `/${data.path}`;

    const page = await prisma.seoPage.update({ where: { id: paramId(req.params.id) }, data });
    const settings = await getSeoSettings();
    res.json({ page: serializeSeoPage(page, settings) });
  }),
);

router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.seoPage.delete({ where: { id: paramId(req.params.id) } });
    res.json({ success: true });
  }),
);

export default router;
