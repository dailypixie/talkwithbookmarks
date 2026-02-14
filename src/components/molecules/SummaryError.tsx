import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { cn } from '@/utils';

export interface SummaryErrorProps {
  className?: string;
  error: string;
  onRetry: () => void;
}

export function SummaryError({ className, error, onRetry }: SummaryErrorProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center h-full gap-4', className)}>
      <AlertCircle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-destructive text-center">{error}</p>
      <Button onClick={onRetry} variant="outline" size="sm" className="gap-2">
        Try Again
      </Button>
    </div>
  );
}
