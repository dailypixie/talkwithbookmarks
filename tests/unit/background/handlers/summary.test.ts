/**
 * Unit tests for src/background/handlers/summary.ts
 */

import { handleGetPageSummary, handleGenerateSummary } from '@/background/handlers/summary';
import { SUMMARY_CONFIG } from '@/utils/constants';

jest.mock('@/background/db', () => ({
  getPageByUrl: jest.fn(),
  updatePageSummary: jest.fn(),
}));

jest.mock('@/background/offscreen', () => ({
  sendMessageToOffscreenWithRetry: jest.fn(),
}));

import { getPageByUrl, updatePageSummary } from '@/background/db';
import { sendMessageToOffscreenWithRetry } from '@/background/offscreen';

const mockGetPageByUrl = getPageByUrl as jest.MockedFunction<typeof getPageByUrl>;
const mockUpdatePageSummary = updatePageSummary as jest.MockedFunction<typeof updatePageSummary>;
const mockSendToOffscreen = sendMessageToOffscreenWithRetry as jest.MockedFunction<
  typeof sendMessageToOffscreenWithRetry
>;

describe('handleGetPageSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached summary when page has one', async () => {
    mockGetPageByUrl.mockResolvedValue({
      url: 'https://example.com',
      summary: 'Cached summary text',
      summaryModel: 'model-x',
    } as any);

    const result = await handleGetPageSummary('https://example.com');

    expect(result).toEqual({
      summary: 'Cached summary text',
      summaryModel: 'model-x',
      exists: true,
    });
  });

  it('returns null summary when page exists but has no summary', async () => {
    mockGetPageByUrl.mockResolvedValue({
      url: 'https://example.com',
      title: 'Page',
    } as any);

    const result = await handleGetPageSummary('https://example.com');

    expect(result).toEqual({ summary: null, exists: true });
  });

  it('returns exists: false when page not found', async () => {
    mockGetPageByUrl.mockResolvedValue(undefined);

    const result = await handleGetPageSummary('https://example.com');

    expect(result).toEqual({ summary: null, exists: false });
  });

  it('returns null on error', async () => {
    mockGetPageByUrl.mockRejectedValue(new Error('DB error'));

    const result = await handleGetPageSummary('https://example.com');

    expect(result).toEqual({ summary: null, exists: false });
  });
});

describe('handleGenerateSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendToOffscreen
      .mockResolvedValueOnce({ currentModel: 'test-model' } as any)
      .mockResolvedValueOnce({ response: 'Generated summary from LLM' });
  });

  it('generates and saves summary', async () => {
    const result = await handleGenerateSummary(
      'https://example.com',
      'Page content here',
      'Example Title'
    );

    expect(mockSendToOffscreen).toHaveBeenCalledTimes(2);
    expect(mockSendToOffscreen).toHaveBeenNthCalledWith(1, { action: 'offscreen_getStatus' });
    expect(mockSendToOffscreen).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        action: 'offscreen_chat',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Title: Example Title'),
          }),
        ]),
      })
    );
    expect(mockUpdatePageSummary).toHaveBeenCalledWith(
      'https://example.com',
      'Generated summary from LLM',
      'test-model'
    );
    expect(result).toEqual({
      summary: 'Generated summary from LLM',
      summaryModel: 'test-model',
    });
  });

  it('truncates content exceeding MAX_CONTENT_LENGTH', async () => {
    const longContent = 'x'.repeat(SUMMARY_CONFIG.MAX_CONTENT_LENGTH + 1000);

    await handleGenerateSummary('https://example.com', longContent, 'Title');

    const chatCall = mockSendToOffscreen.mock.calls.find((c) => c[0].action === 'offscreen_chat');
    expect(chatCall).toBeDefined();
    const prompt = (chatCall![0] as any).messages[0].content;
    expect(prompt.length).toBeLessThanOrEqual(
      SUMMARY_CONFIG.MAX_CONTENT_LENGTH + 500
    );
    expect(prompt).toContain('...');
  });

  it('returns error when no response from LLM', async () => {
    mockSendToOffscreen
      .mockReset()
      .mockResolvedValueOnce({ currentModel: 'x' } as any)
      .mockResolvedValueOnce({});

    const result = await handleGenerateSummary('https://example.com', 'content', 'Title');

    expect(result).toEqual({
      summary: null,
      error: 'No response from LLM. Make sure a model is loaded.',
    });
  });

  it('returns error when offscreen throws', async () => {
    mockSendToOffscreen.mockReset().mockRejectedValue(new Error('Offscreen failed'));

    const result = await handleGenerateSummary('https://example.com', 'content', 'Title');

    expect(result).toEqual({ summary: null, error: 'Error: Offscreen failed' });
  });
});
