import React from 'react';
import { cn } from '@/utils';

export interface IndexingFooterProps {
  className?: string;
}

export function IndexingFooter({ className }: IndexingFooterProps) {
  return (
    <div className={cn('text-xs text-gray-600 text-center', className)}>
      <p>Bookmarks are downloaded and split into semantic chunks for easy processing.</p>
    </div>
  );
}
