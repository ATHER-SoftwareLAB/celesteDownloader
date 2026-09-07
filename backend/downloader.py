import yt_dlp

# 'android' client returns pre-signed URLs, skipping the JS signature
# deciphering step that stalls without a JS runtime installed (deno/node).
CLIENT_ARGS = {"extractor_args": {"youtube": {"player_client": ["android"]}}}

# URLs copied from YouTube often carry a `list=` param (mix/playlist/queue).
# Without noplaylist, yt-dlp extracts every entry in that list instead of
# just the requested video, which can mean dozens of videos and minutes.
SINGLE_VIDEO_ARGS = {"noplaylist": True}


def get_metadata(url: str) -> dict:
    ydl_opts = {
        "quiet": True,
        "skip_download": True,
        "socket_timeout": 15,
        **CLIENT_ARGS,
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


def download_video(url: str, quality: str, output_dir: str) -> None:
    format_selector = (
        f"bestvideo[height<={quality}]+bestaudio/best[height<={quality}]"
        if quality
        else "best"
    )
    ydl_opts = {
        "format": format_selector,
        "outtmpl": f"{output_dir}/%(title)s.%(ext)s",
        "merge_output_format": "mp4",
        "quiet": True,
        "socket_timeout": 15,
        **CLIENT_ARGS,
        **SINGLE_VIDEO_ARGS,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])
