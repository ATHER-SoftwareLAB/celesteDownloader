import os
import re
from typing import Callable, Optional

import yt_dlp
from yt_dlp.utils import sanitize_filename

# URLs copied from YouTube often carry a `list=` param (mix/playlist/queue).
# Without noplaylist, yt-dlp extracts every entry in that list instead of
# just the requested video, which can mean dozens of videos and minutes.
SINGLE_VIDEO_ARGS = {"noplaylist": True}

# Channels can have thousands of uploads; only the most recent ones are listed.
CHANNEL_MAX_VIDEOS = 50

# A channel URL (@handle, /channel/, /c/, /user/), optionally with a tab.
CHANNEL_URL_RE = re.compile(
    r"^(?P<base>(?:https?://)?(?:www\.|m\.)?youtube\.com/"
    r"(?:@[^/?#]+|channel/[^/?#]+|c/[^/?#]+|user/[^/?#]+))"
    r"(?P<tab>/[^?#]*)?"
)

# Titles yt-dlp gives to playlist entries that can't be downloaded.
UNAVAILABLE_ENTRY_TITLES = {"[Private video]", "[Deleted video]"}


def channel_videos_url(url: str) -> Optional[str]:
    """For a channel URL, the URL of its Videos tab; None for anything else.

    A channel's root URL lists its tabs (Videos, Shorts, Live...) as entries
    instead of videos, so it is pointed at the Videos tab. A URL that already
    names a tab is kept as is.
    """
    match = CHANNEL_URL_RE.match(url)
    if not match:
        return None
    tab = (match.group("tab") or "").strip("/")
    return url if tab else f"{match.group('base')}/videos"


def _entry_thumbnail(entry: dict) -> Optional[str]:
    thumbnails = entry.get("thumbnails") or []
    return thumbnails[-1].get("url") if thumbnails else None


def _playlist_metadata(url: str, info: dict, is_channel: bool) -> dict:
    entries = []
    unavailable = 0
    for entry in info.get("entries") or []:
        # Skip nested lists (e.g. channel tabs) - only single videos are queued.
        if not entry or entry.get("ie_key") != "Youtube" or not entry.get("url"):
            continue
        if entry.get("title") in UNAVAILABLE_ENTRY_TITLES:
            unavailable += 1
            continue
        entries.append(
            {
                "url": entry["url"],
                "title": entry.get("title") or "descarga",
                "duration": entry.get("duration"),
                "thumbnail": _entry_thumbnail(entry),
            }
        )
    return {
        "type": "playlist",
        "url": url,
        "title": info.get("title"),
        "uploader": info.get("uploader") or info.get("channel"),
        "is_channel": is_channel,
        "unavailable_count": unavailable,
        "entries": entries,
    }


def _video_metadata(url: str, info: dict) -> dict:
    seen_heights = set()
    formats = []
    for f in info.get("formats", []):
        height = f.get("height")
        if height and height not in seen_heights:
            seen_heights.add(height)
            formats.append({"height": height, "fps": f.get("fps") or 0})
    formats.sort(key=lambda f: f["height"], reverse=True)

    return {
        "type": "video",
        "url": url,
        "title": info.get("title"),
        "duration": info.get("duration"),
        "uploader": info.get("uploader"),
        "upload_date": info.get("upload_date"),
        "thumbnail": info.get("thumbnail"),
        "formats": formats,
    }


def get_metadata(url: str) -> dict:
    """Metadata for a video, or for a playlist/channel with its list of videos."""
    channel_url = channel_videos_url(url)
    ydl_opts = {
        "quiet": True,
        "skip_download": True,
        "socket_timeout": 15,
        # List playlist entries without extracting each video (seconds
        # instead of minutes); a single video is still fully extracted.
        "extract_flat": "in_playlist",
        **SINGLE_VIDEO_ARGS,
    }
    if channel_url:
        ydl_opts["playlistend"] = CHANNEL_MAX_VIDEOS

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(channel_url or url, download=False)

    if info.get("_type") == "playlist":
        return _playlist_metadata(url, info, is_channel=channel_url is not None)
    return _video_metadata(url, info)


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
