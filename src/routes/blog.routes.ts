import { Router } from 'express';
import { Role, BlogPostStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { slugify, paramId } from '../utils/helpers';
import { prepareBlogData, serializeBlogPost, isBlogPublic, ensureUniqueBlogSlug } from '../services/blog.service';

const router = Router();

const blogSchema = z.object({
  slug: z.string().optional(),
  title: z.string().min(1),
  excerpt: z.string().min(1),
  content: z.string().optional(),
  category: z.string().min(1),
  tags: z.array(z.string()).optional(),
  author: z.string().min(1),
  authorAvatar: z.string().optional().nullable(),
  date: z.coerce.date().optional(),
  readingTime: z.number().int().positive().optional(),
  thumbnail: z.string().optional().nullable(),
  featuredImage: z.string().optional().nullable(),
  featured: z.boolean().optional(),
  status: z.nativeEnum(BlogPostStatus).optional(),
  scheduledAt: z.coerce.date().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  metaKeywords: z.string().optional().nullable(),
  ogTitle: z.string().optional().nullable(),
  ogDescription: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
  ogType: z.string().optional(),
  schemaMarkup: z.string().optional().nullable(),
});

function buildSearchWhere(query: {
  q?: string;
  category?: string;
  tag?: string;
  status?: string;
}) {
  const where: Record<string, unknown> = {};

  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: 'insensitive' } },
      { excerpt: { contains: query.q, mode: 'insensitive' } },
      { content: { contains: query.q, mode: 'insensitive' } },
      { author: { contains: query.q, mode: 'insensitive' } },
    ];
  }

  if (query.category) where.category = query.category;
  if (query.tag) where.tags = { has: query.tag };
  if (query.status && Object.values(BlogPostStatus).includes(query.status as BlogPostStatus)) {
    where.status = query.status;
  }

  return where;
}

router.get(
  '/meta/categories',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (_req, res) => {
    const categories = await prisma.blogCategory.findMany({ orderBy: { name: 'asc' } });
    res.json({ categories });
  }),
);

router.post(
  '/meta/categories',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        name: z.string().min(1),
        slug: z.string().optional(),
        description: z.string().optional(),
        color: z.string().optional(),
      })
      .parse(req.body);
    const category = await prisma.blogCategory.create({
      data: { ...data, slug: data.slug || slugify(data.name) },
    });
    res.status(201).json({ category });
  }),
);

router.get(
  '/meta/tags',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (_req, res) => {
    const tags = await prisma.blogTag.findMany({ orderBy: { name: 'asc' } });
    res.json({ tags });
  }),
);

router.post(
  '/meta/tags',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const data = z.object({ name: z.string().min(1), slug: z.string().optional() }).parse(req.body);
    const tag = await prisma.blogTag.create({
      data: { ...data, slug: data.slug || slugify(data.name) },
    });
    res.status(201).json({ tag });
  }),
);

router.get(
  '/',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (req, res) => {
    const where = buildSearchWhere({
      q: req.query.q as string | undefined,
      category: req.query.category as string | undefined,
      tag: req.query.tag as string | undefined,
      status: req.query.status as string | undefined,
    });

    const posts = await prisma.blogPost.findMany({
      where,
      orderBy: [{ date: 'desc' }],
    });

    res.json({ posts: posts.map(serializeBlogPost) });
  }),
);

router.get(
  '/:id',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const post = await prisma.blogPost.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!post) throw new ApiError(404, 'Blog post not found');
    res.json({ post: serializeBlogPost(post) });
  }),
);

router.post(
  '/',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const parsed = blogSchema.parse(req.body);
    const data = prepareBlogData(parsed);
    data.slug = await ensureUniqueBlogSlug(data.slug);
    const post = await prisma.blogPost.create({ data });
    res.status(201).json({ post: serializeBlogPost(post) });
  }),
);

router.put(
  '/:id',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, 'Blog post not found');

    const parsed = blogSchema.partial().parse(req.body);
    const data = prepareBlogData(parsed, existing);
    data.slug = await ensureUniqueBlogSlug(data.slug, id);
    const post = await prisma.blogPost.update({ where: { id }, data });
    res.json({ post: serializeBlogPost(post) });
  }),
);

router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, 'Blog post not found');
    await prisma.blogPost.delete({ where: { id } });
    res.json({ success: true });
  }),
);

export default router;
