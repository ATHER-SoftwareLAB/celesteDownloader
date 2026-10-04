import logging
import os
import threading
import time
import uuid
from typing import Optional

import yt_dlp
from fastapi import FastAPI
from pydantic import BaseModel

from config import get_config, set_config
from downloader import download_video, get_metadata

app = FastAPI()
logger = logging.getLogger(__name__)

# In-memory queue: one download processed at a time, in submission order.
# tasks holds status/progress per task_id; pending holds ids waiting their turn;
# current_id is the task_id being processed right now (or None if idle).
tasks: dict[str, dict] = {}
pending: list[str] = []
current_id: str | None = None
paused = False
queue_lock = threading.Lock()


def friendly_error(message: str) -> str:
    lower = message.lower()
    if "private" in lower:
        return "Este video es privado y no se puede descargar"
    if "unavailable" in lower or "not available" in lower:
        return "El video no está disponible"
    if "unsupported url" in lower or "no video formats" in lower:
        return "El enlace no es válido"
    return "No se pudo procesar el video. Verifica el enlace"


@app.get("/ping")
def ping():
    return {"message": "pong desde Python"}


@app.get("/info")
def info(url: str):
    try:
        return get_metadata(url)
    except yt_dlp.utils.DownloadError as e:
        return {"error": friendly_error(str(e))}


class DownloadRequest(BaseModel):
    url: str
    quality: str
    format: str = "video"
    title: str = ""


def _process(task_id: str) -> None:
    global current_id
    task = tasks[task_id]
    task["status"] = "downloading"

    def on_progress(update: dict) -> None:
        task.update(update)

    try:
        download_dir = get_config()["download_path"]
        os.makedirs(download_dir, exist_ok=True)
        output_path = download_video(
            task["url"],
            task["quality"],
            download_dir,
            task["title"],
            format_type=task["format"],
            on_progress=on_progress,
        )
        task["status"] = "completed"
        task["progress"] = 100
        task["path"] = output_path
    except yt_dlp.utils.DownloadError as e:
        task["status"] = "error"
        task["error"] = friendly_error(str(e))
    # Anything else (disk full, no write permission, ffmpeg failure...) must
    # also end the task: if it escaped, it would kill the worker thread and
    # leave this task and every queued one stuck until the backend restarts.
    except OSError:
        logger.exception("Error writing download for task %s", task_id)
        task["status"] = "error"
        task["error"] = (
            "No se pudo guardar el archivo. Verifica que la carpeta de descargas "
            "exista y tengas permisos de escritura"
        )
    except Exception:
        logger.exception("Unexpected error processing task %s", task_id)
        task["status"] = "error"
        task["error"] = "Ocurrió un error inesperado durante la descarga"
    finally:
        with queue_lock:
            current_id = None


def _worker() -> None:
    global current_id
    while True:
        task_id = None
        with queue_lock:
            if not paused and current_id is None and pending:
                task_id = pending.pop(0)
                current_id = task_id
        if task_id is None:
            time.sleep(0.5)
            continue
        _process(task_id)


threading.Thread(target=_worker, daemon=True).start()


@app.post("/download")
def download(req: DownloadRequest):
    task_id = str(uuid.uuid4())
    tasks[task_id] = {
        "url": req.url,
        "quality": req.quality,
        "format": req.format,
        "title": req.title,
        "status": "pending",
        "progress": 0,
    }
    with queue_lock:
        pending.append(task_id)
        position = len(pending)
    return {"success": True, "task_id": task_id, "status": "queued", "position": position}


@app.get("/progress/{task_id}")
def progress(task_id: str):
    task = tasks.get(task_id)
    if task is None:
        return {"error": "Tarea no encontrada"}
    return {
        "task_id": task_id,
        "status": task["status"],
        "progress": task["progress"],
        **({"error": task["error"]} if "error" in task else {}),
        **({"path": task["path"]} if "path" in task else {}),
    }


@app.get("/queue")
def get_queue_status():
    with queue_lock:
        current = None
        if current_id is not None:
            task = tasks[current_id]
            current = {
                "task_id": current_id,
                "status": task["status"],
                "progress": task["progress"],
            }
        queue_list = [
            {"task_id": tid, "status": tasks[tid]["status"], "position": i + 1}
            for i, tid in enumerate(pending)
        ]
        return {"current": current, "queue": queue_list, "paused": paused}


@app.post("/queue/pause")
def pause_queue():
    global paused
    paused = True
    return {"paused": True}


@app.post("/queue/resume")
def resume_queue():
    global paused
    paused = False
    return {"paused": False}


class ConfigUpdate(BaseModel):
    download_path: Optional[str] = None
    theme: Optional[str] = None
    auto_retries: Optional[bool] = None
    max_retries: Optional[int] = None
    metadata_cache_ttl: Optional[int] = None


@app.get("/config")
def config_get():
    return get_config()


@app.post("/config")
def config_set(update: ConfigUpdate):
    updates = {k: v for k, v in update.model_dump().items() if v is not None}
    return set_config(updates)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=5000)
