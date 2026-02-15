import { db } from '@/entrypoints/background/db';
import { SliceItem } from '@/utils/types';
import { SearchContextResponse, SearchContextResult } from '@/entrypoints/background/search/searchContext';
import { getEmbeddings } from '@/entrypoints/background/search/embedding';
import { vectorLogger } from '@/utils';

export async function vectorSearch(queryEmbedding: number[], topK = 5): Promise<SliceItem[]> {
  const allSlices = (await db.slices.toArray()).filter((s) => s.embedding && s.embedding.length === queryEmbedding.length) as (SliceItem & {
    embedding: number[];
  })[];

  function cosine(a: number[], b: number[]): number {
    const dot = a.reduce((sum, v, i) => sum + v * (b[i] || 0), 0);
    const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
    const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
    return magA && magB ? dot / (magA * magB) : 0;
  }

  return allSlices
    .map((slice) => ({
      ...slice,
      score: cosine(queryEmbedding, slice.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export async function handleSearchVectorContext(message: { query?: string; topK?: number; url?: string }): Promise<SearchContextResponse> {
  const query = (message.query ?? '').trim();
  const topK = Math.min(Math.max(1, message.topK ?? 3), 20);

  try {
    const queryEmbedding = await getEmbeddings([query]);

    if (!queryEmbedding || queryEmbedding.length === 0) {
      return { results: [], error: 'Failed to get embedding for query' };
    }

    const slices = await vectorSearch(queryEmbedding[0], topK);

    vectorLogger.info('Vector search completed', { query, topK, results: slices.length });

    const results: SearchContextResult[] = slices.map((slice) => ({
      title: slice.title ?? '',
      url: slice.url ?? '',
      text: slice.text ?? '',
    }));

    return { results };
  } catch (e: Error | any) {
    vectorLogger.error('Vector search failed', e, { query, topK, error: (e as Error).message });
    return { results: [], error: (e as Error).message };
  }
}
