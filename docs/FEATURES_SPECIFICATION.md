# Feature Specification — Celeste Downloader

**Versión**: 1.0  
**Fecha**: 18 de agosto de 2026  
**Estado**: Diseño para Fase 1 (MVP)

---

## Tabla de Contenidos

1. [Principios de Diseño](#principios-de-diseño)
2. [Arquitectura de Estado](#arquitectura-de-estado)
3. [Feature 1: Descarga Sencilla](#feature-1-descarga-sencilla)
4. [Feature 2: Descarga Avanzada](#feature-2-descarga-avanzada)
5. [Feature 3: Cola de Descargas](#feature-3-cola-de-descargas)
6. [Feature 4: Descarga de Listas](#feature-4-descarga-de-listas)
7. [Feature 5: Configuración](#feature-5-configuración)
8. [Feature 6: Historial de Sesión](#feature-6-historial-de-sesión)
9. [Gestión de Metadatos](#gestión-de-metadatos)
10. [Redundancia y Reintentos](#redundancia-y-reintentos)
11. [Diseño de Interfaz](#diseño-de-interfaz)
12. [Consideraciones Técnicas](#consideraciones-técnicas)

---

## Principios de Diseño

### 1. Minimalismo Funcional
- Mostrar solo lo necesario en cada momento
- Descartar decoraciones innecesarias
- Cada elemento tiene un propósito claro
- Visual consistente con esquema de colores limitado

### 2. Transparencia Radical
- Sin telemetría, sin analytics, sin tracking
- Sin anuncios de ningún tipo
- Sin conexiones de red ocultas
- Usuario siempre sabe qué está sucediendo
- Logs visibles opcionalmente (modo debug)

### 3. Facilidad de Uso
- Curva de aprendizaje < 2 minutos
- Comportamiento predecible
- Mensajes de error claros y accionables
- Valores por defecto sensatos
- No requiere documentación para uso básico

### 4. Arquitectura (KISS, DRY, YAGNI)
- Componentes simples, responsabilidad única
- Evitar abstracción prematura
- No implementar features no solicitadas
- Código legible sobre inteligente

---

## Arquitectura de Estado

### Estado Global (Persiste entre sesiones)
```javascript
{
  config: {
    downloadPath: "C:/Users/User/Downloads",  // Configurable
    defaultFormat: "video",  // video | audio
    autoRetries: true,
    maxConcurrentDownloads: 3,
    theme: "dark"  // future-proofing
  },
  metadata_cache: {}  // Cache LRU en memoria, no persiste
}
```

### Estado de Sesión (Se limpia al cerrar)
```javascript
{
  downloads: [],  // Queue + historial de sesión
  currentDownload: null,
  sessionHistory: []  // Solo para UI, no persiste
}
```

### Ciclo de Vida de Datos

```
┌─────────────────────────────────────────────┐
│     Metadatos del Video (Temporal)          │
│  ┌──────────────────────────────────────┐   │
│  │ Obtenidos por yt-dlp info            │   │
│  │ - Título, duración, autor            │   │
│  │ - Miniatura (URL)                    │   │
│  │ - Formatos disponibles               │   │
│  │ - Cacheado por 1 sesión              │   │
│  │ - Se muestra en preview              │   │
│  └──────────────────────────────────────┘   │
│                    ↓                         │
│  Usuario confirma descarga                  │
│                    ↓                         │
│  ┌──────────────────────────────────────┐   │
│  │ Se agrega a Queue/Historial Sesión   │   │
│  │ - Almacenado en memoria RAM          │   │
│  │ - Mostrado en "Últimos descargas"    │   │
│  │ - Desaparece al cerrar app           │   │
│  └──────────────────────────────────────┘   │
│                    ↓                         │
│  Descarga completada → Archivo guardado     │
│  (Metadatos NO se guardan en disco)         │
└─────────────────────────────────────────────┘
```

---

## Feature 1: Descarga Sencilla

### Descripción
Modo pensado para usuarios casuales. Todo está predeterminado:
- Video: máxima calidad disponible (idealmente 1080p, sino mejor disponible)
- Audio: máxima calidad disponible
- Formato automático según tipo (MP4 para video, MP3 para audio)

### Flujo de Usuario

```
1. Usuario abre Celeste Downloader
   ↓
2. Toggle "Tipo de descarga" está en "Sencilla"
   ↓
3. Usuario pega URL de YouTube
   ↓
4. Celeste obtiene metadata (yt-dlp info)
   ↓
5. Muestra preview:
   - Miniatura
   - Título
   - Duración
   - Subido por
   - Fecha
   ↓
6. Usuario elige tipo:
   - [Video] button (predeterminado)
   - [Audio] button
   ↓
7. Usuario hace click "Descargar"
   ↓
8. Descarga inicia en cola
   ↓
9. Progreso visible en barra
   ↓
10. Completado → Aparece en "Últimos descargas"
```

### Opciones Sencillas

| Opción | Valor Predeterminado | Lógica |
|--------|---------------------|--------|
| Formato | Video/Audio (elegible) | Usuario elige, no hay sub-opciones |
| Calidad Video | Mejor disponible ≤ 1080p | yt-dlp selecciona automáticamente |
| Calidad Audio | Mejor disponible | yt-dlp selecciona automáticamente |
| Codec | Automático | H.264 para video, AAC para audio |
| Ubicación | Configurada en Settings | De disco, no solicitada cada vez |

### UI - Modo Sencillo

```
┌─────────────────────────────────────────────────┐
│ Celeste Downloader v1.0                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Input URL aquí]                               │
│                                                 │
│  ┌──────────────────┐  ┌──────────────────┐    │
│  │ [Miniatura]      │  │ Título del Video │    │
│  │ Preview          │  │ Subido por: ...  │    │
│  │ (mientras         │  │ Duración: ...    │    │
│  │  carga)          │  │ Fecha: ...       │    │
│  └──────────────────┘  └──────────────────┘    │
│                                                 │
│  Tipo de descarga: [Sencilla] [Avanzada]       │
│                                                 │
│  Tipo: [Video] [Audio]                          │
│                                                 │
│  Ruta: c:/descargas [Cambiar]                  │
│                                                 │
│  [Descargar]                [████████ 45%]     │
│                                                 │
│  ─────────────────────────────────────────────  │
│  Últimos descargas:                             │
│  • Video 1 (Video 1080p)  [📁]                 │
│  • Video 2 (Audio MP3)    [📁]                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Feature 2: Descarga Avanzada

### Descripción
Modo para usuarios que quieren control total sobre calidad y opciones.

### Flujo de Usuario

```
1-5. [Igual a descarga sencilla]
   ↓
6. Usuario tilda "Avanzada" en toggle
   ↓
7. UI se actualiza: nuevos selectores aparecen
   ↓
8. Usuario ve opciones:
   - Formato: [Video ▼] | [Audio ▼]
   - Calidad Video: [1080p ▼] (si eligió Video)
   - Calidad Audio: [320kbps ▼] (si eligió Audio)
   - Codec Video: [H.264 ▼] (opcional MVP)
   - Codec Audio: [AAC ▼] (opcional MVP)
   ↓
9. Usuario personaliza según necesidad
   ↓
10. Usuario hace click "Descargar"
   ↓
11. Resto igual a descarga sencilla
```

### Opciones Avanzadas

| Opción | Valores | Comportamiento |
|--------|---------|-----------------|
| Formato | Video, Audio | Cambia opciones disponibles |
| Calidad Video | [Dinámico según video] | yt-dlp detecta opciones, user elige |
| Calidad Audio | [128k-320k] | Opciones estándar de audio |
| Codec Video | H.264, VP9, AV1 | Opcional MVP v1.1 |
| Codec Audio | AAC, Opus, Vorbis | Opcional MVP v1.1 |
| Subtítulos | On/Off | Opcional MVP v1.1 |

### Cambio Dinámico Formato ↔ Audio/Video

```
Usuario selecciona "Video" → Muestra opciones de video
                          → Oculta opciones de audio

Usuario selecciona "Audio"  → Oculta opciones de video
                          → Muestra opciones de audio (calidad, codec)
```

### UI - Modo Avanzado

```
┌─────────────────────────────────────────────────┐
│ Celeste Downloader v1.0                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Input URL aquí]                               │
│                                                 │
│  ┌──────────────────┐  ┌──────────────────┐    │
│  │ [Miniatura]      │  │ Título del Video │    │
│  │ Preview          │  │ Subido por: ...  │    │
│  │ (mientras         │  │ Duración: ...    │    │
│  │  carga)          │  │ Fecha: ...       │    │
│  └──────────────────┘  └──────────────────┘    │
│                                                 │
│  Tipo de descarga: [Sencilla] [Avanzada]       │
│                                                 │
│  Formato: [Video ▼]        Calidad: [1080p ▼] │
│                                                 │
│  Ruta: c:/descargas [Cambiar]                  │
│                                                 │
│  [Descargar]                [████████ 45%]     │
│                                                 │
│  ─────────────────────────────────────────────  │
│  Últimos descargas:                             │
│  • Video 1 (Video 1080p)  [📁]                 │
│  • Video 2 (Audio MP3)    [📁]                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Feature 3: Cola de Descargas

### Descripción
Las descargas se procesan en serie (una a la vez). Usuario puede:
- Ver todas las descargas encoladas
- Pausar/Reanudar
- Cancelar individual o toda la cola

### Estado de Descarga

```javascript
{
  id: "uuid",
  url: "https://youtube.com/...",
  status: "pending|downloading|paused|completed|failed",
  progress: {
    percentage: 0-100,
    downloadedBytes: 0,
    totalBytes: 0,
    speed: "2.5 MB/s",
    eta: "00:45"
  },
  metadata: {
    title: "...",
    duration: "12:34",
    format: "mp4",
    quality: "1080p"
  },
  retries: 0,
  downloadedAt: "timestamp"
}
```

### Flujo de Cola

```
Usuario descarga Video A
           ↓
[Downloading Video A] → 50%
           ↓
Usuario descarga Video B
           ↓
Sistema agrega a cola:
├─ Video A (downloading) - 50%
└─ Video B (pending)

Cuando Video A termina:
├─ Video A (completed) ✓
└─ Video B (downloading) - iniciando...

Sistema procesa una por una automáticamente
```

### UI - Visualización de Cola

```
┌─────────────────────────────────────────────────┐
│ Descargas en Cola (3)                           │
├─────────────────────────────────────────────────┤
│                                                 │
│ [Video A]                        [⏸ ✕]         │
│ Descargando: 75%  Speed: 2.5MB/s  ETA: 2:15   │
│ ████████████░░░░░░░░░░░░░░░░░░░                │
│                                                 │
│ [Video B]                        [▶ ✕]         │
│ En cola: Esperando...                          │
│                                                 │
│ [Video C]                        [▶ ✕]         │
│ En cola: Esperando...                          │
│                                                 │
│                         [Cancelar Todo]        │
└─────────────────────────────────────────────────┘
```

### Acciones en Cola

| Acción | Descripción | Resultado |
|--------|-------------|-----------|
| Pausar | Pausa descarga actual | Reanudable, mantiene progreso |
| Cancelar | Cancela una descarga | Se elimina de cola, archivo parcial se borra |
| Cancelar Todo | Cancela toda la cola | Pausa actual se cancela, resto se descarta |
| Reordenar | Mover posición en cola | MVP v1.1 (no en MVP v1.0) |

---

## Feature 4: Descarga de Listas

### Descripción
Usuario puede pegar URL de playlist/canal y descargar todos los videos.

### Tipos Soportados (MVP v1.0)
- YouTube Playlists (públicas)
- YouTube Channels (solo últimos N videos)

### Tipos Futuros (v1.1+)
- Twitch playlists
- Rumble playlists
- Otros

### Flujo

```
Usuario pega URL de playlist
           ↓
Celeste detecta tipo (yt-dlp)
           ↓
Muestra: "¿Descargar playlist de X videos?"
           ↓
Opciones:
├─ [Todos]
├─ [Primeros 10]
├─ [Últimos 10]
└─ [Rango personalizado: ___]
           ↓
Usuario confirma
           ↓
Se agregan todos a la cola como downloads individuales
           ↓
Se procesan en serie
```

### UI - Modal de Descarga de Lista

```
┌──────────────────────────────────────┐
│ Descargar Playlist                   │
├──────────────────────────────────────┤
│                                      │
│ Playlist: "My Favorite Videos"       │
│ Cantidad de videos: 47               │
│ Duración total: 12 horas 34 minutos  │
│                                      │
│ ¿Descargar todos?                    │
│                                      │
│ Opciones:                            │
│ ◉ Todos                              │
│ ○ Primeros: [10]                    │
│ ○ Últimos: [10]                      │
│ ○ Rango: [5] a [15]                 │
│                                      │
│            [Cancelar] [Descargar]   │
└──────────────────────────────────────┘
```

---

## Feature 5: Configuración

### Descripción
Pantalla de settings que guarda cambios en disco (archivo config JSON).

### Opciones Configurables

| Opción | Tipo | Predeterminado | Persistencia |
|--------|------|-----------------|---------------|
| Ubicación de descargas | Path | ~/Downloads | Sí (archivo config) |
| Tema | light/dark | dark | Sí |
| Auto-reintentos | boolean | true | Sí |
| Máximo reintentos | number | 3 | Sí |
| Descargas paralelas | number | 1 | Sí |
| Notificaciones | boolean | true | Sí |
| Caché metadatos | number (min) | 30 | Sí |

### UI - Settings

```
┌─────────────────────────────────────┐
│ Configuración                       │
├─────────────────────────────────────┤
│                                     │
│ Descarga                            │
│ ─────────────────────────────────   │
│ Ubicación: [c:/descargas] [...]     │
│ Auto-reintentos: [toggle]           │
│ Máximo reintentos: [3]              │
│ Caché metadatos: [30] minutos       │
│                                     │
│ Interfaz                            │
│ ─────────────────────────────────   │
│ Tema: [Dark ▼]                      │
│ Notificaciones: [toggle]            │
│                                     │
│ Acerca de                           │
│ ─────────────────────────────────   │
│ Versión: 1.0.0                      │
│ Licencia: Open Source                │
│ © 2026 ATHERsoftwaeLAB              │
│                                     │
│                    [Guardar]        │
└─────────────────────────────────────┘
```

---

## Feature 6: Historial de Sesión

### Descripción
Muestra últimas descargas de la sesión actual. Se borra al cerrar la app.

### Datos Mostrados
- Miniatura del video
- Título
- Formato descargado
- Calidad
- Ubicación (con link a carpeta)
- Timestamp de descarga

### Interacciones
- Click en miniatura: Abre la carpeta del archivo
- Click en título: Abre el archivo
- Hover: Muestra información completa

### UI - Historial

```
┌──────────────────────────────────────────────┐
│ Últimos descargas (sesión actual)            │
├──────────────────────────────────────────────┤
│                                              │
│ [Thumb] Video 1         Video 1080p [📁]     │
│         "Descargado hace 5 min"              │
│         c:/descargas/video-1.mp4             │
│                                              │
│ [Thumb] Video 2         Audio MP3   [📁]     │
│         "Descargado hace 12 min"             │
│         c:/descargas/video-2.mp3             │
│                                              │
│ [Thumb] Video 3         Video 720p [📁]      │
│         "Descargado hace 25 min"             │
│         d:/media/video-3.mp4                 │
│                                              │
│ ─────────────────────────────────────────    │
│ Se limpian al cerrar la aplicación            │
│                                              │
└──────────────────────────────────────────────┘
```

---

## Gestión de Metadatos

### Ciclo de Vida Detallado

#### 1. **Obtención**
```
User Input URL
      ↓
Backend: yt-dlp info [url]
      ↓
Parse respuesta a objeto:
{
  url: "https://...",
  title: "...",
  duration: "MM:SS",
  uploader: "...",
  upload_date: "YYYY-MM-DD",
  formats: [
    { format_id: "18", ext: "mp4", height: 360, ... },
    { format_id: "22", ext: "mp4", height: 720, ... },
    { format_id: "137", ext: "mp4", height: 1080, ... },
  ]
  thumbnail: "https://..."
}
      ↓
Almacenar en RAM (metadata_cache)
      ↓
Mostrar en UI (preview)
```

#### 2. **Caché en Memoria**
```javascript
// Estructura de caché
const metadata_cache = {
  "video_url_hash_1": {
    data: { ... },
    cachedAt: timestamp,
    ttl: 30 * 60 * 1000  // 30 minutos
  }
}

// Limpieza automática
setInterval(() => {
  for (let key in metadata_cache) {
    if (Date.now() - metadata_cache[key].cachedAt > metadata_cache[key].ttl) {
      delete metadata_cache[key];
    }
  }
}, 60000);  // Cada minuto
```

#### 3. **Uso Durante Descarga**
```
User confirma descarga
      ↓
Se crea Download object:
{
  id: uuid,
  url: url,
  metadata: metadata_cache[url_hash],  // Referencia
  status: "pending",
  ...
}
      ↓
Se agrega a queue
      ↓
Backend inicia descarga con yt-dlp
      ↓
Metadata se usa solo para UI (mostrar título, etc)
```

#### 4. **Post-Descarga**
```
Descarga completada
      ↓
Se agrega al sessionHistory (solo nombre + ruta)
{
  id: uuid,
  title: "...",
  format: "mp4",
  quality: "1080p",
  location: "c:/descargas/file.mp4",
  downloadedAt: timestamp
}
      ↓
IMPORTANTE: NO se persiste metadata_cache
      ↓
Se muestra en "Últimos descargas"
      ↓
Al cerrar app → sessionHistory se descarta
      ↓
metadata_cache se limpia de RAM
```

### Reglas de Caché

1. **TTL**: 30 minutos de inactividad
2. **Tamaño máximo**: 50 entradas (LRU evict si excede)
3. **Únicamente en RAM**: No toca disco
4. **Limpieza en cierre**: Se vacía completamente al cerrar app
5. **Validez**: Si URL cambia, se obtiene metadata nueva

---

## Redundancia y Reintentos

### Modelo Simple de Reintentos

```
Usuario inicia descarga
      ↓
Backend ejecuta: yt-dlp download [url]
      ↓
      ¿Éxito?
      ├─ Sí → Completado, mostrar ✓
      └─ No → Capturar error
              ↓
              ¿Error recuperable?
              ├─ Sí (conexión, timeout, etc)
              │  ↓
              │  Intento 1 → Fallido
              │  Espera: 3 segundos
              │  ↓
              │  Intento 2 → Fallido
              │  Espera: 6 segundos
              │  ↓
              │  Intento 3 → Fallido
              │  Espera: 10 segundos
              │  ↓
              │  ¿Max reintentos alcanzado?
              │  ├─ Sí → Error final, mostrar mensaje
              │  └─ No → Siguiente
              │
              └─ No (URL inválida, privado, etc)
                 ↓
                 Error inmediato, no reintentar
```

### Configuración

| Parámetro | MVP | Configurable |
|-----------|-----|--------------|
| Max reintentos | 3 | Sí (Settings) |
| Delay inicial | 3s | No (MVP) |
| Delay multiplicador | exponencial (3x) | No (MVP) |
| Tipos recuperables | conexión, timeout, rate-limit | Predefinido |

### Errores No Recuperables
- URL inválida o malformada
- Video privado
- Video eliminado
- Acceso denegado por región
- Cuenta requerida

**Comportamiento**: Mostrar error claro, no reintentar, sugerir acción

### Errores Recuperables
- Timeout de conexión
- Conexión perdida
- Rate limit de YouTube
- Falla temporal de servidor

**Comportamiento**: Reintentar automáticamente con backoff exponencial

### UI - Estado de Reintento

```
┌──────────────────────────────────────┐
│ Video X                              │
├──────────────────────────────────────┤
│                                      │
│ Descargando...                       │
│ Intento 2 de 3                       │
│ ██████░░░░░░░░░░░░░░░░░░░░░░░░ 35% │
│                                      │
│              [Cancelar]              │
└──────────────────────────────────────┘
```

---

## Diseño de Interfaz

### Paleta de Colores

**Modo Oscuro** (predeterminado)
```
Fondo primario:     #1a1a1a (casi negro)
Fondo secundario:   #2d2d2d (gris oscuro)
Acento primario:    #00a8ff (azul celeste) ← Logo
Acento secundario:  #00d4ff (azul claro)
Texto primario:     #ffffff (blanco)
Texto secundario:   #b0b0b0 (gris claro)
Error:              #ff4444 (rojo)
Éxito:              #44ff44 (verde)
Warning:            #ffaa44 (naranja)
```

### Tipografía

```
Headings:           Inter, sans-serif (600 weight)
Body:               Inter, sans-serif (400 weight)
Mono (logs):        JetBrains Mono
Tamaños:
  H1: 24px
  H2: 18px
  Body: 14px
  Small: 12px
```

### Espaciado (8px grid)

```
Padding contenedor:    16px
Padding interno:       12px
Gap entre elementos:   8px
Margen vertical:       12px
```

### Componentes Base

#### Button
```
Normal:   Fondo #00a8ff, texto blanco, 8px radius
Hover:    Fondo #00d4ff
Active:   Fondo #0080cc
Disabled: Fondo #555555, cursor not-allowed
```

#### Input
```
Fondo:    #2d2d2d
Border:   1px #00a8ff
Texto:    #ffffff
Placeholder: #888888
Focus:    Border 2px #00d4ff, box-shadow 0 0 8px rgba(0,168,255,0.3)
```

#### Card/Container
```
Fondo:    #2d2d2d
Radius:   8px
Border:   1px #444444
Padding:  16px
```

#### Progress Bar
```
Fondo:    #444444
Progreso: Linear gradient #00a8ff → #00d4ff
Radius:   4px
Height:   6px
```

### Layout Principal

```
┌────────────────────────────────────────────────┐
│  Logo + Título                    [⚙] [ⓘ]      │ 48px header
├────────────────────────────────────────────────┤
│                                                │
│  [URL Input...]              (48px input)      │
│                                                │
│  Preview Card          Info Card               │
│  ┌──────────┐          ┌──────────────────┐    │
│  │          │          │ Título           │    │
│  │  Thumb   │          │ Subido por: ...  │    │
│  │ (200x120)│          │ Duración: ...    │    │
│  │          │          │ Fecha: ...       │    │
│  └──────────┘          └──────────────────┘    │
│                                                │
│  Tipo: [Sencilla][Avanzada]                   │
│  Formato: [Video ▼]  Calidad: [Dinámica ▼]   │
│  Ruta: [c:/descargas] [...]                   │
│                                                │
│  [Descargar]            [████░░░░ 45%]        │
│                                                │
│  ────────────────────────────────────────────  │
│  Últimos descargas:                            │
│  • [Thumb] Título (1080p)        [📁]         │
│  • [Thumb] Título (MP3)           [📁]        │
│                                                │
└────────────────────────────────────────────────┘
```

### Responsive (Desktop-first)
```
Ancho mínimo: 900px
Ancho óptimo: 1200px
Máximo contenedor: 1400px

Breakpoints:
900px - 1200px: Ajusta espacios
< 900px: No soportado (desktop only)
```

---

## Consideraciones Técnicas

### Portabilidad (Windows Portable)

El usuario descarga `CelesteDownloader.zip`, lo descomprime y ejecuta sin instalar nada.

**Requisitos en el ZIP:**
```
CelesteDownloader/
├─ CelesteDownloader.exe (Electron)
├─ config/
│  └─ default-config.json
├─ python/
│  ├─ python.exe
│  ├─ lib/
│  └─ ... (Python embebido)
├─ bin/
│  ├─ ffmpeg.exe
│  └─ yt-dlp (ejecutable Python)
└─ resources/
   ├─ icon.png
   └─ ...
```

**Carpetas en Runtime:**
```
%APPDATA%/CelesteDownloader/
├─ config.json (usuario settings, creado en primer run)
└─ metadata_cache/ (temporal, limpiado al cerrar)

%LOCALAPPDATA%/CelesteDownloader/
└─ logs/ (opcional, debug mode)
```

### Detalles de Implementación

#### Metadata Fetching (Backend Python)
```python
# backend/downloader/metadata.py
def get_video_info(url: str) -> dict:
    """
    Obtiene metadata de video sin descargar.
    
    Returns:
    {
        title: str,
        duration: str,
        uploader: str,
        upload_date: str,
        formats: list[dict],
        thumbnail_url: str,
        ...
    }
    """
    try:
        with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
            info = ydl.extract_info(url, download=False)
            return parse_info(info)
    except Exception as e:
        handle_error(e)
```

#### Descarga (Backend Python)
```python
# backend/downloader/download.py
def download_video(
    url: str,
    output_path: str,
    format_type: str,  # 'video' | 'audio'
    quality: str,      # '1080p', '720p', 'best', etc
    callback: Callable  # Progreso updates
) -> str:
    """
    Descarga video/audio usando yt-dlp.
    
    Args:
        url: URL de YouTube
        output_path: Ruta donde guardar
        format_type: 'video' o 'audio'
        quality: Calidad deseada
        callback: Función para reportar progreso
    
    Returns:
        Ruta del archivo descargado
    """
    # Construir opciones de yt-dlp según parámetros
    ydl_opts = build_ydl_options(format_type, quality, output_path)
    
    # Agregar hook para progress
    ydl_opts['progress_hooks'] = [callback]
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.download([url])
            return get_downloaded_file_path(output_path, info)
    except Exception as e:
        handle_download_error(e)
```

#### IPC Frontend ↔ Backend
```javascript
// frontend/src/ipc/downloader.ts
export const downloaderAPI = {
  // Metadata
  getVideoInfo: (url: string) => ipcRenderer.invoke('downloader:getInfo', url),
  
  // Descargar
  startDownload: (opts: DownloadOptions) => 
    ipcRenderer.invoke('downloader:start', opts),
  
  pauseDownload: (id: string) => 
    ipcRenderer.invoke('downloader:pause', id),
  
  cancelDownload: (id: string) => 
    ipcRenderer.invoke('downloader:cancel', id),
  
  // Listeners
  onProgress: (callback: ProgressCallback) =>
    ipcRenderer.on('downloader:progress', callback),
  
  onComplete: (callback: CompleteCallback) =>
    ipcRenderer.on('downloader:complete', callback),
  
  onError: (callback: ErrorCallback) =>
    ipcRenderer.on('downloader:error', callback)
}
```

#### Gestión de Cola (Backend)
```python
# backend/queue/manager.py
class DownloadQueue:
    def __init__(self):
        self.queue = []
        self.current = None
        self.lock = threading.Lock()
    
    def add(self, task: DownloadTask):
        """Agrega tarea a la cola"""
        with self.lock:
            self.queue.append(task)
            if not self.current:
                self.process_next()
    
    def process_next(self):
        """Procesa siguiente tarea en cola"""
        if self.queue:
            self.current = self.queue.pop(0)
            self.download_task(self.current)
        else:
            self.current = None
    
    def download_task(self, task):
        """Ejecuta descarga con manejo de progreso"""
        def on_progress(d):
            if d['status'] == 'downloading':
                send_progress_update(task.id, d)
            elif d['status'] == 'finished':
                send_complete(task.id)
                self.process_next()
        
        try:
            download_video(
                task.url,
                task.output_path,
                task.format,
                task.quality,
                on_progress
            )
        except Exception as e:
            handle_error(task, e)
            if should_retry(e, task.retries):
                task.retries += 1
                self.queue.insert(0, task)  # Reintentar
            self.process_next()
```

### Licencia Recomendada

Dado que yt-dlp usa Unlicense (public domain), opciones compatibles:
- **Unlicense** (igual a yt-dlp)
- **MIT** (muy permisiva)
- **GPL v3** (copyleft)

**Recomendación**: MIT License
- Permisiva pero requiere atribución
- Compatible con yt-dlp
- Fácil de entender

---

## Próxima Fase: Detalle Técnico

Este documento cubre Feature Design. El siguiente paso será:

1. **Component Architecture** — Estructura de componentes React
2. **API Specification** — Contratos IPC entre Frontend y Backend
3. **Database Schema** — Estructura SQLite (config)
4. **Error Catalog** — Listado completo de errores y manejo
5. **Testing Strategy** — Plan de pruebas unitarias, integración e E2E

---

**Documento completado**: 18 de agosto de 2026  
**Versión**: 1.0  
**Estado**: Listo para implementación Fase 1
