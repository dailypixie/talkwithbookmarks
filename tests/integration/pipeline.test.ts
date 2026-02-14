import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SimplePipeline } from '@/background/SimplePipeline';
import { db, getPageByUrl, getSlicesByUrl } from '@/background/db';
import { pipelineEvents } from '@/background/events';
import { PageItem } from '@/utils/types';

// Mock simple html response
const MOCK_HTML = `
<!DOCTYPE html>
<html>
<head><title>Test Page</title></head>
<body>
  <h1>Hello World</h1>
  <p>This is a test paragraph for the integration test.</p>
  <p>It should be chunked into slices.</p>
</body>
</html>
`;

describe('Integration: SimplePipeline', () => {
  let pipeline: SimplePipeline;
  const TEST_URL = 'https://integration-test.com/page1';

  beforeEach(async () => {
    // Clear DB before each test
    await db.delete();
    await db.open();

    // Reset pipeline instance
    pipeline = new SimplePipeline();

    // Setup fetch mock
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(MOCK_HTML),
      })
    );
  });

  afterEach(async () => {
    pipeline.stop();
    // Allow any pending promises to settle
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  it('should download, chunk, and index a page successfully', async () => {
    const items: PageItem[] = [
      {
        id: TEST_URL,
        url: TEST_URL,
        title: 'Test Page',
        content: '', // Initial empty content
        processed: 0,
        timestamp: Date.now(),
      },
    ];

    // Listen for completion
    const completionPromise = new Promise<void>((resolve, reject) => {
      const handler = (event: Event) => {
        const detail = (event as CustomEvent).detail;
        if (detail.type === 'completed') {
          pipelineEvents.removeEventListener('pipeline-event', handler);
          resolve();
        } else if (detail.type === 'error') {
          pipelineEvents.removeEventListener('pipeline-event', handler);
          reject(new Error(detail.error));
        }
      };
      pipelineEvents.addEventListener('pipeline-event', handler);
    });

    // Start pipeline
    await pipeline.start(items);

    // Wait for pipeline to complete
    await completionPromise;

    // Verify DB state
    const page = await getPageByUrl(TEST_URL);
    expect(page).toBeDefined();
    expect(page?.processed).toBe(1);
    expect(page?.indexedAt).toBeGreaterThan(0);

    const slices = await getSlicesByUrl(TEST_URL);
    expect(slices.length).toBeGreaterThan(0);
    expect(slices[0].text).toContain('Hello World');
    expect(slices[0].url).toBe(TEST_URL);
  });
});
