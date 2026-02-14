/**
 * Background Service Worker
 * Handles bookmark indexing, chat/summary, and message routing
 */

import { bookmarksDataSource } from '@/background/bookmarks';
import { simplePipeline } from '@/background/SimplePipeline';
import { getIndexingStats, clearDatabase, getPageByUrl } from '@/background/db';
import { isExcluded } from '@/utils/html';
import { backgroundLogger as logger } from '@/utils/logger';
import { MessageAction, IndexingStatus, IndexingProgress, PipelineState } from '@/utils/types';
import { initializeOffscreen } from '@/background/offscreen';
import {
  handleGetRecommendedModels,
  handleLoadModel,
  handleUnloadModel,
  handleGetModelStatus,
  handleGetModels,
  handleGetCachedModels,
  handleStop,
} from '@/background/handlers/model';
import { handleChat, handleGetHistory, handleGetConversations } from '@/background/handlers/chat';
import { handleSearchContext } from '@/background/handlers/searchContext';
import { handleGetPageSummary, handleGenerateSummary } from '@/background/handlers/summary';

logger.info('Background service worker started');

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));

initializeOffscreen();

// Initialize database
try {
  logger.info('Database initialized');
} catch (error) {
  logger.error('Failed to initialize database', error as Error);
}

// Forward/bubble stream and model events (handled directly by extension UIs)
const FORWARD_ACTIONS = ['chatStream', 'modelProgress', 'modelLoaded', 'modelUnloaded'];

/**
 * Handle messages from popup and content scripts
 */
chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  (async () => {
    try {
      if (FORWARD_ACTIONS.includes(message.action)) {
        // We no longer use a content script; offscreen and popup/side panel
        // both listen to `chrome.runtime.onMessage` directly. Just acknowledge
        // the message so the sender's `sendMessage` resolves, and let the
        // normal runtime broadcast deliver it to any open extension UI.
        sendResponse({ forwarded: true });
        return;
      }
      // Model & chat actions
      if (message.action === 'getRecommendedModels') {
        sendResponse(handleGetRecommendedModels());
        return;
      }
      if (message.action === 'loadModel') {
        sendResponse(await handleLoadModel(message.modelId));
        return;
      }
      if (message.action === 'unloadModel') {
        sendResponse(await handleUnloadModel());
        return;
      }
      if (message.action === 'getModelStatus') {
        sendResponse(await handleGetModelStatus());
        return;
      }
      if (message.action === 'getModels') {
        sendResponse(await handleGetModels());
        return;
      }
      if (message.action === 'getCachedModels') {
        sendResponse(await handleGetCachedModels());
        return;
      }
      if (message.action === 'stop') {
        sendResponse(await handleStop());
        return;
      }
      if (message.action === 'chat') {
        sendResponse(await handleChat(message, sender));
        return;
      }
      if (message.action === 'getHistory') {
        sendResponse(await handleGetHistory(message.url));
        return;
      }
      if (message.action === 'searchContext') {
        sendResponse(await handleSearchContext(message));
        return;
      }
      if (message.action === 'getPageSummary') {
        sendResponse(await handleGetPageSummary(message.url));
        return;
      }
      if (message.action === 'generateSummary') {
        sendResponse(await handleGenerateSummary(message.url, message.content, message.title));
        return;
      }

      if (message.action === MessageAction.GET_CONVERSATION_LIST) {
        sendResponse(await handleGetConversations(message.limit, message.offset));
        return;
      }

      switch (message.action) {
        case MessageAction.START_INDEXING: {
          logger.info('Starting bookmark indexing...');
          const items = await bookmarksDataSource.fetchItems();
          sendResponse({ success: true, itemsQueued: items.length });
          // Run pipeline without awaiting so the popup gets a response immediately
          // and can show progress via GET_INDEXING_PROGRESS polling
          void simplePipeline.start(items);
          break;
        }

        case MessageAction.INDEX_MANUAL_URLS: {
          const urls: string[] = message.urls ?? [];
          const trimmed = urls
            .filter((u: unknown) => typeof u === 'string' && u.trim().length > 0)
            .map((u: string) => u.trim())
            .filter((u) => !isExcluded(u));
          const toQueue: Array<{ id: string; url: string; title: string; content: string; timestamp: number; processed: number }> = [];
          for (const url of trimmed) {
            const existing = await getPageByUrl(url);
            if (existing) continue; // already in db (indexed or queued)
            toQueue.push({
              id: crypto.randomUUID(),
              url,
              title: url,
              content: '',
              timestamp: Date.now(),
              processed: 0,
            });
          }
          const status = simplePipeline.getStatus();
          if (status.isRunning) {
            sendResponse({ success: false, count: 0, message: 'Indexing already in progress' });
            break;
          }
          if (toQueue.length === 0) {
            sendResponse({ success: true, count: 0, message: trimmed.length === 0 ? 'No valid URLs' : 'All URLs already indexed or queued' });
            break;
          }
          logger.info(`Queueing ${toQueue.length} manual URLs for indexing`);
          sendResponse({ success: true, count: toQueue.length });
          void simplePipeline.start(toQueue);
          break;
        }

        case MessageAction.PAUSE_INDEXING: {
          logger.info('Pausing indexing...');
          simplePipeline.pause();
          sendResponse({ success: true });
          break;
        }

        case MessageAction.RESUME_INDEXING: {
          logger.info('Resuming indexing...');
          simplePipeline.resume();
          sendResponse({ success: true });
          break;
        }

        case MessageAction.GET_INDEXING_PROGRESS: {
          const status: PipelineState = simplePipeline.getStatus();
          const stats = await getIndexingStats();
          const attempted = stats.processed + stats.failed;
          const allAttempted = stats.total > 0 && attempted >= stats.total;

          const progress: IndexingProgress = {
            total: stats.total,
            processed: stats.processed,
            failed: stats.failed,
            status: status.isRunning
              ? status.isPaused
                ? IndexingStatus.PAUSED
                : IndexingStatus.INDEXING
              : allAttempted
                ? IndexingStatus.DONE
                : IndexingStatus.IDLE,
          };

          sendResponse(progress);
          break;
        }

        case MessageAction.CLEAR_DATA: {
          logger.info('Clearing database...');
          await clearDatabase();
          sendResponse({ success: true });
          break;
        }

        case MessageAction.GET_DEBUG_DATA: {
          const stats = await getIndexingStats();
          const status = simplePipeline.getStatus();

          sendResponse({
            stats,
            status,
          });
          break;
        }

        case MessageAction.PING: {
          sendResponse({ pong: true });
          break;
        }

        default:
          logger.warn(`Unknown message action: ${message.action}`);
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      logger.error('Error handling message', error as Error);
      sendResponse({ error: (error as Error).message });
    }
  })();

  return true; // Indicate async response
});

/**
 * Handle extension installation/update
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    logger.info('Extension installed');
    // Open popup or setup page if needed
  } else if (details.reason === 'update') {
    logger.info('Extension updated');
  }
});
