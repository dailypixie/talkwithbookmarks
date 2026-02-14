import React from 'react';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/atoms/progress';
import { cn } from '@/utils';

export interface ModelLoadingIndicatorProps {
  className?: string;
  loadingText: string;
  loadingProgress: number;
}

export function ModelLoadingIndicator({ className, loadingText, loadingProgress }: ModelLoadingIndicatorProps) {
  if (!loadingText) return null;
  return (
    <div className={cn('px-3 py-2 bg-muted/50 border-b flex flex-col gap-2 min-h-[40px]', className)}>
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span className="flex items-center gap-2 break-words leading-tight">
          {loadingProgress < 1 && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
          {loadingText}
        </span>
        <span>{loadingProgress > 0 && loadingProgress < 1 ? `${Math.round(loadingProgress * 100)}%` : ''}</span>
      </div>
      <Progress value={loadingProgress * 100} className="h-1" />
    </div>
  );
}
