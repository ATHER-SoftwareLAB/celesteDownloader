import os
import uuid

import yt_dlp
from fastapi import FastAPI
from pydantic import BaseModel

from downloader import download_video, get_metadata

app = FastAPI()

DOWNLOAD_DIR = os.path.expanduser("~/Downloads")


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


@app.post("/download")
def download(req: DownloadRequest):
    task_id = str(uuid.uuid4())
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    try:
        download_video(req.url, req.quality, DOWNLOAD_DIR)
        return {"success": True, "task_id": task_id, "status": "completed"}
    except yt_dlp.utils.DownloadError as e:
        return {
            "success": False,
            "task_id": task_id,
            "status": "error",
            "error": friendly_error(str(e)),
        }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=5000)
