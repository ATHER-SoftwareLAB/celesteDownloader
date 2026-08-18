# Implementation Guide — Guía Paso a Paso

Sigue estos pasos para implementar Celeste Downloader en Fase 1.

**Prerequisitos:** Node.js 18+, Python 3.10+, Git, ffmpeg

---

## Fase 0: Setup Inicial

```bash
cd celesteDownloader
mkdir -p frontend/src backend docs/architecture/decisions
```

## Fase 1, Día 1-2: Setup Electrón + Python (8h)

### Frontend Setup
```bash
cd frontend
npm install electron electron-builder react react-dom
```

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install yt-dlp fastapi uvicorn pydantic
```

### IPC Setup
- Frontend main.js: Electron entry point
- preload.js: Expose ipc to React
- Python main.py: FastAPI server en localhost:5000

**Verificación:** Electron app abre → React renders → Python backend responde vía IPC

---

## Fase 1, Día 3-4: Descarga Sencilla (16h)

### Backend (downloader.py - ~150 líneas)
```python
import yt_dlp

def get_metadata(url):
    with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
        info = ydl.extract_info(url, download=False)
        return {
            'title': info.get('title'),
            'duration': info.get('duration'),
            'uploader': info.get('uploader'),
            'upload_date': info.get('upload_date'),
            'thumbnail': info.get('thumbnail'),
            'url': url
        }

def download_video(url, quality='best'):
    ydl_opts = {
        'format': f'best[height<={quality}]' if quality != 'best' else 'best',
        'outtmpl': '%(title)s.%(ext)s'
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        return {'success': True, 'filename': info.get('title')}
```

### Frontend (App.jsx - ~100 líneas)
```jsx
const [url, setUrl] = useState('');
const [preview, setPreview] = useState(null);

const handleGetInfo = async () => {
  const info = await window.ipc.invoke('getInfo', url);
  setPreview(info);
};

const handleDownload = async () => {
  await window.ipc.invoke('download', {url, quality: 'best'});
};
```

---

## Fase 1, Día 5-6: Descarga Avanzada + Cola (12h)

### Queue Management (queue.py - ~80 líneas)
```python
class DownloadQueue:
    def __init__(self):
        self.queue = []
        self.current = None
    
    def add(self, url, format_type, quality):
        self.queue.append({'url': url, 'format': format_type, 'quality': quality})
        if not self.current:
            self.process_next()
    
    def process_next(self):
        if self.queue:
            self.current = self.queue.pop(0)
            # Download current
```

### Frontend Advanced Mode
- Toggle sencilla/avanzada
- Selectores formato y calidad
- Cola visual

---

## Fase 1, Día 7-10: Config + Historial + Polish + Build

### Config Management (config.py - ~15 líneas)
```python
import json
import os

CONFIG_FILE = os.path.expanduser('~/.celeste/config.json')

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE) as f:
            return json.load(f)
    return {'download_path': os.path.expanduser('~/Downloads')}

def save_config(config):
    os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f)
```

### UI Polish
- Paleta: #00a8ff (azul celeste) + grises
- Tipografía: Inter + JetBrains Mono
- Grid 8px spacing
- Responsive 900px mínimo

### Build
```bash
npm run build
npm run build-electron  # electron-builder
```

---

## Validación Final

```bash
# Backend tests
cd backend && pytest

# Frontend tests
cd frontend && npm test

# E2E: Descargar video real de YouTube
# 1. Pegar URL
# 2. Ver preview
# 3. Descargar en 1080p
# 4. Verificar archivo en ~/Downloads
# 5. Intentar descarga que falle
# 6. Verificar reintentos
```

---

**Checklist Final:**
- [ ] Descarga sencilla funciona
- [ ] Descarga avanzada funciona
- [ ] Cola en serie funciona
- [ ] Reintentos automáticos funcionan
- [ ] Configuración persiste
- [ ] Errores claros
- [ ] UI elegante
- [ ] ZIP portable funciona
- [ ] Código < 700 líneas

**Status:** Ready for Fase 1 implementation

