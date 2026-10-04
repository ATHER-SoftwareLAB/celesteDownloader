# IPC Specification — Contratos de Comunicación

Define los contratos (payloads y respuestas) entre Frontend (Electron/React) y Backend (Python/FastAPI).

**Comunicación:** Electron IPC + HTTP (FastAPI en localhost:5000)

---

## Endpoints Principales

### 1. `getInfo` — Obtener Metadata

**Request:**
```json
{"url": "https://www.youtube.com/watch?v=..."}
```

**Response (Success, video):**
```json
{
  "type": "video",
  "url": "https://...",
  "title": "Video Title",
  "duration": 600,
  "uploader": "Channel Name",
  "upload_date": "20240101",
  "thumbnail": "https://...",
  "formats": [
    {"height": 1080, "fps": 60},
    {"height": 720, "fps": 60}
  ]
}
```

**Response (Success, playlist o canal):**
```json
{
  "type": "playlist",
  "url": "https://www.youtube.com/playlist?list=...",
  "title": "Mi playlist",
  "uploader": "Canal X",
  "is_channel": false,
  "unavailable_count": 2,
  "entries": [
    {"url": "https://www.youtube.com/watch?v=...", "title": "Video 1", "duration": 235, "thumbnail": "https://..."}
  ]
}
```

- Una URL de video con `&list=` se trata como **video**.
- Canales (`@handle`, `/channel/`, `/c/`, `/user/`): se listan los **50 videos más recientes** de la pestaña Videos (`is_channel: true`).
- `entries` excluye videos privados o eliminados; `unavailable_count` dice cuántos se omitieron.
- La selección (todos, primeros N, últimos N, rango) se hace en el frontend; cada video se encola con `download`.

**Response (Error):**
```json
{"error": "Video is private"}
```

---

### 2. `download` — Iniciar Descarga

**Request:**
```json
{"url": "https://...", "quality": "1080"}
```

**Response:**
```json
{"success": true, "task_id": "uuid", "status": "starting"}
```

---

### `getProgress` — Progreso de una tarea

**Response:**
```json
{
  "task_id": "uuid",
  "status": "downloading",
  "progress": 35,
  "retry": 1,
  "max_retries": 3
}
```

- `status`: `pending` | `downloading` | `processing` | `completed` | `error`
- `retry`: reintentos hechos por errores recuperables (0 en el primer intento).
- `max_retries`: límite de reintentos de la tarea; aparece cuando empieza a procesarse.
- `error` (si `status` es `error`) y `path` (si `status` es `completed`).

---

### `getProgressBatch` — Progreso de varias tareas

`POST /progress/batch`. El frontend lo usa para seguir todas las descargas activas con una sola petición (una playlist puede encolar cientos).

**Request:**
```json
{"task_ids": ["uuid-1", "uuid-2"]}
```

**Response:**
```json
{
  "tasks": [
    {"task_id": "uuid-1", "status": "completed", "progress": 100, "retry": 0, "max_retries": 3, "path": "..."},
    {"task_id": "uuid-2", "status": "error", "progress": 0, "retry": 0, "error": "Tarea no encontrada"}
  ]
}
```

Cada elemento tiene la forma de `getProgress`. Una tarea desconocida se devuelve con `status: "error"`.

---

### 3. `addToQueue` — Agregar a Cola

**Request:**
```json
{"url": "https://...", "format": "video", "quality": "1080"}
```

**Response:**
```json
{"success": true, "task_id": "uuid", "position": 2}
```

---

### 4. `getQueueStatus` — Estado de Cola

**Response:**
```json
{
  "current": {"task_id": "uuid-1", "status": "downloading", "progress": 45},
  "queue": [
    {"task_id": "uuid-2", "status": "pending", "position": 1}
  ],
  "paused": false
}
```

---

### 5. `pauseQueue` / `resumeQueue`

Pausar y reanudar procesamiento de cola.

---

### 6. `getConfig` / `setConfig`

**getConfig Response:**
```json
{
  "download_path": "/home/user/Downloads",
  "theme": "dark",
  "auto_retries": true,
  "max_retries": 3,
  "metadata_cache_ttl": 30
}
```

---

### 7. `getHistory` — Historial Sesión

**Response:**
```json
{
  "history": [
    {
      "url": "https://...",
      "title": "Video Title",
      "thumbnail": "https://...",
      "format": "video",
      "quality": "1080",
      "status": "completed",
      "path": "/home/user/Downloads/video.mp4"
    }
  ]
}
```

---

## Error Handling

**Errores recuperables (reintentan):**
- CONNECTION_ERROR
- RATE_LIMIT
- TIMEOUT

**Errores no recuperables:**
- INVALID_URL
- VIDEO_PRIVATE
- DISK_SPACE

**Reintentos (hasta `max_retries`, por defecto 3):**
- Intento inicial falla → esperar 3s → reintento 1
- Reintento 1 falla → esperar 6s → reintento 2
- Reintento 2 falla → esperar 10s → reintento 3
- Reintento 3 falla → error final

---

## Security

- Input validation en backend
- No guardar credenciales YouTube
- IPC local, localhost:5000 solo
- Sin TLS (local machine)

---

**Version:** 1.0  
**Date:** 2026-08-18

