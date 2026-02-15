import { MessageAction } from './types';

export class Runtime {
  static getIndexingProgress() {
    return chrome.runtime.sendMessage({
      action: MessageAction.GET_INDEXING_PROGRESS,
    });
  }

  static getConversationList(limit = 50, offset = 0) {
    return chrome.runtime.sendMessage({
      action: MessageAction.GET_CONVERSATION_LIST,
      limit,
      offset,
    });
  }

  static startIndexing() {
    return chrome.runtime.sendMessage({
      action: MessageAction.START_INDEXING,
    });
  }

  static pauseIndexing() {
    return chrome.runtime.sendMessage({
      action: MessageAction.PAUSE_INDEXING,
    });
  }

  static resumeIndexing() {
    return chrome.runtime.sendMessage({
      action: MessageAction.RESUME_INDEXING,
    });
  }

  static clearAllData() {
    return chrome.runtime.sendMessage({
      action: MessageAction.CLEAR_DATA,
    });
  }

  static clearIndexedData() {
    return chrome.runtime.sendMessage({
      action: MessageAction.CLEAR_INDEXED_DATA,
    });
  }

  static IndexManualUrls(urls: string[]) {
    return chrome.runtime.sendMessage({
      action: MessageAction.INDEX_MANUAL_URLS,
      urls,
    });
  }

  static getModelStatus() {
    return chrome.runtime.sendMessage({
      action: MessageAction.GET_MODEL_STATUS,
    });
  }

  static getRecommendedModels() {
    return chrome.runtime.sendMessage({
      action: MessageAction.GET_RECOMMENDED_MODELS,
    });
  }

  static getModels() {
    return chrome.runtime.sendMessage({
      action: MessageAction.GET_MODELS,
    });
  }

  static getCachedModels() {
    return chrome.runtime.sendMessage({
      action: MessageAction.GET_CACHED_MODELS,
    });
  }

  static loadModel(modelId: string) {
    return chrome.runtime.sendMessage({
      action: MessageAction.LOAD_MODEL,
      modelId,
    });
  }

  static unloadModel() {
    return chrome.runtime.sendMessage({
      action: MessageAction.UNLOAD_MODEL,
    });
  }

  static getHistory(url: string, conversationId?: number) {
    return chrome.runtime.sendMessage({
      action: MessageAction.GET_HISTORY,
      url,
      conversationId,
    });
  }

  static chat(messages: Array<{ role: string; content: string }>, originalContent: string, url: string, context: string, sources: any[]) {
    return chrome.runtime.sendMessage({
      action: MessageAction.CHAT,
      messages,
      originalContent,
      url,
      context,
      sources,
    });
  }

  static searchContext(query: string, topK: number) {
    return chrome.runtime.sendMessage({
      action: MessageAction.SEARCH_CONTEXT,
      query,
      topK,
    });
  }

  static searchVectorContext(query: string, topK: number) {
    return chrome.runtime.sendMessage({
      action: MessageAction.SEARCH_VECTOR_CONTEXT,
      query,
      topK,
    });
  }

  static hybridSearch(query: string, topK: number): Promise<any> {
    const resVectorPromise = this.searchVectorContext(query, topK);
    const resBM25Promise = this.searchContext(query, topK);
    return Promise.all([resVectorPromise, resBM25Promise]).then(([vector, bm25]) => {
      // Simple hybrid logic: combine and deduplicate results
      return { ...vector, bm25, results: [...vector.results, ...bm25.results] };
    });
  }

  static stop() {
    return chrome.runtime.sendMessage({
      action: MessageAction.STOP,
    });
  }

  static getPageSummary(url: string) {
    return chrome.runtime.sendMessage({
      action: MessageAction.GET_PAGE_SUMMARY,
      url,
    });
  }

  static generateSummary(url: string, content: string, title: string) {
    return chrome.runtime.sendMessage({
      action: MessageAction.GENERATE_SUMMARY,
      url,
      content,
      title,
    });
  }

  static onMessage(callback: (msg: any) => void) {
    chrome.runtime.onMessage.addListener(callback);
  }

  static removeMessageListener(callback: (msg: any) => void) {
    chrome.runtime.onMessage.removeListener(callback);
  }
}
