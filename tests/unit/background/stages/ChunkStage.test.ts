/**
 * Unit tests for src/background/stages/ChunkStage.ts
 */

// Mock embedding module to avoid loading @mlc-ai/web-llm (ESM) in Jest
jest.mock('@/entrypoints/background/search/embedding', () => ({
  getEmbeddings: jest.fn((texts: string[]) => Promise.resolve(texts.map(() => [0.1, 0.2, 0.3]))),
}));

import { ChunkStage, chunkStage } from '@/entrypoints/background/stages/ChunkStage';
import { getEmbeddings } from '@/entrypoints/background/search/embedding';
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
      await expect(chunkStage.process(item)).rejects.toThrow('No HTML content to chunk');
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

    it('calls getEmbeddings for each chunk and attaches embeddings', async () => {
      const html = `
        <html><body><p>This is a paragraph with enough content to pass the minimum length.
        We need at least fifty characters to be valid for chunking.</p></body></html>
      `;
      const item = makeItem({ rawHtml: html });

      const result = await chunkStage.process(item);

      expect(getEmbeddings).toHaveBeenCalledWith(expect.any(Array));
      const textsPassed = (getEmbeddings as jest.Mock).mock.calls[0][0];
      expect(textsPassed.length).toBe(result.chunks!.length);
      result.chunks!.forEach((chunk) => {
        expect(chunk.embedding).toEqual([0.1, 0.2, 0.3]);
      });
    });

    it('maps each chunk to the correct embedding by position index', async () => {
      // Use position-specific mock: embedding at index i = [i, i*10] so we can verify mapping
      const mockGetEmbeddings = getEmbeddings as jest.Mock;
      mockGetEmbeddings.mockImplementationOnce((texts: string[]) =>
        Promise.resolve(texts.map((_, i) => [i, i * 10]))
      );

      const longContent = 'Word '.repeat(300);
      const html = `<html><body><p>${longContent}</p></body></html>`;
      const item = makeItem({ rawHtml: html });

      const result = await chunkStage.process(item);

      const textsPassed = mockGetEmbeddings.mock.calls[0][0];
      expect(textsPassed.length).toBe(result.chunks!.length);

      result.chunks!.forEach((chunk, index) => {
        expect(chunk.position).toBe(index);
        expect(chunk.text).toBe(textsPassed[index]);
        expect(chunk.embedding).toEqual([index, index * 10]);
      });
    });

    it('throws when embedding count does not match chunk count', async () => {
      const mockGetEmbeddings = getEmbeddings as jest.Mock;
      mockGetEmbeddings.mockImplementationOnce((texts: string[]) =>
        Promise.resolve(texts.slice(0, -1).map(() => [0.1])) // one fewer embedding
      );

      const longContent = 'Word '.repeat(300);
      const html = `<html><body><p>${longContent}</p></body></html>`;
      const item = makeItem({ rawHtml: html });

      await expect(chunkStage.process(item)).rejects.toThrow(/Embedding count mismatch/);
    });

    it('preserves item url and title in result', async () => {
      const html = `
        <html><body><p>This is a paragraph with enough content to pass the minimum length.
        We need at least fifty characters to be valid for chunking.</p></body></html>
      `;
      const item = makeItem({ url: 'https://site.com/page', title: 'My Page', rawHtml: html });

      const result = await chunkStage.process(item);

      expect(result.url).toBe('https://site.com/page');
      expect(result.title).toBe('My Page');
    });
  });

  describe('setup and teardown', () => {
    it('setup resolves without error', async () => {
      await expect(chunkStage.setup()).resolves.not.toThrow();
    });

    it('teardown resolves without error', async () => {
      await expect(chunkStage.teardown()).resolves.not.toThrow();
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
