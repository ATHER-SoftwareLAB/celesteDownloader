import os
import threading
import time
import uuid

import yt_dlp
from fastapi import FastAPI
from pydantic import BaseModel

from downloader import download_video, get_metadata

app = FastAPI()

DOWNLOAD_DIR = os.path.expanduser("~/Downloads")

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


def _process(task_id: str) -> None:
    global current_id
    task = tasks[task_id]
    task["status"] = "downloading"

    def on_progress(update: dict) -> None:
        task.update(update)

    try:
        download_video(
            task["url"],
            task["quality"],
            DOWNLOAD_DIR,
            format_type=task["format"],
            on_progress=on_progress,
        )
        task["status"] = "completed"
        task["progress"] = 100
    except yt_dlp.utils.DownloadError as e:
        task["status"] = "error"
        task["error"] = friendly_error(str(e))
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
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    tasks[task_id] = {
        "url": req.url,
        "quality": req.quality,
        "format": req.format,
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=5000)
