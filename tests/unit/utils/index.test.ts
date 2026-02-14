/**
 * Unit tests for src/utils/index.ts (withTimeout, isThinking, cleanContent)
 */

import { withTimeout, isThinking, cleanContent } from '@/utils/index';

describe('withTimeout', () => {
  it('resolves when promise completes before timeout', async () => {
    const result = await withTimeout(Promise.resolve(42), 100, 'timeout');
    expect(result).toBe(42);
  });

  it('rejects with custom message when timeout is exceeded', async () => {
    const slowPromise = new Promise<number>((resolve) =>
      setTimeout(() => resolve(42), 200)
    );
    await expect(
      withTimeout(slowPromise, 50, 'Request timed out')
    ).rejects.toThrow('Request timed out');
  });

  it('propagates rejection from the promise', async () => {
    const failingPromise = Promise.reject(new Error('Something failed'));
    await expect(
      withTimeout(failingPromise, 100, 'timeout')
    ).rejects.toThrow('Something failed');
  });
});

describe('isThinking', () => {
  it('returns true for text starting with < and length < 7', () => {
    expect(isThinking('<')).toBe(true);
    expect(isThinking('<th')).toBe(true);
    expect(isThinking('<think')).toBe(true);
  });

  it('returns true for <think> when incomplete (no </think>)', () => {
    expect(isThinking('<think>')).toBe(true);
  });

  it('returns false when text is longer and starts with < but not <think>', () => {
    expect(isThinking('<thought')).toBe(false);
  });

  it('returns true for text starting with <think> and not containing </think>', () => {
    expect(isThinking('<think>')).toBe(true);
    expect(isThinking('<think> abc')).toBe(true);
  });

  it('returns false for text starting with <think> but containing </think>', () => {
    expect(isThinking('<think></think>')).toBe(false);
    expect(isThinking('<think> done </think>')).toBe(false);
  });

  it('returns false for normal text', () => {
    expect(isThinking('Hello')).toBe(false);
    expect(isThinking('')).toBe(false);
  });

  it('handles trimmed input - short text starting with <', () => {
    expect(isThinking('  <')).toBe(true); // trim gives "<", length 3 < 7
  });
});

describe('cleanContent', () => {
  it('removes complete think blocks', () => {
    const input = '<think>reasoning</think>Hello world';
    expect(cleanContent(input)).toBe('Hello world');
  });

  it('removes incomplete think block when at start of string', () => {
    const input = '<think>incomplete reasoning';
    expect(cleanContent(input)).toBe('');
  });

  it('removes multiple think blocks', () => {
    const input = '<think>a</think>First. <think>b</think>Second.';
    expect(cleanContent(input)).toBe('First. Second.');
  });

  it('removes context preamble (Instruction pattern)', () => {
    const input = 'Context information is below.\n\n---\n\nInstruction:\n\nWhat is X?';
    expect(cleanContent(input)).toBe('What is X?');
  });

  it('removes context preamble (Question pattern)', () => {
    const input =
      'Use the following context when answering. Be concise.\n\n---\n\nQuestion:\n\nWhat is Y?';
    expect(cleanContent(input)).toBe('What is Y?');
  });

  it('removes "Focus primarily on the Current Page Content."', () => {
    const input = 'Answer here\n\nFocus primarily on the Current Page Content.';
    expect(cleanContent(input)).toBe('Answer here');
  });

  it('removes "Answer:" at end', () => {
    const input = 'The answer is 42\n\nAnswer:';
    expect(cleanContent(input)).toBe('The answer is 42');
  });

  it('trims whitespace', () => {
    expect(cleanContent('  hello  ')).toBe('hello');
  });

  it('combines multiple cleaning rules', () => {
    const input =
      'Context information is below.\n\n---\n\nInstruction:\n\n<think>reason</think>The answer.\n\nAnswer:';
    expect(cleanContent(input)).toBe('The answer.');
  });
});
