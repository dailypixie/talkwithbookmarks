import { cn } from '@/utils';

export interface ChatEmptyStateProps {
  className?: string;
  modelLoaded: boolean;
}

export function ChatEmptyState({ className, modelLoaded }: ChatEmptyStateProps) {
  return (
    <div className={cn('text-center text-muted-foreground text-sm mt-10', className)}>
      {modelLoaded ? 'Talk with your bookmarks!' : 'Select a model and start chatting with your bookmarks!'}
    </div>
  );
}
