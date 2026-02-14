import { FileText } from 'lucide-react';
import { cn } from '@/utils';

export interface NoPageSelectedProps {
  className?: string;
}

export function NoPageSelected({ className }: NoPageSelectedProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center h-full p-6 text-center', className)}>
      <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <p className="text-muted-foreground">Navigate to a webpage to generate a summary</p>
    </div>
  );
}
