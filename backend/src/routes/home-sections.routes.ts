import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { asyncHandler } from '../middleware/errorHandler';

const sectionSchema = z.object({
  hero: z.boolean().optional(),
  homeIntro: z.boolean().optional(),
  homeExploreLinks: z.boolean().optional(),
  trustedBy: z.boolean().optional(),
  services: z.boolean().optional(),
  whyChooseUs: z.boolean().optional(),
  caseStudies: z.boolean().optional(),
  testimonials: z.boolean().optional(),
  pricing: z.boolean().optional(),
  technologies: z.boolean().optional(),
  faq: z.boolean().optional(),
});

const router = Router();

export async function getOrCreateHomeSections() {
  let sections = await prisma.homeSectionSettings.findUnique({ where: { id: 'default' } });
  if (!sections) {
    sections = await prisma.homeSectionSettings.create({ data: { id: 'default' } });
  }
  return sections;
}

router.get(
  '/',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (_req, res) => {
    const sections = await getOrCreateHomeSections();
    res.json({ sections });
  }),
);

router.put(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const data = sectionSchema.parse(req.body);
    const sections = await prisma.homeSectionSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...data },
      update: data,
    });
    res.json({ sections });
  }),
);

export default router;
