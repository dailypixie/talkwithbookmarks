import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { handleSearchContext } from '@/entrypoints/background/handlers/searchContext';
import { db, addSlice } from '@/entrypoints/background/db';

describe('Integration: Search Context', () => {
  beforeEach(async () => {
    // Clear DB
    await db.delete();
    await db.open();

    // Populate with test data
    await addSlice({
      id: 'slice-1',
      url: 'https://example.com/page1',
      title: 'React Hooks Guide',
      text: 'Learn about useState and useEffect hooks in React.',
      position: 0,
    });

    await addSlice({
      id: 'slice-2',
      url: 'https://example.com/page2',
      title: 'Advanced React Patterns',
      text: 'Higher order components and render props are advanced patterns.',
      position: 0,
    });

    await addSlice({
      id: 'slice-3',
      url: 'https://vuejs.org/guide',
      title: 'Vue.js Introduction',
      text: 'Vue is a progressive framework for building user interfaces.',
      position: 0,
    });
  });

  afterEach(async () => {
    // Cleanup
    await db.delete();
  });

  it('should return relevant results based on keyword match', async () => {
    const result = await handleSearchContext({ query: 'react hooks' });

    expect(result.results).toBeDefined();
    expect(result.results!.length).toBeGreaterThan(0);

    // First result should be the most relevant (contains both "React" and "hooks")
    expect(result.results![0].title).toBe('React Hooks Guide');
  });

  it('should return results when searching by url', async () => {
    const result = await handleSearchContext({ query: '', url: 'https://vuejs.org/guide' });
    expect(result.results).toHaveLength(1);
    expect(result.results![0].title).toBe('Vue.js Introduction');
  });

  it('should handle empty results gracefully', async () => {
    const result = await handleSearchContext({ query: 'angular' });
    expect(result.results).toEqual([]);
  });

  it('should search within specific URL when both url and query provided', async () => {
    const result = await handleSearchContext({
      query: 'patterns',
      url: 'https://example.com/page2',
    });

    expect(result.results).toBeDefined();
    expect(result.results!.length).toBeGreaterThan(0);
    expect(result.results!.every((r) => r.url === 'https://example.com/page2')).toBe(true);
    expect(result.results![0].title).toBe('Advanced React Patterns');
  });

  it('should respect topK limit on results', async () => {
    await addSlice({
      id: 'slice-4',
      url: 'https://example.com/page1',
      title: 'React State',
      text: 'React state management.',
      position: 1,
    });

    const result = await handleSearchContext({ query: 'react', topK: 2 });

    expect(result.results!.length).toBe(2);
  });

  it('should return all slices for url when no query, ordered by position', async () => {
    await addSlice({
      id: 'slice-extra',
      url: 'https://example.com/page1',
      title: 'React Part 2',
      text: 'More React content.',
      position: 1,
    });

    const result = await handleSearchContext({ url: 'https://example.com/page1', topK: 10 });

    expect(result.results!.length).toBe(2);
    expect(result.results![0].title).toBe('React Hooks Guide');
    expect(result.results![1].title).toBe('React Part 2');
  });

  it('should return results with correct shape (title, url, text)', async () => {
    const result = await handleSearchContext({ query: 'react', topK: 3 });

    expect(result.results!.length).toBeGreaterThan(0);
    for (const r of result.results!) {
      expect(r).toHaveProperty('title');
      expect(r).toHaveProperty('url');
      expect(r).toHaveProperty('text');
      expect(typeof r.title).toBe('string');
      expect(typeof r.url).toBe('string');
      expect(typeof r.text).toBe('string');
    }
  });
});
