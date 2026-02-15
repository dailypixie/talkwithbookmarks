/**
 * Unit tests for src/background/stages/DownloadStage.ts
 */

import { DownloadStage, downloadStage } from '@/entrypoints/background/stages/DownloadStage';
import { PipelineStage, StageQueueItem } from '@/utils/types';

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

function makeItem(overrides: Partial<StageQueueItem> = {}): StageQueueItem {
  return {
    id: 'item-1',
    url: 'https://example.com',
    title: 'Example',
    stage: PipelineStage.DOWNLOAD,
    status: 'pending' as any,
    queueStatus: 'pending' as any,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('DownloadStage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('has correct stage and name', () => {
      expect(downloadStage.stage).toBe(PipelineStage.DOWNLOAD);
      expect(downloadStage.name).toBe('DownloadStage');
      expect(downloadStage.concurrency).toBe(10);
    });
  });

  describe('process', () => {
    it('fetches URL and returns item with rawHtml', async () => {
      const html = '<html><body>' + 'x'.repeat(150) + '</body></html>';
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(html),
      } as any);

      const item = makeItem();
      const result = await downloadStage.process(item);

      expect(mockFetch).toHaveBeenCalledWith('https://example.com', expect.objectContaining({ signal: expect.any(AbortSignal) }));
      expect(result.rawHtml).toBe(html);
      expect(result.updatedAt).toBeDefined();
    });

    it('throws when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any);

      const item = makeItem();
      await expect(downloadStage.process(item)).rejects.toThrow('HTTP 404: Not Found');
    });

    it('throws when content is too small (< 100 chars)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('short'),
      } as any);

      const item = makeItem();
      await expect(downloadStage.process(item)).rejects.toThrow('Page content too small');
    });

    it('accepts content of exactly 100 chars', async () => {
      const html = 'x'.repeat(100);
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(html),
      } as any);

      const item = makeItem();
      const result = await downloadStage.process(item);
      expect(result.rawHtml).toBe(html);
    });
  });

  describe('shouldProcess', () => {
    it('returns true for DOWNLOAD stage items', () => {
      const stage = new DownloadStage();
      expect(stage.shouldProcess(makeItem({ stage: PipelineStage.DOWNLOAD }))).toBe(true);
    });

    it('returns false for CHUNK stage items', () => {
      const stage = new DownloadStage();
      expect(stage.shouldProcess(makeItem({ stage: PipelineStage.CHUNK as any }))).toBe(false);
    });
  });
});
