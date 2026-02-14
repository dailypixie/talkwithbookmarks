/**
 * Unit tests for src/background/stages/ChunkStage.ts
 */

import { ChunkStage, chunkStage } from '@/background/stages/ChunkStage';
import { PipelineStage, StageQueueItem } from '@/utils/types';

function makeItem(overrides: Partial<StageQueueItem> = {}): StageQueueItem {
  return {
    id: 'item-1',
    url: 'https://example.com',
    title: 'Example',
    stage: PipelineStage.CHUNK,
    status: 'pending' as any,
    queueStatus: 'pending' as any,
    createdAt: 0,
    updatedAt: 0,
    rawHtml: undefined,
    ...overrides,
  };
}

describe('ChunkStage', () => {
  describe('metadata', () => {
    it('has correct stage and name', () => {
      expect(chunkStage.stage).toBe(PipelineStage.CHUNK);
      expect(chunkStage.name).toBe('ChunkStage');
      expect(chunkStage.concurrency).toBe(5);
    });
  });

  describe('process', () => {
    it('extracts text and creates chunks from HTML', async () => {
      const html = `
        <html><head><script>ignore</script></head>
        <body>
          <h1>Title</h1>
          <p>This is a paragraph with enough content to pass the minimum length.
          We need at least fifty characters to be valid for chunking.
          Adding more text to ensure we have sufficient content.</p>
        </body></html>
      `;
      const item = makeItem({ rawHtml: html });

      const result = await chunkStage.process(item);

      expect(result.textContent).toBeDefined();
      expect(result.textContent!.length).toBeGreaterThanOrEqual(50);
      expect(result.chunks).toBeDefined();
      expect(result.chunks!.length).toBeGreaterThan(0);
      expect(result.chunks![0]).toHaveProperty('text');
      expect(result.chunks![0]).toHaveProperty('position');
      expect(result.rawHtml).toBeUndefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('throws when no rawHtml', async () => {
      const item = makeItem({ rawHtml: undefined });
      await expect(chunkStage.process(item)).rejects.toThrow(
        'No HTML content to chunk'
      );
    });

    it('throws when extracted text is too short', async () => {
      const html = '<p>Short</p>';
      const item = makeItem({ rawHtml: html });

      await expect(chunkStage.process(item)).rejects.toThrow(/Text too short/);
    });

    it('creates multiple chunks for long content', async () => {
      const longContent = 'Word '.repeat(300);
      const html = `<html><body><p>${longContent}</p></body></html>`;
      const item = makeItem({ rawHtml: html });

      const result = await chunkStage.process(item);

      expect(result.chunks!.length).toBeGreaterThan(1);
      result.chunks!.forEach((chunk, i) => {
        expect(chunk).toHaveProperty('text');
        expect(chunk).toHaveProperty('position', i);
      });
    });
  });

  describe('shouldProcess', () => {
    it('returns true for CHUNK stage items', () => {
      expect(chunkStage.shouldProcess(makeItem({ stage: PipelineStage.CHUNK }))).toBe(true);
    });

    it('returns false for DOWNLOAD stage items', () => {
      expect(chunkStage.shouldProcess(makeItem({ stage: PipelineStage.DOWNLOAD }))).toBe(false);
    });
  });
});
