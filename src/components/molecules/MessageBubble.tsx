import React from 'react';
import { Copy } from 'lucide-react';
import { cn } from '@/utils';
import { Message, Roles } from '@/utils/types';
import { cleanContent } from '@/utils';
import { SourceList } from '@/components/molecules/SourceList';

export interface MessageBubbleProps {
  className?: string;
  message: Partial<Message>;
  onCopy?: (content: string) => void;
}

export function MessageBubble({ className, message, onCopy }: MessageBubbleProps) {
  const isUser = message.role === Roles.USER;
  const safeContent = cleanContent(message.content ?? '');
  const handleCopy = () => {
    if (!safeContent) return;
    if (onCopy) {
      onCopy(safeContent);
    } else {
      navigator.clipboard.writeText(safeContent);
    }
  };

  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start', className)}>
      <div
        className={cn(
          'rounded-lg px-3 py-2 max-w-[90%] break-words text-sm',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
        )}
      >
        {safeContent.split('\n').map((line, idx) => (
          <React.Fragment key={idx}>
            {line}
            <br />
          </React.Fragment>
        ))}
      </div>
      {!isUser && (
        <div className="flex gap-2 text-xs text-muted-foreground ml-1">
          <button type="button" onClick={handleCopy} className="hover:text-foreground" title="Copy">
            <Copy className="h-3 w-3" />
          </button>
          <SourceList sources={message.sources} />
        </div>
      )}
    </div>
  );
}
