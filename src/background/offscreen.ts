import { backgroundLogger as logger } from '@/utils/logger';

let offscreenCreated = false;

export async function sendMessageToOffscreenWithRetry(message: Record<string, unknown>, maxRetries = 3, interval = 500): Promise<unknown> {
  await ensureOffscreen();

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await chrome.runtime.sendMessage(message);
    } catch (e: any) {
      logger.debug(`Offscreen message failed (attempt ${i + 1}/${maxRetries}):`, e);
      if (i === maxRetries - 1) throw e;
      await new Promise((r) => setTimeout(r, interval));
    }
  }
  throw new Error('Offscreen send failed');
}

export async function ensureOffscreen(): Promise<void> {
  if (offscreenCreated) return;

  try {
    const existingContexts = await (
      chrome.runtime as unknown as { getContexts: (o: { contextTypes: string[] }) => Promise<{ length: number }[]> }
    ).getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
    });

    if (existingContexts.length > 0) {
      offscreenCreated = true;
      return;
    }

    const chromeOffscreen = (
      chrome as unknown as {
        offscreen: { createDocument: (opts: { url: string; reasons: string[]; justification: string }) => Promise<void> };
      }
    ).offscreen;
    await chromeOffscreen.createDocument({
      url: 'pages/offscreen/offscreen.html',
      reasons: ['WORKERS'],
      justification: 'Run Web-LLM for AI inference',
    });
    logger.info('Created offscreen document');
    offscreenCreated = true;
    await waitForOffscreen();

    chrome.storage.local.get('selectedModel', (result: { selectedModel?: string }) => {
      if (result.selectedModel) {
        sendMessageToOffscreenWithRetry({ action: 'offscreen_loadModel', modelId: result.selectedModel }).catch((e) =>
          logger.error('Auto-load failed', e as Error)
        );
      }
    });
  } catch (e: unknown) {
    const err = e as { message?: string };
    if (err.message?.includes('single offscreen')) {
      offscreenCreated = true;
      await waitForOffscreen();
    } else {
      logger.error('Failed to create offscreen', e as Error);
    }
  }
}

async function waitForOffscreen(maxAttempts = 10): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'ping' });
      if (response === 'pong') return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  logger.warn('Offscreen did not respond to ping');
}

export function initializeOffscreen(): void {
  void ensureOffscreen();
}
