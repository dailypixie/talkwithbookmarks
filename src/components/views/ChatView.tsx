import { useRef, useState } from 'react';

import { cn } from '@/utils';
import { Conversation } from '@/utils/types';
import { ConversationHistory } from '@/components/views/ConversationHistory';

import { ChatInputForm } from '@/components/molecules/ChatInputForm';
import { ChatTimestamp } from '@/components/molecules/ChatTimestamp';
import { ModelLoadingIndicator } from '@/components/molecules/ModelLoadingIndicator';
import { StatusDisplay } from '@/components/molecules/StatusDisplay';
import { ChatHeader } from '@/components/organisms/ChatHeader';
import { MessageList, MessageListHandle } from '@/components/organisms/MessageList';
import { useChatState } from '@/ui/hooks/useChatState';
import { useModelState } from '@/ui/hooks/useModelState';

export interface ChatViewProps {
  className?: string;
  onClose?: () => void;
  container?: HTMLElement | null;
}

export function ChatView({ className, container }: ChatViewProps) {
  const messageListRef = useRef<MessageListHandle>(null);
  const [showHistory, setShowHistory] = useState(false);
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

  const { isGenerating, chatLoadingText, timestamp, handleSend, handleStop, loadHistory } = useChatState({
    messageListRef,
    modelLoaded,
  });

  const loadingText = chatLoadingText || modelLoadingText;

  const handleSelectConversation = async (conversation: Conversation) => {
    if (conversation.id) {
      await chrome.storage.local.set({ activeConversationId: conversation.id });
      await loadHistory();
      setShowHistory(false);
    }
  };

  const handleNewChat = async () => {
    await chrome.storage.local.remove('activeConversationId');
    messageListRef.current?.setMessages([]);
    setShowHistory(false);
  };

  if (showHistory) {
    return (
      <ConversationHistory onSelectConversation={handleSelectConversation} onNewChat={handleNewChat} onBack={() => setShowHistory(false)} />
    );
  }

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
        onHistoryClick={() => setShowHistory(true)}
      />
      {modelsError && <StatusDisplay type="error" message={modelsError} onRetry={refreshModels} className="mb-2" />}

      <ModelLoadingIndicator loadingText={loadingText} loadingProgress={loadingProgress} />
      <MessageList loadingText={loadingText} modelLoaded={modelLoaded} ref={messageListRef} />
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
