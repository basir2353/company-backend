import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { paramId } from '../utils/helpers';

const router = Router();

const testimonialSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  company: z.string().min(1),
  review: z.string().min(1),
  rating: z.number().int().min(1).max(5).optional(),
  avatar: z.string().optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  published: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

router.get(
  '/',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (_req, res) => {
    const testimonials = await prisma.testimonial.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ testimonials });
  }),
);

router.get(
  '/:id',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (req, res) => {
    const testimonial = await prisma.testimonial.findUnique({ where: { id: paramId(req.params.id) } });
    if (!testimonial) throw new ApiError(404, 'Testimonial not found');
    res.json({ testimonial });
  }),
);

router.post(
  '/',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const data = testimonialSchema.parse(req.body);
    const testimonial = await prisma.testimonial.create({ data });
    res.status(201).json({ testimonial });
  }),
);

router.put(
  '/:id',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const data = testimonialSchema.partial().parse(req.body);
    const testimonial = await prisma.testimonial.update({ where: { id: paramId(req.params.id) }, data });
    res.json({ testimonial });
  }),
);

router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.testimonial.delete({ where: { id: paramId(req.params.id) } });
    res.json({ success: true });
  }),
);

export default router;
