import * as DbModule from '@/entrypoints/background/db';
import { sendMessageToOffscreenWithRetry } from '@/entrypoints/background/offscreen';
import { backgroundLogger as logger } from '@/utils/logger';
import { MessageAction, Roles } from '@/utils/types';
import type { Message, Source, Conversation } from '@/utils/types';

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
        action: MessageAction.OFFSCREEN_CHAT,
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
  url: string | undefined,
  conversationId?: number
): Promise<{ messages: { role: string; content: string; sources?: Source[] }[]; error?: string }> {
  try {
    let actualConversationId: number | undefined;
    const isExtensionUrl = !url || url.includes('chrome-extension:');

    if (conversationId) {
      actualConversationId = conversationId;
    } else if (url && !isExtensionUrl) {
      const existing = await DbModule.getConversationForUrl(url);
      if (existing?.id) actualConversationId = existing.id;
    } else if (!actualConversationId && isExtensionUrl) {
      const stored = await chrome.storage.local.get('activeConversationId');
      if (typeof stored.activeConversationId === 'number') {
        actualConversationId = stored.activeConversationId;
      }
    }

    if (actualConversationId) {
      const messages = await DbModule.getConversationMessages(actualConversationId);
      await chrome.storage.local.set({ activeConversationId: actualConversationId });
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

export async function handleGetConversations(limit = 20, offset = 0): Promise<{ conversations: Conversation[]; error?: string }> {
  try {
    const convers = await DbModule.getConversations(limit, offset);
    return { conversations: convers };
  } catch (e) {
    logger.error('GetConversations error', e as Error);
    return { conversations: [], error: (e as Error).message };
  }
}
