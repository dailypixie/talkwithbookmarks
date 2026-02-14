import { cn } from '@/utils';

export interface IndexingMessageProps {
  className?: string;
  message: string;
}

export function IndexingMessage({ className, message }: IndexingMessageProps) {
  return <p className={cn('text-sm text-amber-700 bg-amber-50 rounded p-2', className)}>{message}</p>;
}
