/**
 * Unit tests for src/background/handlers/chat.ts
 */

import { handleChat, handleGetHistory } from '@/background/handlers/chat';
import { Roles } from '@/utils/types';

jest.mock('@/background/db', () => ({
  getConversationForUrl: jest.fn(),
  createConversation: jest.fn(),
  addMessage: jest.fn(),
  getConversationMessages: jest.fn(),
}));

jest.mock('@/background/offscreen', () => ({
  sendMessageToOffscreenWithRetry: jest.fn(),
}));

import * as DbModule from '@/background/db';
import { sendMessageToOffscreenWithRetry } from '@/background/offscreen';

const mockGetConversationForUrl = DbModule.getConversationForUrl as jest.MockedFunction<
  typeof DbModule.getConversationForUrl
>;
const mockCreateConversation = DbModule.createConversation as jest.MockedFunction<
  typeof DbModule.createConversation
>;
const mockAddMessage = DbModule.addMessage as jest.MockedFunction<typeof DbModule.addMessage>;
const mockGetConversationMessages = DbModule.getConversationMessages as jest.MockedFunction<
  typeof DbModule.getConversationMessages
>;
const mockSendToOffscreen = sendMessageToOffscreenWithRetry as jest.MockedFunction<
  typeof sendMessageToOffscreenWithRetry
>;

describe('handleChat', () => {
  const defaultSender = { id: 'ext', tab: { id: 1 } } as chrome.runtime.MessageSender;

  beforeEach(() => {
    jest.clearAllMocks();
    (global.chrome as any).storage.local.set.mockResolvedValue(undefined);
    mockGetConversationForUrl.mockResolvedValue(undefined);
    mockCreateConversation.mockResolvedValue(1);
    mockAddMessage.mockResolvedValue(1);
    mockSendToOffscreen.mockResolvedValue({ response: 'AI reply' });
  });

  it('throws when no messages provided', async () => {
    await expect(handleChat({ messages: [] }, defaultSender)).rejects.toThrow('No messages provided');
    await expect(handleChat({} as any, defaultSender)).rejects.toThrow('No messages provided');
  });

  it('throws when last message content is empty', async () => {
    await expect(
      handleChat(
        { messages: [{ role: Roles.USER, content: '   ' }] } as any,
        defaultSender
      )
    ).rejects.toThrow('Invalid message content');
  });

  it('creates new conversation when none exists', async () => {
    mockGetConversationForUrl.mockResolvedValue(undefined);
    mockCreateConversation.mockResolvedValue(42);

    const result = await handleChat(
      {
        messages: [{ role: Roles.USER, content: 'Hello' }],
        url: 'https://example.com',
      },
      defaultSender
    );

    expect(mockCreateConversation).toHaveBeenCalledWith('example.com', 'https://example.com');
    expect(mockAddMessage).toHaveBeenCalledWith(42, 'user', 'Hello', undefined);
    expect(result.conversationId).toBe(42);
  });

  it('reuses existing conversation when url matches', async () => {
    mockGetConversationForUrl.mockResolvedValue({ id: 10, title: 'x', updatedAt: 1 } as any);

    const result = await handleChat(
      { messages: [{ role: Roles.USER, content: 'Hi' }], url: 'https://example.com' },
      defaultSender
    );

    expect(mockGetConversationForUrl).toHaveBeenCalledWith('https://example.com');
    expect(mockCreateConversation).not.toHaveBeenCalled();
    expect(mockAddMessage).toHaveBeenCalledWith(10, 'user', 'Hi', undefined);
    expect(result.conversationId).toBe(10);
  });

  it('saves originalContent when provided', async () => {
    await handleChat(
      {
        messages: [{ role: Roles.USER, content: 'Short' }],
        originalContent: 'Expanded content for context',
      },
      defaultSender
    );

    expect(mockAddMessage).toHaveBeenNthCalledWith(
      1,
      1,
      'user',
      'Expanded content for context',
      undefined
    );
  });

  it('saves assistant response from offscreen', async () => {
    mockSendToOffscreen.mockResolvedValue({ response: 'Generated answer' });

    const result = await handleChat(
      { messages: [{ role: Roles.USER, content: 'Q' }] },
      defaultSender
    );

    expect(mockAddMessage).toHaveBeenNthCalledWith(2, 1, 'assistant', 'Generated answer', undefined, undefined);
    expect(result.response).toBe('Generated answer');
  });

  it('saves error message when offscreen fails', async () => {
    mockSendToOffscreen.mockRejectedValue(new Error('LLM failed'));

    const result = await handleChat(
      { messages: [{ role: Roles.USER, content: 'Q' }] },
      defaultSender
    );

    expect(mockAddMessage).toHaveBeenNthCalledWith(2, 1, 'assistant', 'Error: Error: LLM failed', undefined, undefined);
    expect(result.error).toBe('Error: LLM failed');
  });

  it('passes tabId to offscreen chat', async () => {
    await handleChat(
      { messages: [{ role: Roles.USER, content: 'Q' }] },
      { id: 'ext', tab: { id: 99 } } as chrome.runtime.MessageSender
    );

    expect(mockSendToOffscreen).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'offscreen_chat',
        messages: [{ role: Roles.USER, content: 'Q' }],
        tabId: 99,
      })
    );
  });
});

describe('handleGetHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.chrome as any).storage.local.get.mockImplementation((keys: string, cb?: (r: any) => void) => {
      if (cb) cb({});
      return Promise.resolve({});
    });
    (global.chrome as any).storage.local.set.mockResolvedValue(undefined);
    (global.chrome as any).storage.local.remove.mockResolvedValue(undefined);
  });

  it('returns empty when no url and extension url (uses activeConversationId)', async () => {
    (global.chrome as any).storage.local.get.mockImplementation((_k: string, cb?: (r: any) => void) => {
      if (cb) cb({ activeConversationId: 5 });
      return Promise.resolve({ activeConversationId: 5 });
    });
    mockGetConversationMessages.mockResolvedValue([
      { role: Roles.USER, content: 'Hi', sources: undefined },
      { role: Roles.ASSISTANT, content: 'Hello', sources: undefined },
    ] as any);

    const result = await handleGetHistory('chrome-extension://abc/popup.html');

    expect(result.messages).toHaveLength(2);
    expect(result.messages[0]).toEqual({ role: 'user', content: 'Hi', sources: undefined });
    expect(result.messages[1]).toEqual({ role: 'assistant', content: 'Hello', sources: undefined });
  });

  it('returns messages for url when conversation exists', async () => {
    mockGetConversationForUrl.mockResolvedValue({ id: 3, title: 'x', updatedAt: 1 } as any);
    mockGetConversationMessages.mockResolvedValue([
      { role: Roles.USER, content: 'Q', sources: undefined },
      { role: Roles.ASSISTANT, content: 'A', sources: [{ title: 'S', url: 'u', type: 'article' as any }] },
    ] as any);

    const result = await handleGetHistory('https://example.com');

    expect(mockGetConversationForUrl).toHaveBeenCalledWith('https://example.com');
    expect(result.messages).toHaveLength(2);
    expect(result.messages[1].sources).toBeDefined();
  });

  it('returns empty when no conversation found', async () => {
    mockGetConversationForUrl.mockResolvedValue(undefined);
    (global.chrome as any).storage.local.get.mockImplementation((_k: string, cb?: (r: any) => void) => {
      if (cb) cb({});
      return Promise.resolve({});
    });

    const result = await handleGetHistory('https://example.com');

    expect(result.messages).toEqual([]);
  });

  it('returns error on exception', async () => {
    mockGetConversationForUrl.mockRejectedValue(new Error('DB error'));

    const result = await handleGetHistory('https://example.com');

    expect(result).toEqual({ messages: [], error: 'DB error' });
  });
});
