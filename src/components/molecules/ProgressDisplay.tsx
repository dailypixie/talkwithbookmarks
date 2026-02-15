import { Progress } from '@/components/atoms/progress';
import { cn } from '@/utils';

export interface ProgressDisplayProps {
  className?: string;
  processed: number;
  total: number;
  failed?: number;
  status: string;
  stage: string;
}

export function ProgressDisplay({ className, processed, total, failed = 0, status, stage }: ProgressDisplayProps) {
  const attempted = processed + failed;
  const percentage = total > 0 ? Math.round((attempted / total) * 100) : 0;
  const percentageCapped = Math.min(percentage, 100);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div>
        <h2 className="text-lg font-semibold mb-2 text-foreground">Indexing Progress</h2>
        <div className="flex justify-between mb-1 text-sm text-muted-foreground">
          <span>Progress</span>
          <span>
            {attempted} / {total}
            <span className="text-muted-foreground/80 ml-1">
              ({processed} succeeded{failed > 0 ? `, ${failed} failed` : ''})
            </span>
          </span>
        </div>
        <Progress value={percentageCapped} className="h-2" />
      </div>
      <p className="text-sm text-muted-foreground">
        Status: <span className="font-semibold capitalize text-foreground">{status}</span>
        {stage && (
          <>
            {' '}
            - Stage: <span className="font-semibold capitalize text-foreground">{stage}</span>
          </>
        )}
      </p>
    </div>
  );
}
