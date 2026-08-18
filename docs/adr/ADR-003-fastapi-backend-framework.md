# ADR-003: FastAPI for Backend Framework

**Date**: 2026-08-17  
**Status**: Accepted  
**Author**: Antonio Torres  
**Deciders**: Antonio Torres, Backend Team

---

## Context

The backend requires a Python web framework to:
- Wrap yt-dlp functionality (video info fetching, download orchestration)
- Provide HTTP endpoints for metadata retrieval
- Stream real-time download progress via WebSocket
- Handle quality selection and file management
- Perform SHA-256 hash verification

### Requirements
- [[REQUIREMENTS.md#FR2|FR2]]: Metadata fetching endpoint
- [[REQUIREMENTS.md#FR3|FR3]]: Download orchestration
- [[REQUIREMENTS.md#FR5|FR5]]: Real-time progress (WebSocket)
- [[REQUIREMENTS.md#FR4|FR4]]: SHA-256 verification
- [[REQUIREMENTS.md#NFR1|NFR1]]: Verification <5s

### Candidates Evaluated
1. **Flask** - Lightweight, simple
2. **Django** - Full-featured, batteries-included
3. **FastAPI** - Modern, async, auto-docs
4. **Starlette** - Lightweight async, lower-level
5. **Tornado** - Async, WebSocket-native

### Selection Criteria
- **Async support** (WebSocket progress updates)
- **Type safety** (Python type hints)
- **Development speed** (auto-docs, validation)
- **Performance** (latency-sensitive file streaming)
- **Maintenance burden** (active community, stable API)

---

## Decision

**We will use FastAPI for the backend framework.**

### Architecture Overview

```
FastAPI Application (main.py)
├── Routers
│   ├── metadata_router.py
│   │   └── GET /metadata?url=...
│   ├── download_router.py
│   │   ├── POST /download
│   │   └── WS /progress
│   └── health_router.py
│       └── GET /health
│
├── Services
│   ├── youtube_service.py       (yt-dlp wrapper)
│   ├── download_service.py      (orchestration)
│   ├── verification_service.py  (SHA-256 hashing)
│   └── logger_service.py        (minimal logging)
│
├── Models
│   ├── schemas.py               (Pydantic models)
│   └── enums.py                 (Quality, Status)
│
└── Utils
    ├── config.py                (settings, paths)
    └── exceptions.py            (custom errors)
```

### Key Endpoints

```python
# metadata_router.py
@router.get("/metadata")
async def get_metadata(url: str) -> MetadataResponse:
    """
    Fetch video metadata from YouTube.
    
    Args:
        url: YouTube video URL (https://youtube.com/watch?v=...)
    
    Returns:
        {
            "title": "Video Title",
            "duration": 600,           # seconds
            "uploader": "Channel Name",
            "thumbnail": "https://...",
            "formats": [
                {"quality": "720p", "filesize": 123456789},
                {"quality": "1080p", "filesize": 234567890}
            ]
        }
    
    Raises:
        HTTPException 400: Invalid URL
        HTTPException 404: Video not found
        HTTPException 503: yt-dlp service error
    """
    try:
        metadata = await youtube_service.get_info(url)
        return MetadataResponse(**metadata)
    except YouTubeError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Metadata fetch failed: {e}")
        raise HTTPException(status_code=503, detail="Service error")


# download_router.py
@router.post("/download")
async def start_download(request: DownloadRequest) -> DownloadResponse:
    """
    Start a video download with progress tracking.
    
    Args:
        {
            "url": "https://youtube.com/watch?v=...",
            "quality": "720p"
        }
    
    Returns:
        {
            "download_id": "uuid-1234-5678-90ab",
            "status": "downloading"
        }
    """
    download_id = generate_uuid()
    asyncio.create_task(download_orchestration(download_id, request))
    return DownloadResponse(download_id=download_id, status="downloading")


@router.websocket("/progress/{download_id}")
async def websocket_progress(websocket: WebSocket, download_id: str):
    """
    WebSocket endpoint for real-time progress updates.
    
    Messages sent to client:
    {
        "progress": 65,              # 0-100
        "speed": 2500000,            # bytes/sec
        "eta": 120,                  # seconds
        "status": "downloading"      # | "verifying" | "complete"
    }
    """
    await websocket.accept()
    
    # Subscribe to progress updates
    progress_stream = download_manager.subscribe(download_id)
    
    try:
        async for update in progress_stream:
            await websocket.send_json(update)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await websocket.close()
```

### Async Orchestration Pattern

```python
# services/download_service.py
async def download_orchestration(download_id: str, request: DownloadRequest):
    """
    Main download workflow (background task).
    
    1. Download file
    2. Compute SHA-256
    3. Compare hash (with retry)
    4. Publish success/failure
    """
    try:
        # Phase 1: Download
        download_manager.set_status(download_id, "downloading")
        
        file_path = await youtube_service.download(
            url=request.url,
            quality=request.quality,
            progress_callback=lambda p, s, e: 
                download_manager.update_progress(download_id, p, s, e)
        )
        
        # Phase 2: Verify
        download_manager.set_status(download_id, "verifying")
        
        for attempt in range(1, 4):  # max 3 retries
            sha256_hash = await compute_hash(file_path)
            expected_hash = await youtube_service.get_expected_hash(request.url)
            
            if sha256_hash == expected_hash:
                download_manager.set_status(download_id, "complete", hash_verified=True)
                return
            
            if attempt < 3:
                logger.warning(f"Hash mismatch (attempt {attempt})")
                download_manager.set_status(download_id, "retry", attempt=attempt)
        
        # Hash failed all retries
        download_manager.set_status(download_id, "error", reason="hash_mismatch")
        os.remove(file_path)  # Clean up corrupted file
        
    except Exception as e:
        logger.error(f"Download error: {e}")
        download_manager.set_status(download_id, "error", reason=str(e))
        if os.path.exists(file_path):
            os.remove(file_path)
```

---

## Rationale

### Why FastAPI?

1. **Native Async/Await**
   - WebSocket streaming is async-first
   - No callback hell (vs Flask)
   - True concurrency with asyncio
   - Can handle 100+ simultaneous downloads (in theory)

2. **Automatic API Documentation**
   - Swagger UI at `/docs` (built-in)
   - OpenAPI schema generation
   - Auto-generated from type hints & docstrings
   - Saves 10+ hours of API documentation

3. **Type Safety**
   - Pydantic models for request/response validation
   - Automatic JSON serialization/deserialization
   - IDE IntelliSense throughout
   - Runtime type checking without extra code

4. **Performance**
   - Benchmarks show ~2x faster than Flask for I/O-bound tasks
   - Efficient memory usage (async garbage collection)
   - Sub-10ms latency for simple endpoints
   - Critical for real-time progress updates

5. **Development Speed**
   - Minimal boilerplate (vs Django)
   - Decorators for routing (`@router.get()`, `@router.websocket()`)
   - Single file can work (grows naturally to multi-file)
   - DevTools plugin for FastAPI (pytest integration)

6. **WebSocket Support**
   - Built-in via Starlette (FastAPI's ASGI foundation)
   - Cleaner API than Flask-SocketIO
   - Native async iterators for streaming
   - Example: `async for update in progress_stream:`

7. **Python 3.9+ Alignment**
   - Requires Python 3.6+, optimized for 3.9+
   - Modern Python idioms (match statements, union types in 3.10+)
   - Future-proof for team

### Why Not Django?

- **Overkill for MVP**: Batteries-included = complex setup, migration system, ORM
- **Async support**: Added in 3.0+ but still second-class (not as native as FastAPI)
- **Learning curve**: 5+ hours setup & config vs FastAPI 1 hour
- **Time cost**: Too much infrastructure for 4-day sprint

### Why Not Flask?

- **No async support** (until async-variants like Quart)
- **WebSocket**: Requires Flask-SocketIO extension (external dependency)
- **Type safety**: Manual validation, no Pydantic integration
- **Performance**: Slower for concurrent requests

### Why Not Starlette?

- **Lower-level**: Would need to write more middleware/routing boilerplate
- **No auto-docs**: Would need to add OpenAPI manually
- **No Pydantic**: Would need to add validation layer separately
- FastAPI is built on Starlette + adds these conveniences

### Why Not Tornado?

- **Less Pythonic**: Callback-based API (feels like JavaScript)
- **Smaller community**: Fewer StackOverflow answers
- **Different paradigm**: Not familiar to most Python developers

---

## Consequences

### Positive
✅ Sub-10ms latency for endpoints (critical for real-time progress)  
✅ Built-in WebSocket support (no external library needed)  
✅ Automatic API docs (saves documentation time)  
✅ Type safety & IDE support (fewer runtime errors)  
✅ True async/await (handles 100+ concurrent connections)  
✅ Small learning curve for team (Pythonic, decorator-based)  
✅ Active community & regular updates  

### Negative
❌ Requires Python 3.6+ (not legacy Python 2)  
❌ Async debugging more complex than sync (requires asyncio knowledge)  
❌ Smaller ecosystem than Django (fewer third-party packages)  
❌ If app grows massively, may need to refactor to Django later (unlikely for MVP)

### Mitigations
- **Training**: 1-hour team session on async/await patterns
- **Testing**: Async test fixtures provided by pytest-asyncio
- **Documentation**: Link to official FastAPI tutorials in codebase
- **Debugging**: Use VS Code debugger with Python extension (async-aware)

---

## Implementation Checklist

### Setup (Day 1)
- [ ] Create `backend/` directory
- [ ] `pip install fastapi uvicorn python-multipart aiofiles`
- [ ] Create `main.py` with minimal app (`FastAPI()` + `/health`)
- [ ] Create `requirements-backend.txt` with pinned versions
- [ ] Run `uvicorn main:app --reload` (verify docs at `http://localhost:8000/docs`)

### Routers (Day 2)
- [ ] Create `routers/metadata_router.py` with `GET /metadata`
- [ ] Create `routers/download_router.py` with `POST /download`
- [ ] Create `routers/ws_router.py` with `WS /progress`
- [ ] Include routers in `main.py` via `app.include_router()`

### Services (Day 2-3)
- [ ] Create `services/youtube_service.py` (yt-dlp wrapper)
- [ ] Create `services/download_service.py` (orchestration)
- [ ] Create `services/verification_service.py` (SHA-256)
- [ ] Add error handling & logging

### Testing (Day 3-4)
- [ ] Write pytest fixtures for FastAPI test client
- [ ] Test endpoints: `/metadata`, `/download`, WebSocket `/progress`
- [ ] Test error cases: invalid URLs, network timeouts, verification failures
- [ ] Performance test: Verify <100ms response time for metadata

### Code Review Checklist
- [ ] All endpoints documented (docstrings with Args/Returns/Raises)
- [ ] Pydantic models used for request/response validation
- [ ] Async functions use `async def`, not `def` (except sync-only code)
- [ ] Error handling catches specific exceptions (not bare `except:`)
- [ ] WebSocket gracefully handles disconnects (try/finally with close)
- [ ] File cleanup on error (no orphaned downloads)
- [ ] Logging includes context (url, quality, download_id)

---

## Tech Stack Details

| Component | Package | Version | Why |
|-----------|---------|---------|-----|
| Framework | FastAPI | ~0.104 | Modern, async, auto-docs |
| Server | uvicorn | ~0.24 | ASGI server, battle-tested |
| Validation | Pydantic | ~2.0 | Type validation, JSON schema |
| yt-dlp Wrapper | yt-dlp | latest | YouTube support, maintained |
| Async File I/O | aiofiles | ~23.0 | Non-blocking file operations |
| Hashing | hashlib | builtin | SHA-256, no external dep |
| Logging | logging | builtin | Simple, JSON-compatible |
| Testing | pytest | ~7.0 | Async fixtures, parametrize |
| Testing | pytest-asyncio | ~0.21 | Async test support |

---

## Related ADRs & Requirements

- **ADR-001**: No database (FastAPI doesn't include ORM)
- **ADR-002**: Zustand state (WebSocket sends JSON to Zustand actions)
- **[[REQUIREMENTS.md#FR2|FR2]]**: Metadata endpoint (`GET /metadata`)
- **[[REQUIREMENTS.md#FR3|FR3]]**: Download logic (`POST /download`, `WS /progress`)
- **[[REQUIREMENTS.md#FR4|FR4]]**: Verification (SHA-256 in background task)
- **[[REQUIREMENTS.md#FR5|FR5]]**: Real-time progress (WebSocket streaming)
- **[[ARCHITECTURE.md#Backend|Architecture: Backend Components]]**

---

## Future Considerations

### v0.2.0 (Post-MVP)
- Add database layer (SQLite) for persistent history
  - FastAPI + SQLAlchemy integration
  - Async ORM: SQLAlchemy 2.0 async session
- Add authentication (if multi-user support needed)
  - FastAPI security (OAuth2, JWT)
- Add monitoring & metrics
  - Prometheus integration
  - Grafana dashboards

### Scaling Notes
- Current design supports ~100 concurrent downloads per machine
- For 1000+ concurrent: consider load balancing (Nginx) + multiple FastAPI instances
- Consider message queue (Celery) for long-running downloads

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-08-17 | Antonio Torres | Initial acceptance |

