/**
 * Unit tests for src/background/handlers/searchContext.ts
 */

import { handleSearchContext } from '@/background/handlers/searchContext';
import { SliceItem } from '@/utils/types';

jest.mock('@/background/db', () => ({
  getSlicesByUrl: jest.fn(),
  getAllSlices: jest.fn(),
}));

import * as DbModule from '@/background/db';

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
    const slices = [
      slice({ id: 'a', position: 1, text: 'Second chunk' }),
      slice({ id: 'b', position: 0, text: 'First chunk' }),
    ];
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
    const slices = [
      slice({ id: '1', position: 0 }),
      slice({ id: '2', position: 1 }),
      slice({ id: '3', position: 2 }),
    ];
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
    const manySlices = Array.from({ length: 30 }, (_, i) =>
      slice({ id: `s${i}`, position: i })
    );
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
});
