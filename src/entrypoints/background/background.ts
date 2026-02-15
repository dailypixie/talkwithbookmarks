/**
 * Background Service Worker
 * Handles bookmark indexing, chat/summary, and message routing
 */

import { bookmarksDataSource } from '@/entrypoints/background/bookmarks';
import { indexingPipeline } from '@/entrypoints/background/IndexingPipeline';
import { getIndexingStats, clearDatabase, getPageByUrl, clearIndexedData } from '@/entrypoints/background/db';
import { isExcluded } from '@/utils/html';
import { backgroundLogger as logger } from '@/utils/logger';
import { MessageAction, IndexingStatus, IndexingProgress, PipelineState } from '@/utils/types';
import { initializeOffscreen } from '@/entrypoints/background/offscreen';
import {
  handleGetRecommendedModels,
  handleLoadModel,
  handleUnloadModel,
  handleGetModelStatus,
  handleGetModels,
  handleGetCachedModels,
  handleStop,
} from '@/entrypoints/background/handlers/model';
import { handleChat, handleGetHistory, handleGetConversations } from '@/entrypoints/background/handlers/chat';
import { handleSearchContext } from '@/entrypoints/background/search/searchContext';
import { handleGetPageSummary, handleGenerateSummary } from '@/entrypoints/background/handlers/summary';
import { handleSearchVectorContext } from '@/entrypoints/background/search/vector';

logger.info('Background service worker started');

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));

initializeOffscreen();

// Initialize database
try {
  logger.info('Database initialized');
} catch (error) {
  logger.warn('Failed to initialize database', error as Error);
}

// Forward/bubble stream and model events (handled directly by extension UIs)
const FORWARD_ACTIONS = [MessageAction.CHAT_STREAM, MessageAction.MODEL_PROGRESS, MessageAction.MODEL_LOADED, MessageAction.MODEL_UNLOADED];

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
      if (message.action === MessageAction.GET_RECOMMENDED_MODELS) {
        sendResponse(handleGetRecommendedModels());
        return;
      }
      if (message.action === MessageAction.LOAD_MODEL) {
        sendResponse(await handleLoadModel(message.modelId));
        return;
      }
      if (message.action === MessageAction.UNLOAD_MODEL) {
        sendResponse(await handleUnloadModel());
        return;
      }
      if (message.action === MessageAction.GET_MODEL_STATUS) {
        sendResponse(await handleGetModelStatus());
        return;
      }
      if (message.action === MessageAction.GET_MODELS) {
        sendResponse(await handleGetModels());
        return;
      }
      if (message.action === MessageAction.GET_CACHED_MODELS) {
        sendResponse(await handleGetCachedModels());
        return;
      }
      if (message.action === MessageAction.STOP) {
        sendResponse(await handleStop());
        return;
      }
      if (message.action === MessageAction.CHAT) {
        sendResponse(await handleChat(message, sender));
        return;
      }
      if (message.action === MessageAction.GET_HISTORY) {
        sendResponse(await handleGetHistory(message.url, message.conversationId));
        return;
      }
      if (message.action === MessageAction.SEARCH_CONTEXT) {
        sendResponse(await handleSearchContext(message));
        return;
      }
      if (message.action === MessageAction.SEARCH_VECTOR_CONTEXT) {
        sendResponse(await handleSearchVectorContext(message));
        return;
      }
      if (message.action === MessageAction.GET_PAGE_SUMMARY) {
        sendResponse(await handleGetPageSummary(message.url));
        return;
      }
      if (message.action === MessageAction.GENERATE_SUMMARY) {
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
          indexingPipeline.start(items);
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
          const status = indexingPipeline.getStatus();
          if (status.isRunning) {
            sendResponse({ success: false, count: 0, message: 'Indexing already in progress' });
            break;
          }
          if (toQueue.length === 0) {
            sendResponse({
              success: true,
              count: 0,
              message: trimmed.length === 0 ? 'No valid URLs' : 'All URLs already indexed or queued',
            });
            break;
          }
          logger.info(`Queueing ${toQueue.length} manual URLs for indexing`);
          sendResponse({ success: true, count: toQueue.length });
          indexingPipeline.start(toQueue);
          break;
        }

        case MessageAction.PAUSE_INDEXING: {
          logger.info('Pausing indexing...');
          indexingPipeline.pause();
          sendResponse({ success: true });
          break;
        }

        case MessageAction.RESUME_INDEXING: {
          logger.info('Resuming indexing...');
          indexingPipeline.resume();
          sendResponse({ success: true });
          break;
        }

        case MessageAction.GET_INDEXING_PROGRESS: {
          const status: PipelineState = indexingPipeline.getStatus();
          const stats = await getIndexingStats();

          // When pipeline is running, use stage-specific metrics so progress resets per stage
          // When idle/done, use cumulative database stats
          const useStageMetrics = status.isRunning;
          const processed = useStageMetrics ? status.metrics.itemsIndexed : stats.processed;
          const failed = useStageMetrics ? status.metrics.itemsFailed : stats.failed;
          const attempted = stats.processed + stats.failed;
          const allAttempted = stats.total > 0 && attempted >= stats.total;
          const currentStage = status.currentStage || status.metrics.stage;

          const progress: IndexingProgress = {
            total: stats.total,
            processed: processed,
            failed: failed,
            status: status.isRunning
              ? status.isPaused
                ? IndexingStatus.PAUSED
                : IndexingStatus.INDEXING
              : allAttempted
                ? IndexingStatus.DONE
                : IndexingStatus.IDLE,
            stage: currentStage,
            currentStageNumber: indexingPipeline.getStageNumber(currentStage),
            totalStages: indexingPipeline.getTotalStages(),
          };

          sendResponse(progress);
          break;
        }

        case MessageAction.CLEAR_DATA: {
          logger.info('Clearing database...');
          indexingPipeline.stop();
          await clearDatabase();
          sendResponse({ success: true });
          break;
        }

        case MessageAction.CLEAR_INDEXED_DATA: {
          logger.info('Clearing indexed data...');
          indexingPipeline.stop();
          await clearIndexedData();
          sendResponse({ success: true });
          break;
        }

        case MessageAction.GET_DEBUG_DATA: {
          const stats = await getIndexingStats();
          const status = indexingPipeline.getStatus();

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
      logger.warn('Error handling message', error as Error);
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
