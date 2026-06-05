import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { paramId } from '../utils/helpers';

const router = Router();

const subscribeSchema = z.object({
  email: z.string().email(),
  source: z.string().optional(),
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { email, source } = subscribeSchema.parse(req.body);
    const normalized = email.trim().toLowerCase();

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: normalized },
    });

    if (existing) {
      res.json({
        subscriber: existing,
        message: 'You are already subscribed.',
        alreadySubscribed: true,
      });
      return;
    }

    const subscriber = await prisma.newsletterSubscriber.create({
      data: { email: normalized, source: source ?? 'website' },
    });

    res.status(201).json({
      subscriber,
      message: 'Thanks for subscribing.',
      alreadySubscribed: false,
    });
  }),
);

router.get(
  '/',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (_req, res) => {
    const subscribers = await prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ subscribers });
  }),
);

router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.newsletterSubscriber.delete({ where: { id: paramId(req.params.id) } });
    res.json({ success: true });
  }),
);

export default router;
