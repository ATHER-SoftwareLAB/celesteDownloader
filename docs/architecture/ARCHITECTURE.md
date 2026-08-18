# Architecture — Celeste Downloader

## 1. Architecture Overview

### Summary

Celeste Downloader es una aplicación de escritorio modular con arquitectura de dos procesos: un Frontend (Electron + React) que proporciona la interfaz gráfica, y un Backend (Python + FastAPI) que orquesta las descargas usando yt-dlp. El frontend comunica con el backend a través de IPC, permitiendo separación clara de responsabilidades y facilidad de testing.

### Architecture Style

Modular Monolith con separación Frontend/Backend.

### Architectural Goals

- Abstracción simple de complejidad de yt-dlp
- Experiencia de usuario fluida y responsiva
- Facilidad de mantenimiento y extensión
- Portabilidad (ZIP sin instalación)
- Máxima transparencia (sin dependencias ocultas)

### Architectural Constraints

- Dependencia de yt-dlp (requiere actualizaciones)
- Límites de YouTube (rate limiting, bloqueos IP)
- Espacio de disco limitado en usuario
- Arquitectura desktop-first (no web)

---

## 2. System Context

```
┌─────────────────────────────────────┐
│            Usuario                  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Celeste Downloader App            │
│  (Electron + React + Python)         │
└──────────────┬──────────────────────┘
               │
       ┌───────┼───────┐
       ▼       ▼       ▼
    YouTube  Disco  SQLite
    (API)    Local  (Config)
```

### External Systems

| System | Purpose | Protocol |
|---|---|---|
| YouTube | Obtener información de videos | HTTP/HTTPS |
| Sistema de Archivos | Guardar videos descargados | File I/O |
| yt-dlp | Motor de descarga | Child Process |
| ffmpeg | Conversión de formatos | Child Process |

---

## 3. High-Level Architecture

```
┌────────────────────────────────────────────────┐
│          Frontend (Electron + React)           │
│  - Input URL                                   │
│  - Mostrar preview                             │
│  - Cola de descargas                           │
│  - Settings                                    │
│  - Historial sesión                            │
└─────────────────────┬────────────────────────┘
                      │ IPC
┌─────────────────────▼────────────────────────┐
│      Backend (Python + FastAPI)              │
│  - Download Manager                          │
│  - Format Handler                            │
│  - Metadata Fetcher (yt-dlp info)            │
│  - Error Handler                             │
│  - Config Manager                            │
└─────────────────────┬────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
    yt-dlp        ffmpeg      SQLite
```

### Components

| Component | Responsibility | Technology |
|---|---|---|
| Frontend (Electron) | UI, eventos usuario, mostrar progreso | Electron + React + TypeScript |
| Frontend (Renderer) | Renderizado de componentes | React, CSS-in-JS |
| Backend (Main) | IPC handlers, orquestación | Python + FastAPI |
| Download Manager | Gestión de cola y descargas | Python threading |
| Metadata Service | Obtención de info sin descargar | yt-dlp SDK |
| Config Manager | Persistencia de configuración | SQLite |

---

## 4. Component Architecture

### Frontend

**Responsibility**

- Proporcionar interfaz gráfica
- Capturar entrada del usuario
- Mostrar estado de descargas
- Mantener historial de sesión
- No hace lógica de descarga

**Structure**

```
src/
├── components/
│   ├── InputField.tsx
│   ├── PreviewCard.tsx
│   ├── DownloadButton.tsx
│   ├── Queue.tsx
│   ├── Settings.tsx
│   └── History.tsx
├── hooks/
│   ├── useDownloader.ts
│   └── useSettings.ts
├── services/
│   └── downloaderAPI.ts (IPC)
├── store/
│   ├── downloadStore.ts
│   ├── settingsStore.ts
│   └── historyStore.ts
├── types/
│   └── index.ts
└── App.tsx
```

**Rules**

- Solo UI logic, no business logic
- Comunicar con backend vía IPC
- Mantener estado local mínimo
- Componentes reutilizables

### Backend

**Responsibility**

- Ejecutar yt-dlp
- Gestionar cola de descargas
- Manejar errores
- Persistir configuración
- Reportar progreso al frontend

**Structure**

```
backend/
├── downloader/
│   ├── metadata.py
│   ├── download.py
│   └── formats.py
├── queue/
│   └── manager.py
├── config/
│   └── manager.py
├── errors/
│   └── handler.py
├── ipc/
│   └── handlers.py
└── main.py
```

**Rules**

- No interfaz gráfica
- Thread-safe para descargas paralelas
- Errores claros y accionables
- Logging estructurado

### Database (SQLite)

**Technology:** SQLite (embebido, archivo local)

**Responsibility**

- Almacenar configuración de usuario
- Persistencia entre sesiones

**Main Entities**

```
config
├── id (PK)
├── key (downloadPath, theme, etc)
├── value
└── updated_at

(Historial NO se persiste)
```

---

## 5. Data Flow

### Flow 1: Obtención de Metadata

```
Usuario pega URL
      ↓
Frontend envía: ipcRenderer.invoke('getInfo', url)
      ↓
Backend recibe IPC handler
      ↓
Ejecuta: yt_dlp.extract_info(url, download=False)
      ↓
Parse respuesta a JSON
      ↓
Almacena en RAM (metadata_cache LRU)
      ↓
Envía resultado al Frontend
      ↓
Frontend muestra preview
```

### Flow 2: Descarga de Video

```
Usuario confirma descarga
      ↓
Frontend agrega a queue: ipcRenderer.invoke('download', {url, format, quality})
      ↓
Backend crea DownloadTask
      ↓
Agrega a cola (thread-safe)
      ↓
Inicia descarga (si es first)
      ↓
Loop: Ejecuta yt-dlp, escucha progress hooks
      ↓
Envía progress al frontend: ipcRenderer.send('progress', {id, percent, speed, eta})
      ↓
Al completar: ipcRenderer.send('complete', {id, path})
      ↓
Frontend agrega a sessionHistory
      ↓
Procesa siguiente en cola
```

---

## 6. API Architecture

### IPC Channels (Frontend ↔ Backend)

**Invoke (Request-Response)**
```
downloader:getInfo(url) → metadata
downloader:download(opts) → {id}
downloader:cancel(id) → null
downloader:pause(id) → null
config:get(key) → value
config:set(key, value) → null
```

**On (Event Listener)**
```
downloader:progress → {id, percent, speed, eta}
downloader:complete → {id, path}
downloader:error → {id, message, code}
```

---

## 7. Authentication & Authorization

### Authentication

No requerida. Aplicación local sin conexión remota.

### Authorization

Basada en permisos del sistema operativo:
- Acceso a disco (lectura/escritura)
- Acceso a red (YouTube)
- Permisos de carpeta

---

## 8. Infrastructure

```
Usuario Machine
├─ Electron (Frontend)
│  ├─ React Components
│  └─ IPC Renderer
├─ Python Process (Backend)
│  ├─ FastAPI Server (IPC)
│  ├─ Download Manager
│  └─ Config Manager
├─ SQLite (file-based)
├─ yt-dlp (bundled)
├─ ffmpeg (bundled)
└─ Disco Local
   └─ Videos descargados
```

### Infrastructure Components

| Component | Type | Purpose |
|---|---|---|
| Electron | Framework | Application shell |
| Python | Runtime | Backend process |
| SQLite | Database | Config storage |
| yt-dlp | Library | Video download |
| ffmpeg | Binary | Format conversion |

---

## 9. Observability

### Logging

- Backend: Logs estructurados en archivo (./logs/celeste.log)
- Frontend: Console browser devtools
- Modo debug: Verbose logging opcional

### Monitoring

- No telemetría
- Sin conexión a servidores externos
- Solo logs locales

### Error Tracking

- Error handler centralizado
- Categorización de errores (recuperable vs no)
- Mensajes claros al usuario

---

## 10. Scalability

### Current Expected Load

- Instancia única por usuario
- 1-10 videos descargados por sesión
- 3-5 descargas encoladas típicamente
- 50-500MB por video

### Scaling Strategy

- Local-first: Todo en máquina del usuario
- Descargas en serie (no paralelas)
- Metadata cache LRU (50 entradas máx)

### Known Bottlenecks

1. **YouTube rate limiting** → Reintentos con backoff
2. **I/O disco** → Buffering, I/O async
3. **Memoria** → LRU cache, limpieza automática
4. **Red** → Dependencia ancho de banda usuario

---

## 11. Reliability

### Failure Scenarios

| Failure | Expected Behavior |
|---|---|
| URL inválida | Error inmediato, no reintentar |
| Video privado | Error claro, no reintentar |
| Conexión perdida | Reintentar 3x con backoff |
| Rate limit YouTube | Reintentar con espera más larga |
| Espacio disco insuficiente | Advertencia antes, cancelar |
| Crash Electron | Recuperable al reiniciar |

### Backup

No requerido (sin estado crítico).

### Recovery

- Reinicio automático de descarga interrumpida
- Limpieza de archivos parciales
- Reset de cache al cerrar

---

## 12. Architectural Principles

1. **Separación de Responsabilidades** — Frontend/Backend desacoplados
2. **Simplicidad sobre Flexibilidad** — KISS, evitar over-engineering
3. **Transparencia Radical** — Sin conexiones ocultas, logs visibles
4. **Portabilidad** — ZIP sin instalación, dependencias embebidas
5. **User-Centric** — Decisiones favorecen experiencia usuario

---

## 13. Architectural Decisions

| ADR | Decision | Status |
|---|---|---|
| ADR-001 | Electron + React para Frontend | Accepted |
| ADR-002 | Python + FastAPI para Backend | Accepted |
| ADR-003 | IPC para comunicación | Accepted |
| ADR-004 | SQLite para configuración | Accepted |
| ADR-005 | Metadata solo en RAM (no persiste) | Accepted |
| ADR-006 | Cola de descargas en serie | Accepted |

Ver: `docs/architecture/decisions/`

---

## 14. Technical Debt

| ID | Description | Impact | Priority |
|---|---|---|---|
| TBD | N/A | N/A | N/A |

(Proyecto nuevo, sin deuda inicial)

---

## 15. Known Limitations

- Solo YouTube (por ahora)
- Desktop-only (no web ni mobile)
- Requiere conexión internet
- Limitado por rate limiting YouTube
- Dependencia de yt-dlp/ffmpeg

---

## 16. Architecture Review

**Last Review:** 2026-08-18 (Initial Design)

**Next Review:** 2026-09-01 (Post-MVP)

**Reviewer:** Claude

### Review Status

Healthy (Proyecto iniciando, diseño validado)

### Required Actions

- [ ] Validar integración Electron + Python en PoC
- [ ] Confirmar empaquetado portátil funciona
- [ ] Pruebas en múltiples SO
