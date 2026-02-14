import React, { useEffect, useRef, useState } from 'react';
import { Bookmark, BookOpen, FileText } from 'lucide-react';
import { cn } from '@/utils';
import { PageType, Source } from '@/utils/types';

export interface SourceListProps {
  className?: string;
  sources?: Partial<Source>[];
}

export function SourceList({ className, sources: rawSources }: SourceListProps) {
  if (!rawSources?.length) return null;

  const sources = [...new Map(rawSources?.map((s) => [s.title, s])).values()].filter((s) => s.type !== PageType.CURRENT_PAGE);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const isOpen = isPinnedOpen || isHovering;

  useEffect(() => {
    if (!isPinnedOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsPinnedOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isPinnedOpen]);

  return (
    <div
      ref={containerRef}
      className={cn('relative group', className)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <button
        type="button"
        className="hover:text-foreground flex items-center gap-1"
        title={isPinnedOpen ? 'Hide sources' : 'View sources'}
        aria-expanded={isOpen}
        onClick={() => setIsPinnedOpen((prev) => !prev)}
      >
        <BookOpen className="h-3 w-3" />
        <span>{sources.length}</span>
      </button>
      <div
        className={cn(
          'absolute bottom-full left-0 mb-1 z-50 w-64 bg-popover border rounded-md shadow-lg p-2 text-xs',
          isOpen ? 'block' : 'hidden'
        )}
      >
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
