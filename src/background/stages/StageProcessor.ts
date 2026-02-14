/**
 * Abstract Stage Processor
 * Base class for all pipeline stage processors
 */

import { PipelineStage, StageQueueItem } from '@/utils/types';
import { pipelineLogger as logger } from '@/utils/logger';

/**
 * Abstract base class for stage processors.
 * Each stage implements process() to transform input items.
 */
export abstract class StageProcessor {
  /** Which pipeline stage this processor handles */
  abstract readonly stage: PipelineStage;

  /** Max concurrent items for this stage */
  abstract readonly concurrency: number;

  /** Human-readable name for logging */
  abstract readonly name: string;

  /**
   * Process a single item.
   * Should return the updated item with stage-specific data populated.
   * Throws on failure.
   */
  abstract process(item: StageQueueItem, signal?: AbortSignal): Promise<StageQueueItem>;

  /**
   * Optional: Called before processing starts (e.g., load models)
   */
  async setup(): Promise<void> {
    logger.debug(`${this.name} setup complete`);
  }

  /**
   * Optional: Called after all processing completes (e.g., unload models)
   */
  async teardown(): Promise<void> {
    logger.debug(`${this.name} teardown complete`);
  }

  /**
   * Check if item should be processed by this stage
   */
  shouldProcess(item: StageQueueItem): boolean {
    return item.stage === this.stage;
  }
}
