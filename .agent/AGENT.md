# Talk with Bookmarks – Agent Specification

A browser extension that indexes bookmarks, processes pages in chunks, and uses on-device AI (WebLLM) to chat and summarize.

## Tech Stack

- **UI**: React 19, TypeScript, Tailwind CSS 4, Radix UI primitives (cva, clsx, tailwind-merge)
- **AI**: WebLLM (@mlc-ai/web-llm) for on-device inference
- **Storage**: Dexie.js (IndexedDB)
- **Build**: Parcel with webextension config
- **Testing**: Jest

## Project Structure

```
src/
├── background/              # Service worker
│   ├── background.ts        # Message routing, forwards to handlers
│   ├── db.ts                # Dexie schema & helpers (getIndexingStats, clearDatabase)
│   ├── bookmarks.ts         # Bookmark data source (fetchItems)
│   ├── DatabaseService.ts   # DB service layer
│   ├── events.ts            # Event utilities
│   ├── offscreen.ts         # Offscreen document setup for WebLLM
│   ├── SimplePipeline.ts    # Indexing pipeline (download → chunk)
│   ├── handlers/            # Message handlers (imported by background.ts)
│   │   ├── index.ts
│   │   ├── chat.ts          # handleChat, handleGetHistory
│   │   ├── model.ts         # load/unload model, getStatus, getModels, etc.
│   │   ├── searchContext.ts # handleSearchContext
│   │   └── summary.ts       # handleGetPageSummary, handleGenerateSummary
│   └── stages/              # Pipeline stages
│       ├── index.ts
│       ├── DownloadStage.ts
│       ├── ChunkStage.ts
│       └── StageProcessor.ts
├── components/
│   ├── atoms/               # Button, Input, Progress, Select, Tabs
│   ├── molecules/
│   ├── organisms/
│   └── pages/               # ChatInterface, SummaryInterface
├── pages/
│   ├── bubble/              # Bubble UI + content script
│   ├── popup/               # Popup UI (PopupApp)
│   └── offscreen/           # Offscreen page for WebLLM
├── utils/
│   ├── types.ts             # Enums, types (MessageAction, IndexingStatus, etc.)
│   ├── constants.ts
│   ├── html.ts              # Text extraction / chunking
│   ├── logger.ts            # backgroundLogger, etc.
│   └── index.ts
├── lib/                     # Shared utilities
├── manifest.json
└── globals.css
```

## Coding Standards

### TypeScript

- Use explicit types for function parameters and returns
- Prefer `type` over `interface` for object shapes
- Use enums for fixed string sets (e.g. `MessageAction`, `IndexingStatus` in `@/utils/types`)

### React

- Functional components with hooks only
- State with `useState`, effects with `useEffect`
- Props destructuring in function signature

### Naming

| Type        | Convention                | Example             |
| ----------- | ------------------------- | ------------------- |
| Files       | PascalCase for components | `ChatInterface.tsx` |
| Files       | camelCase for modules     | `searchContext.ts`  |
| Functions   | camelCase                 | `handleChat()`      |
| Constants   | UPPER_SNAKE_CASE          | `STORAGE_KEY`       |
| Types/Enums | PascalCase                | `MessageAction`     |

### Message Passing

Background ↔ UI use `chrome.runtime.sendMessage`. Always send an `action` field. Async handlers must return `true` from the listener and call `sendResponse` when done.

```typescript
// Example
chrome.runtime.sendMessage({ action: 'searchContext', query: '...', topK: 5 }, callback);
```

Actions are handled in `background.ts`; implementation lives in `background/handlers/*.ts`.

### Error Handling

- Wrap async operations in try/catch
- Return `{ error: string }` on failure
- Log with a consistent prefix, e.g. `[Background]` or use `@/utils/logger` (e.g. `backgroundLogger`)

## Common Patterns

- **Imports**: Use the `@/` alias only; no relative paths.
- **Shell**: Use bash for commands, not PowerShell.

### Testing

- Prefer integration and end-to-end tests over unit tests.
- Mock as little as possible; test real code paths (e.g. use jsdom for browser APIs where appropriate).

### Adding a New Message Handler

1. Implement the handler in `src/background/handlers/` (e.g. `myAction.ts`), exporting a function that takes `(message, sender?)` and returns a result or Promise.
2. In `background.ts`, import the handler and add a branch:

```typescript
if (message.action === 'myAction') {
  sendResponse(await handleMyAction(message, sender));
  return;
}
```

3. The listener is async and returns `true` so the message channel stays open for `sendResponse`.

### Adding a UI Component

1. Create under `src/components/` in the right layer: `atoms/`, `molecules/`, `organisms/`, or `pages/`.
2. Reuse existing atoms (e.g. from `@/components/atoms/`) and Radix primitives.
3. Import with the `@/` alias.

## Commands

```bash
npm test           # Run Jest tests
npm run build      # Build extension (output in dist/)
npm run watch      # Watch and rebuild
npm run lint       # File naming + ESLint
```

Load the unpacked extension from `dist/` in Chrome (Developer mode).
