import * as DbModule from '@/background/db';
import { sendMessageToOffscreenWithRetry } from '@/background/offscreen';
import { backgroundLogger as logger } from '@/utils/logger';
import { Roles } from '@/utils/types';
import type { Message, Source } from '@/utils/types';

export async function handleChat(
  message: {
    messages?: Partial<Message>[];
    url?: string;
    originalContent?: string;
    context?: string;
    sources?: Source[];
  },
  sender: chrome.runtime.MessageSender
): Promise<{ response?: string; error?: string; conversationId?: number }> {
  if (!message?.messages?.length) {
    throw new Error('No messages provided');
  }
  const lastMsg = message.messages[message.messages.length - 1];
  if (!lastMsg?.content?.trim()) {
    throw new Error('Invalid message content');
  }

  try {
    let conversationId: number | undefined;

    if (message.url) {
      try {
        new URL(message.url);
        const existing = await DbModule.getConversationForUrl(message.url);
        if (existing?.id) conversationId = existing.id;
      } catch {
        // continue without URL lookup
      }
    }

    if (!conversationId) {
      const title = message.url ? new URL(message.url).hostname : 'New Chat';
      conversationId = await DbModule.createConversation(title, message.url);
    }

    await chrome.storage.local.set({ activeConversationId: conversationId });

    const contentToSave = message.originalContent ?? lastMsg.content;
    await DbModule.addMessage(conversationId, 'user', contentToSave, message.context);

    let response: { response?: string; error?: string } = {};
    try {
      response = (await sendMessageToOffscreenWithRetry({
        action: 'offscreen_chat',
        messages: message.messages,
        tabId: sender.tab?.id,
      })) as { response?: string; error?: string };
    } catch (e) {
      response = { error: String(e) };
    }

    const assistantContent = response.response?.trim() ? response.response : response.error ? `Error: ${response.error}` : '';
    if (assistantContent) {
      await DbModule.addMessage(conversationId, 'assistant', assistantContent, undefined, message.sources);
    }

    return { ...response, conversationId };
  } catch (e) {
    logger.error('Chat error', e as Error);
    return { error: String(e) };
  }
}

export async function handleGetHistory(
  url: string | undefined
): Promise<{ messages: { role: string; content: string; sources?: Source[] }[]; error?: string }> {
  try {
    let conversationId: number | undefined;
    const isExtensionUrl = !url || url.includes('chrome-extension:');

    if (url && !isExtensionUrl) {
      const existing = await DbModule.getConversationForUrl(url);
      if (existing?.id) conversationId = existing.id;
    }

    if (!conversationId && isExtensionUrl) {
      const stored = await chrome.storage.local.get('activeConversationId');
      if (typeof stored.activeConversationId === 'number') {
        conversationId = stored.activeConversationId;
      }
    }

    if (conversationId) {
      const messages = await DbModule.getConversationMessages(conversationId);
      await chrome.storage.local.set({ activeConversationId: conversationId });
      return {
        messages: messages.map((m) => ({
          role: m.role === Roles.USER ? 'user' : 'assistant',
          content: m.content,
          sources: m.sources,
        })),
      };
    }
    if (!url || !isExtensionUrl) {
      await chrome.storage.local.remove('activeConversationId');
    }
    return { messages: [] };
  } catch (e) {
    logger.error('GetHistory error', e as Error);
    return { messages: [], error: (e as Error).message };
  }
}
