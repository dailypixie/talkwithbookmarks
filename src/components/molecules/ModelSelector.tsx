import React from 'react';
import { Package, Star } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/atoms/select';
import { cn } from '@/utils';

export interface ModelSelectorProps {
  className?: string;
  container?: HTMLElement | null;
  models: string[];
  selectedModel: string;
  disabled?: boolean;
  cachedModels?: Set<string>;
  recommendedModels?: Set<string>;
  onValueChange: (value: string) => void;
}

export function ModelSelector({
  className,
  container,
  models,
  selectedModel,
  disabled,
  cachedModels,
  recommendedModels,
  onValueChange,
}: ModelSelectorProps) {
  return (
    <div className="flex-1">
      <Select value={selectedModel} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={cn('h-9 w-full', className)}>
          <SelectValue placeholder="Select a model..." />
        </SelectTrigger>
        <SelectContent container={container}>
          {models.map((model) => (
            <SelectItem key={model} value={model}>
              <span className="flex items-center gap-2">
                {recommendedModels?.has(model) && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                {cachedModels?.has(model) && <Package className="h-3 w-3 text-muted-foreground" />}
                {model.split('/').pop() || model}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
