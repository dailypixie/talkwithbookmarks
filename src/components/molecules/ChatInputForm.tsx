import React, { useState } from 'react';
import { Send, Square } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { cn } from '@/utils';

export interface ChatInputFormProps {
  className?: string;
  onSend: (value: string) => void;
  onStop: () => void;
  isGenerating: boolean;
  modelLoaded: boolean;
}

export function ChatInputForm({ className, onSend, onStop, isGenerating, modelLoaded }: ChatInputFormProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !modelLoaded || isGenerating) return;
    onSend(trimmed);
    setInputValue('');
  };

  return (
    <div className={cn('p-3 border-t bg-background flex gap-2', className)}>
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        placeholder="Ask your bookmarks..."
        disabled={isGenerating}
        className="flex-1"
      />
      {!isGenerating ? (
        <Button onClick={handleSend} disabled={!inputValue || !modelLoaded}>
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
