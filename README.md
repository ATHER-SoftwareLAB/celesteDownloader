# Celeste Downloader

Una UI moderna y elegante para descargar videos de YouTube sin usar terminal, basada en la librería `yt-dlp`.

## Descripción

**Celeste Downloader** es una aplicación de escritorio que proporciona una alternativa gráfica intuitiva a la línea de comandos para descargar videos y audio de YouTube. Diseñado con principios de minimalismo, transparencia y facilidad de uso.

## Características Principales

### Fase 1 - MVP

- **Descarga Sencilla** — Modo automático con 1080p por defecto
- **Descarga Avanzada** — Control total de calidad y formato
- **Cola de Descargas** — Procesadas en serie, no simultáneas
- **Configuración Persistente** — Ubicación, temas, reintentos
- **Historial de Sesión** — Últimas descargas (volátil)
- **Reintentos Automáticos** — Con backoff exponencial
- **Portabilidad** — ZIP sin instalación requerida

### Fase 2+ 

- Descarga de playlists/listas
- Soporte múltiples plataformas
- Gestor de biblioteca
- Sincronización en la nube

## Stack Tecnológico

- **Frontend:** Electron + React + TypeScript
- **Backend:** Python + FastAPI
- **Comunicación:** IPC (Inter-Process Communication)
- **Descarga:** yt-dlp + ffmpeg
- **Configuración:** SQLite (local)
- **Testing:** pytest, Jest
- **CI/CD:** GitHub Actions

## Documentación

- **[PROJECT.md](./PROJECT.md)** — Definición y objetivos del proyecto
- **[CLAUDE.md](./CLAUDE.md)** — Guías de ingeniería y principios
- **[docs/DESIGN_BRIEF.md](./docs/DESIGN_BRIEF.md)** — Arquitectura del sistema
- **[docs/FEATURES_SPECIFICATION.md](./docs/FEATURES_SPECIFICATION.md)** — Especificación detallada de features
- **[docs/architecture/ARCHITECTURE.md](./docs/architecture/ARCHITECTURE.md)** — Arquitectura técnica
- **[docs/architecture/decisions/](./docs/architecture/decisions/)** — Architectural Decision Records (ADRs)

## Roadmap

### Fase 1: MVP (2-3 semanas)
- [ ] Setup Electron + React + Python
- [ ] Modo descarga sencilla
- [ ] Modo descarga avanzada
- [ ] Cola de descargas
- [ ] Configuración y persistencia
- [ ] Historial de sesión
- [ ] Reintentos automáticos
- [ ] UI minimalista y elegante
- [ ] Testing y build

### Fase 2: Core Features (3-4 semanas)
- [ ] Descarga de listas/playlists
- [ ] Mejoras de UI
- [ ] Documentación de usuario
- [ ] Tests adicionales

### Fase 3: Release (2 semanas)
- [ ] Testing final en múltiples SO
- [ ] Release v1.0
- [ ] Documentación completa

## Principios de Diseño

### 1. Transparencia Radical
- Sin telemetría, analytics, o tracking
- Sin anuncios
- Sin dependencias ocultas
- Usuario siempre sabe qué está sucediendo

### 2. Minimalismo Funcional
- Mostrar solo lo necesario
- Cada elemento tiene propósito
- Valores sensatos por defecto
- UI limpia y elegante

### 3. Facilidad de Uso
- Curva de aprendizaje < 2 minutos
- Comportamiento predecible
- Errores claros y accionables
- No requiere documentación para uso básico

### 4. Arquitectura Simple
- KISS (Keep It Simple, Stupid)
- DRY (Don't Repeat Yourself)
- YAGNI (You Aren't Gonna Need It)
- Componentes con responsabilidad única

## Desarrollo

### Pre-requisitos

- Node.js 18+
- Python 3.10+
- Git

### Setup Inicial

```bash
# Clonar repositorio
git clone <repo-url>
cd celesteDownloader

# Frontend setup
cd frontend
npm install
npm run dev

# Backend setup (en otra terminal)
cd backend
python -m venv venv
source venv/bin/activate  # o `venv\Scripts\activate` en Windows
pip install -r requirements.txt
python main.py
```

### Tests

```bash
# Backend
cd backend
pip install -r requirements-dev.txt
pytest
```

### Estructura de Carpetas

```
celesteDownloader/
├── docs/
│   ├── DESIGN_BRIEF.md
│   ├── FEATURES_SPECIFICATION.md
│   ├── architecture/
│   │   ├── ARCHITECTURE.md
│   │   └── decisions/
│   └── requirements/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   └── types/
│   └── package.json
├── backend/
│   ├── downloader/
│   ├── queue/
│   ├── config/
│   ├── errors/
│   ├── ipc/
│   ├── main.py
│   └── requirements.txt
├── PROJECT.md
├── CLAUDE.md
└── README.md
```

## Licencia

MIT License — Licencia permisiva compatible con yt-dlp.

## Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama (`feat/ISSUE-ID-description`)
3. Commit con mensajes descriptivos
4. Push y abre Pull Request

## Soporte

Para bugs, features, o preguntas:
- Abre un issue en GitHub
- Revisa la documentación en `/docs`

---

**Versión:** 0.1.0 (Planning)  
**Autor:** ATHERsoftwareLAB  
**Última actualización:** 2026-08-18
