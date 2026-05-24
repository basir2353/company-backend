import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { paramId } from '../utils/helpers';

const router = Router();

const metricSchema = z.object({
  label: z.string(),
  value: z.number(),
  suffix: z.string().optional(),
  prefix: z.string().optional(),
  decimals: z.number().optional(),
});

const metricsBlockSchema = z.object({
  label: z.string(),
  metrics: z.array(metricSchema),
});

const timelineStepSchema = z.object({
  phase: z.string(),
  title: z.string(),
  duration: z.string(),
});

const caseStudySchema = z.object({
  slug: z.string().min(1),
  client: z.string().min(1),
  industry: z.string().min(1),
  problem: z.string().min(1),
  solution: z.string().min(1),
  technologies: z.array(z.string()).optional(),
  results: z.array(metricSchema),
  beforeMetrics: metricsBlockSchema,
  afterMetrics: metricsBlockSchema,
  timeline: z.array(timelineStepSchema),
  analyticsImage: z.string().min(1),
  beforeImage: z.string().min(1),
  accent: z.string().optional(),
  published: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

router.get(
  '/',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (_req, res) => {
    const caseStudies = await prisma.caseStudy.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ caseStudies });
  }),
);

router.get(
  '/:id',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (req, res) => {
    const caseStudy = await prisma.caseStudy.findUnique({ where: { id: paramId(req.params.id) } });
    if (!caseStudy) throw new ApiError(404, 'Case study not found');
    res.json({ caseStudy });
  }),
);

router.post(
  '/',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const data = caseStudySchema.parse(req.body);
    const caseStudy = await prisma.caseStudy.create({
      data: {
        ...data,
        technologies: data.technologies ?? [],
      },
    });
    res.status(201).json({ caseStudy });
  }),
);

router.put(
  '/:id',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const data = caseStudySchema.partial().parse(req.body);
    const caseStudy = await prisma.caseStudy.update({
      where: { id: paramId(req.params.id) },
      data: {
        ...data,
        ...(data.technologies ? { technologies: data.technologies } : {}),
      },
    });
    res.json({ caseStudy });
  }),
);

router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.caseStudy.delete({ where: { id: paramId(req.params.id) } });
    res.json({ success: true });
  }),
);

export default router;
