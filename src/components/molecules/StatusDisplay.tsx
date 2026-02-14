import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { cn } from '@/utils';

export interface StatusDisplayProps {
  className?: string;
  type: 'loading' | 'error' | 'info';
  message: string;
  onRetry?: () => void;
}

export function StatusDisplay({ className, type, message, onRetry }: StatusDisplayProps) {
  if (type === 'error') {
    return (
      <div className={cn('px-3 py-1.5 text-sm text-amber-700 bg-amber-50 border-b flex items-center justify-between gap-2', className)}>
        <span>{message}</span>
        {onRetry && (
          <Button variant="outline" size="sm" className="shrink-0 h-7 text-xs" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('px-3 py-2 bg-muted/50 border-b flex items-center gap-2 text-xs text-muted-foreground', className)}>
      {type === 'loading' && <Loader2 className="h-3 w-3 animate-spin" />}
      <span>{message}</span>
    </div>
  );
}
