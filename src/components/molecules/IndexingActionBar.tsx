import React from 'react';
import { IndexingStatus } from '@/utils/types';

export interface IndexingActionBarProps {
  className?: string;
  status: IndexingStatus;
  isLoading: boolean;
  onStartIndexing: () => void;
  onPause: () => void;
  onResume: () => void;
}

export function IndexingActionBar({
  className,
  status,
  isLoading,
  onStartIndexing,
  onPause,
  onResume,
}: IndexingActionBarProps) {
  return (
    <div className={`flex gap-2 ${className ?? ''}`}>
      {status === IndexingStatus.IDLE && (
        <button
          onClick={onStartIndexing}
          disabled={isLoading}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {isLoading ? 'Starting...' : 'Start Indexing'}
        </button>
      )}
      {status === IndexingStatus.DONE && (
        <p className="text-sm text-green-700 font-medium">Indexing complete.</p>
      )}
      {status === IndexingStatus.INDEXING && (
        <button
          onClick={onPause}
          className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition"
        >
          Pause
        </button>
      )}
      {status === IndexingStatus.PAUSED && (
        <button
          onClick={onResume}
          className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          Resume
        </button>
      )}
    </div>
  );
}
