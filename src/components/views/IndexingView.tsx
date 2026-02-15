import { useState, useEffect } from 'react';
import { ProgressDisplay } from '@/components/molecules/ProgressDisplay';
import { IndexingControls } from '@/components/molecules/IndexingControls';
import { IndexingMessage } from '@/components/molecules/IndexingMessage';
import { IndexingFooter } from '@/components/molecules/IndexingFooter';
import { IndexingProgress, IndexingStatus } from '@/utils/types';
import { Button } from '@/components/atoms/button';
import { Plus } from 'lucide-react';
import { Runtime } from '@/utils/runtime';

export function IndexingInterface() {
  const [progress, setProgress] = useState<IndexingProgress>({
    total: 0,
    processed: 0,
    status: IndexingStatus.IDLE,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [zeroItemsMessage, setZeroItemsMessage] = useState<string | null>(null);
  const [manualUrls, setManualUrls] = useState('');
  const [manualUrlMessage, setManualUrlMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isQueueingUrls, setIsQueueingUrls] = useState(false);

  useEffect(() => {
    getProgress();
    const interval = setInterval(getProgress, 500);
    return () => clearInterval(interval);
  }, []);

  const getProgress = async () => {
    try {
      const response = await Runtime.getIndexingProgress();
      setProgress(response);
    } catch (error) {
      console.error('Error getting progress:', error);
    }
  };

  const handleStartIndexing = async () => {
    setZeroItemsMessage(null);
    setIsLoading(true);
    try {
      const response = await Runtime.startIndexing();
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
      await Runtime.pauseIndexing();
      await getProgress();
    } catch (error) {
      console.error('Error pausing:', error);
    }
  };

  const handleResume = async () => {
    try {
      await Runtime.resumeIndexing();
      await getProgress();
    } catch (error) {
      console.error('Error resuming:', error);
    }
  };

  const handleClear = async () => {
    if (confirm('Are you sure you want to clear all data?')) {
      try {
        await Runtime.clearAllData();
        setProgress({ total: 0, processed: 0, status: IndexingStatus.IDLE });
      } catch (error) {
        console.error('Error clearing data:', error);
      }
    }
  };

  const handleQueueUrls = async () => {
    const urls = manualUrls
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    if (urls.length === 0) {
      setManualUrlMessage({ type: 'error', text: 'Please enter at least one URL.' });
      return;
    }
    setManualUrlMessage(null);
    setIsQueueingUrls(true);
    try {
      const response = await Runtime.IndexManualUrls(urls);
      if (response?.success) {
        if (response.count > 0) {
          setManualUrlMessage({ type: 'success', text: `Queued ${response.count} URL${response.count === 1 ? '' : 's'} for indexing.` });
          setManualUrls('');
        } else {
          setManualUrlMessage({ type: 'error', text: response.message ?? 'No URLs were queued (all already indexed or invalid).' });
        }
      } else {
        setManualUrlMessage({ type: 'error', text: response?.message ?? 'Failed to queue URLs.' });
      }
      await getProgress();
    } catch (error) {
      console.error('Error queueing URLs:', error);
      setManualUrlMessage({ type: 'error', text: 'Failed to queue URLs.' });
    } finally {
      setIsQueueingUrls(false);
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

      <div className="bg-card text-card-foreground rounded-lg border border-border p-4 shadow-sm">
        <h3 className="text-sm font-medium mb-1">Index URLs</h3>
        <p className="text-xs text-muted-foreground mb-3">Enter a list of URLs (one per line) to add them to the indexing queue.</p>
        <textarea
          className="flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 resize-y"
          placeholder={'https://example.com/page1\nhttps://example.com/page2'}
          value={manualUrls}
          onChange={(e) => setManualUrls(e.target.value)}
          disabled={progress.status === IndexingStatus.INDEXING || progress.status === IndexingStatus.PAUSED}
        />
        {manualUrlMessage && (
          <div className="mt-2">
            <IndexingMessage
              message={manualUrlMessage.text}
              className={
                manualUrlMessage.type === 'success'
                  ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800'
                  : undefined
              }
            />
          </div>
        )}
        <div className="flex justify-end mt-3">
          <Button
            onClick={handleQueueUrls}
            disabled={
              !manualUrls.trim() ||
              isQueueingUrls ||
              progress.status === IndexingStatus.INDEXING ||
              progress.status === IndexingStatus.PAUSED
            }
          >
            <Plus className="mr-2 h-4 w-4" /> {isQueueingUrls ? 'Queueing...' : 'Queue URLs'}
          </Button>
        </div>
      </div>

      <IndexingFooter />
    </div>
  );
}
