import { cn } from '@/utils';

export interface IndexingMessageProps {
  className?: string;
  message: string;
}

export function IndexingMessage({ className, message }: IndexingMessageProps) {
  return (
    <p
      className={cn(
        'text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 rounded p-2 border border-amber-200 dark:border-amber-800',
        className
      )}
    >
      {message}
    </p>
  );
}
