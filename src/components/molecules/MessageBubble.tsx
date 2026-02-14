import React from 'react';
import { Copy } from 'lucide-react';
import { cn } from '@/utils';
import { Message, Roles } from '@/utils/types';
import { cleanContent } from '@/utils';
import { SourceList } from '@/components/molecules/SourceList';

export interface MessageBubbleProps {
  className?: string;
  message: Partial<Message>;
}

export function MessageBubble({ className, message }: MessageBubbleProps) {
  const isUser = message.role === Roles.USER;
  const safeContent = cleanContent(message.content ?? '');
  const [copied, setCopied] = React.useState(false);
  const copyTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleCopy = () => {
    if (!safeContent) return;
    navigator.clipboard
      .writeText(safeContent)
      .then(() => {
        setCopied(true);
        if (copyTimerRef.current) {
          window.clearTimeout(copyTimerRef.current);
        }
        copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        setCopied(false);
      });
  };

  if (!safeContent) return null;

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
          <div className="relative">
            <button type="button" onClick={handleCopy} className="hover:text-foreground" title={copied ? 'Copied' : 'Copy'}>
              <Copy className="h-3 w-3" />
            </button>
            {copied && (
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-foreground text-background px-1.5 py-0.5 text-[10px] shadow">
                Copied
              </span>
            )}
          </div>
          <SourceList sources={message.sources} />
        </div>
      )}
    </div>
  );
}
