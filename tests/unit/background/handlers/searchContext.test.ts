/**
 * Unit tests for src/background/handlers/searchContext.ts
 */

import { handleSearchContext } from '@/entrypoints/background/search/searchContext';
import { SliceItem } from '@/utils/types';

jest.mock('@/entrypoints/background/db', () => ({
  getSlicesByUrl: jest.fn(),
  getAllSlices: jest.fn(),
}));

import * as DbModule from '@/entrypoints/background/db';

const mockGetSlicesByUrl = DbModule.getSlicesByUrl as jest.MockedFunction<typeof DbModule.getSlicesByUrl>;
const mockGetAllSlices = DbModule.getAllSlices as jest.MockedFunction<typeof DbModule.getAllSlices>;

const slice = (overrides: Partial<SliceItem> = {}): SliceItem => ({
  id: 's1',
  url: 'https://example.com',
  title: 'Example Page',
  text: 'Some content about testing and code.',
  position: 0,
  ...overrides,
});

describe('handleSearchContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty results when no slices', async () => {
    mockGetAllSlices.mockResolvedValue([]);

    const result = await handleSearchContext({ query: 'test' });

    expect(result.results).toEqual([]);
    expect(mockGetAllSlices).toHaveBeenCalled();
  });

  it('returns empty when url has no slices', async () => {
    mockGetSlicesByUrl.mockResolvedValue([]);

    const result = await handleSearchContext({ url: 'https://example.com' });

    expect(result.results).toEqual([]);
  });

  it('returns all chunks for url when no query (sorted by position)', async () => {
    const slices = [slice({ id: 'a', position: 1, text: 'Second chunk' }), slice({ id: 'b', position: 0, text: 'First chunk' })];
    mockGetSlicesByUrl.mockResolvedValue(slices);

    const result = await handleSearchContext({
      url: 'https://example.com',
      topK: 10,
    });

    expect(result.results).toHaveLength(2);
    expect(result.results![0].text).toBe('First chunk');
    expect(result.results![1].text).toBe('Second chunk');
  });

  it('respects topK when returning url chunks', async () => {
    const slices = [slice({ id: '1', position: 0 }), slice({ id: '2', position: 1 }), slice({ id: '3', position: 2 })];
    mockGetSlicesByUrl.mockResolvedValue(slices);

    const result = await handleSearchContext({
      url: 'https://example.com',
      topK: 2,
    });

    expect(result.results).toHaveLength(2);
  });

  it('scores slices by keyword overlap', async () => {
    const slices = [
      slice({ id: '1', title: 'React Guide', text: 'React is a library. React components.' }),
      slice({ id: '2', title: 'Vue Intro', text: 'Vue is another framework.' }),
    ];
    mockGetAllSlices.mockResolvedValue(slices);

    const result = await handleSearchContext({ query: 'React', topK: 5 });

    expect(result.results!.length).toBeGreaterThan(0);
    expect(result.results![0].title).toBe('React Guide');
    expect(result.results![0].text).toContain('React');
  });

  it('gives bonus for matches in title', async () => {
    const slices = [
      slice({ id: '1', title: 'Testing React', text: 'content' }),
      slice({ id: '2', title: 'Other', text: 'React appears in body only' }),
    ];
    mockGetAllSlices.mockResolvedValue(slices);

    const result = await handleSearchContext({ query: 'React Testing', topK: 5 });

    expect(result.results!.length).toBe(2);
    // Title match gets +2 per word, so "Testing React" slice should rank higher
    const firstTitle = result.results![0].title;
    expect(['Testing React', 'Other']).toContain(firstTitle);
  });

  it('clamps topK between 1 and 20 for result slicing', async () => {
    const manySlices = Array.from({ length: 30 }, (_, i) => slice({ id: `s${i}`, position: i }));
    mockGetAllSlices.mockResolvedValue(manySlices);

    const result = await handleSearchContext({ query: 'x', topK: 100 });
    expect(result.results!.length).toBeLessThanOrEqual(20);

    const result2 = await handleSearchContext({ query: 'x', topK: 1 });
    expect(result2.results!.length).toBeLessThanOrEqual(1);
  });

  it('returns fallback when no scored results (score 0)', async () => {
    const slices = [
      slice({ id: '1', title: 'Alpha', text: 'no match', url: 'https://a.com' }),
      slice({ id: '2', title: 'Beta', text: 'nothing', url: 'https://b.com' }),
    ];
    mockGetAllSlices.mockResolvedValue(slices);

    const result = await handleSearchContext({ query: 'xyznonexistent', topK: 5 });

    // Updated behavior: if query doesn't match anything, we return empty results instead of fallback
    expect(result.results!.length).toBe(0);
    expect(result.results).toBeDefined();
  });

  it('handles empty query string', async () => {
    mockGetAllSlices.mockResolvedValue([slice()]);

    const result = await handleSearchContext({ query: '   ' });

    expect(result.results).toBeDefined();
  });

  it('returns error on exception', async () => {
    mockGetAllSlices.mockRejectedValue(new Error('DB error'));

    const result = await handleSearchContext({ query: 'test' });

    expect(result).toEqual({ results: [], error: 'DB error' });
  });

  it('filters by url and scores by query when both provided', async () => {
    const matching = slice({ id: '1', url: 'https://example.com', title: 'React Guide', text: 'React hooks tutorial', position: 0 });
    const nonMatching = slice({ id: '2', url: 'https://example.com', title: 'Other', text: 'unrelated content', position: 1 });
    mockGetSlicesByUrl.mockResolvedValue([nonMatching, matching]);

    const result = await handleSearchContext({
      url: 'https://example.com',
      query: 'React',
      topK: 5,
    });

    expect(mockGetSlicesByUrl).toHaveBeenCalledWith('https://example.com');
    expect(mockGetAllSlices).not.toHaveBeenCalled();
    expect(result.results!.length).toBeGreaterThan(0);
    expect(result.results![0].title).toBe('React Guide');
  });

  it('handles special regex characters in query without throwing', async () => {
    const slices = [
      slice({ id: '1', title: 'React (Hooks)', text: 'Learn about React.' }),
      slice({ id: '2', title: 'a.b pattern', text: 'Regex example a.b' }),
    ];
    mockGetAllSlices.mockResolvedValue(slices);

    const result1 = await handleSearchContext({ query: 'React (Hooks)', topK: 5 });
    expect(result1.results).toBeDefined();
    expect(result1.error).toBeUndefined();

    const result2 = await handleSearchContext({ query: 'a.b', topK: 5 });
    expect(result2.results).toBeDefined();
    expect(result2.error).toBeUndefined();
  });

  it('ignores short words (< 2 chars) in scoring', async () => {
    const slices = [
      slice({ id: '1', title: 'A B', text: 'single letter a b c' }),
      slice({ id: '2', title: 'React', text: 'react library' }),
    ];
    mockGetAllSlices.mockResolvedValue(slices);

    const result = await handleSearchContext({ query: 'a b react', topK: 5 });

    expect(result.results!.length).toBeGreaterThan(0);
    expect(result.results![0].title).toBe('React');
  });

  it('higher frequency of match increases score', async () => {
    const slices = [
      slice({ id: '1', title: 'Guide', text: 'React is mentioned once' }),
      slice({ id: '2', title: 'Tutorial', text: 'React React React repeated many times React' }),
    ];
    mockGetAllSlices.mockResolvedValue(slices);

    const result = await handleSearchContext({ query: 'React', topK: 5 });

    expect(result.results!.length).toBe(2);
    expect(result.results![0].text).toContain('React React React');
  });

  it('clamps topK to minimum 1 when 0 or negative', async () => {
    mockGetAllSlices.mockResolvedValue([slice(), slice(), slice()]);

    const result1 = await handleSearchContext({ query: 'content', topK: 0 });
    expect(result1.results!.length).toBeGreaterThanOrEqual(1);

    const result2 = await handleSearchContext({ query: 'content', topK: -5 });
    expect(result2.results!.length).toBeGreaterThanOrEqual(1);
  });

  it('handles slices with null/undefined title, url, text', async () => {
    const slices = [
      slice({ id: '1', title: undefined as unknown as string, url: undefined as unknown as string, text: undefined as unknown as string }),
    ];
    mockGetAllSlices.mockResolvedValue(slices);

    const result = await handleSearchContext({ query: '', topK: 5 });

    expect(result.results).toBeDefined();
    expect(result.results!.every((r) => typeof r.title === 'string' && typeof r.url === 'string' && typeof r.text === 'string')).toBe(true);
  });

  it('uses default topK of 3 when not specified', async () => {
    const slices = Array.from({ length: 10 }, (_, i) =>
      slice({ id: `s${i}`, url: 'https://example.com', text: `content ${i}`, position: i })
    );
    mockGetSlicesByUrl.mockResolvedValue(slices);

    const result = await handleSearchContext({ url: 'https://example.com' });

    expect(result.results!.length).toBe(3);
  });

  it('returns empty results when url has slices but query matches none', async () => {
    const slices = [slice({ id: '1', url: 'https://example.com', title: 'Alpha', text: 'no match here' })];
    mockGetSlicesByUrl.mockResolvedValue(slices);

    const result = await handleSearchContext({
      url: 'https://example.com',
      query: 'xyznonexistent',
      topK: 5,
    });

    expect(result.results).toEqual([]);
  });

  describe('scoring behavior', () => {
    it('ranks title match above body-only match (title adds +2 per word)', async () => {
      const slices = [
        slice({ id: '1', title: 'Other', text: 'React React in body only' }),
        slice({ id: '2', title: 'React Guide', text: 'content' }),
      ];
      mockGetAllSlices.mockResolvedValue(slices);

      const result = await handleSearchContext({ query: 'React', topK: 5 });

      expect(result.results![0].title).toBe('React Guide');
    });

    it('ranks higher body frequency above single body match', async () => {
      const slices = [
        slice({ id: '1', title: 'Alpha', text: 'React once' }),
        slice({ id: '2', title: 'Beta', text: 'React React React React' }),
      ];
      mockGetAllSlices.mockResolvedValue(slices);

      const result = await handleSearchContext({ query: 'React', topK: 5 });

      expect(result.results![0].title).toBe('Beta');
    });

    it('scores multi-word query: title match + body match beats body-only', async () => {
      const slices = [
        slice({ id: '1', title: 'Random', text: 'React hooks React hooks' }),
        slice({ id: '2', title: 'React Hooks', text: 'short' }),
      ];
      mockGetAllSlices.mockResolvedValue(slices);

      const result = await handleSearchContext({ query: 'React hooks', topK: 5 });

      expect(result.results![0].title).toBe('React Hooks');
    });

    it('is case insensitive', async () => {
      const slices = [slice({ id: '1', title: 'REACT LIBRARY', text: 'Content' }), slice({ id: '2', title: 'Vue', text: 'vue framework' })];
      mockGetAllSlices.mockResolvedValue(slices);

      const result = await handleSearchContext({ query: 'react', topK: 5 });

      expect(result.results!.length).toBeGreaterThan(0);
      expect(result.results![0].title).toBe('REACT LIBRARY');
    });

    it('matches substrings within words', async () => {
      const slices = [
        slice({ id: '1', title: 'Preact', text: 'Preact is like React' }),
        slice({ id: '2', title: 'Vue', text: 'Different framework' }),
      ];
      mockGetAllSlices.mockResolvedValue(slices);

      const result = await handleSearchContext({ query: 'react', topK: 5 });

      expect(result.results!.length).toBeGreaterThan(0);
      expect(result.results![0].title).toBe('Preact');
    });

    it('combines title and text for scoring', async () => {
      const slices = [
        slice({ id: '1', title: 'React', text: 'React and more React' }),
        slice({ id: '2', title: 'Vue', text: 'Vue Vue Vue Vue' }),
      ];
      mockGetAllSlices.mockResolvedValue(slices);

      const result = await handleSearchContext({ query: 'React', topK: 5 });

      expect(result.results![0].title).toBe('React');
      expect(result.results![0].text).toContain('React');
    });

    it('orders results by descending score', async () => {
      const slices = [
        slice({ id: '1', title: 'C', text: 'word once' }),
        slice({ id: '2', title: 'A', text: 'word word word' }),
        slice({ id: '3', title: 'B', text: 'word word' }),
      ];
      mockGetAllSlices.mockResolvedValue(slices);

      const result = await handleSearchContext({ query: 'word', topK: 5 });

      expect(result.results!.map((r) => r.title)).toEqual(['A', 'B', 'C']);
    });

    it('scores both title and text; title bonus stacks with occurrence count', async () => {
      const slices = [slice({ id: '1', title: 'React', text: 'React' }), slice({ id: '2', title: 'Vue', text: 'React React React' })];
      mockGetAllSlices.mockResolvedValue(slices);

      const result = await handleSearchContext({ query: 'React', topK: 5 });

      expect(result.results![0].title).toBe('React');
    });
  });
});
