import React from 'react';
import { Button } from '@/components/atoms/button';
import { cn } from '@/utils';
import { IndexingStatus } from '@/utils/types';

export interface IndexingControlsProps {
  className?: string;
  status: IndexingStatus;
  isLoading: boolean;
  onStartIndexing: () => void;
  onPause: () => void;
  onResume: () => void;
  onClear: () => void;
}

export function IndexingControls({ className, status, isLoading, onStartIndexing, onPause, onResume, onClear }: IndexingControlsProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex gap-2">
        {status === IndexingStatus.IDLE && (
          <Button onClick={onStartIndexing} disabled={isLoading} className="flex-1">
            {isLoading ? 'Starting...' : 'Start Indexing'}
          </Button>
        )}
        {status === IndexingStatus.DONE && (
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">Indexing complete.</p>
        )}
        {status === IndexingStatus.INDEXING && (
          <Button onClick={onPause} variant="outline" className="flex-1">
            Pause
          </Button>
        )}
        {status === IndexingStatus.PAUSED && (
          <Button onClick={onResume} variant="outline" className="flex-1">
            Resume
          </Button>
        )}
      </div>
      <Button onClick={onClear} variant="destructive" className="w-full">
        Clear Data
      </Button>
    </div>
  );
}
