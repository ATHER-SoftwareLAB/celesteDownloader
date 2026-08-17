# ADR-001: No Persistent Database - Session-Only History

**Date**: 2026-08-17  
**Status**: Accepted  
**Author**: Antonio Torres  
**Deciders**: Antonio Torres, Development Team

---

## Context

Celeste Downloader requires a way to track user download history. The MVP scope is a simple desktop YouTube downloader with minimal complexity. The decision must balance between:

1. **User experience**: Users want to see what they've downloaded in current session
2. **Scope & complexity**: First release should be lean, no complex infrastructure
3. **Data persistence**: Should history survive app restart, or only current session?
4. **Platform constraints**: Desktop app with no backend persistence layer

### Requirements
- [[REQUIREMENTS.md#FR6|FR6]]: Show session-only download history
- [[REQUIREMENTS.md#C1|C1]]: No persistent database (session only)

### Trade-offs to Consider
- **Session-only**: Simple, fast, no DB maintenance → History lost on restart
- **SQLite persistence**: More complex, requires schema → History survives restarts
- **Cloud sync**: Most complex, requires backend → History available anywhere

---

## Decision

**We will NOT implement a persistent database. History will be stored in-memory (Zustand store) and cleared on app restart.**

### Implementation Details

**Frontend**:
- Store history in Zustand: `downloadHistory: DownloadRecord[]`
- Max 20 entries (LRU eviction if exceeded)
- Timestamp, title, quality, file size, file path
- Clear History button removes all entries from state
- No localStorage persistence (session only)

**DownloadRecord Interface**:
```typescript
interface DownloadRecord {
  id: string;              // UUID
  timestamp: Date;         // When download completed
  videoTitle: string;      // Video title from metadata
  quality: '720p' | '1080p' | 'audio';
  fileSize: number;        // Bytes
  filePath: string;        // Absolute path to saved file
  duration: number;        // Video duration in seconds
  status: 'success' | 'failed';
}
```

**Persistence Scope**: In-memory only (Zustand), cleared on app exit.

---

## Rationale

### Why Not Persistent Storage?

1. **MVP Scope**: Session history is sufficient for MVP users
   - Users typically re-open app for each download session
   - Persisting across restarts is a P2 feature

2. **Simplicity**: Eliminates need for:
   - Database setup & migration scripts
   - Schema versioning
   - Data cleanup/archiving logic
   - Cross-platform file path normalization (Windows vs Linux)

3. **Security**: No sensitive data written to disk
   - No database files to leak
   - No need for encryption-at-rest
   - Complies with "minimal logging" constraint [[REQUIREMENTS.md#C2|C2]]

4. **Performance**: Zero I/O overhead
   - History queries are in-memory (O(1) lookups)
   - No disk latency for history retrieval

5. **Development Speed**: No backend infrastructure required
   - Ship MVP faster (Day 1-4 sprint)
   - No database migrations, schema design
   - Can add persistence in v0.2.0-beta (P2)

### Why Not Cloud Persistence?

- Adds network dependency (backend required)
- Requires user authentication (out of scope)
- Violates "simple desktop app" principle
- Performance hit on every history query
- P2 feature, not MVP critical

---

## Consequences

### Positive
✅ Faster MVP development (no DB infrastructure)  
✅ Simple Zustand store, no external dependencies  
✅ Lower security surface (no persistent secrets)  
✅ Better performance (in-memory queries)  
✅ Cleaner architecture for MVP (single-process app)

### Negative
❌ History lost on app restart (expected, documented)  
❌ No cross-device sync  
❌ If app crashes, current download not in history  
❌ Cannot analyze usage patterns (no data retention)

### Mitigations
- Clear documentation: "History is session-only"
- Legal modal mentions: "No download history saved"
- Future P2 feature: optional SQLite persistence toggle
- Logging: Users can access file timestamps via filesystem

---

## Alternatives Considered

### Alternative 1: SQLite Local Database
- **Pros**: Persistence, standard, portable
- **Cons**: Adds 10+ files (schema, migrations), complexity, ~15 hours dev time
- **Decision**: Rejected for MVP, move to P2

### Alternative 2: localStorage (Browser-like)
- **Pros**: Web-like API, familiar to frontend engineers
- **Cons**: Desktop app has no localStorage equivalent, would need shim
- **Decision**: Rejected, use Zustand directly

### Alternative 3: Hybrid (localStorage + JSON File)
- **Pros**: Persistence without database
- **Cons**: Manual serialization, cross-platform path issues, complexity
- **Decision**: Rejected, too fragile for MVP

### Alternative 4: Cloud Backend (API)
- **Pros**: Scalable, cross-device sync
- **Cons**: Requires backend, auth, network dep, $$$
- **Decision**: Rejected, not MVP scope

---

## Follow-up Tasks

- [ ] **P2 Feature**: ADR-002 (TBD) - Add optional SQLite persistence in v0.2.0-beta
  - Create `migrations/` folder
  - Define `DownloadRecord` schema
  - Add settings toggle: "Remember download history"
  
- [ ] **Testing**: Verify Zustand store clears on app exit
  - Component test: `<History>` renders empty on fresh load
  - Integration test: Download → Close → Restart → History empty

- [ ] **Documentation**: Update user manual
  - Add note: "Download history is per session"
  - Add FAQ: "Where is my history? Why was it cleared?"

- [ ] **Monitoring**: Track if users request persistence feature
  - GitHub issues / feature requests
  - Usage metrics (if added in future)

---

## Related ADRs

- **ADR-002**: State management choice (Zustand) - complements this decision
- **ADR-003**: Backend framework (FastAPI) - no database layer needed
- **[[REQUIREMENTS.md#FR6|FR6]]**: Session history requirement
- **[[REQUIREMENTS.md#C1|C1]]**: Constraint: no persistent database

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-08-17 | Antonio Torres | Initial acceptance |

