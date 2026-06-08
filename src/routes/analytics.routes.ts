/**
 * Internal dashboard analytics (content counts, leads) — not Google Analytics.
 *
 * Future server-side GA4 recommendations:
 * - POST /api/analytics/events — accept { event, params } from trusted server actions
 * - Use GA4 Measurement Protocol (https://developers.google.com/analytics/devguides/collection/protocol/ga4)
 *   with MEASUREMENT_ID + API_SECRET env vars — never expose the secret to the browser.
 * - Mirror key backend events: lead created (POST /leads), admin login (POST /auth/login),
 *   user registered (POST /auth/register).
 */
import { Router } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      blogCount,
      portfolioCount,
      servicesCount,
      testimonialsCount,
      leadsCount,
      newLeadsCount,
      mediaCount,
      recentLeads,
      leadsByStatus,
      contentGrowth,
    ] = await Promise.all([
      prisma.blogPost.count(),
      prisma.portfolioProject.count(),
      prisma.service.count(),
      prisma.testimonial.count(),
      prisma.contactLead.count(),
      prisma.contactLead.count({ where: { status: 'NEW' } }),
      prisma.media.count(),
      prisma.contactLead.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, status: true, createdAt: true },
      }),
      prisma.contactLead.groupBy({ by: ['status'], _count: { status: true } }),
      Promise.all([
        prisma.blogPost.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.portfolioProject.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.contactLead.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      ]),
    ]);

    const monthlyLeads = await prisma.$queryRaw<{ month: string; count: bigint }[]>`
      SELECT TO_CHAR("createdAt", 'Mon') as month, COUNT(*)::bigint as count
      FROM "ContactLead"
      WHERE "createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR("createdAt", 'Mon'), DATE_TRUNC('month', "createdAt")
      ORDER BY DATE_TRUNC('month', "createdAt")
    `.catch(() => []);

    res.json({
      stats: {
        blog: blogCount,
        portfolio: portfolioCount,
        services: servicesCount,
        testimonials: testimonialsCount,
        leads: leadsCount,
        newLeads: newLeadsCount,
        media: mediaCount,
        newContent: {
          blog: contentGrowth[0],
          portfolio: contentGrowth[1],
          leads: contentGrowth[2],
        },
      },
      recentLeads,
      leadsByStatus: leadsByStatus.map((item) => ({
        status: item.status,
        count: item._count.status,
      })),
      monthlyLeads: monthlyLeads.map((item) => ({
        month: item.month,
        count: Number(item.count),
      })),
    });
  }),
);

export default router;
