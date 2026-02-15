/**
 * Application-wide constants
 * Centralizes magic numbers and configuration values
 */

// Embedding Configuration
export const EMBEDDING_CONFIG = {
  /** Maximum number of text chunks to embed in a single batch */
  MAX_BATCH_SIZE: 50,
  /** Model identifier for embeddings */
  MODEL: 'snowflake-arctic-embed-m-q0f32-MLC-b4',
} as const;

// Text Chunking Configuration
export const CHUNKING_CONFIG = {
  /** Default maximum size for text chunks in characters */
  MAX_CHUNK_SIZE: 1000,
  /** Default overlap between consecutive chunks in characters */
  CHUNK_OVERLAP: 100,
  /** Window size for looking back to find sentence boundaries */
  LOOKBACK_WINDOW: 200,
} as const;

// Retry Configuration
export const RETRY_CONFIG = {
  /** Maximum number of retry attempts */
  MAX_RETRIES: 3,
  /** Delay in milliseconds before each retry attempt */
  RETRY_DELAYS: [500, 1000, 2000],
} as const;

// Database Configuration
export const DATABASE_CONFIG = {
  /** Database name */
  NAME: 'talkwithbookmarks',
  /** Enable debug mode (only in development) */
  DEBUG: typeof process !== 'undefined' && process.env?.NODE_ENV === 'development',
} as const;

// Pipeline Configuration
export const PIPELINE_CONFIG = {
  /** Batch size for processing pages */
  BATCH_SIZE: 10,
  /** Default concurrency limits per stage */
  DEFAULT_CONCURRENCY: {
    DOWNLOAD: 10,
    CHUNK: 5,
  },
} as const;

// Summary Generation Configuration
export const SUMMARY_CONFIG = {
  /** Maximum characters of content to send to LLM for summary generation */
  MAX_CONTENT_LENGTH: 6000,
  /** Timeout in ms for summary generation; prevents UI from staying stuck */
  GENERATION_TIMEOUT_MS: 120_000,
} as const;

// Recommended LLM models for the chat/summary bubble
export const RECOMMENDED_MODELS = {
  FAST: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  QUALITY: 'Qwen3-8B-q4f16_1-MLC',
} as const;
