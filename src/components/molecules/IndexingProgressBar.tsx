import React from 'react';
import { IndexingProgress, IndexingStatus } from '@/utils/types';

export interface IndexingProgressBarProps {
  className?: string;
  progress: IndexingProgress;
}

export function IndexingProgressBar({ className, progress }: IndexingProgressBarProps) {
  const success = progress.processed;
  const failed = progress.failed ?? 0;
  const attempted = success + failed;
  const percentage = progress.total > 0 ? Math.round((attempted / progress.total) * 100) : 0;
  const percentageCapped = Math.min(percentage, 100);
  const statusLabel = progress.status === IndexingStatus.DONE ? 'Finished' : progress.status;

  return (
    <div className={className}>
      <div className="flex justify-between mb-1 text-sm text-gray-600">
        <span>Progress</span>
        <span>
          {attempted} / {progress.total}
          <span className="text-gray-500 ml-1">
            ({success} succeeded{failed > 0 ? `, ${failed} failed` : ''})
          </span>
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${percentageCapped}%` }} />
      </div>
      <p className="text-sm text-gray-600 mt-2">
        Status: <span className="font-semibold capitalize">{statusLabel}</span>
      </p>
    </div>
  );
}
