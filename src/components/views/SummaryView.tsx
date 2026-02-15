import { useEffect, useState } from 'react';
import { SUMMARY_CONFIG } from '@/utils/constants';
import { cleanContent, cn, MessageAction, withTimeout, Runtime } from '@/utils';
import { SummaryHeader } from '@/components/molecules/SummaryHeader';
import { SummaryCard } from '@/components/molecules/SummaryCard';
import { NoPageSelected } from '@/components/molecules/NoPageSelected';
import { NoModelLoaded } from '@/components/molecules/NoModelLoaded';
import { SummaryLoading } from '@/components/molecules/SummaryLoading';
import { SummaryGenerating } from '@/components/molecules/SummaryGenerating';
import { SummaryError } from '@/components/molecules/SummaryError';

interface SummaryInterfaceProps {
  className?: string;
  isActive?: boolean;
}

export function SummaryInterface({ className, isActive = false }: SummaryInterfaceProps) {
  const [pageUrl, setPageUrl] = useState<string>('');
  const [pageTitle, setPageTitle] = useState<string>('');
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [summaryModel, setSummaryModel] = useState<string | null>(null);

  useEffect(() => {
    const checkModel = async () => {
      try {
        const res = await Runtime.getModelStatus();
        setModelLoaded(res?.loaded ?? false);
      } catch (e) {
        console.error('Failed to check model status:', e);
      }
    };
    checkModel();
    const handleMessage = (msg: { action: string }) => {
      if (msg.action === MessageAction.MODEL_LOADED) setModelLoaded(true);
      else if (msg.action === MessageAction.MODEL_UNLOADED) setModelLoaded(false);
    };
    Runtime.onMessage(handleMessage);
    return () => Runtime.removeMessageListener(handleMessage);
  }, []);

  useEffect(() => {
    const initPageFromContext = async () => {
      const url = window.location.href;
      if (url && !url.startsWith('chrome://') && !url.startsWith('chrome-extension://')) {
        setPageUrl(url);
        setPageTitle(document.title || 'Untitled');
        return;
      }
      // Popup/extension context: use the current selected tab
      try {
        const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });
        if (tab?.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
          setPageUrl(tab.url);
          setPageTitle(tab.title || 'Untitled');
        }
      } catch (e) {
        console.error('Failed to get current tab:', e);
      }
    };
    initPageFromContext();
  }, []);

  useEffect(() => {
    if (!pageUrl || !isActive) return;

    const loadSummary = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await Runtime.getPageSummary(pageUrl);
        if (response?.summary) {
          setSummary(cleanContent(response.summary ?? ''));
          setSummaryModel(response.summaryModel ?? null);
          setIsLoading(false);
        } else {
          setIsLoading(false);
          autoGenerateSummary();
        }
      } catch (e) {
        console.error('Failed to load summary:', e);
        setIsLoading(false);
        autoGenerateSummary();
      }
    };
    loadSummary();
  }, [pageUrl, isActive]);

  useEffect(() => {
    if (!isActive || !modelLoaded || !pageUrl || summary || isGenerating || isLoading) return;
    autoGenerateSummary();
  }, [isActive, modelLoaded, pageUrl, summary, isGenerating, isLoading]);

  const fetchPageContent = async (): Promise<string> => {
    try {
      const body = document.body;
      if (!body) return '';
      const clone = body.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('script, style, noscript').forEach((el) => el.remove());
      return clone.innerText?.trim() ?? '';
    } catch (e) {
      console.error('Failed to fetch page content from DOM:', e);
      return '';
    }
  };

  const autoGenerateSummary = async () => {
    if (!pageUrl || isGenerating || !modelLoaded) return;

    setIsGenerating(true);
    setError(null);

    try {
      const content = await fetchPageContent();
      if (!content) {
        setError('Could not fetch page content. Try refreshing the page.');
        setIsGenerating(false);
        return;
      }

      const response = await withTimeout(
        Runtime.generateSummary(pageUrl, content, pageTitle),
        SUMMARY_CONFIG.GENERATION_TIMEOUT_MS,
        'Summary generation timed out. Try again.'
      );

      if (response?.summary) {
        setSummary(cleanContent(response.summary ?? ''));
        setSummaryModel(response.summaryModel ?? null);
      } else if (response?.error) {
        setError(response.error);
      } else {
        setError('Failed to generate summary. Make sure a model is loaded.');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!pageUrl) return;

    setIsGenerating(true);
    setError(null);

    try {
      const content = await fetchPageContent();
      if (!content) {
        setError('Could not fetch page content. Try refreshing the page.');
        return;
      }

      const response = await withTimeout(
        Runtime.generateSummary(pageUrl, content, pageTitle),
        SUMMARY_CONFIG.GENERATION_TIMEOUT_MS,
        'Summary generation timed out. Try again.'
      );

      if (response?.summary) {
        setSummary(cleanContent(response.summary ?? ''));
        setSummaryModel(response.summaryModel ?? null);
      } else if (response?.error) {
        setError(response.error);
      } else {
        setError('Failed to generate summary. Make sure a model is loaded.');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    setSummary(null);
    setSummaryModel(null);
    handleGenerateSummary();
  };

  if (!pageUrl) {
    return <NoPageSelected className={className} />;
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <SummaryHeader pageTitle={pageTitle} pageUrl={pageUrl} className="p-3 border-b bg-muted/30" />

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <SummaryLoading />
        ) : summary ? (
          <SummaryCard summary={summary} summaryModel={summaryModel} onRegenerate={handleRegenerate} isGenerating={isGenerating} />
        ) : isGenerating ? (
          <SummaryGenerating />
        ) : !modelLoaded ? (
          <NoModelLoaded />
        ) : error ? (
          <SummaryError error={error} onRetry={handleGenerateSummary} />
        ) : (
          <SummaryLoading />
        )}
      </div>
    </div>
  );
}
