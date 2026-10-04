import pytest
from yt_dlp.utils import DownloadError

from main import friendly_error


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("ERROR: [youtube] abc: Private video", "Este video es privado y no se puede descargar"),
        ("ERROR: [youtube] abc: Video unavailable", "El video no está disponible"),
        ("ERROR: Unsupported URL: https://example.com", "El enlace no es válido"),
        ("ERROR: something else entirely", "No se pudo procesar el video. Verifica el enlace"),
    ],
)
def test_friendly_error_maps_yt_dlp_messages(raw, expected):
    assert friendly_error(DownloadError(raw)) == expected
