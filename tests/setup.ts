/**
 * Jest test setup
 * Configures test environment and global mocks
 */

import 'fake-indexeddb/auto';

// Mock chrome API
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn(),
    onInstalled: {
      addListener: jest.fn(),
    },
  },
  bookmarks: {
    getTree: jest.fn(),
    onCreated: {
      addListener: jest.fn(),
    },
    onRemoved: {
      addListener: jest.fn(),
    },
  },
  storage: {
    local: {
      get: jest.fn((_keys, cb?: (result: Record<string, unknown>) => void) => {
        if (cb) cb({});
        return Promise.resolve({});
      }),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    },
    onChanged: {
      addListener: jest.fn(),
    },
  },
  sidePanel: {
    setPanelBehavior: jest.fn().mockResolvedValue(undefined),
  },
  tabs: {
    query: jest.fn(),
    connect: jest.fn(),
  },
} as any;

// Mock fetch
global.fetch = jest.fn();

// Suppress console in tests unless explicitly enabled
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
const originalDebug = console.debug;

beforeEach(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  console.debug = jest.fn();
});

afterEach(() => {
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
  console.debug = originalDebug;
  jest.clearAllMocks();
});
