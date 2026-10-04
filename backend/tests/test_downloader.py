import downloader


class FakeYoutubeDL:
    """Stands in for yt_dlp.YoutubeDL without touching the network."""

    def __init__(self, opts):
        self.opts = opts

    def __enter__(self):
        return self

    def __exit__(self, *exc_info):
        return False

    def extract_info(self, url, download):
        ext = "mp3" if self.opts.get("postprocessors") else "mp4"
        # yt-dlp fills the output template with %-style formatting.
        filepath = self.opts["outtmpl"] % {"ext": ext}
        return {"requested_downloads": [{"filepath": filepath}]}


def _download(monkeypatch, tmp_path, title, format_type):
    monkeypatch.setattr(downloader.yt_dlp, "YoutubeDL", FakeYoutubeDL)
    return downloader.download_video(
        "https://www.youtube.com/watch?v=x", "1080", str(tmp_path), title, format_type=format_type
    )


def test_audio_path_has_single_mp3_extension(monkeypatch, tmp_path):
    path = _download(monkeypatch, tmp_path, "Mi video", "audio")

    assert path == str(tmp_path / "Mi video.mp3")


def test_video_path_is_mp4(monkeypatch, tmp_path):
    path = _download(monkeypatch, tmp_path, "Mi video", "video")

    assert path == str(tmp_path / "Mi video.mp4")


def test_percent_in_title_is_kept_literally(monkeypatch, tmp_path):
    path = _download(monkeypatch, tmp_path, "100% real %(id)s", "audio")

    assert path == str(tmp_path / "100% real %(id)s.mp3")


def test_existing_file_gets_numbered_name(monkeypatch, tmp_path):
    (tmp_path / "Mi video.mp3").touch()

    path = _download(monkeypatch, tmp_path, "Mi video", "audio")

    assert path == str(tmp_path / "Mi video (1).mp3")
