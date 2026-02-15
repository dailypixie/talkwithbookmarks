/**
 * Unit tests for src/background/background.ts message routing
 */

import { MessageAction } from '@/utils/types';

// Capture the message listener when background registers it
let messageListener: ((message: unknown, sender: unknown, sendResponse: (r?: unknown) => void) => boolean) | null = null;
(global.chrome as any).runtime.onMessage.addListener = jest.fn(
  (cb: (msg: unknown, sender: unknown, sendResponse: (r?: unknown) => void) => boolean) => {
    messageListener = cb;
  }
);

// Mock dependencies before background is loaded
const mockFetchItems = jest.fn();
const mockStart = jest.fn();
const mockPause = jest.fn();
const mockResume = jest.fn();
const mockGetStatus = jest.fn();
const mockGetIndexingStats = jest.fn();
const mockClearDatabase = jest.fn();
const mockGetPageByUrl = jest.fn();
const mockHandleGetRecommendedModels = jest.fn();
const mockHandleLoadModel = jest.fn();
const mockHandleUnloadModel = jest.fn();
const mockHandleGetModelStatus = jest.fn();
const mockHandleGetModels = jest.fn();
const mockHandleGetCachedModels = jest.fn();
const mockHandleStop = jest.fn();
const mockHandleChat = jest.fn();
const mockHandleGetHistory = jest.fn();
const mockHandleSearchContext = jest.fn();
const mockHandleGetPageSummary = jest.fn();
const mockHandleGenerateSummary = jest.fn();

jest.mock('@/entrypoints/background/bookmarks', () => ({
  bookmarksDataSource: { fetchItems: mockFetchItems },
}));

jest.mock('@/entrypoints/background/SimplePipeline', () => ({
  simplePipeline: {
    start: mockStart,
    pause: mockPause,
    resume: mockResume,
    getStatus: mockGetStatus,
  },
}));

jest.mock('@/entrypoints/background/db', () => ({
  getIndexingStats: mockGetIndexingStats,
  clearDatabase: mockClearDatabase,
  getPageByUrl: mockGetPageByUrl,
}));

jest.mock('@/utils/html', () => ({
  ...jest.requireActual('@/utils/html'),
  isExcluded: jest.fn(() => false),
}));

jest.mock('@/entrypoints/background/offscreen', () => ({
  initializeOffscreen: jest.fn(),
}));

jest.mock('@/entrypoints/background/handlers/model', () => ({
  handleGetRecommendedModels: mockHandleGetRecommendedModels,
  handleLoadModel: mockHandleLoadModel,
  handleUnloadModel: mockHandleUnloadModel,
  handleGetModelStatus: mockHandleGetModelStatus,
  handleGetModels: mockHandleGetModels,
  handleGetCachedModels: mockHandleGetCachedModels,
  handleStop: mockHandleStop,
}));

jest.mock('@/entrypoints/background/handlers/chat', () => ({
  handleChat: mockHandleChat,
  handleGetHistory: mockHandleGetHistory,
}));

jest.mock('@/entrypoints/background/handlers/searchContext', () => ({
  handleSearchContext: mockHandleSearchContext,
}));

jest.mock('@/entrypoints/background/handlers/summary', () => ({
  handleGetPageSummary: mockHandleGetPageSummary,
  handleGenerateSummary: mockHandleGenerateSummary,
}));

function getMessageListener(): (message: unknown, sender: unknown, sendResponse: (r?: unknown) => void) => boolean {
  expect(messageListener).not.toBeNull();
  return messageListener!;
}

beforeAll(async () => {
  // Dynamic import so our addListener mock captures the callback
  await import('@/entrypoints/background/background');
});

function runListener(message: unknown, sender = { id: 'test', url: 'https://example.com' }): Promise<unknown> {
  return new Promise((resolve) => {
    const sendResponse = (response?: unknown) => resolve(response);
    const listener = getMessageListener();
    listener(message, sender, sendResponse);
  });
}

describe('Background message routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetIndexingStats.mockResolvedValue({ total: 10, processed: 5, failed: 0 });
    mockGetStatus.mockReturnValue({
      isRunning: false,
      isPaused: false,
      metrics: {},
    });
  });

  describe('forward actions', () => {
    it('acknowledges chatStream and returns forwarded: true', async () => {
      const result = await runListener({ action: MessageAction.CHAT_STREAM });
      expect(result).toEqual({ forwarded: true });
    });

    it('acknowledges modelProgress and returns forwarded: true', async () => {
      const result = await runListener({ action: MessageAction.MODEL_PROGRESS });
      expect(result).toEqual({ forwarded: true });
    });
  });

  describe('model actions', () => {
    it('routes getRecommendedModels to handler', async () => {
      mockHandleGetRecommendedModels.mockReturnValue({ recommended: { FAST: 'x', QUALITY: 'y' } });
      const result = await runListener({ action: MessageAction.GET_RECOMMENDED_MODELS });
      expect(mockHandleGetRecommendedModels).toHaveBeenCalled();
      expect(result).toEqual({ recommended: { FAST: 'x', QUALITY: 'y' } });
    });

    it('routes loadModel to handler', async () => {
      mockHandleLoadModel.mockResolvedValue({ success: true });
      const result = await runListener({ action: MessageAction.LOAD_MODEL, modelId: 'test-model' });
      expect(mockHandleLoadModel).toHaveBeenCalledWith('test-model');
      expect(result).toEqual({ success: true });
    });

    it('routes unloadModel to handler', async () => {
      mockHandleUnloadModel.mockResolvedValue({ success: true });
      const result = await runListener({ action: MessageAction.UNLOAD_MODEL });
      expect(mockHandleUnloadModel).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('routes getModelStatus to handler', async () => {
      mockHandleGetModelStatus.mockResolvedValue({ loaded: false });
      const result = await runListener({ action: MessageAction.GET_MODEL_STATUS });
      expect(mockHandleGetModelStatus).toHaveBeenCalled();
      expect(result).toEqual({ loaded: false });
    });

    it('routes getModels to handler', async () => {
      mockHandleGetModels.mockResolvedValue(['model1', 'model2']);
      const result = await runListener({ action: MessageAction.GET_MODELS });
      expect(mockHandleGetModels).toHaveBeenCalled();
      expect(result).toEqual(['model1', 'model2']);
    });

    it('routes getCachedModels to handler', async () => {
      mockHandleGetCachedModels.mockResolvedValue({ cachedModels: [] });
      const result = await runListener({ action: MessageAction.GET_CACHED_MODELS });
      expect(mockHandleGetCachedModels).toHaveBeenCalled();
      expect(result).toEqual({ cachedModels: [] });
    });

    it('routes stop to handler', async () => {
      mockHandleStop.mockResolvedValue({ success: true });
      const result = await runListener({ action: MessageAction.STOP });
      expect(mockHandleStop).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  describe('chat actions', () => {
    it('routes chat to handler with message and sender', async () => {
      const sender = { id: 'sender-1', url: 'https://example.com', tab: { id: 1 } };
      mockHandleChat.mockResolvedValue({ success: true });
      const result = await runListener({ action: MessageAction.CHAT, messages: [], url: 'https://example.com' }, sender);
      expect(mockHandleChat).toHaveBeenCalledWith({ action: MessageAction.CHAT, messages: [], url: 'https://example.com' }, sender);
      expect(result).toEqual({ success: true });
    });

    it('routes getHistory to handler', async () => {
      mockHandleGetHistory.mockResolvedValue([]);
      const result = await runListener({ action: MessageAction.GET_HISTORY, url: 'https://example.com' });
      expect(mockHandleGetHistory).toHaveBeenCalledWith('https://example.com', undefined);
      expect(result).toEqual([]);
    });
  });

  describe('search and summary actions', () => {
    it('routes searchContext to handler', async () => {
      mockHandleSearchContext.mockResolvedValue({ results: [] });
      const result = await runListener({ action: MessageAction.SEARCH_CONTEXT, query: 'test' });
      expect(mockHandleSearchContext).toHaveBeenCalledWith({ action: MessageAction.SEARCH_CONTEXT, query: 'test' });
      expect(result).toEqual({ results: [] });
    });

    it('routes getPageSummary to handler', async () => {
      mockHandleGetPageSummary.mockResolvedValue({ summary: 'Cached summary' });
      const result = await runListener({ action: MessageAction.GET_PAGE_SUMMARY, url: 'https://example.com' });
      expect(mockHandleGetPageSummary).toHaveBeenCalledWith('https://example.com');
      expect(result).toEqual({ summary: 'Cached summary' });
    });

    it('routes generateSummary to handler', async () => {
      mockHandleGenerateSummary.mockResolvedValue({ summary: 'Generated summary' });
      const result = await runListener({
        action: MessageAction.GENERATE_SUMMARY,
        url: 'https://example.com',
        content: 'page content',
        title: 'Page Title',
      });
      expect(mockHandleGenerateSummary).toHaveBeenCalledWith('https://example.com', 'page content', 'Page Title');
      expect(result).toEqual({ summary: 'Generated summary' });
    });
  });

  describe('indexing actions', () => {
    it('handles START_INDEXING and starts pipeline', async () => {
      mockFetchItems.mockResolvedValue([{ id: '1', url: 'https://a.com', title: 'A' }]);
      const result = await runListener({ action: MessageAction.START_INDEXING });
      expect(mockFetchItems).toHaveBeenCalled();
      expect(mockStart).toHaveBeenCalledWith([{ id: '1', url: 'https://a.com', title: 'A' }]);
      expect(result).toEqual({ success: true, itemsQueued: 1 });
    });

    it('handles INDEX_MANUAL_URLS and starts pipeline with URL list', async () => {
      mockGetPageByUrl.mockResolvedValue(undefined);
      mockGetStatus.mockReturnValue({ isRunning: false, isPaused: false, metrics: {} });
      const result = await runListener({
        action: MessageAction.INDEX_MANUAL_URLS,
        urls: ['https://example.com/a', 'https://example.com/b'],
      });
      expect(mockGetPageByUrl).toHaveBeenCalledWith('https://example.com/a');
      expect(mockGetPageByUrl).toHaveBeenCalledWith('https://example.com/b');
      expect(mockStart).toHaveBeenCalled();
      const [items] = mockStart.mock.calls[0];
      expect(items).toHaveLength(2);
      expect(items[0]).toMatchObject({ url: 'https://example.com/a', title: 'https://example.com/a', processed: 0 });
      expect(items[1]).toMatchObject({ url: 'https://example.com/b', title: 'https://example.com/b', processed: 0 });
      expect(result).toEqual({ success: true, count: 2 });
    });

    it('handles PAUSE_INDEXING', async () => {
      const result = await runListener({ action: MessageAction.PAUSE_INDEXING });
      expect(mockPause).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('handles RESUME_INDEXING', async () => {
      const result = await runListener({ action: MessageAction.RESUME_INDEXING });
      expect(mockResume).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('handles GET_INDEXING_PROGRESS', async () => {
      mockGetIndexingStats.mockResolvedValue({ total: 10, processed: 5, failed: 1 });
      mockGetStatus.mockReturnValue({
        isRunning: false,
        isPaused: false,
        metrics: {},
      });
      const result = await runListener({ action: MessageAction.GET_INDEXING_PROGRESS });
      expect(mockGetIndexingStats).toHaveBeenCalled();
      expect(mockGetStatus).toHaveBeenCalled();
      expect(result).toEqual({
        total: 10,
        processed: 5,
        failed: 1,
        status: 'idle',
      });
    });

    it('reports INDEXING status when pipeline is running', async () => {
      mockGetIndexingStats.mockResolvedValue({ total: 10, processed: 3, failed: 0 });
      mockGetStatus.mockReturnValue({ isRunning: true, isPaused: false, metrics: {} });
      const result = await runListener({ action: MessageAction.GET_INDEXING_PROGRESS });
      expect(result).toEqual({
        total: 10,
        processed: 3,
        failed: 0,
        status: 'indexing',
      });
    });

    it('reports PAUSED status when pipeline is paused', async () => {
      mockGetIndexingStats.mockResolvedValue({ total: 10, processed: 3, failed: 0 });
      mockGetStatus.mockReturnValue({ isRunning: true, isPaused: true, metrics: {} });
      const result = await runListener({ action: MessageAction.GET_INDEXING_PROGRESS });
      expect(result).toEqual({
        total: 10,
        processed: 3,
        failed: 0,
        status: 'paused',
      });
    });

    it('handles CLEAR_DATA', async () => {
      const result = await runListener({ action: MessageAction.CLEAR_DATA });
      expect(mockClearDatabase).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('handles GET_DEBUG_DATA', async () => {
      mockGetIndexingStats.mockResolvedValue({ total: 5, processed: 3, failed: 1 });
      mockGetStatus.mockReturnValue({ isRunning: false, isPaused: false, metrics: {} });
      const result = await runListener({ action: MessageAction.GET_DEBUG_DATA });
      expect(result).toEqual({
        stats: { total: 5, processed: 3, failed: 1 },
        status: { isRunning: false, isPaused: false, metrics: {} },
      });
    });
  });

  describe('misc actions', () => {
    it('handles PING', async () => {
      const result = await runListener({ action: MessageAction.PING });
      expect(result).toEqual({ pong: true });
    });
  });

  describe('unknown action', () => {
    it('returns error for unknown action', async () => {
      const result = await runListener({ action: 'unknownAction' });
      expect(result).toEqual({ error: 'Unknown action' });
    });
  });
});
