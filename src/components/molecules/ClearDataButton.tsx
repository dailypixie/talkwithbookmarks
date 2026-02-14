import React from 'react';

export interface ClearDataButtonProps {
  className?: string;
  onClick: () => void;
  label?: string;
}

export function ClearDataButton({
  className,
  onClick,
  label = 'Clear Data',
}: ClearDataButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition text-sm ${className ?? ''}`}
    >
      {label}
    </button>
  );
}
