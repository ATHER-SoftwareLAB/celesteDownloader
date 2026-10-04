import uuid

import pytest

import downloader
import main


class FakeYoutubeDL:
    """Returns a canned extract_info result and records how it was called."""

    info: dict = {}
    calls: list = []

    def __init__(self, opts):
        self.opts = opts

    def __enter__(self):
        return self

    def __exit__(self, *exc_info):
        return False

    def extract_info(self, url, download):
        FakeYoutubeDL.calls.append((url, self.opts))
        return FakeYoutubeDL.info


@pytest.fixture
def fake_ydl(monkeypatch):
    FakeYoutubeDL.calls = []
    monkeypatch.setattr(downloader.yt_dlp, "YoutubeDL", FakeYoutubeDL)
    return FakeYoutubeDL


def video_entry(video_id, title, duration=60):
    return {
        "_type": "url",
        "ie_key": "Youtube",
        "id": video_id,
        "url": f"https://www.youtube.com/watch?v={video_id}",
        "title": title,
        "duration": duration,
        "thumbnails": [{"url": f"https://i.ytimg.com/{video_id}/small.jpg"},
                       {"url": f"https://i.ytimg.com/{video_id}/big.jpg"}],
    }


PLAYLIST_INFO = {
    "_type": "playlist",
    "title": "Mi playlist",
    "uploader": "Canal X",
    "entries": [
        video_entry("a1", "Primero", 100),
        {"_type": "url", "ie_key": "Youtube", "url": "https://www.youtube.com/watch?v=p",
         "title": "[Private video]", "duration": None},
        video_entry("a2", "Segundo", 200),
        {"_type": "url", "ie_key": "YoutubeTab", "url": "https://www.youtube.com/@x/shorts",
         "title": "Canal X - Shorts"},
        {"_type": "url", "ie_key": "Youtube", "url": "https://www.youtube.com/watch?v=d",
         "title": "[Deleted video]", "duration": None},
    ],
}


@pytest.mark.parametrize(
    "url, expected",
    [
        ("https://www.youtube.com/@canal", "https://www.youtube.com/@canal/videos"),
        ("https://www.youtube.com/@canal/", "https://www.youtube.com/@canal/videos"),
        ("https://youtube.com/@canal?si=abc", "https://youtube.com/@canal/videos"),
        ("https://www.youtube.com/channel/UC123", "https://www.youtube.com/channel/UC123/videos"),
        ("https://www.youtube.com/c/Canal", "https://www.youtube.com/c/Canal/videos"),
        ("https://www.youtube.com/user/canal", "https://www.youtube.com/user/canal/videos"),
        ("https://www.youtube.com/@canal/shorts", "https://www.youtube.com/@canal/shorts"),
        ("https://www.youtube.com/@canal/videos", "https://www.youtube.com/@canal/videos"),
    ],
)
def test_channel_urls_point_at_a_videos_list(url, expected):
    assert downloader.channel_videos_url(url) == expected


@pytest.mark.parametrize(
    "url",
    [
        "https://www.youtube.com/watch?v=abc",
        "https://www.youtube.com/playlist?list=PL123",
        "https://youtu.be/abc",
    ],
)
def test_non_channel_urls_are_left_alone(url):
    assert downloader.channel_videos_url(url) is None


def test_playlist_lists_only_downloadable_videos(fake_ydl):
    fake_ydl.info = PLAYLIST_INFO

    meta = downloader.get_metadata("https://www.youtube.com/playlist?list=PL123")

    assert meta["type"] == "playlist"
    assert meta["title"] == "Mi playlist"
    assert meta["uploader"] == "Canal X"
    assert meta["is_channel"] is False
    assert meta["unavailable_count"] == 2
    assert meta["entries"] == [
        {"url": "https://www.youtube.com/watch?v=a1", "title": "Primero", "duration": 100,
         "thumbnail": "https://i.ytimg.com/a1/big.jpg"},
        {"url": "https://www.youtube.com/watch?v=a2", "title": "Segundo", "duration": 200,
         "thumbnail": "https://i.ytimg.com/a2/big.jpg"},
    ]


def test_playlist_is_listed_flat_and_without_limit(fake_ydl):
    fake_ydl.info = PLAYLIST_INFO

    downloader.get_metadata("https://www.youtube.com/playlist?list=PL123")

    url, opts = fake_ydl.calls[0]
    assert url == "https://www.youtube.com/playlist?list=PL123"
    assert opts["extract_flat"] == "in_playlist"
    assert "playlistend" not in opts


def test_channel_lists_its_latest_videos(fake_ydl):
    fake_ydl.info = PLAYLIST_INFO

    meta = downloader.get_metadata("https://www.youtube.com/@canal")

    url, opts = fake_ydl.calls[0]
    assert url == "https://www.youtube.com/@canal/videos"
    assert opts["playlistend"] == downloader.CHANNEL_MAX_VIDEOS
    assert meta["is_channel"] is True
    assert meta["url"] == "https://www.youtube.com/@canal"


def test_single_video_keeps_video_metadata(fake_ydl):
    fake_ydl.info = {
        "title": "Me at the zoo",
        "duration": 19,
        "uploader": "jawed",
        "upload_date": "20050424",
        "thumbnail": "https://i.ytimg.com/zoo.jpg",
        "formats": [{"height": 240, "fps": 30}, {"height": 360, "fps": 30}, {"height": 240}],
    }

    meta = downloader.get_metadata("https://www.youtube.com/watch?v=jNQXAC9IVRw")

    assert meta["type"] == "video"
    assert meta["title"] == "Me at the zoo"
    assert meta["formats"] == [{"height": 360, "fps": 30}, {"height": 240, "fps": 30}]


def test_progress_batch_reports_each_task():
    known = str(uuid.uuid4())
    main.tasks[known] = {"status": "downloading", "progress": 40, "retry": 0}
    unknown = str(uuid.uuid4())

    result = main.progress_batch(main.ProgressBatchRequest(task_ids=[known, unknown]))

    assert result["tasks"] == [
        {"task_id": known, "status": "downloading", "progress": 40, "retry": 0},
        {"task_id": unknown, "status": "error", "progress": 0, "retry": 0,
         "error": "Tarea no encontrada"},
    ]
