import React from 'react';

export interface IndexingInfoFooterProps {
  className?: string;
  children?: React.ReactNode;
}

const DEFAULT_MESSAGE = 'Bookmarks are downloaded and split into semantic chunks for easy processing.';

export function IndexingInfoFooter({ className, children = DEFAULT_MESSAGE }: IndexingInfoFooterProps) {
  return (
    <div className={`text-xs text-gray-600 text-center ${className ?? ''}`}>
      <p>{children}</p>
    </div>
  );
}
