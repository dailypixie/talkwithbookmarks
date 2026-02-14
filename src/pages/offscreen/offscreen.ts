/**
 * Offscreen document for Web-LLM inference (chat, summary)
 */

import {
  CreateMLCEngine,
  type MLCEngineInterface,
  type ChatCompletionMessageParam,
  prebuiltAppConfig,
} from '@mlc-ai/web-llm';

let engine: MLCEngineInterface | null = null;
let currentModel = '';
let isLoading = false;

chrome.runtime.onMessage.addListener((message: { action: string; modelId?: string; messages?: ChatCompletionMessageParam[]; tabId?: number }, _sender, sendResponse) => {
  if ((_sender as chrome.runtime.MessageSender).tab) {
    return false;
  }

  if (message.action === 'offscreen_loadModel') {
    loadModel(message.modelId!).then(sendResponse);
    return true;
  }

  if (message.action === 'offscreen_chat') {
    handleChat(message.messages ?? [], message.tabId).then(sendResponse);
    return true;
  }

  if (message.action === 'offscreen_getStatus') {
    sendResponse({ loaded: !!engine, currentModel, isLoading });
    return true;
  }

  if (message.action === 'ping') {
    sendResponse('pong');
    return true;
  }

  if (message.action === 'offscreen_getModels') {
    const defaultModels = prebuiltAppConfig.model_list.map((m) => m.model_id);
    const customModels = ['Llama-3.2-1B-Instruct-q4f16_1-MLC', 'Qwen3-8B-q4f16_1-MLC'];
    sendResponse(Array.from(new Set([...customModels, ...defaultModels])));
    return true;
  }

  if (message.action === 'offscreen_stop') {
    if (engine) engine.interruptGenerate();
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'offscreen_unload') {
    (async () => {
      if (engine) {
        await engine.unload();
        engine = null;
        currentModel = '';
        chrome.runtime.sendMessage({ action: 'modelUnloaded' });
      }
      sendResponse({ success: true });
    })();
    return true;
  }

  if (message.action === 'offscreen_getCachedModels') {
    getCachedModels().then(sendResponse);
    return true;
  }

  return false;
});

async function loadModel(modelId: string): Promise<{ success: boolean; error?: string }> {
  if (isLoading) return { success: false, error: 'Already loading a model' };

  try {
    isLoading = true;
    chrome.runtime.sendMessage({ action: 'modelProgress', progress: 0, text: 'Initializing...' });

    if (engine && currentModel !== modelId) {
      await engine.unload();
    }

    engine = await CreateMLCEngine(modelId, {
      initProgressCallback: (report) => {
        chrome.runtime.sendMessage({ action: 'modelProgress', progress: report.progress, text: report.text });
      },
    });

    currentModel = modelId;
    isLoading = false;
    chrome.runtime.sendMessage({ action: 'modelLoaded', modelId, success: true });
    return { success: true };
  } catch (error: unknown) {
    isLoading = false;
    const errorMessage = error instanceof Error ? error.message : String(error);
    chrome.runtime.sendMessage({ action: 'modelProgress', progress: 0, text: 'Error: ' + errorMessage });
    return { success: false, error: errorMessage };
  }
}

async function handleChat(
  messages: ChatCompletionMessageParam[],
  tabId?: number
): Promise<{ response: string; error?: string }> {
  if (!engine) return { response: '', error: 'No model loaded' };

  try {
    const completion = await engine.chat.completions.create({ stream: true, messages });
    let fullResponse = '';
    for await (const chunk of completion) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      fullResponse += delta;
      chrome.runtime.sendMessage({ action: 'chatStream', delta, tabId });
    }
    return { response: fullResponse };
  } catch (error) {
    return { response: '', error: String(error) };
  }
}

async function getCachedModels(): Promise<{ cachedModels: string[]; error?: string }> {
  try {
    const cacheNames = await caches.keys();
    const allModelIds = prebuiltAppConfig.model_list.map((m) => m.model_id);
    const cachedModels: string[] = [];
    for (const modelId of allModelIds) {
      for (const cacheName of cacheNames) {
        try {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();
          const hasModel = keys.some(
            (req) => req.url.includes(modelId) || req.url.includes(modelId.replace(/-/g, '_'))
          );
          if (hasModel && !cachedModels.includes(modelId)) {
            cachedModels.push(modelId);
          }
        } catch {
          // ignore
        }
      }
    }
    return { cachedModels };
  } catch (error) {
    return { cachedModels: [], error: String(error) };
  }
}
