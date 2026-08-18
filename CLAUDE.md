# CLAUDE.md — Engineering Instructions

## 1. Project

**Name:** Celeste Downloader

**Description:** UI gráfica para descargar videos de YouTube sin usar terminal, basada en yt-dlp.

**Architecture:** Modular Monolith (Electron Frontend + Python Backend)

**Primary Stack:** Electron, React, TypeScript, Python, FastAPI, yt-dlp, ffmpeg, SQLite

---

## 2. Mission

Eres un agente de ingeniería trabajando en este repositorio.

Tu objetivo es implementar software confiable y mantenible mientras preservas la arquitectura, requisitos, seguridad y estándares de ingeniería del proyecto.

No optimices solo para "hacer que el código funcione".

Prioriza en este orden:

1. **Correctness** — El código hace lo que debe hacer
2. **Maintainability** — Fácil de entender y modificar
3. **Security** — Sin vulnerabilidades conocidas
4. **Testability** — Testeable automáticamente
5. **Simplicity** — KISS, evita over-engineering
6. **Performance** — Cuando es relevante

---

## 3. Source of Truth

Usa estas fuentes en este orden:

1. **Current source code** — Implementación actual
2. **Architecture documentation** — `docs/architecture/ARCHITECTURE.md`
3. **ADR documents** — `docs/architecture/decisions/`
4. **Features specification** — `docs/FEATURES_SPECIFICATION.md`
5. **Linear issues** — Trabajo actual y criterios de aceptación
6. **Project definition** — `PROJECT.md`

Si la documentación entra en conflicto con la implementación, no asumas cuál es correcta.

Reporta la discrepancia y determina qué debe cambiar.

---

## 4. Documentation Map

| Purpose | Location | Status |
|---|---|---|
| Project Definition | `PROJECT.md` | Active |
| System Design Brief | `docs/DESIGN_BRIEF.md` | Active |
| Features Specification | `docs/FEATURES_SPECIFICATION.md` | Active |
| Architecture | `docs/architecture/ARCHITECTURE.md` | Active |
| Engineering Guidelines | `CLAUDE.md` (este archivo) | Active |
| ADRs | `docs/architecture/decisions/` | Active |
| API Specification | `docs/API.md` | Planned |
| Component Architecture | `docs/COMPONENT_ARCHITECTURE.md` | Planned |

Lee la documentación relevante antes de cambios significativos.

---

## 5. Before Coding

Antes de implementar una feature significativa:

1. Entiende el requisito (lee Linear issue)
2. Inspecciona implementación existente
3. Identifica componentes afectados
4. Lee documentación de arquitectura relevante
5. Revisa ADRs relacionados
6. Identifica riesgos y dependencias
7. Propón plan de implementación conciso

**NO** comiences implementación sustancial basada en descripción corta si falta contexto arquitectónico.

---

## 6. Architecture Rules

Respeta la arquitectura definida en: `docs/architecture/ARCHITECTURE.md`

No introduzcas patrón arquitectónico nuevo solo porque sea posible técnicamente.

**Prefiere:**

- Patrones existentes
- Abstracciones existentes
- Dependencias existentes
- Soluciones simples
- Cambios locales sobre refactoring global

**Evita:**

- Abstracción prematura
- Dependencias innecesarias
- Business logic duplicada
- Circular dependencies
- Tight coupling

---

## 7. Architectural Changes

Un cambio arquitectónico incluye:

- Introducir patrón arquitectónico nuevo
- Cambiar almacenamiento de datos
- Cambiar autenticación
- Introducir servicio externo nuevo
- Cambiar comunicación entre componentes
- Cambiar infraestructura deployment
- Introducir infraestructura significativa
- Cambiar dependencias mayores

Antes de hacer tal cambio:

1. Inspecciona ADRs existentes
2. Explica el cambio propuesto
3. Identifica alternativas
4. Identifica consecuencias
5. Crea o propone ADR cuando sea apropiado

**NUNCA** introduzcas decisión arquitectónica significativa silenciosamente.

---

## 8. Requirements

El comportamiento funcional debe derivar del requisito/especificación relevante.

**NO** inventes requisitos a menos que se pida explícitamente.

Cuando requisitos sean ambiguos:

- Identifica la ambigüedad
- Establece la suposición
- Pide clarificación si impacta implementación materialmente

---

## 9. Linear Issues

Cada pieza significativa de trabajo debe corresponder a un issue en Linear.

Cuando trabajas en un issue:

- Lee descripción completa
- Lee criterios de aceptación
- Chequea dependencias
- Chequea issues relacionados
- Mantén implementación alineada con el issue

**NO** marques issue como completado solo porque el código compila.

Una tarea está completa solo cuando:
- Criterios de aceptación están satisfechos
- Validación requerida fue realizada
- Tests pasan
- No hay regresiones obvias

---

## 10. Git

Usa Conventional Commits.

**Formato:**

```
type(scope): description
```

**Ejemplos:**

```
feat(downloader): add simple mode with 1080p default
fix(queue): handle pause correctly with retry logic
refactor(backend): simplify metadata cache
test(downloader): add tests for quality selection
docs(architecture): document IPC contract
```

**Reglas:**

- No commits con cambios no relacionados
- No reescribas history a menos que sea pedido explícitamente
- Un commit = una razón para cambio

---

## 11. Branches

Usa:

```
type/ISSUE-ID-short-description
```

**Ejemplos:**

```
feat/CELES-1-simple-download-mode
fix/CELES-5-queue-pause-bug
refactor/CELES-12-metadata-caching
```

---

## 12. Testing

Toda conducta nueva debe tener tests apropiados.

**Prefiere:**

- Unit tests para lógica aislada (backend math, parsing)
- Integration tests para interacción de componentes (IPC, queue)
- E2E tests para flujos críticos de usuario (descarga completa)

Antes de considerar trabajo completado:

1. Ejecuta tests relevantes
2. Ejecuta suite más amplia cuando apropriado
3. Investiga fallos
4. **NO** deshabilites o removes tests solo para que pasen

---

## 13. Security

**NUNCA commits:**

- API keys
- Passwords
- Tokens
- Credenciales privadas
- Secrets
- `.env` files con credenciales reales

Cuando modifiques funcionalidad sensible a seguridad:

- Revisa autenticación
- Revisa autorización
- Revisa validación de inputs
- Revisa session handling
- Revisa data exposure
- Revisa logging
- Revisa security de dependencias

**NO** asumas que validación client-side es suficiente.

---

## 14. Dependencies

Antes de agregar dependencia:

1. Chequea si functionality ya existe en proyecto
2. Chequea si standard library lo resuelve
3. Chequea dependencias existentes
4. Evalúa implications de maintenance y security
5. Agrega solo si es justificado

**Evita** dependencias para functionality trivial.

---

## 15. Database

Respeta arquitectura existente de base de datos.

Cambios de database deben considerar:

- Schema integrity
- Existing data
- Migrations
- Indexes
- Constraints
- Referential integrity
- Performance
- Rollback/recovery

**NUNCA** modifiques datos en producción sin autorización explícita.

---

## 16. IPC / API

Cuando modifiques IPC channels:

- Preserva backward compatibility cuando sea posible
- Valida inputs
- Retorna errores consistentes
- Documenta cambios de contract significativos
- Actualiza tests relevantes

**NO** cambies IPC contracts silenciosamente.

---

## 17. Code Quality

Prefiere código que sea:

- **Clear** — Fácil de leer y entender
- **Explicit** — Intención obvia, sin magia
- **Cohesive** — Cada función tiene propósito único
- **Testable** — Fácil de probar automáticamente
- **Easy to modify** — Cambios no crean efectos secundarios

**Evita:**

- Código clever (inteligente pero oscuro)
- Deep nesting
- Funciones grandes
- Hidden side effects
- Abstracciones innecesarias
- Optimización prematura

Sigue convenciones establecidas en el repositorio.

---

## 18. Refactoring

**NO** hagas refactoring no relacionado mientras implementas feature.

Si descubres deuda técnica significativa:

1. Documéntala
2. Determina si bloquea trabajo actual
3. Crea Linear issue cuando apropiado
4. Direcciona separadamente a menos que sea necesaria para feature actual

---

## 19. Documentation

Actualiza documentación cuando cambios de implementación hacen docs inacurados.

Documentación debe explicar:

- Qué hace el sistema
- Por qué decisiones importantes fueron tomadas
- Cómo componentes importantes interactúan

**NO** dupliques información innecesariamente.

---

## 20. Definition of Done

Una tarea está completa cuando:

- [ ] Implementación está completa
- [ ] Criterios de aceptación están satisfechos
- [ ] Tests están implementados donde apropiado
- [ ] Tests pasan
- [ ] Sin regresiones obvias introducidas
- [ ] Implicaciones de seguridad fueron consideradas
- [ ] Documentación fue actualizada si es necesaria
- [ ] Cambios arquitectónicos fueron documentados si es necesaria
- [ ] Linear issue está actualizado
- [ ] Cambios listos para review

---

## 21. Working Style

Cuando se te pide implementar algo:

### Step 1 — Understand
Inspecciona código y documentación relevante.

### Step 2 — Plan
Proporciona plan conciso para cambios significativos.

### Step 3 — Implement
Haz el cambio más pequeño y apropiado que resuelva el problema.

### Step 4 — Validate
Ejecuta tests relevantes, linters, type checks, builds.

### Step 5 — Review
Revisa cambios por:
- Correctness
- Security
- Maintainability
- Cambios no intencionales

### Step 6 — Report
Resume:
- Qué cambió
- Archivos afectados
- Tests realizados
- Concerns pendientes
- Status Linear issue

---

## 22. Key Principles for This Project

### Transparencia Radical

- **Sin telemetría** — Ningún tracking, analytics, o phone-home
- **Sin anuncios** — Aplicación limpia sin ads
- **Sin dependencias ocultas** — Todo embebido o explícito
- **Logs visibles** — Usuario sabe qué está pasando
- **Open Source** — Código disponible para inspección

### Minimalismo Funcional

- **Mostrar solo necesario** — UI limpia, sin clutter
- **Cada elemento tiene propósito** — No decoración
- **Valores sensatos por defecto** — No requiere documentación para uso básico
- **Paleta limitada** — Azul + grises, consistente

### Facilidad de Uso

- **Curva aprendizaje < 2 minutos** — Nuevo usuario productivo inmediatamente
- **Comportamiento predecible** — Las acciones tienen consecuencias obvias
- **Errores claros** — Mensajes accionables, sugieren soluciones
- **No requiere manual** — Interfaz autodescriptiva

### KISS / DRY / YAGNI

- **Keep It Simple, Stupid** — Evita complejidad innecesaria
- **Don't Repeat Yourself** — Código compartido, no duplicado
- **You Aren't Gonna Need It** — No features no solicitadas

---

## 23. Important Rule

Cuando no estés seguro:

**NO** inventes convenciones, requisitos, arquitectura, o comportamiento.

Inspecciona el repositorio y documentación primero.

Si la incertidumbre persiste y la decisión tiene consecuencias materiales:

**STOP y pide clarificación.**

Es mejor preguntar que asumir.

---

**Última actualización:** 2026-08-18  
**Versión:** 1.0  
**Estado:** Active
