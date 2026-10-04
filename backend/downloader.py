import os
from typing import Callable, Optional

import yt_dlp
from yt_dlp.utils import sanitize_filename

# URLs copied from YouTube often carry a `list=` param (mix/playlist/queue).
# Without noplaylist, yt-dlp extracts every entry in that list instead of
# just the requested video, which can mean dozens of videos and minutes.
SINGLE_VIDEO_ARGS = {"noplaylist": True}


def get_metadata(url: str) -> dict:
    ydl_opts = {
        "quiet": True,
        "skip_download": True,
        "socket_timeout": 15,
        **SINGLE_VIDEO_ARGS,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

        seen_heights = set()
        formats = []
        for f in info.get("formats", []):
            height = f.get("height")
            if height and height not in seen_heights:
                seen_heights.add(height)
                formats.append({"height": height, "fps": f.get("fps") or 0})
        formats.sort(key=lambda f: f["height"], reverse=True)

        return {
            "url": url,
            "title": info.get("title"),
            "duration": info.get("duration"),
            "uploader": info.get("uploader"),
            "upload_date": info.get("upload_date"),
            "thumbnail": info.get("thumbnail"),
            "formats": formats,
        }


def _progress_hook(callback: Callable[[dict], None]):
    def hook(d: dict) -> None:
        if d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            downloaded = d.get("downloaded_bytes", 0)
            percent = int(downloaded / total * 100) if total else 0
            callback({"status": "downloading", "progress": percent})
        elif d["status"] == "finished":
            callback({"status": "processing", "progress": 100})

    return hook


def _unique_base(output_dir: str, title: str, ext: str) -> str:
    """Path without extension such that `<base>.<ext>` doesn't exist yet."""
    safe_title = sanitize_filename(title, restricted=False) or "descarga"
    base = os.path.join(output_dir, safe_title)
    n = 1
    while os.path.exists(f"{base}.{ext}"):
        base = os.path.join(output_dir, f"{safe_title} ({n})")
        n += 1
    return base


def download_video(
    url: str,
    quality: str,
    output_dir: str,
    title: str,
    format_type: str = "video",
    on_progress: Optional[Callable[[dict], None]] = None,
) -> str:
    ext = "mp3" if format_type == "audio" else "mp4"
    # Title decided up front and collision-checked against files already on
    # disk instead of yt-dlp's own %(title)s templating, so downloading the
    # same video twice doesn't overwrite the first file - it gets
    # "title (1).ext" instead.
    base = _unique_base(output_dir, title, ext)
    ydl_opts = {
        # The extension is left to yt-dlp: it appends the real extension to
        # any name whose extension doesn't match the downloaded stream, so a
        # literal "title.mp3" ended up as "title.mp3.mp3" after audio
        # extraction. "%" is doubled so a title like "100%" or "%(id)s" isn't
        # read as a template field.
        "outtmpl": base.replace("%", "%%") + ".%(ext)s",
        "quiet": True,
        "socket_timeout": 15,
        **SINGLE_VIDEO_ARGS,
    }

    if format_type == "audio":
        ydl_opts["format"] = "bestaudio/best"
        ydl_opts["postprocessors"] = [
            {"key": "FFmpegExtractAudio", "preferredcodec": "mp3"}
        ]
    else:
        ydl_opts["format"] = (
            f"bestvideo[height<={quality}]+bestaudio/best[height<={quality}]"
            if quality
            else "best"
        )
        ydl_opts["merge_output_format"] = "mp4"

    if on_progress:
        ydl_opts["progress_hooks"] = [_progress_hook(on_progress)]

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)

    # Final file after merging/audio extraction, as reported by yt-dlp.
    downloads = info.get("requested_downloads") or []
    return downloads[0]["filepath"] if downloads else f"{base}.{ext}"
