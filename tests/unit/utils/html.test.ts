/**
 * Unit tests for src/utils/html.ts
 */

import {
  cn,
  isExcluded,
  extractTextFromHTML,
  splitTextSemantic,
  splitText,
} from '@/utils/html';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('deduplicates conflicting Tailwind classes (tailwind-merge)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('handles empty inputs', () => {
    expect(cn()).toBe('');
  });
});

describe('isExcluded', () => {
  it('excludes social media domains', () => {
    expect(isExcluded('https://facebook.com/page')).toBe(true);
    expect(isExcluded('https://www.instagram.com/user')).toBe(true);
    expect(isExcluded('https://twitter.com/x')).toBe(true);
  });

  it('excludes search and portals', () => {
    expect(isExcluded('https://www.google.com/search?q=test')).toBe(true);
    expect(isExcluded('https://duckduckgo.com/?q=test')).toBe(true);
  });

  it('excludes video/streaming sites', () => {
    expect(isExcluded('https://youtube.com/watch?v=abc')).toBe(true);
    expect(isExcluded('https://www.netflix.com')).toBe(true);
  });

  it('excludes browser internal URLs', () => {
    expect(isExcluded('chrome://settings')).toBe(true);
    expect(isExcluded('chrome-extension://abc123')).toBe(true);
  });

  it('excludes localhost and loopback', () => {
    expect(isExcluded('http://localhost:3000')).toBe(true);
    expect(isExcluded('http://127.0.0.1')).toBe(true);
  });

  it('excludes auth/login pages', () => {
    expect(isExcluded('https://accounts.google.com/signin')).toBe(true);
  });

  it('excludes file extensions (PDF, images, etc.)', () => {
    expect(isExcluded('https://example.com/file.pdf')).toBe(true);
    expect(isExcluded('https://example.com/image.png')).toBe(true);
    expect(isExcluded('https://example.com/video.mp4')).toBe(true);
  });

  it('excludes file extensions with query params', () => {
    expect(isExcluded('https://example.com/doc.pdf?token=abc')).toBe(true);
  });

  it('allows regular URLs', () => {
    expect(isExcluded('https://example.com/article')).toBe(false);
    expect(isExcluded('https://github.com/user/repo')).toBe(false);
    expect(isExcluded('https://docs.example.com/guide')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isExcluded('https://FACEBOOK.com/page')).toBe(true);
    expect(isExcluded('https://Example.com/file.PDF')).toBe(true);
  });
});

describe('extractTextFromHTML', () => {
  it('strips script tags and their content', () => {
    const html = '<p>Hello</p><script>alert(1)</script><p>World</p>';
    expect(extractTextFromHTML(html)).toBe('Hello World');
  });

  it('strips style tags and their content', () => {
    const html = '<p>Hello</p><style>body{color:red}</style><p>World</p>';
    expect(extractTextFromHTML(html)).toBe('Hello World');
  });

  it('removes all HTML tags', () => {
    expect(extractTextFromHTML('<h1>Title</h1><p>Content</p>')).toBe('Title Content');
  });

  it('decodes HTML entities', () => {
    expect(extractTextFromHTML('&amp; &lt; &gt; &quot; &#39;')).toBe('& < > " \'');
  });

  it('normalizes whitespace', () => {
    expect(extractTextFromHTML('  hello   world  \n\n  ')).toBe('hello world');
  });

  it('returns empty string for empty input', () => {
    expect(extractTextFromHTML('')).toBe('');
  });

  it('handles complex HTML', () => {
    const html = `
      <article>
        <h1>Article Title</h1>
        <p>First paragraph with &nbsp; space.</p>
        <script>var x = 1;</script>
        <p>Second paragraph</p>
      </article>
    `;
    const result = extractTextFromHTML(html);
    expect(result).toContain('Article Title');
    expect(result).toContain('First paragraph');
    expect(result).toContain('Second paragraph');
    expect(result).not.toContain('var x');
  });
});

describe('splitTextSemantic', () => {
  it('returns single chunk when text is shorter than maxChunkSize', () => {
    const text = 'Short text';
    const result = splitTextSemantic(text, 100);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ text: 'Short text', position: 0 });
  });

  it('splits long text into multiple chunks', () => {
    const text = 'A'.repeat(2500);
    const result = splitTextSemantic(text, 1000, 0);
    expect(result.length).toBeGreaterThan(1);
  });

  it('respects sentence boundaries when possible', () => {
    const text = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
    const repeated = (text + ' ').repeat(50); // Make it long enough to split
    const result = splitTextSemantic(repeated, 200, 20);
    expect(result.length).toBeGreaterThan(1);
    result.forEach((chunk, i) => {
      expect(chunk.position).toBe(i);
      expect(chunk.text.length).toBeLessThanOrEqual(250); // some allowance
    });
  });

  it('uses default maxChunkSize and overlap', () => {
    const text = 'A'.repeat(1500);
    const result = splitTextSemantic(text);
    expect(result.length).toBeGreaterThan(1);
  });
});

describe('splitText', () => {
  it('returns single chunk for short text', () => {
    const result = splitText('Short');
    expect(result).toEqual(['Short']);
  });

  it('splits long text into string array', () => {
    const text = 'A'.repeat(2500);
    const result = splitText(text, 500);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(1);
    expect(result.every((s) => typeof s === 'string')).toBe(true);
  });

  it('delegates to splitTextSemantic', () => {
    const text = 'One. Two. Three.';
    const semantic = splitTextSemantic(text, 5, 0);
    const legacy = splitText(text, 5);
    expect(legacy).toEqual(semantic.map((c) => c.text));
  });
});
