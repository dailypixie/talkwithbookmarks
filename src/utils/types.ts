// ======================
// Enums
// ======================
export enum Roles {
  USER = 'user',
  ASSISTANT = 'assistant',
}

export enum MessageAction {
  // Indexing
  GET_INDEXING_PROGRESS = 'getIndexingProgress',
  START_INDEXING = 'startIndexing',
  PAUSE_INDEXING = 'pauseIndexing',
  RESUME_INDEXING = 'resumeIndexing',

  // Debug
  GET_DEBUG_DATA = 'getDebugData',
  CLEAR_DATA = 'clearData',

  // Database Management
  EXPORT_DATABASE = 'exportDatabase',
  IMPORT_DATABASE = 'importDatabase',

  // Misc
  START = 'start',
  PING = 'ping',
}

/** Indexing status states */
export enum IndexingStatus {
  IDLE = 'idle',
  INDEXING = 'indexing',
  PAUSED = 'paused',
  DONE = 'done',
  ERROR = 'error',
}

/** Result of indexing a single page */
export enum IndexResult {
  INDEXED = 'indexed',
  SKIPPED = 'skipped',
  FAILED = 'failed',
}

/** Page type classification */
export enum PageType {
  ARTICLE = 'article',
  WEBAPP = 'webapp',
  NAVIGATION = 'navigation',
  ERROR = 'error',
  UNKNOWN = 'unknown',
  /** Chat context: current page content */
  CURRENT_PAGE = 'current_page',
  /** Chat context: bookmark */
  BOOKMARK = 'bookmark',
}

/** Pipeline processing stages */
export enum PipelineStage {
  DOWNLOAD = 'download',
  CHUNK = 'chunk',
}

/** Status of a stage queue item */
export enum StageItemStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/** Status of a stage queue item */
export enum StageItemQueueStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  CHUNKING = 'chunking',
  CHUNKED = 'chunked',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

// ======================
// Interfaces
// ======================
/** Item in the stage processing queue */
export interface StageQueueItem {
  id: string;
  url: string;
  title: string;
  /** Current stage being processed */
  stage: PipelineStage;
  /** Internal processing status within current stage */
  status: StageItemStatus;
  /** Overall pipeline queue status - tracks where item left off for resume */
  queueStatus: StageItemQueueStatus;
  /** Raw HTML content (after download stage) */
  rawHtml?: string;
  /** Extracted text content (after chunk stage) */
  textContent?: string;
  /** Semantic chunks (after chunk stage) */
  chunks?: { text: string; position: number }[];
  /** Error message if failed */
  error?: string;
  /** Retry count */
  retryCount?: number;
  /** Timestamps */
  createdAt: number;
  updatedAt: number;
}

export type PageItem = {
  id: string;
  url: string;
  title: string;
  content: string;
  timestamp: number;
  processed: number;
  indexedAt?: number;
  error?: string;
  pageType?: PageType;
  /** Priority for indexing queue (higher = processed first, default 0) */
  priority?: number;
  [key: string]: any;
};

export interface IndexingProgress {
  total: number;
  processed: number;
  /** Number of pages that failed to index (counted as attempted, not pending) */
  failed?: number;
  current?: string;
  status: IndexingStatus;
}

/** Statistics from a completed indexing run */
export interface IndexingStats {
  indexed: number;
  skipped: number;
  failed: number;
  durationMs: number;
  failureReasons?: Map<string, number>;
}

/** Configuration for retry behavior */
export interface RetryConfig {
  maxRetries: number;
  delays: number[]; // Delay in ms before each retry attempt
}

export type SliceItem = {
  id: string;
  url: string;
  title: string;
  text: string;
  section?: string; // Closest header
  position?: number; // Order in document
};

export type Conversation = {
  id?: number;
  title: string;
  url?: string;
  updatedAt: number;
};

export type Source = {
  title: string;
  url: string;
  type: PageType;
};

export type Message = {
  id?: number;
  conversationId: number;
  role: Roles;
  content: string;
  context?: string;
  sources?: Source[];
  createdAt: number;
};

/** Interface for data source plugins */
export interface DataSource {
  readonly type: 'bookmarks' | 'history' | 'custom';
  readonly name: string;
  fetchItems(): Promise<PageItem[]>;
  onNewItem(callback: (item: PageItem) => void): void;
  onRemovedItem(callback: (id: string) => void): void;
}

/** Pipeline events for progress reporting */
export interface PipelineEvent {
  type:
  | 'started'
  | 'progress'
  | 'item-completed'
  | 'stage-completed'
  | 'paused'
  | 'resumed'
  | 'error'
  | 'completed';
  stage?: PipelineStage;
  progress?: MultiStageProgress;
  itemId?: string;
  itemUrl?: string;
  error?: string;
  timestamp: number;
}

export interface MultiStageProgress {
  stage: PipelineStage;
  total: number;
  completed: number;
  inProgress: number;
  failed: number;
  percentComplete: number;
  estimatedSecondsRemaining: number;
}

export interface StageProgress {
  stage: PipelineStage;
  queueSize: number;
  activeWorkers: number;
  processed: number;
  failed: number;
}

export interface StageMetrics {
  startTime: number;
  itemsSkipped: number;
  stage: PipelineStage;
  itemsProcessed: number;
  itemsIndexed: number;
  itemsFailed: number;
  avgTimePerItem: number;
  peakActiveWorkers: number;
}

export interface PipelineState {
  isRunning: boolean;
  isPaused: boolean;
  currentStage?: PipelineStage;
  metrics: StageMetrics;
  resumeFrom?: PipelineStage;
}

export interface PipelineConfig {
  concurrency?: Partial<Record<PipelineStage, number>>;
  skipStages?: PipelineStage[];
  retryConfig?: RetryConfig;
}

// ======================
// Type Definitions
// ======================
export type DatabaseExport = {
  version: number;
  exportedAt: number;
  pages: PageItem[];
  slices: SliceItem[];
  conversations: Conversation[];
  messages: Message[];
};

export interface ImportOptions {
  replace: boolean;
  onProgress?: (progress: number) => void;
}

