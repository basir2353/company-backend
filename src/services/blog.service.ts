import { BlogPost, BlogPostStatus } from '@prisma/client';
import { slugify } from '../utils/helpers';
import { normalizeMediaUrl } from '../utils/media-url';

export function computeReadingTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(' ').length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

export function resolveBlogStatus(post: BlogPost, now = new Date()): BlogPostStatus {
  if (post.status === BlogPostStatus.SCHEDULED && post.scheduledAt && post.scheduledAt <= now) {
    return BlogPostStatus.PUBLISHED;
  }
  return post.status;
}

export function isBlogPublic(post: BlogPost, now = new Date()): boolean {
  return resolveBlogStatus(post, now) === BlogPostStatus.PUBLISHED;
}

export function buildSchemaMarkup(
  post: Pick<BlogPost, 'title' | 'excerpt' | 'author' | 'authorAvatar' | 'date' | 'featuredImage' | 'thumbnail' | 'slug'>,
  siteUrl = 'https://gemivora.com',
) {
  const image = post.featuredImage || post.thumbnail;
  return JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.excerpt,
      author: {
        '@type': 'Person',
        name: post.author,
        ...(post.authorAvatar ? { image: post.authorAvatar } : {}),
      },
      datePublished: post.date.toISOString(),
      image: image ? [image] : undefined,
      mainEntityOfPage: { '@type': 'WebPage', '@id': `${siteUrl}/blog/${post.slug}` },
    },
    null,
    2,
  );
}

export function prepareBlogData(
  input: Record<string, unknown>,
  existing?: BlogPost,
) {
  const title = String(input.title ?? existing?.title ?? '');
  const slug = input.slug ? String(input.slug) : slugify(title);
  const content = String(input.content ?? existing?.content ?? '');
  const status = (input.status as BlogPostStatus) ?? existing?.status ?? BlogPostStatus.DRAFT;
  const scheduledAt =
    input.scheduledAt === null
      ? null
      : input.scheduledAt
        ? new Date(String(input.scheduledAt))
        : existing?.scheduledAt ?? null;
  const featuredImage =
    (input.featuredImage as string | null | undefined) ??
    (input.thumbnail as string | null | undefined) ??
    existing?.featuredImage ??
    existing?.thumbnail ??
    null;

  let publishedAt = existing?.publishedAt ?? null;
  if (status === BlogPostStatus.PUBLISHED && !publishedAt) publishedAt = new Date();
  if (status === BlogPostStatus.DRAFT) publishedAt = null;

  const excerpt = String(input.excerpt ?? existing?.excerpt ?? '');
  const author = String(input.author ?? existing?.author ?? '');
  const date = input.date ? new Date(String(input.date)) : existing?.date ?? new Date();

  const seoTitle = (input.seoTitle as string | null | undefined) ?? title;
  const seoDescription = (input.seoDescription as string | null | undefined) ?? excerpt;
  const ogTitle = (input.ogTitle as string | null | undefined) ?? seoTitle ?? title;
  const ogDescription = (input.ogDescription as string | null | undefined) ?? seoDescription ?? excerpt;
  const ogImage = (input.ogImage as string | null | undefined) ?? featuredImage;

  const schemaMarkup =
    (input.schemaMarkup as string | null | undefined) ??
    buildSchemaMarkup({ title, excerpt, author, authorAvatar: (input.authorAvatar as string | null | undefined) ?? existing?.authorAvatar ?? null, date, featuredImage, thumbnail: featuredImage, slug });

  return {
    slug,
    title,
    excerpt,
    content,
    category: String(input.category ?? existing?.category ?? 'General'),
    tags: Array.isArray(input.tags) ? input.tags.map(String) : existing?.tags ?? [],
    author,
    authorAvatar: (input.authorAvatar as string | null | undefined) ?? existing?.authorAvatar ?? null,
    date,
    readingTime: Number(input.readingTime ?? computeReadingTime(content)),
    thumbnail: featuredImage,
    featuredImage,
    featured: Boolean(input.featured ?? existing?.featured ?? false),
    status,
    scheduledAt,
    publishedAt,
    seoTitle,
    seoDescription,
    metaKeywords: (input.metaKeywords as string | null | undefined) ?? existing?.metaKeywords ?? null,
    ogTitle,
    ogDescription,
    ogImage,
    ogType: String(input.ogType ?? existing?.ogType ?? 'article'),
    schemaMarkup,
  };
}

export function serializeBlogPost(post: BlogPost) {
  const status = resolveBlogStatus(post);
  const thumbnail = normalizeMediaUrl(post.thumbnail) ?? post.thumbnail;
  const featuredImage = normalizeMediaUrl(post.featuredImage) ?? post.featuredImage;
  const authorAvatar = normalizeMediaUrl(post.authorAvatar) ?? post.authorAvatar;
  const ogImage = normalizeMediaUrl(post.ogImage) ?? post.ogImage;

  return {
    ...post,
    thumbnail,
    featuredImage,
    authorAvatar,
    ogImage,
    status,
    isPublished: status === BlogPostStatus.PUBLISHED,
  };
}
