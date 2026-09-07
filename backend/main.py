import os
import threading
import uuid

import yt_dlp
from fastapi import FastAPI
from pydantic import BaseModel

from downloader import download_video, get_metadata

app = FastAPI()

DOWNLOAD_DIR = os.path.expanduser("~/Downloads")

# In-memory task tracking. A single process, single download at a time, so a
# plain dict is enough - no queue/persistence needed yet.
tasks: dict[str, dict] = {}


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


def _run_download(task_id: str, req: DownloadRequest) -> None:
    def on_progress(update: dict) -> None:
        tasks[task_id].update(update)

    try:
        download_video(
            req.url,
            req.quality,
            DOWNLOAD_DIR,
            format_type=req.format,
            on_progress=on_progress,
        )
        tasks[task_id] = {"status": "completed", "progress": 100}
    except yt_dlp.utils.DownloadError as e:
        tasks[task_id] = {
            "status": "error",
            "progress": tasks[task_id].get("progress", 0),
            "error": friendly_error(str(e)),
        }


@app.post("/download")
def download(req: DownloadRequest):
    task_id = str(uuid.uuid4())
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    tasks[task_id] = {"status": "downloading", "progress": 0}
    threading.Thread(target=_run_download, args=(task_id, req), daemon=True).start()
    return {"success": True, "task_id": task_id, "status": "started"}


@app.get("/progress/{task_id}")
def progress(task_id: str):
    task = tasks.get(task_id)
    if task is None:
        return {"error": "Tarea no encontrada"}
    return {"task_id": task_id, **task}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=5000)
