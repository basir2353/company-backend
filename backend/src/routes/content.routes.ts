import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { paramId } from '../utils/helpers';

const router = Router();

const contentSchema = z.object({
  key: z.string().min(1),
  section: z.string().min(1),
  label: z.string().min(1),
  value: z.string(),
  type: z.enum(['text', 'html', 'json']).optional(),
});

router.get(
  '/',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (req, res) => {
    const section = req.query.section as string | undefined;
    const content = await prisma.siteContent.findMany({
      where: section ? { section } : undefined,
      orderBy: [{ section: 'asc' }, { label: 'asc' }],
    });
    res.json({ content });
  }),
);

router.post(
  '/',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const data = contentSchema.parse(req.body);
    const item = await prisma.siteContent.create({ data });
    res.status(201).json({ item });
  }),
);

router.put(
  '/:id',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const data = contentSchema.partial().parse(req.body);
    const item = await prisma.siteContent.update({ where: { id: paramId(req.params.id) }, data });
    res.json({ item });
  }),
);

router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.siteContent.delete({ where: { id: paramId(req.params.id) } });
    res.json({ success: true });
  }),
);

export default router;
