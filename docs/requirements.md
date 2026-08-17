# Celeste Downloader - Requirements

**Document Version**: v0.1.0-alpha  
**Last Updated**: 2026-08-17  
**Owner**: Antonio Torres

## Overview
Simple, beautiful YouTube downloader with real-time progress, download verification, and session-based history. MVP scope: desktop application (Windows .exe + Linux AppImage) with integrated download orchestration and SHA-256 integrity validation.

---

## Functional Requirements

### FR1: URL Input & Validation
**Requirement**: User shall input YouTube URLs via a text field with real-time validation.  
**SMART Criteria**:
- Input field must accept URLs matching pattern `^https?://(www\.)?youtube\.com/.*` or `youtu\.be/.*`
- Validation occurs on keystroke with visual feedback (<200ms)
- Invalid URLs display error message in <100ms
- Clear button to reset input
**Traces to**: [[ARCHITECTURE.md#Frontend|Frontend]], [[DESIGN.md#Main-Page|Design: Main Page]]  
**Status**: Ready for Dev

### FR2: Metadata Fetching
**Requirement**: System shall fetch and display video metadata before download.  
**SMART Criteria**:
- Fetch title, duration (HH:MM:SS), uploader name, thumbnail (360p preview)
- Response time <3 seconds for typical videos (cached or unavailable metadata graceful)
- Display metadata in preview card with thumbnail, title, uploader, duration
- "Fetch" button triggers `GET /metadata?url=...` endpoint
**Traces to**: [[ARCHITECTURE.md#Backend|Backend: yt-dlp Wrapper]], [[DESIGN.md#Preview-Card|Design: Preview Card]]  
**Status**: Ready for Dev

### FR3: Quality Selection & Download
**Requirement**: User shall select video quality and initiate download.  
**SMART Criteria**:
- Quality options: 720p, 1080p (if available), Audio-only (MP3)
- Default quality: 720p
- Download button triggers `POST /download` with selected quality
- Real-time progress updates via WebSocket `/progress`
- Save location: OS Downloads folder by default (configurable in settings)
- Download duration <15min for typical 10-min video (depends on internet speed)
**Traces to**: [[ARCHITECTURE.md#Backend|Backend: Download Orchestration]], [[DESIGN.md#Download-Progress|Design: Progress UI]]  
**Status**: Ready for Dev

### FR4: SHA-256 Verification
**Requirement**: System shall verify downloaded file integrity via SHA-256 hash.  
**SMART Criteria**:
- Compute SHA-256 after download completes
- Compare against yt-dlp-provided hash (if available) or embedded metadata
- Verification must complete within 5 seconds for files <500MB
- Display "✓ Verified" or "⚠ Hash Mismatch" in UI
- Retry logic: max 3 attempts on mismatch, then fail with user notification
**Traces to**: [[ARCHITECTURE.md#Verification-Engine|Verification Engine]], [[DESIGN.md#Component-States|Component States: Download Results]]  
**Status**: Ready for Dev

### FR5: Real-Time Progress Display
**Requirement**: UI shall display download progress, speed, and ETA in real-time.  
**SMART Criteria**:
- Progress bar: 0-100% visual indicator
- Speed display: MB/s or KB/s (auto-select based on magnitude)
- ETA display: HH:MM:SS format, updates every 500ms
- Update frequency: WebSocket messages at max 1/sec to avoid jank
- Cancel button available during download (graceful cleanup)
**Traces to**: [[DESIGN.md#Download-Progress|Design: Progress Card]], [[ARCHITECTURE.md#Backend|Backend: WebSocket Progress]]  
**Status**: Ready for Dev

### FR6: Session-Based History
**Requirement**: System shall maintain in-memory download history for current session only.  
**SMART Criteria**:
- Store last 20 downloads (title, quality, timestamp, file path)
- Display in "History" tab with sortable columns (newest first)
- Clear History button removes all entries
- History cleared on app restart (no persistence)
- Each history entry shows download date/time, video title, quality, file size
**Traces to**: [[DESIGN.md#History-Page|Design: History Page]], [[ARCHITECTURE.md#Frontend|Frontend: Zustand State]]  
**Status**: Ready for Dev (P2 priority)

### FR7: Settings Panel
**Requirement**: User shall configure default preferences.  
**SMART Criteria**:
- Settings page accessible from main nav
- Configurable settings:
  - Default download quality (720p/1080p/Audio)
  - Default save location (file browser picker)
  - Theme preference (Light/Dark, default: System)
- Settings stored in `localStorage` (survive current session; cleared on app uninstall)
- Validation: prevent invalid paths, provide feedback
**Traces to**: [[DESIGN.md#Settings-Page|Design: Settings Page]]  
**Status**: Ready for Dev (P2 priority)

### FR8: Legal Compliance Modals
**Requirement**: Application shall display legal notices on first launch.  
**SMART Criteria**:
- Show modal sequence on first run (detected via localStorage flag)
- Modals: License (MIT), Terms of Service, yt-dlp Attribution
- User must click "Accept" to dismiss
- Modal blocks interaction with main UI until dismissed
- Once accepted, flag stored in localStorage to prevent re-display
**Traces to**: [[DESIGN.md#Modals|Design: Modals]], [[ARCHITECTURE.md|Architecture: Legal Compliance]]  
**Status**: Ready for Dev (P3 priority)

---

## Non-Functional Requirements

### NFR1: Download Verification Performance
**Requirement**: SHA-256 hash verification shall not exceed 5 seconds.  
**Measurement**: Wall-clock time from download completion to "verified" state  
**Applies to**: Files up to 500MB (typical YouTube videos)  
**Trade-off**: Larger files may require longer; user notified with progress indicator  
**Traces to**: [[ARCHITECTURE.md#Verification-Engine|Verification Engine]]

### NFR2: UI Responsiveness
**Requirement**: UI shall respond to user input within 100ms.  
**Measurement**: Click-to-visual-feedback time (button press → state change visible)  
**Excludes**: Network I/O, backend processing  
**Testing**: Lighthouse, browser DevTools performance profiler  
**Traces to**: [[DESIGN.md#Interactions|Design: Interactions]], [[ARCHITECTURE.md#Frontend|Frontend Tech Stack]]

### NFR3: Standalone Packaging
**Requirement**: Application shall package as single-file executables.  
**Platforms**: Windows (.exe), Linux (.AppImage)  
**Max Size**: <200MB (includes Python runtime, yt-dlp, React bundle)  
**Dependencies**: Zero external runtime requirements (portable)  
**Tooling**: PyInstaller (backend) + electron-builder (frontend bundling)  
**Traces to**: [[DEPLOYMENT.md|Deployment: Packaging]]

### NFR4: Offline Capability
**Requirement**: System shall allow video playback/access of cached downloads without internet.  
**Scope**: Local file browsing, metadata display for cached videos  
**Limitation**: Metadata fetch, URL validation, quality check require internet  
**Traces to**: [[ARCHITECTURE.md|Architecture: Offline Mode]]

### NFR5: Accessibility
**Requirement**: UI shall meet WCAG 2.1 AA standard for accessibility.  
**Checklist**:
- Keyboard navigation (Tab, Enter, Escape)
- ARIA labels on all interactive elements
- Color contrast minimum 4.5:1 for text
- Focus indicators visible on all elements
**Traces to**: [[DESIGN.md#Accessibility|Design: Accessibility]]

### NFR6: Security
**Requirement**: Application shall follow secure download practices.  
**Checklist**:
- SSL/TLS validation for all HTTP requests
- Hash verification prevents corrupted/tampered files
- No sensitive data stored locally (no credentials, no analytics)
- Respect YouTube ToS in automation (rate limiting, user-agent headers)
**Traces to**: [[SECURITY.md|Security: Download Verification]]

---

## Constraints

### Scope Constraints
- **C1**: No persistent database (session history only, cleared on app close)
- **C2**: No complex logging, telemetry, or analytics collection
- **C3**: No user authentication or accounts
- **C4**: Single-user application (desktop only, no cloud sync)

### Technical Constraints
- **C5**: Must use yt-dlp as YouTube backend (respects ToS better than direct API)
- **C6**: Python backend required for yt-dlp integration (can't bundle yt-dlp in JavaScript)
- **C7**: Must respect YouTube Terms of Service (no commercial redistribution, rate limiting)
- **C8**: Maximum 3 retry attempts on download failure (prevents infinite loops)

### Performance Constraints
- **C9**: Download speed limited by user's internet connection (not application)
- **C10**: UI thread blocking tolerance: <16ms per frame (60fps requirement)
- **C11**: Memory footprint: <500MB for app + Python runtime combined

### Legal Constraints
- **C12**: Must display yt-dlp attribution (GPL compliance)
- **C13**: Must include clear warning about YouTube ToS implications
- **C14**: MVP released as open-source (MIT license)

---

## Requirement Traceability Matrix

| ID | Type | Description | Architecture | Design | Status |
|-----|------|-------------|--------------|--------|--------|
| FR1 | Func | URL Input & Validation | Frontend | Main Page | Ready |
| FR2 | Func | Metadata Fetching | Backend: yt-dlp Wrapper | Preview Card | Ready |
| FR3 | Func | Quality Selection & Download | Backend: Download | Download UI | Ready |
| FR4 | Func | SHA-256 Verification | Verification Engine | Results Card | Ready |
| FR5 | Func | Real-Time Progress | WebSocket Backend | Progress Bar | Ready |
| FR6 | Func | Session History | Zustand State | History Page | P2 |
| FR7 | Func | Settings Panel | localStorage | Settings Page | P2 |
| FR8 | Func | Legal Modals | Frontend Modal | Modals | P3 |
| NFR1 | Perf | Verification <5s | Verification | N/A | Ready |
| NFR2 | Perf | UI <100ms response | React Optimization | N/A | Ready |
| NFR3 | Perf | Standalone Packaging | PyInstaller | N/A | Day 4 |
| NFR4 | Func | Offline Mode | File System | N/A | P2 |
| NFR5 | QA | Accessibility WCAG2.1 AA | N/A | Accessibility | Day 3 |
| NFR6 | Sec | Security Best Practices | SSL/TLS, Hashing | N/A | Ready |

---

## Notes & Open Questions

- **yt-dlp version**: Pin to latest stable (e.g., 2025.01.01) in requirements.txt
- **Python version**: Requires 3.9+ (asyncio, type hints)
- **Quality availability**: Not all videos have 1080p; graceful fallback to best available
- **File conflicts**: Prompt user if file exists in download folder (overwrite/rename)
- **Cancel handling**: Partial downloads deleted on cancel (no resume feature for MVP)
