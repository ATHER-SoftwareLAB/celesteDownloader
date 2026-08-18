# Celeste Downloader — Project Definition

## 1. Overview

**Name:** Celeste Downloader

**Version:** 0.1.0 (Planning)

**Status:** Development (Fase 1 Starting)

**Repository:** https://github.com/atherlab/celesteDownloader

**Created:** 2026-08-18

**Last Updated:** 2026-08-18

---

## 2. Purpose

### Problem

Usuarios que descargan videos de YouTube deben usar línea de comandos (`yt-dlp` directo) o herramientas web genéricas poco confiables. No existe UI moderna y confiable solo para este propósito.

### Solution

Aplicación de escritorio moderna (Electron + React) que proporciona UI elegante para descargar videos/audio de YouTube usando yt-dlp embebido. Totalmente portátil (ZIP sin instalación), transparente (sin telemetría), y minimalista.

### Value

- **Para usuarios:** Interfaz clara, curva aprendizaje < 2 minutos, ningún riesgo de malware
- **Para desarrolladores:** Código simple y pragmático (~700 líneas Fase 1), fácil de mantener
- **Para el producto:** Diferenciador vs sitios web (confiabilidad, velocidad, control local)

---

## 3. Objectives

### Primary Objective

Entregar aplicación funcional y elegante para descargar videos de YouTube en 2-3 semanas (Fase 1) con **todas las features core** usando código pragmático (KISS).

### Secondary Objectives

- Código mantenible y simple (evitar over-engineering)
- Documentación clara para futuros desarrolladores
- Base sólida para expansión (listas, plataformas adicionales)
- Transparencia radical (sin telemetría, sin malware)

### Non-Goals

- Web app (solo desktop)
- Sincronización en la nube (Fase 2)
- Soporte múltiples plataformas en v0.1 (versión inicial Windows/macOS, después Linux)
- Sistema de recomendaciones
- Gestor de biblioteca avanzado (Fase 2)

---

## 4. Users

### Primary Users

Personas que descargan regularmente videos de YouTube:
- Educadores archivando contenido
- Creadores de contenido (material de referencia)
- Usuarios con conexión limitada (offline viewing)

### Secondary Users

- Desarrolladores que extienden la herramienta
- Contribuidores open source

### User Context

**Cuando:** A demanda, mientras navegan YouTube  
**Donde:** En su computadora (desktop)  
**Por qué:** Guardar videos para visualizar después, descargar audio, control de calidad  

---

## 5. Core Features (Fase 1)

| ID | Feature | Priority | Descripción |
|---|---|---|---|
| F-001 | Descarga Sencilla | Must | Modo automático: 1080p video / best audio |
| F-002 | Descarga Avanzada | Must | Control total: elegir formato, calidad, codec |
| F-003 | Cola de Descargas | Must | Procesar en serie (no simultáneas), pause/cancel |
| F-004 | Configuración | Should | Ubicación, tema, reintentos, cache TTL |
| F-005 | Historial Sesión | Should | Últimas descargas (se limpia al cerrar) |
| F-006 | Reintentos Automáticos | Should | 3 intentos con backoff exponencial |
| F-007 | Descarga de Listas | Could | Playlists/canales (Fase 2 si tiempo) |
| F-008 | Manejo de Errores | Must | Mensajes claros, sugerencias de solución |

---

## 6. Technology Stack

| Layer | Technology | Razón |
|---|---|---|
| **Frontend** | Electron | Desktop native, fácil empaquetado |
| **Frontend UI** | React | Prototipado rápido, comunidad |
| **Frontend Language** | TypeScript | Type safety sin complejidad |
| **Backend** | Python 3.10+ | Integración nativa yt-dlp |
| **Backend Framework** | FastAPI | Simple, rápido, built-in async |
| **Communication** | IPC (Electron) | Integrado, sin overhead network |
| **Download Engine** | yt-dlp | Mejor mantenedor, soporte YouTube |
| **Video Processing** | ffmpeg | Integrado en yt-dlp |
| **Configuration** | JSON file | Simple, human-readable, local |
| **Database** | SQLite | Confiable, local, no server |
| **Testing** | pytest + Jest | Unit/integration tests |
| **Build** | electron-builder | Estándar en Electron |
| **CI/CD** | GitHub Actions | Integrado, gratuito |

---

## 7. Project Constraints

### Technical

- **Portabilidad:** ZIP sin instalación (embeber Python + ffmpeg)
- **Performance:** Metadata < 5s, UI response < 500ms
- **No servidor:** Todo local, sin dependencias externas
- **Compatibilidad:** Windows/macOS v0.1, Linux en Fase 2

### Business

- **Tiempo:** 2-3 semanas Fase 1 (solo features Must)
- **Team:** 1 persona (pragmatismo sobre perfección)
- **Budget:** Cero (open source)
- **Release:** v0.1-beta → feedback → v1.0

### Legal / Compliance

- **yt-dlp:** GNU GPL v3 compatible (our MIT license compatible)
- **ffmpeg:** LGPL compatible
- **Disclaimers:** Usuarios responsables de respetar copyright
- **No ToS:** No tracking, transparencia radical

---

## 8. Success Criteria (MVP)

El MVP Fase 1 es exitoso cuando:

- ✅ Usuario puede pegar URL de YouTube y ver preview (< 5s)
- ✅ Modos sencillo y avanzado funcionan correctamente
- ✅ Descargas guardan en ~/Downloads con calidad correcta
- ✅ Cola procesa en serie, pause/cancel funcionan
- ✅ Errores mostrados con mensajes claros
- ✅ App no crashea
- ✅ Configuración persiste entre sesiones
- ✅ UI elegante y responsiva (900px mínimo)
- ✅ ~700 líneas de código total (frontend + backend)
- ✅ Builds portables funcionan en Windows

### Métricas

| Métrica | Target | Validación |
|---|---|---|
| User learning curve | < 2 min | Usuario nuevo descarga sin documentación |
| Download success rate | > 95% | Errores son por URL inválida, no bug |
| Error clarity | 10/10 | Mensajes sugieren soluciones |
| Code simplicity | ~700 lines | No over-engineering, KISS |
| Timeline | 2-3 semanas | Estimation realista |

---

## 9. Roadmap

### Fase 1: MVP Core (2-3 semanas)
**Deliverable:** Aplicación funcional básica

- Día 1-2: Setup Electron + Python + IPC
- Día 3-4: Descarga sencilla + preview
- Día 5-6: Descarga avanzada + cola
- Día 7-8: Configuración + reintentos
- Día 9-10: UI polish + testing + build

**Features:** F-001, F-002, F-003, F-004, F-005, F-006, F-008

### Fase 2: Expansión (3-4 semanas)
**Deliverable:** Features opcionales

- Descarga de listas (F-007)
- Documentación de usuario
- Tests adicionales
- UI improvements

### Fase 3: Release (2 semanas)
**Deliverable:** v1.0 producción

- Testing en múltiples SO
- Release oficial
- Documentación completa
- GitHub/social

**Total:** 7-9 semanas, 1 persona

---

## 10. Documentation Map

| Documento | Ubicación | Propósito |
|---|---|---|
| **Project Definition** | Este archivo | Overview y objetivos |
| **Design Brief** | `claude/DESIGN_BRIEF.md` | Arquitectura y decisiones |
| **Features Spec** | `claude/FEATURES_SPECIFICATION.md` | Requerimientos detallados |
| **Architecture** | `ARCHITECTURE.md — System Architecture.md` | Diseño técnico |
| **Phase 1 Roadmap** | `claude/PHASE1_ROADMAP.md` | Plan diario, ejemplos código |
| **Implementation Guide** | `claude/IMPLEMENTATION_GUIDE.md` | Instrucciones paso a paso |
| **IPC Specification** | `claude/IPC_SPECIFICATION.md` | Contratos de comunicación |
| **Engineering Guide** | `CLAUDE.md — AI Engineering Instructions.md` | Estándares y principios |
| **README** | `README.md` | Guía para usuarios/developers |

---

## 11. Project Principles

### 1. Transparencia Radical
- Sin telemetría, analytics, o tracking
- Sin anuncios
- Sin dependencias ocultas
- Usuario siempre sabe qué está sucediendo
- Logs visibles (modo debug)

### 2. Minimalismo Funcional
- Mostrar solo lo necesario
- Cada elemento tiene propósito
- Valores sensatos por defecto
- Interfaz autodescriptiva
- Paleta de colores limitada

### 3. Facilidad de Uso
- Curva aprendizaje < 2 minutos
- Comportamiento predecible
- Errores claros y accionables
- No requiere documentación para uso básico

### 4. KISS / DRY / YAGNI
- **Keep It Simple, Stupid** — Evita complejidad innecesaria
- **Don't Repeat Yourself** — Código compartido
- **You Aren't Gonna Need It** — Solo features solicitadas
- **Code that works > Perfect architecture**

### 5. Pragmatismo
- Implementación simple sobre patrones complejos
- Refactoring solo cuando duele
- Itera rápido, agrega features después
- ~700 líneas Fase 1 en lugar de 5000+ over-engineered

---

## 12. Current State

**Current Phase:** Fase 1 — Implementación

**Current Milestone:** Setup + Core Download

**Current Focus:** 
- Completar documentación (✅)
- Setup Electron + Python (próximo)
- Implementar descarga sencilla
- Agregar UI y cola

**Known Issues:** Ninguno (pre-desarrollo)

**Technical Debt:** Ninguno (proyecto nuevo)

---

## 13. Environment

- **Development:** Electron + React local, Python dev server
- **Build:** electron-builder producción
- **Distribution:** ZIP portable (sin installer)
- **Target OS:** Windows 10+, macOS 10.15+
- **Target Hardware:** 2GB RAM mínimo, SSD recomendado

---

## Change Log

| Fecha | Cambio | Autor |
|---|---|---|
| 2026-08-18 | Definición inicial del proyecto | Claude |
