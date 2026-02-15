// Domains to exclude from indexing
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { bookmarksLogger as logger } from '@/utils/logger';

/**
 * Merge class names with tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Get the URL of the current selected tab (works from popup/side panel). */
export const getPageUrl = async (): Promise<string> => {
  let url = window.location.href;
  if (!url || url.includes('chrome-extension')) {
    const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });
    url = tab?.url ?? '';
  }
  return url;
};

const EXCLUDED_DOMAINS = [
  // Social media
  'facebook.com',
  'snapchat.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'linkedin.com',
  // Search & portals
  'google.com',
  'bing.com',
  'imgur.com',
  'yahoo.com',
  'duckduckgo.com',
  // Video/streaming
  'youtube.com',
  'netflix.com',
  'twitch.tv',
  'spotify.com',
  '9gag.com',
  // Shopping
  'amazon.com',
  'ebay.com',
  'aliexpress.com',
  // Auth/login pages
  'accounts.google.com',
  'login.',
  'auth.',
  'signin.',
  // Browser internal
  'chrome://',
  'chrome-extension://',
  'about:',
  'edge://',
  'moz-extension://',
  // Local/Internal
  'localhost',
  '127.0.0.1',
  '::1',
];

// File extensions to exclude (not HTML pages)
const EXCLUDED_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.ico',
  '.bmp',
  '.mp4',
  '.webm',
  '.avi',
  '.mov',
  '.mp3',
  '.wav',
  '.ogg',
  '.zip',
  '.rar',
  '.7z',
  '.tar',
  '.gz',
  '.exe',
  '.dmg',
  '.apk',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
];

export function isExcluded(url: string): boolean {
  const lowerUrl = url.toLowerCase();

  // Check excluded domains
  if (EXCLUDED_DOMAINS.some((domain) => lowerUrl.includes(domain))) {
    return true;
  }

  // Check excluded file extensions
  const urlPath = lowerUrl.split('?')[0]; // Remove query params
  if (EXCLUDED_EXTENSIONS.some((ext) => urlPath.endsWith(ext))) {
    return true;
  }

  return false;
}

export function extractTextFromHTML(html: string): string {
  try {
    // Remove script and style tags with their content
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');

    // Remove all HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode common HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');

    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  } catch (error) {
    logger.warn('Failed to extract text', error as Error);
    return '';
  }
}

/**
 * Semantic chunking with overlap
 * Splits text into chunks respecting sentence boundaries where possible
 */
export function splitTextSemantic(text: string, maxChunkSize = 1000, overlap = 100): { text: string; position: number }[] {
  if (text.length <= maxChunkSize) return [{ text, position: 0 }];

  const chunks: { text: string; position: number }[] = [];
  let startIndex = 0;
  let position = 0;

  // Safety: prevent infinite loops
  const maxIterations = Math.ceil(text.length / (maxChunkSize - overlap)) + 10;
  let iterations = 0;

  while (startIndex < text.length && iterations < maxIterations) {
    iterations++;
    let endIndex = startIndex + maxChunkSize;

    if (endIndex >= text.length) {
      endIndex = text.length;
      chunks.push({ text: text.slice(startIndex, endIndex).trim(), position });
      break;
    }

    // Look for sentence boundary near the cut point
    const lookbackWindow = 200;
    const textWindow = text.slice(Math.max(startIndex, endIndex - lookbackWindow), endIndex);

    const sentenceBreak = textWindow.search(/[.!?]\s+[A-Z]/);

    if (sentenceBreak !== -1) {
      // +2 to include the punctuation and space
      const adjustedEnd = Math.max(startIndex, endIndex - lookbackWindow) + sentenceBreak + 2;
      endIndex = adjustedEnd;
    } else {
      const spaceBreak = textWindow.lastIndexOf(' ');
      if (spaceBreak !== -1) {
        endIndex = Math.max(startIndex, endIndex - lookbackWindow) + spaceBreak;
      }
    }

    chunks.push({ text: text.slice(startIndex, endIndex).trim(), position });
    position++;

    // Calculate next start with overlap, but find sentence boundary
    let nextStartIndex = Math.max(startIndex + 1, endIndex - overlap);

    // Look forward from overlap point to find the start of a sentence
    // (after . ! ? followed by whitespace)
    if (nextStartIndex < text.length) {
      const overlapWindow = text.slice(nextStartIndex, Math.min(text.length, nextStartIndex + overlap));
      const sentenceStart = overlapWindow.search(/[.!?]\s+/);
      if (sentenceStart !== -1) {
        // Move to after the punctuation and space
        nextStartIndex = nextStartIndex + sentenceStart + 2;
      }
    }

    // Ensure forward progress
    if (nextStartIndex <= startIndex) {
      nextStartIndex = startIndex + Math.max(1, maxChunkSize - overlap);
    }

    startIndex = nextStartIndex;
  }

  if (iterations >= maxIterations) {
    logger.warn('Text chunking hit iteration limit', { textLength: text.length });
  }

  return chunks;
}

// Deprecated: use splitTextSemantic
export function splitText(text: string, chunkSize = 1000): string[] {
  return splitTextSemantic(text, chunkSize, 0).map((c) => c.text);
}

export async function fetchPageContents(): Promise<string> {
  return new Promise((resolve) => {
    try {
      // Current selected tab in the window that opened the popup
      chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
        if (!tabs[0]?.id) {
          resolve('');
          return;
        }
        try {
          const port = chrome.tabs.connect(tabs[0].id, { name: 'channelName' });
          const timeout = setTimeout(() => resolve(''), 2000);
          port.onMessage.addListener((msg: { contents?: string }) => {
            clearTimeout(timeout);
            resolve(msg.contents ?? '');
          });
          port.onDisconnect.addListener(() => {
            clearTimeout(timeout);
            resolve('');
          });
          port.postMessage({});
        } catch {
          resolve('');
        }
      });
    } catch {
      resolve('');
    }
  });
}
