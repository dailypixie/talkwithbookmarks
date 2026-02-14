import { Power, RefreshCw, History } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { cn } from '@/utils';
import { ModelSelector } from '@/components/molecules/ModelSelector';

export interface ChatHeaderProps {
  className?: string;
  container?: HTMLElement | null;
  models: string[];
  selectedModel: string;
  modelLoaded: boolean;
  loadingText: string;
  cachedModels?: Set<string>;
  recommendedModels?: Set<string>;
  onModelChange: (modelId: string) => void;
  onUnload: () => void;
  onRefresh: () => void;
  onHistoryClick: () => void;
}

export function ChatHeader({
  className,
  container,
  models,
  selectedModel,
  modelLoaded,
  loadingText,
  cachedModels,
  recommendedModels,
  onModelChange,
  onUnload,
  onRefresh,
  onHistoryClick,
}: ChatHeaderProps) {
  return (
    <div className={cn('flex gap-2 items-center p-3 border-b bg-muted/30', className)}>
      <div className="flex-1">
        <ModelSelector
          models={models}
          selectedModel={selectedModel}
          onValueChange={onModelChange}
          cachedModels={cachedModels}
          recommendedModels={recommendedModels}
          disabled={modelLoaded || !!loadingText}
          container={container}
        />
      </div>
      {modelLoaded ? (
        <Button variant="destructive" size="icon" className="h-9 w-9 shrink-0" onClick={onUnload} title="Unload Model">
          <Power className="h-4 w-4" />
        </Button>
      ) : (
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onRefresh} title="Refresh models and status">
          <RefreshCw className={cn('h-4 w-4', loadingText && 'animate-spin')} />
        </Button>
      )}
      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onHistoryClick} title="View History">
        <History className="h-4 w-4" />
      </Button>
    </div>
  );
}
