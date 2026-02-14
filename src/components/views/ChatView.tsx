import { useEffect, useState, useRef } from 'react';

import { cn, fetchPageContents, getPageUrl, cleanContent, isThinking } from '@/utils';
import { PageType, Roles, Source } from '@/utils/types';

import { ChatInputForm } from '../molecules/ChatInputForm';
import { ChatTimestamp } from '../molecules/ChatTimestamp';
import { ModelLoadingIndicator } from '../molecules/ModelLoadingIndicator';
import { StatusDisplay } from '../molecules/StatusDisplay';
import { ChatHeader } from '../organisms/ChatHeader';
import { MessageList, MessageListHandle } from '../organisms/MessageList';

export interface ChatInterfaceProps {
  className?: string;
  onClose?: () => void;
  container?: HTMLElement | null;
}

export function ChatInterface({ className, container }: ChatInterfaceProps) {
  const [models, setModels] = useState<string[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [cachedModels, setCachedModels] = useState<Set<string>>(new Set());
  const [recommendedModels, setRecommendedModels] = useState<Set<string>>(new Set());
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [context, setContext] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const messageListRef = useRef<MessageListHandle>(null);
  const assistantContentRef = useRef('');

  useEffect(() => {
    fetchModels();
    fetchCachedModels();
    checkModelStatus();
    loadHistory();

    if (document.body?.innerText?.length) {
      setContext(document.body.innerText.slice(0, 3000));
    } else {
      fetchPageContents().then(setContext);
    }

    const handleMessage = (msg: { action: string; delta?: string; modelId?: string; progress?: number; text?: string }) => {
      if (msg.action === 'modelProgress') {
        setLoadingText(msg.text ?? '');
        setLoadingProgress(msg.progress ?? 0);
      } else if (msg.action === 'modelLoaded') {
        setSelectedModel(msg.modelId ?? '');
        setModelLoaded(true);
        setLoadingText('');
        setLoadingProgress(0);
      } else if (msg.action === 'chatStream' && msg.delta) {
        messageListRef.current?.appendAssistantDelta(msg.delta);
        assistantContentRef.current += msg.delta;
        const current = assistantContentRef.current;
        const isCurrentlyThinking = isThinking(current);
        setLoadingText(isCurrentlyThinking ? 'Thinking...' : '');
      } else if (msg.action === 'modelUnloaded') {
        setModelLoaded(false);
        setSelectedModel('');
        setIsGenerating(false);
        setLoadingText('');
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const fetchModels = async () => {
    setModelsError(null);
    try {
      let recs = new Set<string>();
      try {
        const r = await chrome.runtime.sendMessage({ action: 'getRecommendedModels' });
        if (r?.recommended) {
          recs = new Set(Object.values(r.recommended) as string[]);
          setRecommendedModels(recs);
        }
      } catch {
        // ignore
      }
      const res = await chrome.runtime.sendMessage({ action: 'getModels' });
      if (Array.isArray(res)) {
        const sorted = [...res].sort((a, b) => {
          const isRecA = recs.has(a);
          const isRecB = recs.has(b);
          if (isRecA && !isRecB) return -1;
          if (!isRecA && isRecB) return 1;
          return a.localeCompare(b);
        });
        setModels(sorted);
        if (sorted.length === 0) setModelsError('No models available.');
      } else {
        const msg = (res as { error?: string })?.error ?? 'Could not load models.';
        setModelsError(msg);
        setModels([]);
      }
    } catch (e) {
      console.error(e);
      setModelsError('Could not load models. Try again.');
      setModels([]);
    }
  };

  const fetchCachedModels = async () => {
    try {
      const res = await chrome.runtime.sendMessage({ action: 'getCachedModels' });
      if (res?.cachedModels) setCachedModels(new Set(res.cachedModels));
    } catch (e) {
      console.error(e);
    }
  };

  const checkModelStatus = async () => {
    try {
      const res = await chrome.runtime.sendMessage({ action: 'getModelStatus' });
      if (res?.loaded) {
        setSelectedModel(res.currentModel ?? '');
        setModelLoaded(true);
        setLoadingText('');
      } else if (res?.isLoading) {
        setLoadingText('Loading model...');
      } else {
        setModelLoaded(false);
        const stored = await chrome.storage.local.get('selectedModel');
        if (stored.selectedModel) setSelectedModel(stored.selectedModel);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadModel = async (modelId: string) => {
    if (!modelId) return;
    setLoadingText('Initializing...');
    try {
      const res = await chrome.runtime.sendMessage({ action: 'loadModel', modelId });
      if (res?.success) {
        setSelectedModel(modelId);
        setModelLoaded(true);
        setLoadingText('');
      } else {
        setLoadingText(res?.error ?? 'Error loading model');
      }
    } catch (e) {
      setLoadingText('Error: ' + e);
    }
  };

  const unloadModel = async () => {
    try {
      await chrome.runtime.sendMessage({ action: 'unloadModel' });
      setModelLoaded(false);
      setSelectedModel('');
    } catch (e) {
      console.error(e);
    }
  };

  const loadHistory = async () => {
    try {
      const url = await getPageUrl();
      const res = await chrome.runtime.sendMessage({ action: 'getHistory', url });
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

  function normalizeSources(sources?: Array<{ title: string; url: string; type?: string }>): Partial<Source>[] | undefined {
    if (!sources?.length) return undefined;
    return sources.map((s) => ({
      title: s.title,
      url: s.url,
      type: s.type === PageType.BOOKMARK || s.type === PageType.CURRENT_PAGE ? s.type : PageType.CURRENT_PAGE,
    }));
  }

  const handleSend = async (value: string) => {
    const userMsg = value.trim();
    if (!userMsg || !modelLoaded || isGenerating) return;
    setIsGenerating(true);
    setLoadingText('Thinking...');
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
      const searchRes = await chrome.runtime.sendMessage({
        action: 'searchContext',
        query: userMsg,
        topK: 3,
      });

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
      await chrome.runtime.sendMessage({
        action: 'chat',
        messages: [{ role: 'user', content: prompt }],
        originalContent: userMsg,
        url,
        context: fullContext,
        sources: sourcesForDb,
      });
    } catch (e) {
      messageListRef.current?.setLastAssistantContent('Error: ' + e);
    }
    setIsGenerating(false);
    setLoadingText('');
    setTimestamp(new Date().toLocaleString());
  };

  const handleStop = async () => {
    await chrome.runtime.sendMessage({ action: 'stop' });
    setIsGenerating(false);
    setLoadingText('');
  };

  return (
    <div className={cn('flex flex-col h-full bg-background text-foreground font-sans', className)}>
      <ChatHeader
        className=""
        modelLoaded={modelLoaded}
        container={container}
        models={models}
        selectedModel={selectedModel}
        cachedModels={cachedModels}
        loadingText={loadingText}
        recommendedModels={recommendedModels}
        onModelChange={loadModel}
        onUnload={unloadModel}
        onRefresh={() => {
          checkModelStatus();
          fetchModels();
        }}
      />
      {modelsError && <StatusDisplay type="error" message={modelsError} onRetry={fetchModels} className="mb-2" />}

      <ModelLoadingIndicator loadingText={loadingText} loadingProgress={loadingProgress} />
      <MessageList loadingText={loadingText} modelLoaded={modelLoaded} ref={messageListRef} onCopyMessage={() => 'Copied'} />
      <ChatTimestamp timestamp={timestamp} />

      <ChatInputForm
        className="p-3 border-t bg-background flex gap-2"
        onSend={handleSend}
        onStop={handleStop}
        isGenerating={isGenerating}
        loadingText={loadingText}
        modelLoaded={modelLoaded}
      />
    </div>
  );
}
