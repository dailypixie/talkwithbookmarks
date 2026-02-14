import React from 'react';
import { cn } from '@/utils';

export interface ChatTimestampProps {
  className?: string;
  timestamp: string;
}

export function ChatTimestamp({ className, timestamp }: ChatTimestampProps) {
  if (!timestamp) return null;
  return <div className={cn('px-3 text-right text-[10px] text-muted-foreground', className)}>{timestamp}</div>;
}
