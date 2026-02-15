/**
 * Unit tests for src/entrypoints/background/search/vector.ts
 * Focus: ordering by cosine similarity, topK, filtering behavior.
 */

jest.mock('@/entrypoints/background/search/embedding', () => ({
  getEmbeddings: jest.fn(),
}));

jest.mock('@/entrypoints/background/db', () => ({
  db: {
    slices: {
      toArray: jest.fn(),
    },
  },
}));

import * as DbModule from '@/entrypoints/background/db';
import { vectorSearch } from '@/entrypoints/background/search/vector';
import { SliceItem } from '@/utils/types';

const mockToArray = DbModule.db.slices.toArray as jest.Mock;

type SliceWithEmbedding = SliceItem & { embedding: number[] };

const slice = (overrides: Partial<SliceWithEmbedding> = {}): SliceWithEmbedding => ({
  id: 's1',
  url: 'https://example.com',
  title: 'Example',
  text: 'Content',
  position: 0,
  embedding: [1, 0, 0],
  ...overrides,
});

describe('vectorSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ordering by cosine similarity', () => {
    it('orders results by cosine similarity descending (highest first)', async () => {
      // Query is [1,0,0]. Cosine scores:
      // [1,0,0] -> 1.0, [0.9,0,0] -> 1.0, [0,1,0] -> 0, [-1,0,0] -> -1
      const slices: SliceWithEmbedding[] = [
        slice({ id: 'orthogonal', title: 'Orthogonal', embedding: [0, 1, 0] }),
        slice({ id: 'opposite', title: 'Opposite', embedding: [-1, 0, 0] }),
        slice({ id: 'exact', title: 'Exact Match', embedding: [1, 0, 0] }),
        slice({ id: 'near', title: 'Near Match', embedding: [0.9, 0.1, 0] }),
      ];
      mockToArray.mockResolvedValue(slices);

      const queryEmbedding = [1, 0, 0];
      const result = await vectorSearch(queryEmbedding, 5);

      expect(result.map((r) => r.title)).toEqual(['Exact Match', 'Near Match', 'Orthogonal', 'Opposite']);
    });

    it('ranks identical embedding above similar embedding', async () => {
      const slices: SliceWithEmbedding[] = [
        slice({ id: 'a', title: 'Similar', embedding: [0.99, 0.01, 0] }),
        slice({ id: 'b', title: 'Identical', embedding: [1, 0, 0] }),
      ];
      mockToArray.mockResolvedValue(slices);

      const result = await vectorSearch([1, 0, 0], 5);

      expect(result[0].title).toBe('Identical');
      expect(result[1].title).toBe('Similar');
    });

    it('ranks higher similarity above lower similarity', async () => {
      // Multi-dimensional: query [1,0,0,0], compare against vectors with varying dot products
      const slices: SliceWithEmbedding[] = [
        slice({ id: 'low', title: 'Low', embedding: [0.1, 0.9, 0, 0] }),
        slice({ id: 'mid', title: 'Mid', embedding: [0.5, 0.5, 0, 0] }),
        slice({ id: 'high', title: 'High', embedding: [0.9, 0.1, 0, 0] }),
      ];
      mockToArray.mockResolvedValue(slices);

      const result = await vectorSearch([1, 0, 0, 0], 5);

      expect(result.map((r) => r.title)).toEqual(['High', 'Mid', 'Low']);
    });

    it('handles negative cosine (opposite direction) and sorts correctly', async () => {
      const slices: SliceWithEmbedding[] = [
        slice({ id: 'pos', title: 'Positive', embedding: [1, 0, 0] }),
        slice({ id: 'neg', title: 'Negative', embedding: [-1, 0, 0] }),
        slice({ id: 'orth', title: 'Orthogonal', embedding: [0, 1, 0] }),
      ];
      mockToArray.mockResolvedValue(slices);

      const result = await vectorSearch([1, 0, 0], 5);

      expect(result[0].title).toBe('Positive');
      expect(result[1].title).toBe('Orthogonal');
      expect(result[2].title).toBe('Negative');
    });
  });

  describe('topK behavior', () => {
    it('respects topK limit', async () => {
      const slices: SliceWithEmbedding[] = [
        slice({ id: '1', title: 'First', embedding: [1, 0, 0] }),
        slice({ id: '2', title: 'Second', embedding: [0.9, 0, 0] }),
        slice({ id: '3', title: 'Third', embedding: [0.8, 0, 0] }),
        slice({ id: '4', title: 'Fourth', embedding: [0.7, 0, 0] }),
        slice({ id: '5', title: 'Fifth', embedding: [0.6, 0, 0] }),
      ];
      mockToArray.mockResolvedValue(slices);

      const result = await vectorSearch([1, 0, 0], 3);

      expect(result).toHaveLength(3);
      expect(result.map((r) => r.title)).toEqual(['First', 'Second', 'Third']);
    });

    it('returns fewer than topK when fewer slices exist', async () => {
      const slices: SliceWithEmbedding[] = [
        slice({ id: '1', title: 'Only', embedding: [1, 0, 0] }),
      ];
      mockToArray.mockResolvedValue(slices);

      const result = await vectorSearch([1, 0, 0], 5);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Only');
    });

    it('uses default topK of 5 when not specified', async () => {
      const slices = Array.from({ length: 10 }, (_, i) =>
        slice({ id: `s${i}`, title: `Slice ${i}`, embedding: [1 - i * 0.05, 0, 0] })
      );
      mockToArray.mockResolvedValue(slices);

      const result = await vectorSearch([1, 0, 0]);

      expect(result).toHaveLength(5);
    });
  });

  describe('filtering', () => {
    it('excludes slices without embedding', async () => {
      const slices: (SliceItem | SliceWithEmbedding)[] = [
        slice({ id: 'with', title: 'With Embedding', embedding: [1, 0, 0] }),
        { id: 'no-emb', url: 'x', title: 'No Embedding', text: 'x', position: 0 } as SliceItem,
      ];
      mockToArray.mockResolvedValue(slices);

      const result = await vectorSearch([1, 0, 0], 5);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('With Embedding');
    });

    it('excludes slices with embedding of wrong dimension', async () => {
      const slices: SliceWithEmbedding[] = [
        slice({ id: 'match', title: 'Match Dim', embedding: [1, 0, 0] }),
        slice({ id: 'wrong', title: 'Wrong Dim', embedding: [1, 0, 0, 0] }),
      ];
      mockToArray.mockResolvedValue(slices);

      const result = await vectorSearch([1, 0, 0], 5); // 3D query

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Match Dim');
    });

    it('returns empty when no slices have matching embeddings', async () => {
      const slices: SliceWithEmbedding[] = [
        slice({ id: 'a', embedding: [1, 0, 0, 0] }),
        slice({ id: 'b', embedding: [1, 0, 0, 0, 0] }),
      ];
      mockToArray.mockResolvedValue(slices);

      const result = await vectorSearch([1, 0, 0], 5); // 3D query

      expect(result).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('returns empty array when no slices', async () => {
      mockToArray.mockResolvedValue([]);

      const result = await vectorSearch([1, 0, 0], 5);

      expect(result).toEqual([]);
    });

    it('handles single-dimension embeddings', async () => {
      const slices: SliceWithEmbedding[] = [
        slice({ id: 'a', title: 'A', embedding: [1] }),
        slice({ id: 'b', title: 'B', embedding: [0.5] }),
      ];
      mockToArray.mockResolvedValue(slices);

      const result = await vectorSearch([1], 5);

      expect(result[0].title).toBe('A');
      expect(result[1].title).toBe('B');
    });

    it('handles zero-magnitude query (cosine returns 0)', async () => {
      const slices: SliceWithEmbedding[] = [
        slice({ id: 'a', title: 'A', embedding: [1, 0, 0] }),
      ];
      mockToArray.mockResolvedValue(slices);

      const result = await vectorSearch([0, 0, 0], 5);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('A');
    });

    it('preserves slice fields in result', async () => {
      const s = slice({
        id: 'my-id',
        url: 'https://test.com',
        title: 'My Title',
        text: 'My text',
        position: 3,
        embedding: [1, 0, 0],
      });
      mockToArray.mockResolvedValue([s]);

      const result = await vectorSearch([1, 0, 0], 5);

      expect(result[0]).toMatchObject({
        id: 'my-id',
        url: 'https://test.com',
        title: 'My Title',
        text: 'My text',
        position: 3,
      });
    });
  });

  describe('tie-breaking (equal scores)', () => {
    it('maintains stable order for equal cosine scores', async () => {
      // Two identical embeddings -> same score. JS sort is stable (ES2019+)
      const slices: SliceWithEmbedding[] = [
        slice({ id: 'first', title: 'First', embedding: [1, 0, 0] }),
        slice({ id: 'second', title: 'Second', embedding: [1, 0, 0] }),
      ];
      mockToArray.mockResolvedValue(slices);

      const result = await vectorSearch([1, 0, 0], 5);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('First');
      expect(result[1].title).toBe('Second');
    });
  });
});
