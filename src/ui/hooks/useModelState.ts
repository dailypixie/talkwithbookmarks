import { useEffect, useState } from 'react';

export interface UseModelStateResult {
  models: string[];
  modelsError: string | null;
  cachedModels: Set<string>;
  recommendedModels: Set<string>;
  selectedModel: string;
  modelLoaded: boolean;
  modelLoadingText: string;
  loadingProgress: number;
  loadModel: (modelId: string) => Promise<void>;
  unloadModel: () => Promise<void>;
  refreshModels: () => void;
}

export function useModelState(): UseModelStateResult {
  const [models, setModels] = useState<string[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [cachedModels, setCachedModels] = useState<Set<string>>(new Set());
  const [recommendedModels, setRecommendedModels] = useState<Set<string>>(new Set());
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelLoadingText, setModelLoadingText] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    fetchModels();
    fetchCachedModels();
    checkModelStatus();

    const handleMessage = (msg: { action: string; modelId?: string; progress?: number; text?: string }) => {
      if (msg.action === 'modelProgress') {
        setModelLoadingText(msg.text ?? '');
        setLoadingProgress(msg.progress ?? 0);
      } else if (msg.action === 'modelLoaded') {
        setSelectedModel(msg.modelId ?? '');
        setModelLoaded(true);
        setModelLoadingText('');
        setLoadingProgress(0);
      } else if (msg.action === 'modelUnloaded') {
        setModelLoaded(false);
        setSelectedModel('');
        setModelLoadingText('');
        setLoadingProgress(0);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const fetchModels = async () => {
    setModelsError(null);
    try {
      let recs = new Set<string>();
      try {
        const r = await chrome.runtime.sendMessage({ action: 'getRecommendedModels' });
        if (r?.recommended) {
          recs = new Set(Object.values(r.recommended) as string[]);
          setRecommendedModels(recs);
        }
      } catch {
        // ignore
      }
      const res = await chrome.runtime.sendMessage({ action: 'getModels' });
      if (Array.isArray(res)) {
        const sorted = [...res].sort((a, b) => {
          const isRecA = recs.has(a);
          const isRecB = recs.has(b);
          if (isRecA && !isRecB) return -1;
          if (!isRecA && isRecB) return 1;
          return a.localeCompare(b);
        });
        setModels(sorted);
        if (sorted.length === 0) setModelsError('No models available.');
      } else {
        const msg = (res as { error?: string })?.error ?? 'Could not load models.';
        setModelsError(msg);
        setModels([]);
      }
    } catch (e) {
      console.error(e);
      setModelsError('Could not load models. Try again.');
      setModels([]);
    }
  };

  const fetchCachedModels = async () => {
    try {
      const res = await chrome.runtime.sendMessage({ action: 'getCachedModels' });
      if (res?.cachedModels) setCachedModels(new Set(res.cachedModels));
    } catch (e) {
      console.error(e);
    }
  };

  const checkModelStatus = async () => {
    try {
      const res = await chrome.runtime.sendMessage({ action: 'getModelStatus' });
      if (res?.loaded) {
        setSelectedModel(res.currentModel ?? '');
        setModelLoaded(true);
        setModelLoadingText('');
      } else if (res?.isLoading) {
        setModelLoadingText('Loading model...');
      } else {
        setModelLoaded(false);
        const stored = await chrome.storage.local.get('selectedModel');
        if (stored.selectedModel) setSelectedModel(stored.selectedModel);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadModel = async (modelId: string) => {
    if (!modelId) return;
    setModelLoadingText('Initializing...');
    try {
      const res = await chrome.runtime.sendMessage({ action: 'loadModel', modelId });
      if (res?.success) {
        setSelectedModel(modelId);
        setModelLoaded(true);
        setModelLoadingText('');
      } else {
        setModelLoadingText(res?.error ?? 'Error loading model');
      }
    } catch (e) {
      setModelLoadingText('Error: ' + e);
    }
  };

  const unloadModel = async () => {
    try {
      await chrome.runtime.sendMessage({ action: 'unloadModel' });
      setModelLoaded(false);
      setSelectedModel('');
    } catch (e) {
      console.error(e);
    }
  };

  const refreshModels = () => {
    checkModelStatus();
    fetchModels();
  };

  return {
    models,
    modelsError,
    cachedModels,
    recommendedModels,
    selectedModel,
    modelLoaded,
    modelLoadingText,
    loadingProgress,
    loadModel,
    unloadModel,
    refreshModels,
  };
}
