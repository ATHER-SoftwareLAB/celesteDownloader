# ADR-002: Zustand for Frontend State Management

**Date**: 2026-08-17  
**Status**: Accepted  
**Author**: Antonio Torres  
**Deciders**: Antonio Torres, Frontend Team

---

## Context

The frontend (React 18) requires a state management solution to handle:
- Download progress (progress %, speed, ETA)
- Download history (in-memory list)
- User settings (quality preference, save path, theme)
- UI state (current page, modal visibility, error messages)

### Requirements
- [[REQUIREMENTS.md#FR5|FR5]]: Real-time progress display
- [[REQUIREMENTS.md#FR6|FR6]]: Session download history
- [[REQUIREMENTS.md#FR7|FR7]]: Settings panel

### Candidates Evaluated
1. **Redux** - Industry standard, complex
2. **MobX** - Decorator-based, requires TypeScript
3. **Zustand** - Minimal, hooks-based, very light
4. **Jotai** - Atom-based, functional
5. **Context API** - Built-in React, insufficient for complex state

### Selection Criteria
- Learning curve (team familiarity)
- Bundle size impact
- TypeScript support
- WebSocket integration ease
- Testing simplicity

---

## Decision

**We will use Zustand for frontend state management.**

### Store Architecture

```typescript
// store/downloadStore.ts
import { create } from 'zustand';

interface DownloadState {
  // Current download
  currentDownload: {
    videoUrl: string;
    videoTitle: string;
    quality: '720p' | '1080p' | 'audio';
    progress: number;      // 0-100
    speed: number;         // bytes/sec
    eta: number;           // seconds
    status: 'idle' | 'fetching' | 'downloading' | 'verifying' | 'complete' | 'error';
    error?: string;
  } | null;
  
  // History (session-only, see ADR-001)
  downloadHistory: DownloadRecord[];
  
  // Settings (in localStorage)
  settings: {
    defaultQuality: '720p' | '1080p' | 'audio';
    savePath: string;      // default: ~/Downloads
    theme: 'light' | 'dark' | 'system';
  };
  
  // UI state
  uiState: {
    currentPage: 'main' | 'history' | 'settings' | 'about';
    showLegalModal: boolean;
    showErrorModal: boolean;
  };
  
  // Actions
  updateProgress: (progress: number, speed: number, eta: number) => void;
  setDownloadStatus: (status: string) => void;
  addToHistory: (record: DownloadRecord) => void;
  clearHistory: () => void;
  updateSettings: (partial: Partial<DownloadState['settings']>) => void;
  setCurrentPage: (page: string) => void;
  // ... more actions
}

export const useDownloadStore = create<DownloadState>((set) => ({
  currentDownload: null,
  downloadHistory: [],
  settings: {
    defaultQuality: '720p',
    savePath: getDownloadsPath(),
    theme: 'system',
  },
  uiState: {
    currentPage: 'main',
    showLegalModal: !hasAcceptedLegal(),
    showErrorModal: false,
  },
  
  updateProgress: (progress, speed, eta) =>
    set((state) => ({
      currentDownload: state.currentDownload ? { ...state.currentDownload, progress, speed, eta } : null,
    })),
  
  // ... other actions
}));
```

### Integration Points

**Frontend Components**:
```tsx
// In React components
const { currentDownload, updateProgress } = useDownloadStore();

return (
  <div>
    <ProgressBar value={currentDownload?.progress ?? 0} />
    <Speed>{currentDownload?.speed} MB/s</Speed>
  </div>
);
```

**WebSocket Updates**:
```typescript
// In API client (api/websocket.ts)
const socket = new WebSocket('ws://localhost:8000/progress');
socket.onmessage = (event) => {
  const { progress, speed, eta } = JSON.parse(event.data);
  useDownloadStore.getState().updateProgress(progress, speed, eta);
};
```

**Settings Persistence**:
```typescript
// Persist to localStorage on settings change
useDownloadStore.subscribe(
  (state) => state.settings,
  (settings) => localStorage.setItem('celeste_settings', JSON.stringify(settings))
);
```

---

## Rationale

### Why Zustand?

1. **Minimal Bundle Impact**
   - ~2KB gzipped (vs Redux ~7KB + middleware)
   - No boilerplate (actions, reducers, middleware)
   - No need for normalization libraries

2. **Simple API**
   - Hooks-based: `useDownloadStore()` (familiar to React 18 developers)
   - Direct mutations: `set(state => ({ ... }))` (vs immutable reduces clutter)
   - Publish/subscribe pattern (native to state needs)

3. **Perfect for MVP Scope**
   - 4-5 state slices (download, history, settings, ui)
   - No cross-cutting concerns (middleware not needed)
   - Clear separation of concerns

4. **TypeScript First**
   - Automatic type inference
   - No decorator overhead (like MobX)
   - Full IntelliSense support

5. **WebSocket Integration**
   - Direct mutation via `getState()` from async handlers
   - No action dispatch boilerplate
   - Real-time progress updates: `socket.onmessage → updateProgress()`

6. **Testing Simplicity**
   - No provider wrapping needed (vs Redux, Context)
   - Test actions directly: `store.updateProgress(50, 2.5, 120)`
   - Easier snapshots

### Why Not Redux?

- **Boilerplate heavy**: Actions + Reducers + Middleware + Selectors = 5x code
- **Learning curve**: Complex for 4 junior developers
- **Overkill for MVP**: Redux shines with 20+ state slices, normalization
- **Time cost**: ~5 hours extra setup & training

### Why Not Context API?

- **Performance**: Re-renders all consumers on any state change (no fine-grained updates)
- **Boilerplate**: Still need reducer hook or custom hooks
- **DevTools**: No time-travel debugging (Zustand has devtools plugin)

### Why Not Jotai?

- **Learning curve**: Atom-based model less familiar to team
- **Ecosystem**: Fewer examples & community resources
- **Bundle size**: Similar to Zustand, but less mature

---

## Consequences

### Positive
✅ Lightweight bundle (< 150KB total gzipped)  
✅ Fast iteration (no boilerplate)  
✅ Excellent TypeScript support  
✅ Real-time updates are straightforward (WebSocket)  
✅ Testing is simple (no provider wrapping)  
✅ DevTools plugin available (time-travel debugging)  
✅ Low learning curve for team

### Negative
❌ Smaller ecosystem (vs Redux)  
❌ Fewer articles/tutorials online  
❌ No middleware pattern (if needed, must extend)  
❌ DevTools plugin is optional (not built-in like Redux)  

### Mitigations
- Use Zustand devtools plugin from day 1
- Document store shape in team wiki
- Team training session (30 min) on Zustand patterns
- Link to official Zustand docs in codebase

---

## Store Slices Strategy

**Planned store structure**:

```
useDownloadStore
├── currentDownload: { status, progress, speed, eta, error }
├── downloadHistory: DownloadRecord[]
├── settings: { quality, path, theme }
├── uiState: { page, modals }
└── actions: { updateProgress, addToHistory, clearHistory, ... }
```

**Rationale**: Single store is simpler than multiple stores (less coordination logic).

**Future**: If store grows >100 lines, split into separate hooks (e.g., `useSettingsStore`).

---

## Implementation Checklist

- [ ] **Day 1**: Install Zustand, create `store/downloadStore.ts`
- [ ] **Day 1**: Connect WebSocket `onmessage` to `updateProgress` action
- [ ] **Day 2**: Add localStorage persistence for settings
- [ ] **Day 2**: Wire up history UI to `downloadHistory` state
- [ ] **Day 3**: Add devtools plugin for debugging
- [ ] **Day 4**: Write store unit tests (jest snapshots)

### Code Review Checklist
- [ ] All actions are pure functions (no side effects)
- [ ] Store is imported at component level, not globally
- [ ] Settings persistence tested (localStorage survives reload)
- [ ] History limit enforced (max 20 entries, LRU eviction)
- [ ] WebSocket error handling updates error state correctly

---

## Related ADRs & Requirements

- **ADR-001**: Session-only history (compatible with Zustand in-memory store)
- **ADR-003**: FastAPI backend (WebSocket progress → Zustand actions)
- **[[REQUIREMENTS.md#FR5|FR5]]**: Real-time progress (Zustand updates from WebSocket)
- **[[REQUIREMENTS.md#FR7|FR7]]**: Settings (Zustand + localStorage)
- **[[DESIGN.md|Design]]**: Component state management

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-08-17 | Antonio Torres | Initial acceptance |

