/**
 * Search over indexed bookmark chunks (slices) and return relevant context for chat.
 */

import * as DbModule from '@/background/db';
import { SliceItem } from '@/utils/types';

export interface SearchContextResult {
  title: string;
  url: string;
  text: string;
}

export interface SearchContextResponse {
  results?: SearchContextResult[];
  summary?: string;
  error?: string;
}

/**
 * Score a slice by simple keyword overlap with the query.
 * Returns a number (higher = more relevant).
 */
function scoreSlice(slice: SliceItem, queryLower: string, queryWords: string[]): number {
  const text = `${slice.title} ${slice.text}`.toLowerCase();
  let score = 0;
  for (const word of queryWords) {
    if (word.length < 2) continue;
    const count = (text.match(new RegExp(escapeRegex(word), 'gi')) ?? []).length;
    score += count;
    if (slice.title.toLowerCase().includes(word)) score += 2;
  }
  return score;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Search stored chunks (slices) by query and return top results for RAG context.
 */
export async function handleSearchContext(message: { query?: string; topK?: number; url?: string }): Promise<SearchContextResponse> {
  const query = (message.query ?? '').trim();
  const topK = Math.min(Math.max(1, message.topK ?? 3), 20);
  const url = message.url;

  try {
    let slices: SliceItem[];

    if (url) {
      slices = await DbModule.getSlicesByUrl(url);
      if (slices.length === 0) {
        return { results: [] };
      }
      // If we have a URL and no query, return all chunks for this page (up to topK)
      if (!query) {
        slices.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        return {
          results: slices.slice(0, topK).map((s) => ({ title: s.title, url: s.url, text: s.text })),
        };
      }
    } else {
      slices = await DbModule.getAllSlices();
    }

    if (slices.length === 0) {
      return { results: [] };
    }

    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 0);

    const scored = slices.map((slice) => ({
      slice,
      score: scoreSlice(slice, queryLower, queryWords),
    }));

    scored.sort((a, b) => b.score - a.score);

    // Use scored results when we have any with score > 0; otherwise inject fallback chunks
    // so context is still populated (chunks are always injected when available).
    const withScore = scored.filter((s) => s.score > 0).slice(0, topK);
    const fallback = scored
      .sort((a, b) => a.slice.url.localeCompare(b.slice.url) || (a.slice.position ?? 0) - (b.slice.position ?? 0))
      .slice(0, topK);
    const top = withScore.length > 0 ? withScore : fallback;

    const results: SearchContextResult[] = top.map(({ slice }) => ({
      title: slice.title ?? '',
      url: slice.url ?? '',
      text: slice.text ?? '',
    }));

    return { results };
  } catch (e) {
    return { results: [], error: (e as Error).message };
  }
}
