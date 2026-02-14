import React from 'react';
import { cn } from '@/utils';
import { Message } from '@/utils/types';
import { MessageBubble } from '@/components/molecules/MessageBubble';
import { ChatEmptyState } from '@/components/molecules/ChatEmptyState';

export interface MessageListProps {
  className?: string;
  messages: Partial<Message>[];
  loadingText?: string;
  modelLoaded?: boolean;
  messagesEndRef?: React.RefObject<HTMLDivElement | null>;
  onCopyMessage?: (content: string) => void;
}

export function MessageList({ className, messages, loadingText, modelLoaded, messagesEndRef, onCopyMessage }: MessageListProps) {
  return (
    <div className={cn('flex-1 overflow-y-auto p-3 space-y-4', className)}>
      {messages.length === 0 && !loadingText && <ChatEmptyState modelLoaded={!!modelLoaded} />}
      {messages.map((msg, idx) => (
        <MessageBubble key={idx} message={msg} onCopy={onCopyMessage} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
