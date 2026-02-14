import { AlertCircle } from 'lucide-react';
import { cn } from '@/utils';

export interface NoModelLoadedProps {
  className?: string;
}

export function NoModelLoaded({ className }: NoModelLoadedProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center h-full p-4 text-center gap-4', className)}>
      <AlertCircle className="h-12 w-12 text-muted-foreground/50" />
      <div className="space-y-2">
        <h3 className="font-medium">No Model Loaded</h3>
        <p className="text-sm text-muted-foreground">Please load an AI model in the Chat tab to generate summaries.</p>
      </div>
    </div>
  );
}
