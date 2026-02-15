import { useEffect, useRef, useState, type RefObject } from 'react';

import { cleanContent, fetchPageContents, getPageUrl, isThinking, Runtime } from '@/utils';
import { MessageListHandle } from '@/components/organisms/MessageList';
import { MessageAction, PageType, Roles, Source } from '@/utils/types';

export interface UseChatStateParams {
  messageListRef: RefObject<MessageListHandle | null>;
  modelLoaded: boolean;
}

export interface UseChatStateResult {
  isGenerating: boolean;
  chatLoadingText: string;
  timestamp: string;
  handleSend: (value: string) => Promise<void>;
  handleStop: () => Promise<void>;
  loadHistory: (conversationId?: number) => Promise<void>;
}

export function useChatState({ messageListRef, modelLoaded }: UseChatStateParams): UseChatStateResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatLoadingText, setChatLoadingText] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [context, setContext] = useState('');
  const assistantContentRef = useRef('');

  useEffect(() => {
    loadHistory();

    if (document.body?.innerText?.length) {
      setContext(document.body.innerText.slice(0, 3000));
    } else {
      fetchPageContents().then(setContext);
    }

    const handleMessage = (msg: { action: string; delta?: string }) => {
      if (msg.action === MessageAction.CHAT_STREAM && msg.delta) {
        messageListRef.current?.appendAssistantDelta(msg.delta);
        assistantContentRef.current += msg.delta;
        const current = assistantContentRef.current;
        const isCurrentlyThinking = isThinking(current);
        setChatLoadingText(isCurrentlyThinking ? 'Thinking...' : '');
      } else if (msg.action === MessageAction.MODEL_UNLOADED) {
        setIsGenerating(false);
        setChatLoadingText('');
      }
    };

    Runtime.onMessage(handleMessage);
    return () => Runtime.removeMessageListener(handleMessage);
  }, []);

  const loadHistory = async (conversationId?: number) => {
    try {
      const url = await getPageUrl();
      const res = await Runtime.getHistory(url, conversationId);
      if (res?.messages) {
        const cleaned = res.messages.map((m: { role: string; content: string; sources?: Source[] }) => ({
          role: m.role as Roles,
          content: cleanContent(m.content),
          sources: normalizeSources(m.sources),
        }));
        messageListRef.current?.setMessages(cleaned);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const normalizeSources = (sources?: Array<{ title: string; url: string; type?: string }>): Partial<Source>[] | undefined => {
    if (!sources?.length) return undefined;
    return sources.map((s) => ({
      title: s.title,
      url: s.url,
      type: s.type === PageType.BOOKMARK || s.type === PageType.CURRENT_PAGE ? s.type : PageType.CURRENT_PAGE,
    }));
  };

  const handleSend = async (value: string) => {
    const userMsg = value.trim();
    if (!userMsg || !modelLoaded || isGenerating) return;
    setIsGenerating(true);
    setChatLoadingText('Thinking...');
    assistantContentRef.current = '';

    const pageText = context || (document.body?.innerText?.slice(0, 30000) ?? '');
    const sources: Source[] = [];

    const currentPageUrl = (await getPageUrl()) || window.location.href;
    if (pageText) {
      sources.push({
        title: document.title || 'Current Page',
        url: currentPageUrl,
        type: PageType.CURRENT_PAGE,
      });
    }

    let ragContext = '';
    try {
      const searchRes = await Runtime.searchContext(userMsg, 3);

      console.log('=========Search results for RAG context:========', searchRes);

      if (searchRes?.summary) {
        ragContext = `[Context Summary]\n${searchRes.summary}\n\n(Sources listed below)`;
        if (searchRes.results?.length) {
          searchRes.results.forEach((r: { title: string; url: string }) => {
            sources.push({ title: r.title, url: r.url, type: PageType.BOOKMARK });
          });
        }
      } else if (searchRes?.results?.length) {
        ragContext = searchRes.results
          .map((r: { title?: string; url?: string; text?: string }) => `[Source: Bookmarks - ${r.title ?? 'Untitled'}]\n${r.text ?? ''}`)
          .filter((block: string) => block.trim().length > 0)
          .join('\n\n---\n\n');
        searchRes.results.forEach((r: { title?: string; url?: string }) => {
          sources.push({
            title: r.title ?? 'Untitled',
            url: r.url ?? '',
            type: PageType.BOOKMARK,
          });
        });
      }
    } catch {
      // searchContext not implemented or failed
    }

    messageListRef.current?.appendUserAndAssistant(userMsg, sources);

    let fullContext = '';
    if (pageText) fullContext += `=== CURRENT PAGE CONTENT ===\n${pageText}\n\n`;
    if (ragContext) fullContext += `=== RELEVANT BOOKMARKS ===\n${ragContext}\n\n`;

    let prompt = userMsg;
    if (fullContext) {
      prompt = `Context information is below.\n\n${fullContext}\n\n---\n\nInstruction: ${userMsg}`;
    }

    try {
      const url = (await getPageUrl()) || window.location.href;
      const sourcesForDb = sources.map((s) => ({
        title: s.title,
        url: s.url,
        type: s.type === 'current_page' ? PageType.CURRENT_PAGE : PageType.BOOKMARK,
      }));
      await Runtime.chat(
        [{ role: 'user', content: prompt }],
        userMsg,
        url,
        fullContext,
        sourcesForDb
      );
    } catch (e) {
      messageListRef.current?.setLastAssistantContent('Error: ' + e);
    }
    setIsGenerating(false);
    setChatLoadingText('');
    setTimestamp(new Date().toLocaleString());
  };

  const handleStop = async () => {
    await Runtime.stop();
    setIsGenerating(false);
    setChatLoadingText('');
  };

  return {
    isGenerating,
    chatLoadingText,
    timestamp,
    handleSend,
    handleStop,
    loadHistory,
  };
}
