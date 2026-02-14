import React from 'react';
import { Bookmark, BookOpen, FileText } from 'lucide-react';
import { cn } from '@/utils';
import { PageType, Source } from '@/utils/types';

export interface SourceListProps {
  className?: string;
  sources?: Partial<Source>[];
}

export function SourceList({ className, sources: rawSources }: SourceListProps) {
  if (!rawSources?.length) return null;

  const sources = [...new Map(rawSources?.map((s) => [s.url, s])).values()].filter((s) => s.type !== PageType.CURRENT_PAGE);

  return (
    <div className={cn('relative group', className)}>
      <button type="button" className="hover:text-foreground flex items-center gap-1" title="View sources">
        <BookOpen className="h-3 w-3" />
        <span>{sources.length}</span>
      </button>
      <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-50 w-64 bg-popover border rounded-md shadow-lg p-2 text-xs">
        <div className="font-medium mb-1">Sources:</div>
        {sources.map((source, idx) => (
          <div key={idx} className="py-1 border-t first:border-t-0">
            <div className="flex items-center gap-1">
              <span className={source.type === PageType.CURRENT_PAGE ? 'text-blue-500' : 'text-green-500'}>
                {source.type === PageType.CURRENT_PAGE ? <FileText className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
              </span>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline truncate block max-w-[200px]"
                title={source.url}
              >
                {source.title}
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
