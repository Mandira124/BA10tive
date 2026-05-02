import re
from typing import List, Optional, Dict
import httpx


def extract_video_id(url: str) -> Optional[str]:
    patterns = [
        r"(?:v=|\/)([0-9A-Za-z_-]{11})(?:[&?]|$)",
        r"(?:embed\/)([0-9A-Za-z_-]{11})",
        r"(?:youtu\.be\/)([0-9A-Za-z_-]{11})",
        r"^([0-9A-Za-z_-]{11})$",
    ]
    for pattern in patterns:
        match = re.search(pattern, url.strip())
        if match:
            return match.group(1)
    return None


def _fetch_with_new_api(video_id: str) -> List[Dict]:
    from youtube_transcript_api import YouTubeTranscriptApi

    api = YouTubeTranscriptApi()

    for lang in (["en"], ["en-US"], ["en-GB"], ["en-CA"], ["en-AU"]):
        try:
            fetched = api.fetch(video_id, languages=lang)
            return [{"text": s.text, "start": s.start, "duration": s.duration} for s in fetched]
        except Exception:
            continue

    try:
        transcript_list = api.list(video_id)
    except Exception as e:
        raise Exception(str(e))

    for t in transcript_list:
        if not t.is_generated and t.language_code.startswith("en"):
            try:
                fetched = t.fetch()
                return [{"text": s.text, "start": s.start, "duration": s.duration} for s in fetched]
            except Exception:
                continue

    for t in transcript_list:
        if t.is_generated and t.language_code.startswith("en"):
            try:
                fetched = t.fetch()
                return [{"text": s.text, "start": s.start, "duration": s.duration} for s in fetched]
            except Exception:
                continue

    for t in transcript_list:
        try:
            fetched = t.translate("en").fetch()
            return [{"text": s.text, "start": s.start, "duration": s.duration} for s in fetched]
        except Exception:
            continue

    for t in transcript_list:
        try:
            fetched = t.fetch()
            return [{"text": s.text, "start": s.start, "duration": s.duration} for s in fetched]
        except Exception:
            continue

    raise Exception("No transcript tracks could be fetched.")


def _fetch_with_old_api(video_id: str) -> List[Dict]:
    from youtube_transcript_api import YouTubeTranscriptApi

    for lang in (["en"], ["en-US"], ["en-GB"]):
        try:
            return YouTubeTranscriptApi.get_transcript(video_id, languages=lang)
        except Exception:
            continue

    transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

    for t in transcript_list:
        if t.language_code.startswith("en"):
            try:
                return t.fetch()
            except Exception:
                continue

    for t in transcript_list:
        try:
            return t.translate("en").fetch()
        except Exception:
            continue

    for t in transcript_list:
        try:
            return t.fetch()
        except Exception:
            continue

    raise Exception("No transcript tracks could be fetched.")


async def fetch_transcript(video_id: str) -> List[Dict]:
    from youtube_transcript_api import YouTubeTranscriptApi

    is_new_api = not hasattr(YouTubeTranscriptApi, "list_transcripts")

    try:
        if is_new_api:
            return _fetch_with_new_api(video_id)
        else:
            return _fetch_with_old_api(video_id)
    except Exception as e:
        raise Exception(
            f"Could not fetch transcript for video {video_id}. "
            "Ensure the video has English captions or auto-generated subtitles enabled. "
            f"Original error: {e}"
        )


async def fetch_video_metadata(video_id: str) -> Dict:
    oembed_url = (
        f"https://www.youtube.com/oembed"
        f"?url=https://www.youtube.com/watch%3Fv%3D{video_id}&format=json"
    )
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(oembed_url)
            if response.status_code == 200:
                data = response.json()
                return {
                    "title": data.get("title", "Untitled Video"),
                    "thumbnail": f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg",
                    "author": data.get("author_name", ""),
                }
        except Exception:
            pass
    return {
        "title": "Untitled Video",
        "thumbnail": f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg",
        "author": "",
    }