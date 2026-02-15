/**
 * Unit tests for src/background/handlers/model.ts
 */

import { RECOMMENDED_MODELS } from '@/utils/constants';
import {
  handleGetRecommendedModels,
  handleLoadModel,
  handleUnloadModel,
  handleGetModelStatus,
  handleGetModels,
  handleGetCachedModels,
  handleStop,
} from '@/entrypoints/background/handlers/model';

jest.mock('@/entrypoints/background/offscreen', () => ({
  sendMessageToOffscreenWithRetry: jest.fn(),
}));

import { sendMessageToOffscreenWithRetry } from '@/entrypoints/background/offscreen';

const mockSendToOffscreen = sendMessageToOffscreenWithRetry as jest.MockedFunction<typeof sendMessageToOffscreenWithRetry>;

describe('model handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.chrome as any).storage.local.set.mockResolvedValue(undefined);
    (global.chrome as any).storage.local.remove.mockResolvedValue(undefined);
  });

  describe('handleGetRecommendedModels', () => {
    it('returns recommended models from constants', () => {
      const result = handleGetRecommendedModels();
      expect(result).toEqual({ recommended: RECOMMENDED_MODELS });
      expect(mockSendToOffscreen).not.toHaveBeenCalled();
    });
  });

  describe('handleLoadModel', () => {
    it('sets storage, sends to offscreen, and returns success', async () => {
      mockSendToOffscreen.mockResolvedValue({ success: true });
      const result = await handleLoadModel('test-model-id');
      expect((global.chrome as any).storage.local.set).toHaveBeenCalledWith({ selectedModel: 'test-model-id' });
      expect(mockSendToOffscreen).toHaveBeenCalledWith({
        action: 'offscreen_loadModel',
        modelId: 'test-model-id',
      });
      expect(result).toEqual({ success: true });
    });

    it('returns error when offscreen fails', async () => {
      mockSendToOffscreen.mockRejectedValue(new Error('Offscreen unavailable'));
      const result = await handleLoadModel('test-model');
      expect(result).toEqual({ error: 'Error: Offscreen unavailable' });
    });

    it('returns error when response is null/undefined', async () => {
      mockSendToOffscreen.mockResolvedValue(null);
      const result = await handleLoadModel('test-model');
      expect(result).toEqual({ error: 'No response' });
    });
  });

  describe('handleUnloadModel', () => {
    it('removes storage, sends unload, returns success', async () => {
      mockSendToOffscreen.mockResolvedValue({ success: true });
      const result = await handleUnloadModel();
      expect((global.chrome as any).storage.local.remove).toHaveBeenCalledWith('selectedModel');
      expect(mockSendToOffscreen).toHaveBeenCalledWith({ action: 'offscreen_unload' });
      expect(result).toEqual({ success: true });
    });

    it('returns success when response is null (default)', async () => {
      mockSendToOffscreen.mockResolvedValue(null);
      const result = await handleUnloadModel();
      expect(result).toEqual({ success: true });
    });

    it('returns error when offscreen throws', async () => {
      mockSendToOffscreen.mockRejectedValue(new Error('Unload failed'));
      const result = await handleUnloadModel();
      expect(result).toEqual({ error: 'Error: Unload failed' });
    });
  });

  describe('handleGetModelStatus', () => {
    it('returns status from offscreen', async () => {
      mockSendToOffscreen.mockResolvedValue({ loaded: true, currentModel: 'model-x' });
      const result = await handleGetModelStatus();
      expect(mockSendToOffscreen).toHaveBeenCalledWith({ action: 'offscreen_getStatus' });
      expect(result).toEqual({ loaded: true, currentModel: 'model-x' });
    });

    it('returns loaded: false when response is null', async () => {
      mockSendToOffscreen.mockResolvedValue(null);
      const result = await handleGetModelStatus();
      expect(result).toEqual({ loaded: false });
    });

    it('returns error when offscreen throws', async () => {
      mockSendToOffscreen.mockRejectedValue(new Error('Status failed'));
      const result = await handleGetModelStatus();
      expect(result).toEqual({ loaded: false, error: 'Error: Status failed' });
    });
  });

  describe('handleGetModels', () => {
    it('returns models array from offscreen', async () => {
      mockSendToOffscreen.mockResolvedValue(['model1', 'model2']);
      const result = await handleGetModels();
      expect(mockSendToOffscreen).toHaveBeenCalledWith({ action: 'offscreen_getModels' });
      expect(result).toEqual(['model1', 'model2']);
    });

    it('returns empty array when response is null', async () => {
      mockSendToOffscreen.mockResolvedValue(null);
      const result = await handleGetModels();
      expect(result).toEqual([]);
    });

    it('returns error object when offscreen throws', async () => {
      mockSendToOffscreen.mockRejectedValue(new Error('Get models failed'));
      const result = await handleGetModels();
      expect(result).toEqual({ error: 'Error: Get models failed' });
    });
  });

  describe('handleGetCachedModels', () => {
    it('returns cached models from offscreen', async () => {
      mockSendToOffscreen.mockResolvedValue({ cachedModels: ['cached1'] });
      const result = await handleGetCachedModels();
      expect(mockSendToOffscreen).toHaveBeenCalledWith({ action: 'offscreen_getCachedModels' });
      expect(result).toEqual({ cachedModels: ['cached1'] });
    });

    it('returns empty cachedModels when response has none', async () => {
      mockSendToOffscreen.mockResolvedValue({});
      const result = await handleGetCachedModels();
      expect(result).toEqual({ cachedModels: [] });
    });

    it('returns error when offscreen throws', async () => {
      mockSendToOffscreen.mockRejectedValue(new Error('Cached failed'));
      const result = await handleGetCachedModels();
      expect(result).toEqual({ cachedModels: [], error: 'Error: Cached failed' });
    });
  });

  describe('handleStop', () => {
    it('sends stop to offscreen and returns success', async () => {
      mockSendToOffscreen.mockResolvedValue(undefined);
      const result = await handleStop();
      expect(mockSendToOffscreen).toHaveBeenCalledWith({ action: 'offscreen_stop' });
      expect(result).toEqual({ success: true });
    });

    it('returns error when offscreen throws', async () => {
      mockSendToOffscreen.mockRejectedValue(new Error('Stop failed'));
      const result = await handleStop();
      expect(result).toEqual({ error: 'Error: Stop failed' });
    });
  });
});
