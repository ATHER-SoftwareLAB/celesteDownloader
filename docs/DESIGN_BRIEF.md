# System Design Brief — Celeste Downloader

## Executive Summary

**Celeste Downloader** es una aplicación de escritorio con interfaz gráfica que proporciona una alternativa moderna y amigable a la terminal para descargar videos de YouTube usando la librería `yt-dlp`. El objetivo es eliminar la barrera de entrada que representa usar la línea de comandos, permitiendo a usuarios no técnicos descargar y convertir videos de forma sencilla.

---

## 1. Visión del Proyecto

### Problema
Los usuarios que desean descargar videos de YouTube enfrentan varias barreras:
- Requieren conocimiento de línea de comandos
- `yt-dlp` es poderoso pero complejo de configurar
- Las opciones están dispersas en documentación
- No existe retroalimentación visual en tiempo real
- Manejo manual de errores es confuso

### Solución
Una aplicación de escritorio con interfaz gráfica (GUI) que:
- Abstrae la complejidad de `yt-dlp`
- Proporciona controles visuales intuitivos
- Ofrece retroalimentación en tiempo real del progreso
- Maneja errores de forma elegante con mensajes claros
- Permite configuración común de forma simplificada

### Valor
- **Para usuarios**: Acceso democrático a descargas de video sin conocimientos técnicos
- **Para el proyecto**: Base sólida para expansión futura (conversión, edición, organización)
- **Sostenibilidad**: Mantenimiento centralizado de configuraciones de `yt-dlp`

---

## 2. Objetivos del Proyecto

### Objetivo Primario
Proveer una interfaz gráfica intuitiva y funcional para descargar videos de YouTube que sea accesible a usuarios no técnicos, encapsulando la complejidad de `yt-dlp`.

### Objetivos Secundarios
- Permitir descarga de videos en múltiples formatos (MP4, WebM, etc.)
- Permitir descarga de solo audio (MP3, M4A)
- Mostrar metadatos de video antes de descargar (duración, calidad disponible, tamaño)
- Gestionar la cola de descargas con inicio/pausa/cancelación
- Guardar configuraciones de usuario (directorio de descarga, formato preferido)
- Manejar errores comunes (URLs inválidas, videos privados/eliminados, límites de YouTube)

### No-Objetivos
Este proyecto **no** incluirá:
- Conversor de formatos avanzado (solo formatos nativos de `yt-dlp`)
- Editor de video
- Gestor de biblioteca de videos descargados
- Integración con servicios de streaming adicionales (solo YouTube inicialmente)
- Soporte para descarga masiva/automática de canales
- Interfaz web (solo aplicación de escritorio)

---

## 3. Usuarios

### Usuario Primario: Descargador Casual
- **Perfil**: Usuario no técnico que ocasionalmente descarga videos
- **Contexto**: Busca una forma sencilla de guardar videos sin usar terminal
- **Necesidades principales**:
  - Interfaz simple y clara
  - Indicador visual de progreso
  - Capacidad de elegir formato básico (MP4, MP3)
  - Manejo automático de errores comunes

### Usuario Secundario: Power User
- **Perfil**: Usuario que descarga frecuentemente con requisitos específicos
- **Contexto**: Requiere opciones avanzadas como calidad, codecs, metadatos
- **Necesidades**:
  - Opciones avanzadas (codec específico, rango de bitrate, subtítulos)
  - Historial de descargas
  - Búsqueda/filtrado de descargas previas
  - Perfiles de configuración guardados

### Contexto de Uso
- Usuarios trabajan en su computadora personal (Windows, macOS, Linux)
- Descarga de 1-20 videos por sesión típicamente
- Sesiones de descarga pueden durar minutos a horas
- Usuarios pueden abandonar la aplicación durante descargas

---

## 4. Requerimientos Funcionales

| ID | Requisito | Prioridad | Notas |
|---|---|---|---|
| **F-001** | Cargar URL de YouTube y validar | Must | Valida formato de URL, accesibilidad del video |
| **F-002** | Mostrar información del video | Must | Título, duración, miniatura, formatos disponibles |
| **F-003** | Seleccionar formato de descarga | Must | Video (MP4, WebM), Audio (MP3, M4A) |
| **F-004** | Seleccionar calidad | Should | Resolución para video, bitrate para audio |
| **F-005** | Descargar video a directorio local | Must | Usar `yt-dlp` backend |
| **F-006** | Mostrar progreso de descarga | Must | Porcentaje, velocidad, tiempo estimado |
| **F-007** | Iniciar/Pausar/Cancelar descargas | Should | Interfaz de control de cola |
| **F-008** | Gestionar descargas simultáneas | Should | Configurar número de descargas paralelas |
| **F-009** | Mostrar errores con claridad | Must | Mensajes amigables para errores comunes |
| **F-010** | Guardar configuraciones de usuario | Should | Directorio de descarga, formato predeterminado |
| **F-011** | Historial de descargas | Could | Lista de videos descargados, acceso rápido |
| **F-012** | Copiar a portapapeles | Should | Copiar URL, título, información del video |

---

## 5. Requerimientos No-Funcionales

| Categoría | Requerimiento | Especificación |
|---|---|---|
| **Performance** | Tiempo de respuesta UI | < 500ms para acciones de usuario |
| **Performance** | Carga de metadatos | < 5 segundos para URL válida |
| **Escalabilidad** | Descargas simultáneas | Mínimo 3-5 en paralelo |
| **Disponibilidad** | Downtime | Solo durante actualizaciones |
| **Confiabilidad** | Reintentos automáticos | 3 reintentos para errores de red |
| **Usabilidad** | Curva de aprendizaje | Nuevo usuario productivo en < 2 minutos |
| **Compatibilidad** | SO soportados | Windows 10+, macOS 10.13+, Linux (Ubuntu 18.04+) |
| **Compatibilidad** | Acceso a YouTube | Sin restricciones de región geográfica (respeta ToS) |
| **Almacenamiento** | Tamaño de instalación | < 200MB |
| **Seguridad** | No almacenar credenciales | Solo URLs y configuraciones públicas |
| **Seguridad** | Validar URLs | Rechazar URLs sospechosas o malformadas |

---

## 6. Restricciones

### Técnicas
- **Dependencia de `yt-dlp`**: Librería de Python que debe estar disponible
- **Dependencia de ffmpeg**: Requerido por `yt-dlp` para conversión de formatos
- **Límites de YouTube**: Respetar restricciones de ToS, manejo de throttling
- **Sistema de archivos**: Espacio disponible debe ser suficiente para descargas

### De Negocio
- **Presupuesto**: Proyecto personal/OSS sin financiamiento inicial
- **Equipo**: Desarrollo inicial por 1-2 personas
- **Timeline**: MVP en 2-3 meses, iteraciones frecuentes
- **Licencia**: Respetar licencia de `yt-dlp` (PL)

### Legales
- **Cumplimiento**: Respetar Términos de Servicio de YouTube
- **Copyright**: No modificar protecciones, solo descargar contenido permitido
- **Privacidad**: No recopilar datos de usuarios sin consentimiento

---

## 7. Stack Tecnológico Propuesto

| Capa | Tecnología | Justificación |
|---|---|---|
| **Framework Desktop** | Electron / Tauri / PyQt | Ver análisis de trade-offs |
| **Backend** | Python + FastAPI (opcional) | Integración nativa con `yt-dlp` |
| **Comunicación** | IPC / REST | Desacoplamiento Frontend-Backend |
| **Base de datos** | SQLite | Configuraciones y historial local |
| **yt-dlp** | yt-dlp (última versión) | Motor de descarga probado |
| **ffmpeg** | ffmpeg binario embebido | Conversión de formatos |
| **Testing** | pytest, Jest/Vitest | Unitario e integración |
| **CI/CD** | GitHub Actions | Build y release automático |
| **Versionado** | Semantic Versioning | Control de cambios |
| **Distribución** | Instaladores nativos | .exe (Win), .dmg (Mac), .deb/.AppImage (Linux) |

---

## 8. Arquitectura de Alto Nivel

### Visión General
```
┌─────────────────────────────────────────────────┐
│            INTERFAZ GRÁFICA (Frontend)           │
│  (Electron/Tauri + React/Vue + TypeScript)       │
├─────────────────────────────────────────────────┤
│  IPC Bridge / REST API                           │
├─────────────────────────────────────────────────┤
│          BACKEND (Python/Process Manager)         │
│  - Download Manager                              │
│  - Format Handler                                │
│  - Error Handler                                 │
│  - Config Manager                                │
├─────────────────────────────────────────────────┤
│     DEPENDENCIAS (yt-dlp, ffmpeg)                │
└─────────────────────────────────────────────────┘
    │                    │                  │
    ▼                    ▼                  ▼
┌─────────┐        ┌──────────┐       ┌──────────┐
│ YouTube │        │ SQLite   │       │ File     │
│         │        │ (config) │       │ System   │
└─────────┘        └──────────┘       └──────────┘
```

### Componentes Principales

#### Frontend (Interfaz Gráfica)
- **Página principal**: Entrada de URL, vista previa de video
- **Pantalla de descargas**: Cola de tareas, progreso, historial
- **Configuraciones**: Preferencias de usuario, directorios
- **Estilos**: Tema moderno, responsive (aunque desktop-first)

#### Backend / Proceso Principal
- **Download Manager**: Orquesta descargas con `yt-dlp`, maneja cola
- **Format Handler**: Mapea selecciones UI a opciones de `yt-dlp`
- **Metadata Fetcher**: Obtiene información de video sin descargar
- **Error Handler**: Interpreta errores de `yt-dlp`, traduce a mensajes UI
- **Config Manager**: Persiste configuraciones en SQLite

#### Capas Internas
- **IPC Bridge**: Comunicación entre Frontend y Backend
- **Database Layer**: Acceso a SQLite (configuraciones, historial)
- **File System Manager**: Validación de rutas, permisos, espacio disponible
- **Process Manager**: Control de procesos de `yt-dlp`, ffmpeg

---

## 9. Flujos de Datos Principales

### Flujo 1: Descarga de Video
```
Usuario ingresa URL
        │
        ▼
Validar URL (formato básico)
        │
        ▼
Obtener metadata (yt-dlp info)
        │
        ▼
Mostrar preview (título, duración, formatos)
        │
        ▼
Usuario selecciona formato/calidad
        │
        ▼
Agregar a cola de descargas
        │
        ▼
Ejecutar yt-dlp download
        │
        ▼
Mostrar progreso en tiempo real
        │
        ▼
Manejo de errores (reintentos, cancelación)
        │
        ▼
Guardar a directorio + registry local
        │
        ▼
Notificar completación
```

### Flujo 2: Gestión de Configuración
```
Usuario abre Configuraciones
        │
        ▼
Cargar valores actuales de SQLite
        │
        ▼
UI muestra opciones (directorio, formato def., etc.)
        │
        ▼
Usuario modifica valores
        │
        ▼
Guardar cambios en SQLite
        │
        ▼
Backend recarga configuración
        │
        ▼
Aplicar a descargas futuras
```

---

## 10. Consideraciones de Escalabilidad

### Carga Esperada (MVP)
- Usuarios concurrentes: 1-10 instancias
- Descargas simultáneas por usuario: 3-5
- Tamaño típico de video: 50-500MB
- Velocidad de descarga: Variable (10-50 Mbps típico)

### Estrategia de Escalabilidad
- **Local-first**: Todo ejecuta en máquina del usuario (sin servidor central)
- **Escalabilidad horizontal**: Instancias independientes, sin sincronización requerida
- **Escalabilidad vertical**: Optimización de CPU/memoria para descargas paralelas

### Posibles Cuellos de Botella
1. **Límites de YouTube**: Rate limiting, bloqueos de IP (mitigación: rotación de user-agents)
2. **I/O de Disco**: Escritura de archivos grandes (mitigación: buffering, I/O async)
3. **Memoria**: Metadata en caché (mitigación: LRU cache, límites configurable)
4. **Red**: Ancho de banda limitado (mitigación: ajustes de velocidad, reintentos)

### Consideraciones Futuras
- **Cloud sync**: Sincronización de configuración entre dispositivos
- **Gestor de biblioteca**: Indexación y búsqueda de descargas locales
- **Queue distribuida**: Descargas programadas entre dispositivos
- **Estadísticas**: Analíticas locales de uso y patrones de descarga

---

## 11. Decisiones Arquitectónicas Clave

### Decisión 1: Desktop vs Web
**Opciones**:
- A) Aplicación de Escritorio (Electron/Tauri)
- B) Aplicación Web (React + Node backend)
- C) Aplicación Híbrida

**Selección**: **A — Aplicación de Escritorio**

**Justificación**:
- Mejor integración con sistema de archivos local
- Control de permisos más sencillo
- Mejor rendimiento para descargas grandes
- Experiencia nativa más pulida
- No requiere servidor central

**Trade-offs**:
- Código específico por SO (mitigado con frameworks multiplataforma)
- Mayor tamaño de instalación

---

### Decisión 2: Frontend Framework
**Opciones**:
- A) Electron + React/Vue/Svelte
- B) Tauri + React/Vue/Svelte
- C) PyQt6 (nativo Python)

**Selección**: **A — Electron + React**

**Justificación**:
- Madurez y ecosistema amplio
- Comunidad activa
- Herramientas de desarrollo robustas
- Facilidad de iterar en UI

**Trade-offs**:
- Mayor consumo de memoria que Tauri
- Dependencia de Node.js en build

**Consideración futura**: Mirar Tauri como alternativa más ligera si rendimiento es problema

---

### Decisión 3: Backend / Integración yt-dlp
**Opciones**:
- A) Subproceso directo de yt-dlp desde Node (child_process)
- B) Servidor Python (FastAPI) + IPC
- C) Python embebido en Electron (python-shell)

**Selección**: **B — Servidor Python + IPC**

**Justificación**:
- Mejor separación de responsabilidades
- Python nativo para `yt-dlp`
- Fácil de testear backend independientemente
- Mejor manejo de procesos pesados
- Escalabilidad futura (reemplazo fácil de componentes)

**Trade-offs**:
- Complejidad de IPC
- Necesidad de empaquetar Python
- Gestión de múltiples procesos

---

### Decisión 4: Almacenamiento Local
**Opciones**:
- A) Archivos JSON planos
- B) SQLite (base de datos embebida)
- C) LevelDB

**Selección**: **B — SQLite**

**Justificación**:
- Confiabilidad y ACID
- Escalable para historial de descargas
- Fácil de consultar y respaldar
- No requiere servidor separado

---

## 12. Plan de Desarrollo Fases

### Fase 1: MVP (2-3 semanas)
- [ ] Estructura base Electron + React
- [ ] Backend Python básico con FastAPI
- [ ] Integración inicial de `yt-dlp`
- [ ] UI de descarga simple
- [ ] Descarga de video en MP4
- [ ] Manejo de errores básicos
- [ ] Build/distribución de prueba

**Deliverable**: Aplicación funcional de descarga simple

### Fase 2: Core Features (3-4 semanas)
- [ ] Múltiples formatos (MP3, WebM, etc.)
- [ ] Cola de descargas visual
- [ ] Pause/Resume/Cancel
- [ ] Pantalla de configuración
- [ ] Historial de descargas
- [ ] UI mejorada y pulida

**Deliverable**: Aplicación feature-complete para usuarios casuale

### Fase 3: Polish & Distribution (2 semanas)
- [ ] Testing completo
- [ ] Optimización de rendimiento
- [ ] Instaladores nativos (Win/Mac/Linux)
- [ ] Documentación de usuario
- [ ] Release inicial pública

**Deliverable**: Versión 1.0 lista para producción

### Fase 4: Expansión (Post-MVP)
- [ ] Soporte para otras plataformas (Spotify, TikTok)
- [ ] Editor de metadatos
- [ ] Gestor de biblioteca
- [ ] Sincronización en la nube
- [ ] Descarga por lotes

---

## 13. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| YouTube cambia API/bloquea acceso | Alto | Alto | Monitoreo de cambios, pruebas constantes, comunidad yt-dlp |
| Problemas de empaquetar Python en Electron | Medio | Medio | Investigación temprana, usar pyinstaller comprobado |
| Rate limiting de YouTube | Medio | Medio | Manejo elegante de errores, esperas configurables |
| Espacio disco insuficiente | Bajo | Medio | Validación previa, alerta al usuario, sugerencias |
| Incompatibilidad ffmpeg | Bajo | Bajo | ffmpeg embebido, tests en múltiples SO |
| Abandono de yt-dlp | Muy bajo | Alto | Mantener fork si es necesario, alternativas preparadas |

---

## 14. Criterios de Éxito (MVP)

- [ ] Descarga correcta de videos públicos de YouTube
- [ ] UI intuitiva (usuario nuevo productivo en < 3 minutos)
- [ ] Manejo robusto de 90% de errores comunes
- [ ] Descargas múltiples simultáneas sin crashes
- [ ] Funcionamiento en Windows 10+, macOS 10.13+, Ubuntu 20.04+
- [ ] Tiempo de inicio < 3 segundos
- [ ] Consumo de memoria < 300MB en reposo
- [ ] Documentación clara para usuarios

---

## 15. Próximos Pasos

1. **Validación de arquitectura**: Revisar con stakeholders
2. **Prueba de concepto**: Validar integración `yt-dlp` + Electron
3. **Setup de proyecto**: Repositorio, CI/CD, estructura de carpetas
4. **Diseño detallado de UI**: Mockups, flujos de usuario
5. **Implementación de Fase 1**: Backend base + UI básica

---

## 16. Apéndice: Trade-offs Analizados

### Electron vs Tauri vs PyQt

| Aspecto | Electron | Tauri | PyQt |
|---|---|---|---|
| Tamaño instalación | 150-200MB | 50-70MB | 80-100MB |
| Memoria RAM | Alto (150-300MB) | Bajo (50-100MB) | Bajo (50-100MB) |
| Tiempo startup | Medio (1-3s) | Rápido (0.3-1s) | Rápido (0.5-2s) |
| Facilidad UI | Alta (web standard) | Media (web + Rust) | Baja (Qt-specific) |
| Madurez | Muy alta | Media (creciente) | Muy alta |
| Comunidad | Muy grande | Creciente | Grande |
| Binding Python | Complejo | Posible | Nativo |

**Conclusión**: Electron es la mejor opción para balance entre UX, madurez y facilidad de desarrollo.

---

**Documento preparado el**: 18 de agosto de 2026  
**Versión**: 1.0 — Brief Inicial  
**Estado**: Listo para revisión y validación arquitectónica
