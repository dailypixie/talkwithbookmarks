/**
 * Utility exports
 */

export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), ms))]);
}

export function isThinking(text: string): boolean {
  return (text.trim().startsWith('<') && text.length < 7) || (text.startsWith('<think>') && !text.includes('</think>'));
}

export function cleanContent(content: string): string {
  let c = content;
  const thinkBlockRegex = /<think>[\s\S]*?<\/think>/g;
  c = c.replace(thinkBlockRegex, '');
  const incompleteThinkRegex = /^<think>[\s\S]*$/;
  c = c.replace(incompleteThinkRegex, '');
  c = c.replace(/^Context information is below\.[\s\S]*?---\n\nInstruction:\s*/, '');
  c = c.replace(/^Use the following context when answering\. Be concise\.[\s\S]*?---\n\nQuestion:\s*/, '');
  c = c.replace(/\n\nFocus primarily on the Current Page Content\.$/, '');
  c = c.replace(/\n\nAnswer:$/, '');
  return c.trim();
}

export * from './html';
export * from './logger';
export * from './constants';
export * from './types';
