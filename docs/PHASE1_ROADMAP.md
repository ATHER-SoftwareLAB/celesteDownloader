# Phase 1 Roadmap — Implementación 2-3 Semanas

**Premisa:** Todas las features core del MVP, pero con código simple y directo. Sin patterns complejos, sin abstracciones innecesarias.

**Timeline Realista:** 40-50 horas totales = 2-3 semanas a 15-25h/semana

---

## Features Deliverables (No Eliminamos Nada)

✅ Descarga Sencilla (1080p/best)  
✅ Descarga Avanzada (control calidad)  
✅ Cola de Descargas (serial)  
✅ Configuración Persistente  
✅ Historial de Sesión  
✅ Reintentos Automáticos  
✅ Descarga de Playlists (públicas; canales: últimos N videos)  
✅ Manejo de Errores  

---

## Filosofía: KISS (Keep It Simple, Stupid)

### ❌ Lo que evitamos (Over-Engineering)
```python
# Abstract classes, factories, dependency injection
class DownloadManager(ABC):
    @abstractmethod
    def download(self): pass

class SerialDownloadManager(DownloadManager):
    def __init__(self, queue_processor, error_handler, logger):
        self.queue_processor = queue_processor
        # ... 20 líneas de setup
```

**Resultado:** 500+ líneas, 9 semanas, difícil de entender

### ✅ Lo que hacemos (Simple)
```python
# Código directo y funcional
downloads = []
current_download = None

def add_download(url, format_type, quality):
    downloads.append({'url': url, 'format': format_type, 'status': 'pending'})
    if not current_download:
        process_next()

def process_next():
    global current_download
    if downloads:
        current_download = downloads.pop(0)
        # Descargar...
```

**Resultado:** 50 líneas, 2 semanas, fácil de entender y mantener

---

## Timeline Semanal

### Semana 1: Core Functionality (40 horas)

#### Día 1-2: Setup (8h)
- [ ] Crear repo con estructura carpetas
- [ ] Electron app básica (main.js + React component)
- [ ] Python FastAPI server
- [ ] IPC working (test: React envía "hola", Python responde)
- [ ] TypeScript compilando
- [ ] Build producción

**Resultado:** App abre, puedes escribir en input, backend responde  
**Código aproximado:** 150 líneas (main.js + App.jsx + main.py)

---

#### Día 3-4: Metadata & Descarga Sencilla (16h)
- [ ] Input URL + Botón "Obtener Info"
- [ ] Mostrar preview (thumbnail, título, duración, autor, fecha)
- [ ] Botón "Descargar" + Barra de progreso
- [ ] yt-dlp metadata retrieval
- [ ] Download en 1080p
- [ ] Error handling básico

**Código aproximado:** Frontend ~100 líneas, Backend ~150 líneas

---

#### Día 5-6: Descarga Avanzada + Cola (12h)
- [ ] Toggle Sencilla/Avanzada
- [ ] Selectores (Formato, Calidad)
- [ ] Cola simple (array de tareas)
- [ ] Procesar una por una
- [ ] Reintentos con backoff: 3s → 6s → 10s

**Código aproximado:** Frontend +50 líneas, Backend +80 líneas

---

### Semana 2: Features + Polish (30 horas)

#### Día 7-8: Configuración + Historial (10h)
- [ ] Settings screen
- [ ] Config JSON load/save
- [ ] Historial últimas descargas

**Código aproximado:** Frontend +50 líneas, Backend +30 líneas

---

#### Día 9-10: UI Polish + Testing + Build (12h)
- [ ] Paleta colores (#00a8ff + grises)
- [ ] Tipografía (Inter + JetBrains Mono)
- [ ] Tests básicos
- [ ] Electron builder (Windows portable)
- [ ] ffmpeg + yt-dlp embebidos

---

## Definición de "Done" (MVP)

✅ Puedo pegar URL de YouTube  
✅ Veo preview (thumbnail, título, duración, autor)  
✅ Modo sencillo: click descargar → video en 1080p  
✅ Modo avanzado: elijo formato y calidad  
✅ Cola procesa en serie  
✅ Puedo descargar una playlist (todos, primeros N, últimos N o rango)  
✅ Reintentos automáticos funcionan  
✅ Configuración persiste  
✅ Errores claros  
✅ UI minimalista y elegante  
✅ ZIP portable funciona  
✅ Código < 700 líneas  

**Estimación Total:** 40-50 horas = 2-3 semanas  
**Código Total:** ~525 líneas (bajo 700)  

---

**Filosofía Final:** Code that works and is maintainable is better than perfect architecture.

