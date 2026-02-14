import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { cn } from '@/utils';
import { Message, Roles, Source } from '@/utils/types';
import { MessageBubble } from '@/components/molecules/MessageBubble';
import { ChatEmptyState } from '@/components/molecules/ChatEmptyState';

export interface MessageListProps {
  className?: string;
  loadingText?: string;
  modelLoaded?: boolean;
  onCopyMessage?: (content: string) => void;
}

export interface MessageListHandle {
  setMessages: (messages: Partial<Message>[]) => void;
  appendUserAndAssistant: (userContent: string, sources?: Source[]) => void;
  appendAssistantDelta: (delta: string) => void;
  setLastAssistantContent: (content: string) => void;
}

export const MessageList = React.forwardRef<MessageListHandle, MessageListProps>(function MessageList(
  { className, loadingText, modelLoaded, onCopyMessage },
  ref
) {
  const [messages, setMessages] = useState<Partial<Message>[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    setMessages: (next) => setMessages(next),
    appendUserAndAssistant: (userContent, sources) =>
      setMessages((prev) => [...prev, { role: Roles.USER, content: userContent }, { role: Roles.ASSISTANT, content: '', sources }]),
    appendAssistantDelta: (delta) =>
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg && lastMsg.role === Roles.ASSISTANT) {
          lastMsg.content = (lastMsg.content ?? '') + delta;
        }
        return newMessages;
      }),
    setLastAssistantContent: (content) =>
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg && lastMsg.role === Roles.ASSISTANT) {
          lastMsg.content = content;
        }
        return newMessages;
      }),
  }));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={cn('flex-1 overflow-y-auto p-3 space-y-4', className)}>
      {messages.length === 0 && !loadingText && <ChatEmptyState modelLoaded={!!modelLoaded} />}
      {messages.map((msg, idx) => (
        <MessageBubble key={idx} message={msg} onCopy={onCopyMessage} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
});
