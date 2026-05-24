import { Router } from 'express';
import { LeadStatus, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { paramId } from '../utils/helpers';

const router = Router();

const leadSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  message: z.string().min(1),
  source: z.string().optional(),
});

const updateLeadSchema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  notes: z.string().optional().nullable(),
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = leadSchema.parse(req.body);
    const lead = await prisma.contactLead.create({ data });
    res.status(201).json({ lead });
  }),
);

router.get(
  '/',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (req, res) => {
    const status = req.query.status as LeadStatus | undefined;
    const leads = await prisma.contactLead.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ leads });
  }),
);

router.get(
  '/:id',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (req, res) => {
    const lead = await prisma.contactLead.findUnique({ where: { id: paramId(req.params.id) } });
    if (!lead) throw new ApiError(404, 'Lead not found');
    res.json({ lead });
  }),
);

router.put(
  '/:id',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const data = updateLeadSchema.parse(req.body);
    const lead = await prisma.contactLead.update({ where: { id: paramId(req.params.id) }, data });
    res.json({ lead });
  }),
);

router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.contactLead.delete({ where: { id: paramId(req.params.id) } });
    res.json({ success: true });
  }),
);

export default router;
