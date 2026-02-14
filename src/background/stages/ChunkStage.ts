/**
 * Chunk Stage Processor
 * Stage 2: Extracts text from HTML and creates semantic chunks
 */

import { PipelineStage, StageQueueItem } from '@/utils/types';
import { StageProcessor } from './StageProcessor';
import { extractTextFromHTML, splitTextSemantic } from '@/utils/html';
import { indexingLogger as logger } from '@/utils/logger';

export class ChunkStage extends StageProcessor {
  readonly stage = PipelineStage.CHUNK;
  readonly concurrency = 5; // CPU-bound text processing
  readonly name = 'ChunkStage';

  /** Minimum text length to consider valid */
  private readonly MIN_TEXT_LENGTH = 50;
  /** Target chunk size in characters */
  private readonly CHUNK_SIZE = 1000;
  /** Overlap between chunks for context preservation */
  private readonly CHUNK_OVERLAP = 150;

  async process(item: StageQueueItem): Promise<StageQueueItem> {
    if (!item.rawHtml) {
      throw new Error('No HTML content to chunk');
    }

    logger.debug(`Chunking ${item.url}`);

    // Extract text from HTML
    const textContent = extractTextFromHTML(item.rawHtml);

    if (textContent.length < this.MIN_TEXT_LENGTH) {
      throw new Error(`Text too short: ${textContent.length} chars (min: ${this.MIN_TEXT_LENGTH})`);
    }

    // Create semantic chunks with overlap
    const rawChunks = splitTextSemantic(textContent, this.CHUNK_SIZE, this.CHUNK_OVERLAP);

    // Normalize chunks to always have position
    const chunks = rawChunks.map((chunk, index) => {
      if (typeof chunk === 'string') {
        return { text: chunk, position: index };
      }
      return chunk;
    });

    logger.debug(`Chunked ${item.url}: ${chunks.length} chunks from ${textContent.length} chars`);

    return {
      ...item,
      textContent,
      chunks,
      // Clear rawHtml to save memory (no longer needed)
      rawHtml: undefined,
      updatedAt: Date.now(),
    };
  }
}

export const chunkStage = new ChunkStage();
