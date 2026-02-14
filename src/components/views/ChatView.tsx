import { useRef } from 'react';

import { cn } from '@/utils';

import { ChatInputForm } from '@/components/molecules/ChatInputForm';
import { ChatTimestamp } from '@/components/molecules/ChatTimestamp';
import { ModelLoadingIndicator } from '@/components/molecules/ModelLoadingIndicator';
import { StatusDisplay } from '@/components/molecules/StatusDisplay';
import { ChatHeader } from '@/components/organisms/ChatHeader';
import { MessageList, MessageListHandle } from '@/components/organisms/MessageList';
import { useChatState } from '@/hooks/useChatState';
import { useModelState } from '@/hooks/useModelState';

export interface ChatInterfaceProps {
  className?: string;
  onClose?: () => void;
  container?: HTMLElement | null;
}

export function ChatInterface({ className, container }: ChatInterfaceProps) {
  const messageListRef = useRef<MessageListHandle>(null);
  const {
    models,
    modelsError,
    cachedModels,
    recommendedModels,
    selectedModel,
    modelLoaded,
    modelLoadingText,
    loadingProgress,
    loadModel,
    unloadModel,
    refreshModels,
  } = useModelState();

  const { isGenerating, chatLoadingText, timestamp, handleSend, handleStop } = useChatState({
    messageListRef,
    modelLoaded,
  });

  const loadingText = chatLoadingText || modelLoadingText;

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
        onRefresh={refreshModels}
      />
      {modelsError && <StatusDisplay type="error" message={modelsError} onRetry={refreshModels} className="mb-2" />}

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
