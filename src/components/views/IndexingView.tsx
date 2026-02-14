import { useState, useEffect } from 'react';
import { ProgressDisplay } from '@/components/molecules/ProgressDisplay';
import { IndexingControls } from '@/components/molecules/IndexingControls';
import { IndexingMessage } from '@/components/molecules/IndexingMessage';
import { IndexingFooter } from '@/components/molecules/IndexingFooter';
import { MessageAction, IndexingProgress, IndexingStatus } from '@/utils/types';

export function IndexingInterface() {
  const [progress, setProgress] = useState<IndexingProgress>({
    total: 0,
    processed: 0,
    status: IndexingStatus.IDLE,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [zeroItemsMessage, setZeroItemsMessage] = useState<string | null>(null);

  useEffect(() => {
    getProgress();
    const interval = setInterval(getProgress, 500);
    return () => clearInterval(interval);
  }, []);

  const getProgress = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: MessageAction.GET_INDEXING_PROGRESS,
      });
      setProgress(response);
    } catch (error) {
      console.error('Error getting progress:', error);
    }
  };

  const handleStartIndexing = async () => {
    setZeroItemsMessage(null);
    setIsLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
        action: MessageAction.START_INDEXING,
      });
      const itemsQueued = response?.itemsQueued ?? -1;
      if (itemsQueued === 0) {
        setZeroItemsMessage('No new bookmarks to index. All bookmarks are already indexed or recently failed (retry after 24h).');
      }
      await getProgress();
    } catch (error) {
      console.error('Error starting indexing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      await chrome.runtime.sendMessage({
        action: MessageAction.PAUSE_INDEXING,
      });
      await getProgress();
    } catch (error) {
      console.error('Error pausing:', error);
    }
  };

  const handleResume = async () => {
    try {
      await chrome.runtime.sendMessage({
        action: MessageAction.RESUME_INDEXING,
      });
      await getProgress();
    } catch (error) {
      console.error('Error resuming:', error);
    }
  };

  const handleClear = async () => {
    if (confirm('Are you sure you want to clear all data?')) {
      try {
        await chrome.runtime.sendMessage({
          action: MessageAction.CLEAR_DATA,
        });
        setProgress({ total: 0, processed: 0, status: IndexingStatus.IDLE });
      } catch (error) {
        console.error('Error clearing data:', error);
      }
    }
  };

  const statusLabel = progress.status === IndexingStatus.DONE ? 'Finished' : progress.status;

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="bg-card text-card-foreground rounded-lg border border-border p-4 shadow-sm">
        <div className="mb-4">
          <ProgressDisplay processed={progress.processed} total={progress.total} failed={progress.failed} status={statusLabel} />
          {zeroItemsMessage && <IndexingMessage message={zeroItemsMessage} />}
        </div>

        <IndexingControls
          status={progress.status}
          isLoading={isLoading}
          onStartIndexing={handleStartIndexing}
          onPause={handlePause}
          onResume={handleResume}
          onClear={handleClear}
        />
      </div>

      <IndexingFooter />
    </div>
  );
}
