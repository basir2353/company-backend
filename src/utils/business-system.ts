import type { BusinessSystem, BusinessSystemStatus, Prisma } from '@prisma/client';
import { normalizeMediaUrl, toStoredMediaPath } from './media-url';

export type ApiBusinessSystemStatus = 'active' | 'draft' | 'archived';

export interface ApiPricingPlan {
  interval: 'monthly' | 'yearly' | 'one-time';
  label: string;
  amount?: string;
  note?: string;
  currency?: string;
}

export interface ApiScreenshot {
  url: string;
  alt?: string;
}

export interface ApiReleaseInfo {
  version: string;
  releaseNotes?: string;
  installerUrl?: string;
  releasedAt?: string;
}

const STATUS_TO_API: Record<BusinessSystemStatus, ApiBusinessSystemStatus> = {
  ACTIVE: 'active',
  DRAFT: 'draft',
  ARCHIVED: 'archived',
};

const STATUS_FROM_API: Record<ApiBusinessSystemStatus, BusinessSystemStatus> = {
  active: 'ACTIVE',
  draft: 'DRAFT',
  archived: 'ARCHIVED',
};

export function statusToApi(status: BusinessSystemStatus): ApiBusinessSystemStatus {
  return STATUS_TO_API[status];
}

export function statusFromApi(status: string): BusinessSystemStatus | null {
  const key = status.trim().toLowerCase() as ApiBusinessSystemStatus;
  return STATUS_FROM_API[key] ?? null;
}

export function parseScreenshots(value: unknown): ApiScreenshot[] {
  if (!Array.isArray(value)) return [];
  const items: ApiScreenshot[] = [];
  for (const entry of value) {
    if (typeof entry === 'string' && entry.trim()) {
      items.push({ url: entry.trim() });
      continue;
    }
    if (entry && typeof entry === 'object' && 'url' in entry) {
      const url = String((entry as { url: unknown }).url ?? '').trim();
      if (!url) continue;
      const altRaw = (entry as { alt?: unknown }).alt;
      const alt = typeof altRaw === 'string' && altRaw.trim() ? altRaw.trim() : undefined;
      items.push({ url, alt });
    }
  }
  return items;
}

export function storeScreenshots(value: unknown): Prisma.InputJsonValue {
  return parseScreenshots(value).map((shot) => {
    const url = toStoredMediaPath(shot.url) ?? shot.url;
    return shot.alt ? { url, alt: shot.alt } : { url };
  }) as Prisma.InputJsonValue;
}

/** Prefer relative `/uploads` and `/images` paths so each client resolves the correct host. */
function publicMediaPath(url?: string | null): string {
  if (!url?.trim()) return '';
  const trimmed = url.trim();
  const stored = toStoredMediaPath(trimmed) ?? trimmed;
  if (stored.startsWith('/uploads/') || stored.startsWith('/images/')) return stored;
  return normalizeMediaUrl(stored) ?? stored;
}

export function serializeBusinessSystem(system: BusinessSystem) {
  const screenshots = parseScreenshots(system.screenshots).map((shot) => ({
    url: publicMediaPath(shot.url),
    ...(shot.alt ? { alt: shot.alt } : {}),
  }));

  const pricingPlans = Array.isArray(system.pricingPlans)
    ? (system.pricingPlans as unknown as ApiPricingPlan[])
    : undefined;

  return {
    id: system.id,
    slug: system.slug,
    name: system.name,
    category: system.category,
    shortDescription: system.shortDescription,
    description: system.description,
    image: publicMediaPath(system.image),
    imageAlt: system.imageAlt ?? undefined,
    /** Flat URL list for public UI helpers that expect string[]. */
    screenshots: screenshots.map((s) => s.url),
    screenshotItems: screenshots,
    features: system.features ?? [],
    modules: system.modules ?? [],
    technologies: system.technologies ?? [],
    demoAvailable: system.demoAvailable,
    requestDemoEnabled: system.requestDemoEnabled,
    demoUrl: system.demoUrl ?? undefined,
    pricingPlans,
    currency: system.currency ?? undefined,
    platform: system.platform ?? undefined,
    status: statusToApi(system.status),
    sortOrder: system.sortOrder,
    seoTitle: system.seoTitle ?? undefined,
    seoDescription: system.seoDescription ?? undefined,
    release: (system.release as ApiReleaseInfo | null) ?? undefined,
    createdAt: system.createdAt.toISOString(),
    updatedAt: system.updatedAt.toISOString(),
  };
}

export function normalizeWritableMedia<T extends { image?: string | null }>(data: T): T {
  if (data.image === undefined) return data;
  return {
    ...data,
    image: data.image ? toStoredMediaPath(data.image) ?? data.image : '',
  };
}
