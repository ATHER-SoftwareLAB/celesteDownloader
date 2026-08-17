# Celeste Downloader - Architecture

## System Overview
```mermaid
graph TB
    User["👤 User<br/>(Desktop App)"]
    Frontend["🎨 Frontend<br/>(React + TypeScript)"]
    Backend["⚙️ Backend<br/>(FastAPI + Python)"]
    YT["🎥 YouTube<br/>(via yt-dlp)"]
    FS["💾 File System<br/>(Downloads folder)"]
    
    User -->|URL + Options| Frontend
    Frontend -->|HTTP POST| Backend
    Backend -->|query| YT
    Backend -->|write| FS
    FS -->|verify hash| Backend
    Backend -->|progress| Frontend
    Frontend -->|display| User
```

## Components

### Frontend (React)
- **Purpose**: User interface for input, preview, progress, settings
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand (minimal)
- **Pages**: Main, Settings, About, History

### Backend (Python)
- **Purpose**: Download orchestration, verification, yt-dlp wrapper
- **Framework**: FastAPI
- **Key functions**:
  - `GET /metadata?url=...` - Fetch video info
  - `POST /download` - Start download with SHA-256 verification
  - `WS /progress` - WebSocket for real-time progress

### yt-dlp Wrapper
- Encapsulates `yt-dlp` calls
- Validates URLs
- Handles quality selection
- Returns download metadata

### Verification Engine
- SHA-256 hash computation
- Retry logic (max 3 attempts)
- Secure storage of expected hashes

## Technology Stack

| Layer | Tech | Why |
|-------|------|-----|
| Frontend | React 18 + TypeScript | Type safety, modern UI |
| Styling | Tailwind CSS | Rapid design, consistent spacing |
| State | Zustand | Minimal, no boilerplate |
| Backend | FastAPI | Fast, async, auto OpenAPI docs |
| Download | yt-dlp | Best YouTube support |
| Verification | hashlib (SHA-256) | Standard, built-in Python |
| Packaging | PyInstaller | One-file executables |

## C4 Model - Component Level

### Component Diagram: Frontend (React)

```mermaid
graph TB
    subgraph Frontend["Frontend (React + Tailwind)"]
        Main["📄 Main Page Component<br/>URL input, Download button"]
        Preview["👁️ Preview Card<br/>Metadata display, Quality selector"]
        Progress["⏱️ Progress Component<br/>Progress bar, Speed, ETA"]
        History["📋 History Component<br/>Download list, Clear action"]
        Settings["⚙️ Settings Component<br/>Quality, Path, Theme"]
        Modal["📋 Modal Component<br/>Legal, Error messages"]
        
        Store["🧠 Zustand Store<br/>downloadHistory[], currentDownload,<br/>settings{}, uiState{}"]
        Hooks["🔌 Custom Hooks<br/>useDownload()<br/>useSettings()<br/>useHistory()"]
    end
    
    API["🔗 API Client<br/>fetch(), WebSocket"]
    
    Main -->|Update state| Store
    Preview -->|Read/write| Store
    Progress -->|Subscribe| Store
    History -->|Query| Store
    Settings -->|Save| Store
    Modal -->|Render state| Store
    Hooks -->|Manage| Store
    Hooks -->|Call| API
    API -->|HTTP/WS| Backend
```

### Component Diagram: Backend (FastAPI)

```mermaid
graph TB
    subgraph Backend["Backend (FastAPI)"]
        Router["🔀 API Router<br/>GET /metadata<br/>POST /download<br/>WS /progress"]
        MetaService["📡 Metadata Service<br/>URL validation<br/>Video info extraction"]
        DownloadService["📥 Download Service<br/>Quality selection<br/>File management<br/>Stream handling"]
        YTDlp["🎥 yt-dlp Wrapper<br/>Subprocess call<br/>Result parsing<br/>Error handling"]
        VerifyService["✔️ Verification Service<br/>SHA-256 computation<br/>Retry logic<br/>Timestamp tracking"]
    end
    
    FileSystem["💾 File System<br/>Downloads/"]
    YouTube["📺 YouTube<br/>via yt-dlp"]
    
    Router -->|Validate URL| MetaService
    MetaService -->|Execute| YTDlp
    YTDlp -->|Query| YouTube
    Router -->|Start| DownloadService
    DownloadService -->|Execute| YTDlp
    DownloadService -->|Write| FileSystem
    FileSystem -->|Read| VerifyService
    VerifyService -->|Status| Router
    Router -->|Stream progress| Frontend
```

---

## Sequence Diagrams

### Sequence: Download Flow (Happy Path)

```mermaid
sequenceDiagram
    actor User
    participant React as React UI
    participant FastAPI as FastAPI Server
    participant ytdlp as yt-dlp
    participant YouTube as YouTube
    participant FS as File System
    
    User->>React: Paste URL, click Fetch
    activate React
    React->>FastAPI: GET /metadata?url=https://...
    activate FastAPI
    
    FastAPI->>ytdlp: get_info(url)
    activate ytdlp
    ytdlp->>YouTube: Query video metadata
    activate YouTube
    YouTube-->>ytdlp: {title, duration, formats}
    deactivate YouTube
    ytdlp-->>FastAPI: {title, duration, formats, thumbnail}
    deactivate ytdlp
    
    FastAPI-->>React: 200 OK {title, uploader, duration, formats}
    deactivate FastAPI
    React->>React: Update preview card, show quality options
    deactivate React
    React->>User: Display video info
    
    User->>React: Select quality (720p), click Download
    activate React
    React->>FastAPI: POST /download {url, quality}
    activate FastAPI
    
    FastAPI->>fastapi: WS /progress connect
    activate fastapi
    
    FastAPI->>ytdlp: download(url, quality)
    activate ytdlp
    
    loop Download Progress
        ytdlp->>YouTube: Stream file chunks
        ytdlp->>FS: Write chunk to file
        activate FS
        FS-->>ytdlp: OK
        deactivate FS
        ytdlp-->>FastAPI: {progress%, speed, eta}
        FastAPI->>React: WS {progress%, speed, eta}
        React->>React: Update progress bar
    end
    
    ytdlp-->>FastAPI: Download complete
    deactivate ytdlp
    
    FastAPI->>FS: Read downloaded file
    activate FS
    FS-->>FastAPI: File handle
    deactivate FS
    
    FastAPI->>FastAPI: Compute SHA-256
    FastAPI->>FastAPI: Compare hash vs yt-dlp metadata
    
    alt Hash matches
        FastAPI->>React: WS {status: verified, hash: OK}
        React->>React: Show ✓ Verified, add to history
        React->>User: "✓ Download complete & verified"
    else Hash mismatch (retry)
        FastAPI->>FastAPI: Retry (max 3x)
        FastAPI->>React: WS {status: retry, attempt: 2/3}
    end
    
    deactivate FastAPI
    deactivate fastapi
    deactivate React
```

### Sequence: Settings Update

```mermaid
sequenceDiagram
    actor User
    participant React as React UI
    participant localStorage as Browser Storage
    participant Backend as Backend (optional)
    
    User->>React: Change default quality to 1080p
    React->>React: Validate input
    React->>localStorage: Save {quality: "1080p"}
    localStorage-->>React: OK
    React->>User: "✓ Settings saved"
    
    Note over React: Next download will use 1080p as default
```

---

## State Machine Diagram

```mermaid
stateDiagram-v2
    [*] --> Idle: App start
    
    Idle --> WaitingURL: User focus input
    WaitingURL --> Idle: User blur
    
    Idle --> FetchingMetadata: User enter valid URL + click Fetch
    FetchingMetadata --> MetadataReady: Success (metadata received)
    FetchingMetadata --> MetadataFailed: Error (URL invalid, video not found)
    
    MetadataFailed --> Idle: User click Retry
    MetadataFailed --> WaitingURL: User modify URL
    
    MetadataReady --> QualitySelect: Show preview card
    QualitySelect --> Idle: User click Back
    QualitySelect --> Downloading: User select quality + click Download
    
    Downloading --> DownloadProgress: File transfer started
    DownloadProgress --> DownloadProgress: Progress updates (WebSocket)
    DownloadProgress --> VerifyingHash: Download complete, computing hash
    DownloadProgress --> DownloadFailed: User click Cancel
    
    VerifyingHash --> DownloadSuccess: Hash match ✓
    VerifyingHash --> DownloadRetry: Hash mismatch (attempt < 3)
    DownloadRetry --> DownloadProgress: Retry download
    DownloadRetry --> DownloadFailed: Max retries exceeded
    
    DownloadSuccess --> HistoryUpdated: Add to session history
    HistoryUpdated --> Idle: Return to main
    
    DownloadFailed --> ErrorMessage: Display error
    ErrorMessage --> Idle: User acknowledge
    
    note right of Idle
        Ready for next download
        No state persistence
    end note
    
    note right of DownloadProgress
        User can cancel here
        WebSocket updates at 1/sec
    end note
    
    note right of VerifyingHash
        Computation: <5s for typical videos
        Retry logic: max 3 attempts
    end note
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph Development["Development Environment"]
        Code["Git Repository<br/>main branch"]
        Tests["Test Suite<br/>Jest (Frontend)<br/>pytest (Backend)"]
    end
    
    subgraph Build["Build Process"]
        FrontendBuild["React Build<br/>npm run build<br/>Minified bundle"]
        BackendPackage["Python Package<br/>PyInstaller<br/>.exe + .AppImage"]
    end
    
    subgraph Distribution["Distribution"]
        Windows["🪟 Windows<br/>.exe file<br/>~150MB"]
        Linux["🐧 Linux<br/>.AppImage<br/>~150MB"]
        GitHub["GitHub Releases<br/>v0.1.0-alpha tag"]
    end
    
    subgraph Runtime["Runtime (User's Machine)"]
        WindowsApp["✓ Run .exe<br/>No installation needed<br/>Python bundled"]
        LinuxApp["✓ Run .AppImage<br/>chmod +x<br/>Python bundled"]
    end
    
    Code -->|npm build + pyinstaller| Build
    Tests -->|Pass/Fail| Build
    FrontendBuild -->|Bundle| BackendPackage
    BackendPackage -->|Package| Distribution
    Distribution -->|Windows path| Windows
    Distribution -->|Linux path| Linux
    Windows -->|Download & run| WindowsApp
    Linux -->|Download & run| LinuxApp
    Windows -->|Also uploaded to| GitHub
    Linux -->|Also uploaded to| GitHub
```

---

## Architecture Decision Records (ADRs)

### See /docs/adr/ for formal ADRs:
- **ADR-001**: No persistent database (session-only history)
- **ADR-002**: Zustand for state management (minimal complexity)
- **ADR-003**: FastAPI for backend framework (async, type safety)
- **ADR-004**: yt-dlp wrapper pattern (decoupled YouTube handling)
- **ADR-005**: WebSocket for real-time progress (vs polling)
