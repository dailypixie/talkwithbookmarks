/**
 * Unit tests for src/background/bookmarks.ts
 */

import { BookmarksDataSource } from '@/entrypoints/background/bookmarks';

jest.mock('@/entrypoints/background/db', () => ({
  db: {
    pages: {
      toArray: jest.fn(),
    },
  },
}));

import { db } from '@/entrypoints/background/db';

const mockPagesToArray = (db as any).pages.toArray;

describe('BookmarksDataSource', () => {
  let dataSource: BookmarksDataSource;

  beforeEach(() => {
    jest.clearAllMocks();
    dataSource = new BookmarksDataSource();
  });

  describe('metadata', () => {
    it('has correct type and name', () => {
      expect(dataSource.type).toBe('bookmarks');
      expect(dataSource.name).toBe('Chrome Bookmarks');
    });
  });

  describe('fetchItems', () => {
    beforeEach(() => {
      (global.chrome as any).bookmarks.getTree.mockResolvedValue([
        {
          id: '1',
          title: 'Bookmarks',
          children: [
            {
              id: '2',
              url: 'https://example.com',
              title: 'Example',
            },
            {
              id: '3',
              url: 'https://github.com',
              title: 'GitHub',
            },
            {
              id: '4',
              url: 'https://facebook.com/page',
              title: 'Excluded',
            },
            {
              id: '5',
              title: 'Folder',
              children: [
                {
                  id: '6',
                  url: 'https://docs.example.com',
                  title: 'Docs',
                },
              ],
            },
          ],
        },
      ]);
      mockPagesToArray.mockResolvedValue([]);
    });

    it('extracts bookmark URLs from tree', async () => {
      const items = await dataSource.fetchItems();

      expect(items.length).toBeGreaterThanOrEqual(2);
      const urls = items.map((i) => i.url);
      expect(urls).toContain('https://example.com');
      expect(urls).toContain('https://github.com');
      expect(urls).toContain('https://docs.example.com');
    });

    it('excludes social media domains', async () => {
      const items = await dataSource.fetchItems();
      const urls = items.map((i) => i.url);
      expect(urls).not.toContain('https://facebook.com/page');
    });

    it('filters out already indexed pages', async () => {
      mockPagesToArray.mockResolvedValue([{ url: 'https://example.com', processed: 1, error: undefined, indexedAt: undefined }]);

      const items = await dataSource.fetchItems();

      expect(items.find((i) => i.url === 'https://example.com')).toBeUndefined();
      expect(items.find((i) => i.url === 'https://github.com')).toBeDefined();
    });

    it('includes failed pages for retry after 24h', async () => {
      mockPagesToArray.mockResolvedValue([
        {
          url: 'https://example.com',
          processed: 0,
          error: 'Failed',
          indexedAt: Date.now() - 25 * 60 * 60 * 1000,
        },
      ]);

      const items = await dataSource.fetchItems();

      expect(items.find((i) => i.url === 'https://example.com')).toBeDefined();
    });

    it('skips recently failed pages (within 24h)', async () => {
      mockPagesToArray.mockResolvedValue([
        {
          url: 'https://example.com',
          processed: 0,
          error: 'Failed',
          indexedAt: Date.now() - 1 * 60 * 60 * 1000,
        },
      ]);

      const items = await dataSource.fetchItems();

      expect(items.find((i) => i.url === 'https://example.com')).toBeUndefined();
    });
  });

  describe('onNewItem', () => {
    it('registers listener for bookmark creation', () => {
      const callback = jest.fn();
      dataSource.onNewItem(callback);

      expect((global.chrome as any).bookmarks.onCreated.addListener).toHaveBeenCalled();
    });
  });

  describe('onRemovedItem', () => {
    it('registers listener for bookmark removal', () => {
      const callback = jest.fn();
      dataSource.onRemovedItem(callback);

      expect((global.chrome as any).bookmarks.onRemoved.addListener).toHaveBeenCalled();
    });
  });
});
