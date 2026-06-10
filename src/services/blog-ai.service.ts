import { z } from 'zod';
import { ApiError } from '../middleware/errorHandler';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

export const blogAiSchema = z.object({
  mode: z.enum(['improve', 'expand', 'seo', 'from_paste', 'title_suggestions', 'continue']),
  title: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  paste: z.string().optional(),
});

export type BlogAiRequest = z.infer<typeof blogAiSchema>;

function getOpenRouterConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new ApiError(
      503,
      'Blog AI is not configured. Set OPENROUTER_API_KEY on the backend (Render environment variables).',
    );
  }

  return {
    apiKey,
    model: process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL,
    referer:
      process.env.ADMIN_URL?.trim() ||
      process.env.PUBLIC_BASE_URL?.trim() ||
      'https://admin.creatd.it.com',
  };
}

async function callAi(system: string, user: string): Promise<string> {
  const { apiKey, model, referer } = getOpenRouterConfig();

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': referer,
      'X-Title': 'Creatd Admin Blog AI',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.55,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('[Blog AI]', response.status, err);
    throw new ApiError(502, 'AI provider request failed. Check OPENROUTER_API_KEY and model settings.');
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  return data.choices?.[0]?.message?.content?.trim() || '';
}

function parseJsonBlock(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function runBlogAi(input: BlogAiRequest): Promise<Record<string, unknown>> {
  const { mode, title = '', excerpt = '', content = '', paste = '' } = input;

  const systemBase =
    'You are a professional blog editor for Creatd, an AI solutions company. Return clean HTML for article body (use h2, h3, p, ul, ol, blockquote, strong, em, tables only when needed). No markdown fences unless asked.';

  switch (mode) {
    case 'improve': {
      const reply = await callAi(
        `${systemBase} Improve clarity, grammar, and structure. Keep meaning. Return JSON: {"contentHtml":"..."}`,
        `Title: ${title}\nExcerpt: ${excerpt}\n\nContent:\n${content}`,
      );
      return parseJsonBlock(reply) || { contentHtml: reply };
    }
    case 'expand': {
      const reply = await callAi(
        `${systemBase} Expand the article with useful sections and examples. Return JSON: {"contentHtml":"..."}`,
        `Title: ${title}\n\nContent:\n${content}`,
      );
      return parseJsonBlock(reply) || { contentHtml: reply };
    }
    case 'seo': {
      const reply = await callAi(
        'Return JSON only: {"seoTitle":"...","seoDescription":"...","metaKeywords":"comma,separated"} for SEO. Max description 160 chars.',
        `Title: ${title}\nExcerpt: ${excerpt}\n\nContent snippet:\n${content.slice(0, 2000)}`,
      );
      return parseJsonBlock(reply) || {};
    }
    case 'from_paste': {
      const reply = await callAi(
        `${systemBase} Turn the user paste into a full blog post. Return JSON: {"title":"...","excerpt":"...","contentHtml":"..."}`,
        paste || content,
      );
      return parseJsonBlock(reply) || { contentHtml: reply };
    }
    case 'title_suggestions': {
      const reply = await callAi(
        'Suggest 5 catchy blog titles. Return JSON: {"titles":["...","..."]}',
        `Topic or draft:\n${paste || title || excerpt || content.slice(0, 500)}`,
      );
      return parseJsonBlock(reply) || {};
    }
    case 'continue': {
      const reply = await callAi(
        `${systemBase} Continue writing from where the article ends. Return JSON: {"contentHtml":"full merged html including original + new"}`,
        `Title: ${title}\n\nExisting content:\n${content}`,
      );
      return parseJsonBlock(reply) || { contentHtml: reply };
    }
    default:
      throw new ApiError(400, 'Invalid mode');
  }
}
