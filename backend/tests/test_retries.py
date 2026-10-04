import io
import uuid

import pytest
import yt_dlp
from yt_dlp.networking import Response
from yt_dlp.networking.exceptions import HTTPError, TransportError

import config
import main

NETWORK_ERROR = "ERROR: [youtube] abc: Unable to download webpage: <urlopen error timed out>"
PRIVATE_ERROR = "ERROR: [youtube] abc: Private video. Sign in if you've been granted access"


@pytest.fixture
def sleeps(monkeypatch):
    waited = []
    monkeypatch.setattr(main, "_sleep_before_retry", waited.append)
    return waited


def run_task(monkeypatch, tmp_path, outcomes, **config_overrides):
    """Runs one task through _process; each download attempt pops the next outcome."""
    monkeypatch.setattr(
        main,
        "get_config",
        lambda: {**config.DEFAULTS, "download_path": str(tmp_path), **config_overrides},
    )
    attempts = []

    def fake_download(*args, **kwargs):
        attempts.append(1)
        outcome = outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    monkeypatch.setattr(main, "download_video", fake_download)

    task_id = str(uuid.uuid4())
    main.tasks[task_id] = {
        "url": "https://www.youtube.com/watch?v=abc",
        "quality": "1080",
        "format": "video",
        "title": "t",
        "status": "pending",
        "progress": 0,
        "retry": 0,
    }
    main._process(task_id)
    return main.tasks[task_id], len(attempts), task_id


def network_error():
    return yt_dlp.utils.DownloadError(NETWORK_ERROR)


def test_recovers_after_a_network_error(monkeypatch, tmp_path, sleeps):
    task, attempts, _ = run_task(monkeypatch, tmp_path, [network_error(), "/ok.mp4"])

    assert task["status"] == "completed"
    assert task["path"] == "/ok.mp4"
    assert attempts == 2
    assert task["retry"] == 1
    assert sleeps == [3]


def test_gives_up_after_max_retries_with_increasing_waits(monkeypatch, tmp_path, sleeps):
    task, attempts, _ = run_task(monkeypatch, tmp_path, [network_error() for _ in range(4)])

    assert task["status"] == "error"
    assert "conexión a internet" in task["error"]
    assert attempts == 4  # first attempt + 3 retries
    assert sleeps == [3, 6, 10]


def test_extra_retries_wait_ten_seconds(monkeypatch, tmp_path, sleeps):
    run_task(monkeypatch, tmp_path, [network_error() for _ in range(6)], max_retries=5)

    assert sleeps == [3, 6, 10, 10, 10]


def test_does_not_retry_unrecoverable_errors(monkeypatch, tmp_path, sleeps):
    outcomes = [yt_dlp.utils.DownloadError(PRIVATE_ERROR), "/never.mp4"]
    task, attempts, _ = run_task(monkeypatch, tmp_path, outcomes)

    assert task["status"] == "error"
    assert task["error"] == "Este video es privado y no se puede descargar"
    assert attempts == 1
    assert sleeps == []


def test_does_not_retry_when_auto_retries_is_off(monkeypatch, tmp_path, sleeps):
    task, attempts, _ = run_task(
        monkeypatch, tmp_path, [network_error(), "/ok.mp4"], auto_retries=False
    )

    assert task["status"] == "error"
    assert attempts == 1
    assert sleeps == []


def test_progress_reports_retry_count(monkeypatch, tmp_path, sleeps):
    _, _, task_id = run_task(monkeypatch, tmp_path, [network_error(), "/ok.mp4"])

    report = main.progress(task_id)

    assert report["retry"] == 1
    assert report["max_retries"] == 3


@pytest.mark.parametrize(
    "message",
    [
        NETWORK_ERROR,
        "ERROR: Unable to download: [Errno 11001] getaddrinfo failed",
        "ERROR: Connection reset by peer",
        "ERROR: HTTP Error 429: Too Many Requests",
        "ERROR: HTTP Error 503: Service Unavailable",
        "ERROR: Remote end closed connection without response",
    ],
)
def test_network_and_server_messages_are_recoverable(message):
    assert main.is_recoverable(yt_dlp.utils.DownloadError(message))


@pytest.mark.parametrize(
    "message",
    [
        PRIVATE_ERROR,
        "ERROR: [youtube] abc: Video unavailable",
        "ERROR: Unsupported URL: https://example.com",
        "ERROR: [youtube] abc: This video is not available in your country",
    ],
)
def test_content_errors_are_not_recoverable(message):
    assert not main.is_recoverable(yt_dlp.utils.DownloadError(message))


def wrapped(cause: BaseException, message: str = "ERROR: something failed"):
    """A DownloadError carrying the original exception, as yt-dlp builds them."""
    return yt_dlp.utils.DownloadError(message, exc_info=(type(cause), cause, None))


def http_error(status: int) -> HTTPError:
    return HTTPError(Response(io.BytesIO(b""), "https://www.youtube.com", {}, status=status))


def test_localized_connection_error_is_recoverable_by_type():
    # Real message on a Spanish Windows: no English keyword to match.
    refused = ConnectionRefusedError(10061, "No se puede establecer una conexión")
    error = wrapped(
        TransportError(cause=refused),
        "ERROR: [youtube] abc: Unable to download API page: [WinError 10061] "
        "No se puede establecer una conexión ya que el equipo de destino denegó expresamente",
    )

    assert main.is_recoverable(error)


@pytest.mark.parametrize("status", [429, 500, 503])
def test_rate_limit_and_server_http_errors_are_recoverable(status):
    assert main.is_recoverable(wrapped(http_error(status)))


@pytest.mark.parametrize("status", [403, 404])
def test_client_http_errors_are_not_recoverable(status):
    assert not main.is_recoverable(wrapped(http_error(status)))


def test_disk_errors_are_not_recoverable():
    assert not main.is_recoverable(wrapped(OSError(28, "No space left on device")))


def test_rate_limit_has_its_own_message():
    assert "limitando" in main.friendly_error(wrapped(http_error(429)))


def test_server_unavailable_is_not_reported_as_removed_video():
    message = main.friendly_error(
        wrapped(http_error(503), "ERROR: HTTP Error 503: Service Unavailable")
    )

    assert message != "El video no está disponible"
    assert "conexión" in message
