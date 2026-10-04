import time

import pytest

import main

TERMINAL_STATUSES = {"completed", "error"}


@pytest.fixture
def fake_env(monkeypatch, tmp_path):
    monkeypatch.setattr(main, "get_config", lambda: {"download_path": str(tmp_path)})
    monkeypatch.setattr(main, "paused", False)
    return tmp_path


def _wait_until_finished(task_ids, timeout=5.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if all(main.tasks[t]["status"] in TERMINAL_STATUSES for t in task_ids):
            return
        time.sleep(0.05)
    statuses = {t: main.tasks[t]["status"] for t in task_ids}
    pytest.fail(f"tasks did not finish in {timeout}s: {statuses}")


def _enqueue(url):
    return main.download(main.DownloadRequest(url=url, quality="1080"))["task_id"]


def test_os_error_marks_task_as_error_and_queue_keeps_working(monkeypatch, fake_env):
    def fake_download(url, *args, **kwargs):
        if url == "https://bad":
            raise OSError("No space left on device")
        return str(fake_env / "ok.mp4")

    monkeypatch.setattr(main, "download_video", fake_download)

    failing = _enqueue("https://bad")
    following = _enqueue("https://good")
    _wait_until_finished([failing, following])

    assert main.tasks[failing]["status"] == "error"
    assert "carpeta de descargas" in main.tasks[failing]["error"]
    assert main.tasks[following]["status"] == "completed"
    assert main.tasks[following]["path"] == str(fake_env / "ok.mp4")


def test_unexpected_error_marks_task_as_error_and_queue_keeps_working(monkeypatch, fake_env):
    def fake_download(url, *args, **kwargs):
        if url == "https://bad":
            raise RuntimeError("ffmpeg exploded")
        return str(fake_env / "ok.mp4")

    monkeypatch.setattr(main, "download_video", fake_download)

    failing = _enqueue("https://bad")
    following = _enqueue("https://good")
    _wait_until_finished([failing, following])

    assert main.tasks[failing]["status"] == "error"
    assert main.tasks[failing]["error"] == "Ocurrió un error inesperado durante la descarga"
    assert main.tasks[following]["status"] == "completed"
