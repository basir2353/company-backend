import { Router } from 'express';
import { Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { slugify, paramId } from '../utils/helpers';
import {
  normalizeWritableMedia,
  serializeBusinessSystem,
  statusFromApi,
  storeScreenshots,
} from '../utils/business-system';

const router = Router();

const pricingPlanSchema = z.object({
  interval: z.enum(['monthly', 'yearly', 'one-time']),
  label: z.string().min(1),
  amount: z.string().optional(),
  note: z.string().optional(),
  currency: z.string().optional(),
});

const screenshotSchema = z.union([
  z.string().min(1),
  z.object({
    url: z.string().min(1),
    alt: z.string().optional(),
  }),
]);

const releaseSchema = z.object({
  version: z.string().min(1),
  releaseNotes: z.string().optional(),
  installerUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : undefined)),
  releasedAt: z.string().optional(),
});

const optionalHttpUrl = z
  .string()
  .optional()
  .nullable()
  .transform((v) => {
    if (v == null) return null;
    const trimmed = v.trim();
    if (!trimmed) return null;
    return trimmed;
  })
  .refine((v) => v === null || /^https?:\/\//i.test(v), {
    message: 'Demo URL must be a valid http(s) URL',
  });

const businessSystemSchema = z.object({
  slug: z.string().optional(),
  name: z.string().min(1),
  category: z.string().min(1),
  shortDescription: z.string().optional().default(''),
  description: z.string().optional().default(''),
  image: z.string().optional().default(''),
  imageAlt: z.string().optional().nullable(),
  screenshots: z.array(screenshotSchema).optional().default([]),
  features: z.array(z.string()).optional().default([]),
  modules: z.array(z.string()).optional().default([]),
  technologies: z.array(z.string()).optional().default([]),
  demoAvailable: z.boolean().optional().default(true),
  requestDemoEnabled: z.boolean().optional().default(true),
  demoUrl: optionalHttpUrl,
  pricingPlans: z.array(pricingPlanSchema).optional().nullable(),
  currency: z.string().optional().nullable(),
  platform: z.string().optional().nullable(),
  status: z.enum(['active', 'draft', 'archived']).optional().default('draft'),
  sortOrder: z.number().int().optional().default(0),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  release: releaseSchema.optional().nullable(),
});

function assertPublishable(data: {
  name: string;
  slug?: string;
  category: string;
  shortDescription?: string;
  status?: string;
}) {
  if ((data.status ?? 'draft') !== 'active') return;
  if (!data.name?.trim()) throw new ApiError(400, 'Name is required to publish');
  if (!data.category?.trim()) throw new ApiError(400, 'Category is required to publish');
  if (!data.shortDescription?.trim()) {
    throw new ApiError(400, 'Short description is required to publish');
  }
}

function toCreateData(parsed: z.infer<typeof businessSystemSchema>) {
  assertPublishable(parsed);
  const slug = (parsed.slug?.trim() || slugify(parsed.name)).toLowerCase();
  if (!slug) throw new ApiError(400, 'A valid slug is required');

  const status = statusFromApi(parsed.status ?? 'draft');
  if (!status) throw new ApiError(400, 'Invalid status');

  const media = normalizeWritableMedia({ image: parsed.image ?? '' });

  return {
    slug,
    name: parsed.name.trim(),
    category: parsed.category.trim(),
    shortDescription: parsed.shortDescription?.trim() ?? '',
    description: parsed.description?.trim() ?? '',
    image: media.image ?? '',
    imageAlt: parsed.imageAlt?.trim() || null,
    screenshots: storeScreenshots(parsed.screenshots ?? []),
    features: (parsed.features ?? []).map((s) => s.trim()).filter(Boolean),
    modules: (parsed.modules ?? []).map((s) => s.trim()).filter(Boolean),
    technologies: (parsed.technologies ?? []).map((s) => s.trim()).filter(Boolean),
    demoAvailable: parsed.demoAvailable ?? true,
    requestDemoEnabled: parsed.requestDemoEnabled ?? true,
    demoUrl: parsed.demoUrl,
    pricingPlans:
      parsed.pricingPlans && parsed.pricingPlans.length > 0
        ? (parsed.pricingPlans as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    currency: parsed.currency?.trim() || null,
    platform: parsed.platform?.trim() || null,
    status,
    sortOrder: parsed.sortOrder ?? 0,
    seoTitle: parsed.seoTitle?.trim() || null,
    seoDescription: parsed.seoDescription?.trim() || null,
    release: parsed.release
      ? (parsed.release as Prisma.InputJsonValue)
      : Prisma.JsonNull,
  };
}

router.get(
  '/',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const statusParam = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const category =
      typeof req.query.category === 'string' ? req.query.category.trim() : '';

    const statusFilter = statusParam ? statusFromApi(statusParam) : null;
    if (statusParam && !statusFilter) {
      throw new ApiError(400, 'Invalid status filter');
    }

    const systems = await prisma.businessSystem.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(category ? { category: { equals: category, mode: 'insensitive' } } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { slug: { contains: q, mode: 'insensitive' } },
                { category: { contains: q, mode: 'insensitive' } },
                { shortDescription: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    res.json({ systems: systems.map(serializeBusinessSystem) });
  }),
);

/** Bulk reorder — must be registered before `/:id`. */
router.put(
  '/reorder/bulk',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const body = z.object({ orderedIds: z.array(z.string().min(1)).min(1) }).parse(req.body);
    await prisma.$transaction(
      body.orderedIds.map((id, index) =>
        prisma.businessSystem.update({
          where: { id },
          data: { sortOrder: index + 1 },
        }),
      ),
    );
    const systems = await prisma.businessSystem.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ systems: systems.map(serializeBusinessSystem) });
  }),
);

router.get(
  '/:id',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const system = await prisma.businessSystem.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!system) throw new ApiError(404, 'Business system not found');
    res.json({ system: serializeBusinessSystem(system) });
  }),
);

router.post(
  '/',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const parsed = businessSystemSchema.parse(req.body);
    const data = toCreateData(parsed);
    const system = await prisma.businessSystem.create({ data });
    res.status(201).json({ system: serializeBusinessSystem(system) });
  }),
);

router.put(
  '/:id',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const existing = await prisma.businessSystem.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, 'Business system not found');

    const parsed = businessSystemSchema.partial().parse(req.body);
    const nextStatus = parsed.status
      ? statusFromApi(parsed.status)
      : existing.status;
    if (parsed.status && !nextStatus) throw new ApiError(400, 'Invalid status');

    assertPublishable({
      name: parsed.name ?? existing.name,
      slug: parsed.slug ?? existing.slug,
      category: parsed.category ?? existing.category,
      shortDescription: parsed.shortDescription ?? existing.shortDescription,
      status: nextStatus === 'ACTIVE' ? 'active' : 'draft',
    });

    const media =
      parsed.image !== undefined
        ? normalizeWritableMedia({ image: parsed.image ?? '' })
        : undefined;

    const system = await prisma.businessSystem.update({
      where: { id },
      data: {
        ...(parsed.slug !== undefined
          ? { slug: (parsed.slug.trim() || slugify(parsed.name ?? existing.name)).toLowerCase() }
          : {}),
        ...(parsed.name !== undefined ? { name: parsed.name.trim() } : {}),
        ...(parsed.category !== undefined ? { category: parsed.category.trim() } : {}),
        ...(parsed.shortDescription !== undefined
          ? { shortDescription: parsed.shortDescription.trim() }
          : {}),
        ...(parsed.description !== undefined
          ? { description: parsed.description.trim() }
          : {}),
        ...(media ? { image: media.image ?? '' } : {}),
        ...(parsed.imageAlt !== undefined
          ? { imageAlt: parsed.imageAlt?.trim() || null }
          : {}),
        ...(parsed.screenshots !== undefined
          ? { screenshots: storeScreenshots(parsed.screenshots) }
          : {}),
        ...(parsed.features !== undefined
          ? { features: parsed.features.map((s) => s.trim()).filter(Boolean) }
          : {}),
        ...(parsed.modules !== undefined
          ? { modules: parsed.modules.map((s) => s.trim()).filter(Boolean) }
          : {}),
        ...(parsed.technologies !== undefined
          ? { technologies: parsed.technologies.map((s) => s.trim()).filter(Boolean) }
          : {}),
        ...(parsed.demoAvailable !== undefined
          ? { demoAvailable: parsed.demoAvailable }
          : {}),
        ...(parsed.requestDemoEnabled !== undefined
          ? { requestDemoEnabled: parsed.requestDemoEnabled }
          : {}),
        ...(parsed.demoUrl !== undefined ? { demoUrl: parsed.demoUrl } : {}),
        ...(parsed.pricingPlans !== undefined
          ? {
              pricingPlans:
                parsed.pricingPlans && parsed.pricingPlans.length > 0
                  ? (parsed.pricingPlans as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
            }
          : {}),
        ...(parsed.currency !== undefined
          ? { currency: parsed.currency?.trim() || null }
          : {}),
        ...(parsed.platform !== undefined
          ? { platform: parsed.platform?.trim() || null }
          : {}),
        ...(nextStatus && parsed.status !== undefined ? { status: nextStatus } : {}),
        ...(parsed.sortOrder !== undefined ? { sortOrder: parsed.sortOrder } : {}),
        ...(parsed.seoTitle !== undefined
          ? { seoTitle: parsed.seoTitle?.trim() || null }
          : {}),
        ...(parsed.seoDescription !== undefined
          ? { seoDescription: parsed.seoDescription?.trim() || null }
          : {}),
        ...(parsed.release !== undefined
          ? {
              release: parsed.release
                ? (parsed.release as Prisma.InputJsonValue)
                : Prisma.JsonNull,
            }
          : {}),
      },
    });

    res.json({ system: serializeBusinessSystem(system) });
  }),
);

/** Soft-unpublish: set status to archived (preferred over hard delete). */
router.post(
  '/:id/archive',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const system = await prisma.businessSystem.update({
      where: { id: paramId(req.params.id) },
      data: { status: 'ARCHIVED' },
    });
    res.json({ system: serializeBusinessSystem(system) });
  }),
);

router.post(
  '/:id/publish',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const existing = await prisma.businessSystem.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, 'Business system not found');

    assertPublishable({
      name: existing.name,
      slug: existing.slug,
      category: existing.category,
      shortDescription: existing.shortDescription,
      status: 'active',
    });

    const system = await prisma.businessSystem.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
    res.json({ system: serializeBusinessSystem(system) });
  }),
);

router.post(
  '/:id/unpublish',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const system = await prisma.businessSystem.update({
      where: { id: paramId(req.params.id) },
      data: { status: 'DRAFT' },
    });
    res.json({ system: serializeBusinessSystem(system) });
  }),
);

router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.businessSystem.delete({ where: { id: paramId(req.params.id) } });
    res.json({ success: true });
  }),
);

export default router;
