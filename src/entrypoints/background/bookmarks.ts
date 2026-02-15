import { isExcluded } from '@/utils/html';
import { db } from '@/entrypoints/background/db';
import { PageItem, DataSource } from '@/utils/types';
import { bookmarksLogger as logger } from '@/utils/logger';

/**
 * Recursively extract all bookmark URLs from Chrome bookmarks tree
 */
function extractBookmarkUrls(nodes: chrome.bookmarks.BookmarkTreeNode[]): PageItem[] {
  const results: PageItem[] = [];

  for (const node of nodes) {
    if (node.url && !isExcluded(node.url)) {
      results.push({
        id: node.id,
        url: node.url,
        title: node.title || node.url,
        content: '',
        timestamp: Date.now(),
        processed: 0,
      });
    }
    if (node.children) {
      results.push(...extractBookmarkUrls(node.children));
    }
  }

  return results;
}

/**
 * Bookmarks data source implementing the DataSource interface
 * This enables pluggable data loading for the indexing pipeline
 */
export class BookmarksDataSource implements DataSource {
  readonly type = 'bookmarks' as const;
  readonly name = 'Chrome Bookmarks';

  private newItemCallback?: (item: PageItem) => void;
  private removedItemCallback?: (id: string) => void;

  /**
   * Fetch all bookmark URLs that need to be indexed
   */
  async fetchItems(): Promise<PageItem[]> {
    const tree = await chrome.bookmarks.getTree();
    const bookmarks = extractBookmarkUrls(tree);

    // Optimization: Fetch all existing pages to identify what we can skip
    const existingPages = await db.pages.toArray();
    const skipMap = new Map<string, { processed: number; error?: string; indexedAt?: number }>();
    existingPages.forEach((p) =>
      skipMap.set(p.url, {
        processed: p.processed,
        error: p.error,
        indexedAt: p.indexedAt,
      })
    );

    return bookmarks.filter((b) => {
      const existing = skipMap.get(b.url);
      if (existing) {
        if (existing.processed === 1) return false; // Already indexed
        // Skip if failed recently (24h)
        if (existing.error && existing.indexedAt && Date.now() - existing.indexedAt < 24 * 60 * 60 * 1000) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Register callback for new bookmarks
   */
  onNewItem(callback: (item: PageItem) => void): void {
    this.newItemCallback = callback;
    chrome.bookmarks.onCreated.addListener((id, bookmark) => {
      if (bookmark.url && !isExcluded(bookmark.url)) {
        logger.info(`New bookmark created: ${bookmark.url}`);
        callback({
          id,
          url: bookmark.url,
          title: bookmark.title || bookmark.url,
          content: '',
          timestamp: Date.now(),
          processed: 0,
          priority: 10, // Higher priority for user-added bookmarks
        });
      }
    });
  }

  /**
   * Register callback for removed bookmarks
   */
  onRemovedItem(callback: (id: string) => void): void {
    this.removedItemCallback = callback;
    chrome.bookmarks.onRemoved.addListener((id) => {
      logger.info(`Bookmark removed: ${id}`);
      callback(id);
    });
  }

  dispose(): void {
    // Chrome extension listeners can't be easily removed, but we clear callbacks
    this.newItemCallback = undefined;
    this.removedItemCallback = undefined;
  }
}

// Singleton instance
export const bookmarksDataSource = new BookmarksDataSource();
