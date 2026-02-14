/**
 * Unit tests for src/background/stages/StageProcessor.ts
 */

import { PipelineStage, StageQueueItem } from '@/utils/types';
import { StageProcessor } from '@/background/stages/StageProcessor';

// Concrete implementation for testing abstract StageProcessor
class TestStageProcessor extends StageProcessor {
  readonly stage = PipelineStage.DOWNLOAD;
  readonly concurrency = 1;
  readonly name = 'TestStage';

  async process(item: StageQueueItem): Promise<StageQueueItem> {
    return { ...item, updatedAt: Date.now() };
  }

  async customSetup(): Promise<void> {
    await this.setup();
  }

  async customTeardown(): Promise<void> {
    await this.teardown();
  }
}

describe('StageProcessor', () => {
  const processor = new TestStageProcessor();

  describe('shouldProcess', () => {
    it('returns true when item stage matches processor stage', () => {
      const item = {
        id: '1',
        url: 'https://x.com',
        title: 'x',
        stage: PipelineStage.DOWNLOAD,
        status: 'pending',
        queueStatus: 'pending',
        createdAt: 0,
        updatedAt: 0,
      } as StageQueueItem;
      expect(processor.shouldProcess(item)).toBe(true);
    });

    it('returns false when item stage does not match', () => {
      const item = {
        id: '1',
        url: 'https://x.com',
        title: 'x',
        stage: PipelineStage.CHUNK,
        status: 'pending',
        queueStatus: 'pending',
        createdAt: 0,
        updatedAt: 0,
      } as StageQueueItem;
      expect(processor.shouldProcess(item)).toBe(false);
    });
  });

  describe('setup', () => {
    it('resolves without error', async () => {
      await expect(processor.customSetup()).resolves.not.toThrow();
    });
  });

  describe('teardown', () => {
    it('resolves without error', async () => {
      await expect(processor.customTeardown()).resolves.not.toThrow();
    });
  });
});
