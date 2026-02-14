import { cn } from '@/utils';

export interface PageHeaderProps {
  className?: string;
  pageTitle: string;
  pageUrl: string;
}

export function SummaryHeader({ className, pageTitle, pageUrl }: PageHeaderProps) {
  const hostname = new URL(pageUrl).hostname || '';
  return (
    <div className={cn('flex flex-col', className)}>
      <h2 className="text-sm font-semibold text-foreground truncate" title={pageTitle}>
        {pageTitle}
      </h2>
      <p className="text-xs text-muted-foreground truncate" title={hostname}>
        {hostname}
      </p>
    </div>
  );
}
