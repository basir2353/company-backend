import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { slugify, paramId } from '../utils/helpers';

const router = Router();

const serviceSchema = z.object({
  slug: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().optional(),
  gradient: z.string().min(1),
  glow: z.string().min(1),
  content: z.string().optional().nullable(),
  published: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

router.get(
  '/',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (_req, res) => {
    const services = await prisma.service.findMany({ orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] });
    res.json({ services });
  }),
);

router.get(
  '/:id',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const service = await prisma.service.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!service) throw new ApiError(404, 'Service not found');
    res.json({ service });
  }),
);

router.post(
  '/',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const data = serviceSchema.parse(req.body);
    const slug = data.slug || slugify(data.title);
    const service = await prisma.service.create({ data: { ...data, slug } });
    res.status(201).json({ service });
  }),
);

router.put(
  '/:id',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const data = serviceSchema.partial().parse(req.body);
    const service = await prisma.service.update({ where: { id: paramId(req.params.id) }, data });
    res.json({ service });
  }),
);

router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.service.delete({ where: { id: paramId(req.params.id) } });
    res.json({ success: true });
  }),
);

export default router;
