import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { asyncHandler } from '../middleware/errorHandler';

const themeSchema = z.object({
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  cardColor: z.string().optional(),
  foregroundColor: z.string().optional(),
  mutedColor: z.string().optional(),
  borderColor: z.string().optional(),
  cardBorderColor: z.string().optional(),
  navbarBackground: z.string().optional(),
  navbarText: z.string().optional(),
  navbarCtaBackground: z.string().optional(),
  dropdownBackground: z.string().optional(),
  dropdownBorder: z.string().optional(),
  heroGradientStart: z.string().optional(),
  heroGradientMid: z.string().optional(),
  heroGradientEnd: z.string().optional(),
  fontHeading: z.string().optional(),
  fontBody: z.string().optional(),
  borderRadius: z.string().optional(),
});

const router = Router();

async function getOrCreateTheme() {
  let theme = await prisma.themeSettings.findUnique({ where: { id: 'default' } });
  if (!theme) {
    theme = await prisma.themeSettings.create({ data: { id: 'default' } });
  }
  return theme;
}

router.get(
  '/',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (_req, res) => {
    const theme = await getOrCreateTheme();
    res.json({ theme });
  }),
);

router.put(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const data = themeSchema.parse(req.body);
    const theme = await prisma.themeSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...data },
      update: data,
    });
    res.json({ theme });
  }),
);

export default router;
