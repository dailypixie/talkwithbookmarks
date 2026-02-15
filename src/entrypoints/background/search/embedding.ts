import * as webllm from '@mlc-ai/web-llm';

import { EMBEDDING_CONFIG } from '@/utils/constants';
import { embeddingLogger as logger } from '@/utils/logger';

let embeddingEngine: webllm.MLCEngine | null = null;
let embeddingEnginePromise: Promise<webllm.MLCEngine> | null = null;
const embeddingModel = EMBEDDING_CONFIG.MODEL;

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  // Prevent concurrent initialization - race condition fix
  if (!embeddingEngine && !embeddingEnginePromise) {
    embeddingEnginePromise = webllm.CreateMLCEngine(embeddingModel, {
      initProgressCallback: (report) => {
        logger.info(`Model init: ${report.text} (${report.progress})`);
      },
    });

    try {
      embeddingEngine = await embeddingEnginePromise;
      embeddingEnginePromise = null;
    } catch (error) {
      embeddingEnginePromise = null;
      throw error;
    }
  } else if (embeddingEnginePromise) {
    // Wait for existing initialization to complete
    embeddingEngine = await embeddingEnginePromise;
  }

  const reply = await embeddingEngine!.embeddings.create({
    input: texts,
  });

  return reply.data.map((d: any) => d.embedding);
}

/**
 * Cleanup embedding engine (for testing or extension unload)
 */
export async function disposeEmbeddingEngine(): Promise<void> {
  if (embeddingEngine) {
    embeddingEngine = null;
  }
  embeddingEnginePromise = null;
}
