/**
 * Simplified Pipeline for Bookmarks Processing
 * Coordinates 2-stage indexing pipeline: Download → Chunk
 */
import { addPageToList, addSlice, getPageByUrl, updateListItemProcessedAt } from '@/background/db';
import {
  PageItem,
  PipelineConfig,
  PipelineEvent,
  PipelineStage,
  StageItemStatus,
  StageItemQueueStatus,
  StageMetrics,
  StageProgress,
  StageQueueItem,
  PipelineState,
} from '@/utils/types';
import { pipelineLogger as logger } from '@/utils/logger';
import { downloadStage, chunkStage, StageProcessor } from '@/background/stages';
import { pipelineEvents } from '@/background/events';

// Stage configuration with their processors
const STAGES: { stage: PipelineStage; processor: StageProcessor }[] = [
  { stage: PipelineStage.DOWNLOAD, processor: downloadStage },
  { stage: PipelineStage.CHUNK, processor: chunkStage },
];

// Default concurrency limits per stage
const DEFAULT_CONCURRENCY: Partial<Record<PipelineStage, number>> = {
  [PipelineStage.DOWNLOAD]: 10,
  [PipelineStage.CHUNK]: 5,
};

export class SimplePipeline {
  private abortController: AbortController | null = null;
  private isRunning = false;
  private isPaused = false;

  // Configurable concurrency
  private concurrency: Partial<Record<PipelineStage, number>> = { ...DEFAULT_CONCURRENCY };

  // Pipeline metrics
  private metrics: StageMetrics = {
    startTime: 0,
    itemsSkipped: 0,
    stage: PipelineStage.DOWNLOAD,
    itemsProcessed: 0,
    itemsIndexed: 0,
    itemsFailed: 0,
    avgTimePerItem: 0,
    peakActiveWorkers: 0,
  };

  // Per-stage metrics
  private stageMetrics: Map<PipelineStage, StageMetrics> = new Map();

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    for (const { stage } of STAGES) {
      this.stageMetrics.set(stage, {
        stage,
        itemsProcessed: 0,
        itemsFailed: 0,
        avgTimePerItem: 0,
        peakActiveWorkers: 0,
        startTime: 0,
        itemsSkipped: 0,
        itemsIndexed: 0,
      });
    }
  }

  /**
   * Start processing items through the pipeline
   */
  async start(items: PageItem[], config?: PipelineConfig): Promise<void> {
    if (this.isRunning) {
      logger.warn('Pipeline already running');
      return;
    }

    this.isRunning = true;
    this.abortController = new AbortController();
    this.metrics.startTime = Date.now();
    this.metrics.itemsIndexed = 0;
    this.metrics.itemsFailed = 0;
    this.metrics.itemsSkipped = 0;

    // Reset per-stage metrics for this run
    this.initializeMetrics();

    // Apply config
    if (config?.concurrency) {
      this.concurrency = { ...this.concurrency, ...config.concurrency };
    }

    try {
      // Save items to database first
      for (const item of items) {
        try {
          await addPageToList(item);
        } catch (error) {
          logger.error('Error adding page to list', error as Error);
        }
      }

      if (items.length === 0) {
        logger.info('Pipeline started with 0 items to process (all bookmarks already indexed or recently failed).');
      } else {
        logger.info(`Pipeline starting with ${items.length} items`);
      }
      pipelineEvents.dispatchEvent(
        new CustomEvent<PipelineEvent>('pipeline-event', {
          detail: { type: 'started', timestamp: Date.now() },
        })
      );

      // Build stage queue items once so later stages can enrich them
      const stageItems: StageQueueItem[] = items.map((item) => ({
        id: item.url,
        url: item.url,
        title: item.title,
        stage: PipelineStage.DOWNLOAD,
        status: StageItemStatus.PENDING,
        queueStatus: StageItemQueueStatus.PENDING,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));

      // Process through each stage sequentially
      for (const { stage, processor } of STAGES) {
        if (this.abortController.signal.aborted) {
          break;
        }

        await this.processStage(stage, processor, stageItems);
      }

      logger.info(items.length === 0 ? 'Pipeline completed (no items were queued).' : 'Pipeline completed successfully', this.metrics);
      pipelineEvents.dispatchEvent(
        new CustomEvent<PipelineEvent>('pipeline-event', {
          detail: {
            type: 'completed',
            timestamp: Date.now(),
          },
        })
      );
    } catch (error) {
      logger.error('Pipeline error', error as Error);
      pipelineEvents.dispatchEvent(
        new CustomEvent<PipelineEvent>('pipeline-event', {
          detail: {
            type: 'error',
            error: (error as Error).message,
            timestamp: Date.now(),
          },
        })
      );
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process all items through a single stage
   *
   * Note: items are `StageQueueItem`s that are reused across stages so that
   * data from earlier stages (e.g. `rawHtml`, `chunks`) is available later.
   */
  private async processStage(stage: PipelineStage, processor: StageProcessor, items: StageQueueItem[]): Promise<void> {
    logger.info(`Processing stage: ${stage}`, { itemCount: items.length });

    await processor.setup();

    const concurrency = this.concurrency[stage] || 1;

    // Prepare items for this stage
    const queue = items.map((item) => {
      item.stage = stage;
      item.status = StageItemStatus.PENDING;
      item.queueStatus = StageItemQueueStatus.PENDING;
      item.updatedAt = Date.now();
      return item;
    });
    const active: Promise<void>[] = [];

    while (queue.length > 0 || active.length > 0) {
      if (this.isPaused) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }

      if (this.abortController?.signal.aborted) {
        break;
      }

      // Fill up to concurrency limit
      while (active.length < concurrency && queue.length > 0) {
        const item = queue.shift()!;
        active.push(this.processItem(item, processor));
      }

      if (active.length > 0) {
        await Promise.race(active);
        active.splice(
          active.findIndex((p) =>
            p.then(
              () => true,
              () => true
            )
          ),
          1
        );
      }
    }

    await processor.teardown();
  }

  /**
   * Process a single item through a processor
   */
  private async processItem(item: StageQueueItem, processor: StageProcessor): Promise<void> {
    const startTime = Date.now();

    try {
      item.status = StageItemStatus.PROCESSING;
      item.updatedAt = Date.now();

      // Process the item
      const result = await processor.process(item, this.abortController?.signal);

      // Merge processor result back into the shared queue item so that
      // subsequent stages can see fields like `rawHtml`, `textContent`, `chunks`, etc.
      Object.assign(item, result);

      // Save chunks to database if they exist
      if (result.chunks) {
        for (const chunk of result.chunks) {
          await addSlice({
            id: `${result.url}#${chunk.position}`,
            url: result.url,
            title: result.title,
            text: chunk.text,
            position: chunk.position,
          });
        }
      }

      // Mark page as processed
      const page = await getPageByUrl(result.url);
      if (page) {
        page.processed = 1;
        page.indexedAt = Date.now();
        await updateListItemProcessedAt(page);
      }

      item.status = StageItemStatus.COMPLETED;
      item.queueStatus = result.stage === PipelineStage.DOWNLOAD ? StageItemQueueStatus.PROCESSED : StageItemQueueStatus.CHUNKED;

      this.metrics.itemsIndexed++;
      logger.debug(`Item processed: ${item.url}`);
    } catch (error) {
      item.status = StageItemStatus.FAILED;
      item.error = (error as Error).message;
      this.metrics.itemsFailed++;

      // Save error to database
      const page = await getPageByUrl(item.url);
      if (page) {
        page.error = item.error;
        page.indexedAt = Date.now();
        await updateListItemProcessedAt(page);
      }

      logger.error(`Item failed in ${item.stage}: ${item.url}`, error as Error);
    } finally {
      const duration = Date.now() - startTime;
      const metrics = this.stageMetrics.get(item.stage);
      if (metrics) {
        metrics.itemsProcessed++;
        if (item.status === StageItemStatus.FAILED) {
          metrics.itemsFailed++;
        }
      }

      item.updatedAt = Date.now();
      logger.info(`Item processed: ${item.url} in ${duration}ms`);
    }
  }

  /**
   * Pause pipeline processing
   */
  pause(): void {
    this.isPaused = true;
    logger.info('Pipeline paused');
    pipelineEvents.dispatchEvent(
      new CustomEvent<PipelineEvent>('pipeline-event', {
        detail: { type: 'paused', timestamp: Date.now() },
      })
    );
  }

  /**
   * Resume pipeline processing
   */
  resume(): void {
    this.isPaused = false;
    logger.info('Pipeline resumed');
    pipelineEvents.dispatchEvent(
      new CustomEvent<PipelineEvent>('pipeline-event', {
        detail: { type: 'resumed', timestamp: Date.now() },
      })
    );
  }

  /**
   * Stop pipeline processing
   */
  stop(): void {
    this.abortController?.abort();
    this.isRunning = false;
    logger.info('Pipeline stopped');
  }

  /**
   * Get current pipeline status
   */
  getStatus(): PipelineState {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      metrics: { ...this.metrics },
    };
  }

  /**
   * Get stage progress
   */
  getStageProgress(stage: PipelineStage): StageProgress | null {
    const metrics = this.stageMetrics.get(stage);
    if (!metrics) return null;

    return {
      stage,
      queueSize: 0,
      activeWorkers: 0,
      processed: metrics.itemsProcessed,
      failed: metrics.itemsFailed,
    };
  }
}

export const simplePipeline = new SimplePipeline();
