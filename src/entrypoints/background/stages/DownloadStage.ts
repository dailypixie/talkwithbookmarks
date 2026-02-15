import { PipelineStage, StageQueueItem } from '@/utils/types';
import { StageProcessor } from '@/entrypoints/background/stages/StageProcessor';
import { indexingLogger as logger } from '@/utils/logger';

export class DownloadStage extends StageProcessor {
  readonly stage = PipelineStage.DOWNLOAD;
  readonly concurrency = 10; // Network-bound, can run many in parallel
  readonly name = 'DownloadStage';

  async process(item: StageQueueItem, signal?: AbortSignal): Promise<StageQueueItem> {
    logger.debug(`Downloading ${item.url}`);

    // Combined timeout + abort signal
    const timeoutSignal = AbortSignal.timeout(15000); // 15s timeout
    const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

    const response = await fetch(item.url, { signal: combinedSignal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const rawHtml = await response.text();

    if (rawHtml.length < 100) {
      throw new Error('Page content too small');
    }

    logger.debug(`Downloaded ${item.url} (${rawHtml.length} chars)`);

    return {
      ...item,
      rawHtml,
      updatedAt: Date.now(),
    };
  }
}

export const downloadStage = new DownloadStage();
