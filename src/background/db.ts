import Dexie, { Table } from 'dexie';
import { PageItem, SliceItem, Conversation, Message, Source, StageQueueItem, Roles } from '@/utils/types';
import { dbLogger as logger } from '@/utils/logger';
import DatabaseService from '@/background/DatabaseService';

Dexie.debug = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

export class BookmarksDB extends Dexie {
  pages!: Table<PageItem>;
  slices!: Table<SliceItem>;
  conversations!: Table<Conversation>;
  messages!: Table<Message>;
  stageQueue!: Table<StageQueueItem>;

  constructor() {
    super('talkwithbookmarks');
    // Version 1: Initial schema with pages, slices, and stage queue
    this.version(1).stores({
      pages: 'url, processed, indexedAt',
      slices: 'id, url',
      conversations: '++id, title, updatedAt',
      messages: '++id, conversationId, role, createdAt',
      stageQueue: 'id, url, [stage+status], stage, status, createdAt, updatedAt',
    });
    // Version 2: Add url index on conversations for getConversationForUrl
    this.version(2).stores({
      pages: 'url, processed, indexedAt',
      slices: 'id, url',
      conversations: '++id, title, updatedAt, url',
      messages: '++id, conversationId, role, createdAt',
      stageQueue: 'id, url, [stage+status], stage, status, createdAt, updatedAt',
    });
  }
}

export const db = new BookmarksDB();

// Initialize the singleton with the default database instance only if not already set
try {
  const svc = DatabaseService.getInstance();
  if (
    typeof (svc as { isInitialized?: () => boolean }).isInitialized === 'function' &&
    !(svc as { isInitialized: () => boolean }).isInitialized()
  ) {
    svc.setDatabase(db);
  }
} catch {
  // DatabaseService may be mocked in tests; ignore
}

const currentDb = (): BookmarksDB => DatabaseService.getInstance().getDatabase() as BookmarksDB;

// Page Management
export async function addPageToList(item: PageItem): Promise<void> {
  try {
    await currentDb().pages.add(item);
  } catch (error) {
    logger.error('Error adding page to list', error as Error);
  }
}

export async function updateListItemProcessedAt(item: PageItem): Promise<void> {
  try {
    await currentDb().pages.put(item);
  } catch (error) {
    logger.error('Error updating list item', error as Error);
  }
}

export async function loadList(): Promise<PageItem[]> {
  // We want items that have NOT been processed (processed === 0)
  return await currentDb().pages.where('processed').equals(0).toArray();
}

export async function getPageByUrl(url: string): Promise<PageItem | undefined> {
  return await currentDb().pages.get(url);
}

export async function updatePageSummary(url: string, summary: string, summaryModel?: string): Promise<void> {
  try {
    const page = await currentDb().pages.get(url);
    const updateData: { summary: string; summaryModel?: string } = { summary };
    if (summaryModel) {
      updateData.summaryModel = summaryModel;
    }
    if (page) {
      await currentDb().pages.update(url, updateData);
    } else {
      await currentDb().pages.put({
        id: url,
        url,
        title: '',
        content: '',
        timestamp: Date.now(),
        processed: 1,
        summary,
        summaryModel,
      });
    }
    logger.info('Updated page summary', { url, summaryModel });
  } catch (error) {
    logger.error('Error updating page summary', error as Error);
  }
}

// Slice Management (chunks)
export async function addSlice(slice: SliceItem): Promise<string> {
  return await currentDb().slices.add(slice);
}

export async function getSlicesByUrl(url: string): Promise<SliceItem[]> {
  return await currentDb().slices.where('url').equals(url).toArray();
}

/** Get all slices (e.g. for search). Optional limit to avoid loading too many. */
export async function getAllSlices(limit = 5000): Promise<SliceItem[]> {
  return await currentDb().slices.limit(limit).toArray();
}

// Conversation Management
export async function createConversation(title: string, url?: string): Promise<number> {
  return await currentDb().conversations.add({ title, url, updatedAt: Date.now() });
}

export async function getConversations(limit = 20, offset = 0): Promise<Conversation[]> {
  return await currentDb()
    .conversations.orderBy('updatedAt')
    .reverse()
    .offset(offset)
    .limit(limit)
    .toArray();
}

export async function addMessage(
  conversationId: number,
  role: 'user' | 'assistant',
  content: string,
  context?: string,
  sources?: Source[]
): Promise<number> {
  if (role !== 'user' && role !== 'assistant') {
    throw new Error(`Invalid role: ${role}. Must be 'user' or 'assistant'`);
  }

  if (!content || content.trim().length === 0) {
    throw new Error('Message content cannot be empty');
  }

  await currentDb().conversations.update(conversationId, { updatedAt: Date.now() });
  return await currentDb().messages.add({
    conversationId,
    role: role === 'user' ? Roles.USER : Roles.ASSISTANT,
    content,
    context,
    sources,
    createdAt: Date.now(),
  });
}

export async function getConversationHistory(conversationId: number): Promise<Message[]> {
  return await currentDb().messages.where('conversationId').equals(conversationId).sortBy('createdAt');
}

export async function getConversationMessages(conversationId: number): Promise<Message[]> {
  return getConversationHistory(conversationId);
}

export async function getConversationForUrl(url: string): Promise<Conversation | undefined> {
  return await currentDb().conversations.where('url').equals(url).reverse().first();
}

// Cleanup
export async function clearDatabase(): Promise<void> {
  try {
    await currentDb().tables.forEach(async (table) => {
      await table.clear();
    });
    logger.info('Database cleared');
  } catch (error) {
    logger.error('Error clearing database', error as Error);
  }
}

export async function getIndexingStats(): Promise<{ total: number; processed: number; failed: number }> {
  const pages = await currentDb().pages.toArray();
  const total = pages.length;
  const processed = pages.filter((p) => p.processed === 1).length;
  // Only count as failed if we attempted and failed (have error, not successfully processed)
  // so success + failed never double-counts a page
  const failed = pages.filter((p) => p.error && p.processed !== 1).length;

  return { total, processed, failed };
}
