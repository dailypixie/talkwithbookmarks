import React from 'react';
import { Send, Square } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { cn } from '@/utils';

export interface ChatInputFormProps {
  className?: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isGenerating: boolean;
  modelLoaded: boolean;
}

export function ChatInputForm({ className, inputValue, onInputChange, onSend, onStop, isGenerating, modelLoaded }: ChatInputFormProps) {
  return (
    <div className={cn('p-3 border-t bg-background flex gap-2', className)}>
      <Input
        value={inputValue}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSend()}
        placeholder="Ask your bookmarks..."
        disabled={isGenerating}
        className="flex-1"
      />
      {!isGenerating ? (
        <Button onClick={onSend} disabled={!inputValue || !modelLoaded}>
          <Send className="h-4 w-4" />
        </Button>
      ) : (
        <Button variant="destructive" onClick={onStop}>
          <Square className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
