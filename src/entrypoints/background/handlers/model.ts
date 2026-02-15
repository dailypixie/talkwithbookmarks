import { RECOMMENDED_MODELS } from '@/utils/constants';
import { sendMessageToOffscreenWithRetry } from '@/entrypoints/background/offscreen';
import { backgroundLogger as logger } from '@/utils/logger';

export function handleGetRecommendedModels(): { recommended: typeof RECOMMENDED_MODELS } {
  return { recommended: RECOMMENDED_MODELS };
}

export async function handleLoadModel(modelId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    await chrome.storage.local.set({ selectedModel: modelId });
    const response = (await sendMessageToOffscreenWithRetry({
      action: 'offscreen_loadModel',
      modelId,
    })) as { success?: boolean; error?: string };
    return response ?? { error: 'No response' };
  } catch (e) {
    return { error: String(e) };
  }
}

export async function handleUnloadModel(): Promise<{ success?: boolean; error?: string }> {
  try {
    await chrome.storage.local.remove('selectedModel');
    const response = (await sendMessageToOffscreenWithRetry({ action: 'offscreen_unload' })) as { success?: boolean; error?: string };
    return response ?? { success: true };
  } catch (e) {
    return { error: String(e) };
  }
}

export async function handleGetModelStatus(): Promise<{ loaded?: boolean; currentModel?: string; isLoading?: boolean; error?: string }> {
  try {
    const response = (await sendMessageToOffscreenWithRetry({ action: 'offscreen_getStatus' })) as {
      loaded?: boolean;
      currentModel?: string;
      isLoading?: boolean;
    };
    return response ?? { loaded: false };
  } catch (e) {
    logger.error('Model status error', e as Error);
    return { loaded: false, error: String(e) };
  }
}

export async function handleGetModels(): Promise<string[] | { error: string }> {
  try {
    const response = await sendMessageToOffscreenWithRetry({ action: 'offscreen_getModels' });
    return (response as string[]) ?? [];
  } catch (e) {
    return { error: String(e) };
  }
}

export async function handleGetCachedModels(): Promise<{ cachedModels: string[]; error?: string }> {
  try {
    const response = (await sendMessageToOffscreenWithRetry({ action: 'offscreen_getCachedModels' })) as { cachedModels?: string[] };
    return { cachedModels: response?.cachedModels ?? [] };
  } catch (e) {
    return { cachedModels: [], error: String(e) };
  }
}

export async function handleStop(): Promise<{ success?: boolean; error?: string }> {
  try {
    await sendMessageToOffscreenWithRetry({ action: 'offscreen_stop' });
    return { success: true };
  } catch (e) {
    return { error: String(e) };
  }
}
