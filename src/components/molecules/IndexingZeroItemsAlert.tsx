import React from 'react';

export interface IndexingZeroItemsAlertProps {
  className?: string;
  message: string;
}

export function IndexingZeroItemsAlert({ className, message }: IndexingZeroItemsAlertProps) {
  return (
    <p className={`text-sm text-amber-700 mt-2 bg-amber-50 rounded p-2 ${className ?? ''}`}>
      {message}
    </p>
  );
}
