import { Loader2 } from 'lucide-react';
import { cn } from '@/utils';

export interface SummaryGeneratingProps {
  className?: string;
}

export function SummaryGenerating({ className }: SummaryGeneratingProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center h-full gap-3', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Generating summary...</p>
    </div>
  );
}
