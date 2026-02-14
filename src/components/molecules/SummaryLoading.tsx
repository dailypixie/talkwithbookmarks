import { Loader2 } from 'lucide-react';
import { cn } from '@/utils';

export interface SummaryLoadingProps {
  className?: string;
}

export function SummaryLoading({ className }: SummaryLoadingProps) {
  return (
    <div className={cn('flex items-center justify-center h-full', className)}>
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
