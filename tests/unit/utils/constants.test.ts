/**
 * Unit tests for src/utils/constants.ts
 */

import {
  CHUNKING_CONFIG,
  RETRY_CONFIG,
  DATABASE_CONFIG,
  PIPELINE_CONFIG,
  SUMMARY_CONFIG,
  RECOMMENDED_MODELS,
} from '@/utils/constants';

describe('CHUNKING_CONFIG', () => {
  it('has expected values', () => {
    expect(CHUNKING_CONFIG.MAX_CHUNK_SIZE).toBe(1000);
    expect(CHUNKING_CONFIG.CHUNK_OVERLAP).toBe(100);
    expect(CHUNKING_CONFIG.LOOKBACK_WINDOW).toBe(200);
  });
});

describe('RETRY_CONFIG', () => {
  it('has expected values', () => {
    expect(RETRY_CONFIG.MAX_RETRIES).toBe(3);
    expect(RETRY_CONFIG.RETRY_DELAYS).toEqual([500, 1000, 2000]);
  });
});

describe('DATABASE_CONFIG', () => {
  it('has name', () => {
    expect(DATABASE_CONFIG.NAME).toBe('talkwithbookmarks');
  });

  it('has DEBUG boolean', () => {
    expect(typeof DATABASE_CONFIG.DEBUG).toBe('boolean');
  });
});

describe('PIPELINE_CONFIG', () => {
  it('has BATCH_SIZE', () => {
    expect(PIPELINE_CONFIG.BATCH_SIZE).toBe(10);
  });

  it('has DEFAULT_CONCURRENCY with DOWNLOAD and CHUNK', () => {
    expect(PIPELINE_CONFIG.DEFAULT_CONCURRENCY.DOWNLOAD).toBe(10);
    expect(PIPELINE_CONFIG.DEFAULT_CONCURRENCY.CHUNK).toBe(5);
  });
});

describe('SUMMARY_CONFIG', () => {
  it('has expected values', () => {
    expect(SUMMARY_CONFIG.MAX_CONTENT_LENGTH).toBe(6000);
    expect(SUMMARY_CONFIG.GENERATION_TIMEOUT_MS).toBe(120_000);
  });
});

describe('RECOMMENDED_MODELS', () => {
  it('has FAST and QUALITY models', () => {
    expect(RECOMMENDED_MODELS.FAST).toBe('Llama-3.2-1B-Instruct-q4f16_1-MLC');
    expect(RECOMMENDED_MODELS.QUALITY).toBe('Qwen3-8B-q4f16_1-MLC');
  });
});
