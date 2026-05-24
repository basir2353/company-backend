import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { slugify, paramId } from '../utils/helpers';

const router = Router();

const portfolioSchema = z.object({
  slug: z.string().optional(),
  title: z.string().min(1),
  category: z.string().min(1),
  industry: z.string().min(1),
  technologies: z.array(z.string()),
  thumbnail: z.string().optional().nullable(),
  description: z.string().min(1),
  results: z.array(z.string()),
  liveUrl: z.string().optional().nullable(),
  caseStudyUrl: z.string().optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  tall: z.boolean().optional(),
  published: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

router.get(
  '/',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (_req, res) => {
    const projects = await prisma.portfolioProject.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] });
    res.json({ projects });
  }),
);

router.get(
  '/:id',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const project = await prisma.portfolioProject.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!project) throw new ApiError(404, 'Project not found');
    res.json({ project });
  }),
);

router.post(
  '/',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const data = portfolioSchema.parse(req.body);
    const slug = data.slug || slugify(data.title);
    const project = await prisma.portfolioProject.create({ data: { ...data, slug } });
    res.status(201).json({ project });
  }),
);

router.put(
  '/:id',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const data = portfolioSchema.partial().parse(req.body);
    const project = await prisma.portfolioProject.update({ where: { id: paramId(req.params.id) }, data });
    res.json({ project });
  }),
);

router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.portfolioProject.delete({ where: { id: paramId(req.params.id) } });
    res.json({ success: true });
  }),
);

export default router;
