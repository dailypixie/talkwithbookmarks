/**
 * Pipeline Event Emitter
 *
 * Provides a type-safe event system for the indexing pipeline using native EventTarget.
 */

import { pipelineLogger as logger } from '@/utils/logger';

/**
 * Type-safe event emitter for pipeline events.
 * Extends native EventTarget for browser compatibility.
 */
export class PipelineEventEmitter extends EventTarget {
  private listeners: Map<string, Set<(payload: Record<string, unknown>) => void>> = new Map();

  /**
   * Subscribe to a pipeline event
   */
  on(eventType: string, callback: (payload: Record<string, unknown>) => void): void {
    // Track callback for off() method
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Use native addEventListener with wrapper
    const wrapper = (event: Event) => {
      const customEvent = event as CustomEvent;
      callback(customEvent.detail);
    };

    // Store reference to wrapper for removal
    (callback as any).__wrapper = wrapper;
    this.addEventListener(eventType, wrapper);
  }

  /**
   * Unsubscribe from a pipeline event
   */
  off(eventType: string, callback: (payload: any) => void): void {
    const wrapper = (callback as any).__wrapper;
    if (wrapper) {
      this.removeEventListener(eventType, wrapper);
    }

    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * Emit a pipeline event (internal use)
   */
  emit(eventType: string, detail: any): void {
    logger.debug(`Pipeline event: ${eventType}`, detail);

    const event = new CustomEvent(eventType, { detail });
    this.dispatchEvent(event);
  }

  /**
   * Clear all listeners (for cleanup)
   */
  clear(): void {
    this.listeners.clear();
  }
}

export const pipelineEvents = new PipelineEventEmitter();
