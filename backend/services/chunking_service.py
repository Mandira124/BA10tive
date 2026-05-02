import uuid
import re
from typing import List, Dict
from models.schemas import VideoChunk

SENTENCE_ENDINGS = re.compile(r"[.!?]\s*$")
TARGET_CHUNK_SECONDS = 120.0
MIN_CHUNK_SECONDS = 45.0
MAX_CHUNK_SECONDS = 180.0


def _clean_text(text: str) -> str:
    cleaned = re.sub(r"\[.*?\]", "", text)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def _detect_topic_shift(prev_text: str, curr_text: str) -> bool:
    prev_words = set(re.findall(r"\b[a-z]{4,}\b", prev_text.lower()))
    curr_words = set(re.findall(r"\b[a-z]{4,}\b", curr_text.lower()))
    if not prev_words or not curr_words:
        return False
    overlap = len(prev_words & curr_words) / max(len(prev_words | curr_words), 1)
    return overlap < 0.15


def _extract_topic_label(text: str) -> str:
    sentences = [s.strip() for s in re.split(r"[.!?]", text) if len(s.strip()) > 10]
    if not sentences:
        words = text.split()
        return " ".join(words[:6]) + "..." if len(words) > 6 else text
    first = sentences[0]
    words = first.split()
    if len(words) <= 8:
        return first
    return " ".join(words[:8]) + "..."


def chunk_transcript(transcript: List[Dict]) -> List[VideoChunk]:
    if not transcript:
        return []

    chunks: List[VideoChunk] = []
    chunk_segments: List[Dict] = []
    chunk_start = transcript[0]["start"]
    chunk_duration = 0.0
    chunk_index = 0

    for i, segment in enumerate(transcript):
        text = _clean_text(segment.get("text", ""))
        if not text:
            continue

        chunk_segments.append({**segment, "text": text})
        chunk_duration += segment.get("duration", 0)

        is_last = i == len(transcript) - 1
        next_seg = transcript[i + 1] if not is_last else None

        # Detect natural break conditions
        at_target = chunk_duration >= TARGET_CHUNK_SECONDS
        at_max = chunk_duration >= MAX_CHUNK_SECONDS
        ends_sentence = bool(SENTENCE_ENDINGS.search(text))

        long_pause = False
        if next_seg:
            gap = next_seg["start"] - (segment["start"] + segment.get("duration", 0))
            long_pause = gap > 2.5

        topic_shift = False
        if next_seg and at_target:
            prev_window = " ".join(s["text"] for s in chunk_segments[-5:])
            next_window = next_seg.get("text", "")
            topic_shift = _detect_topic_shift(prev_window, next_window)

        should_break = (
            is_last
            or at_max
            or (at_target and ends_sentence)
            or (at_target and long_pause)
            or (at_target and topic_shift)
        )

        if should_break and chunk_duration >= MIN_CHUNK_SECONDS:
            end_time = segment["start"] + segment.get("duration", 0)
            full_text = " ".join(s["text"] for s in chunk_segments)

            chunk = VideoChunk(
                id=str(uuid.uuid4()),
                index=chunk_index,
                start_time=chunk_start,
                end_time=end_time,
                text=full_text.strip(),
                topic_label=_extract_topic_label(full_text),
            )
            chunks.append(chunk)
            chunk_index += 1

            if next_seg:
                chunk_start = next_seg["start"]
            chunk_segments = []
            chunk_duration = 0.0

    # Handle any remaining segments
    if chunk_segments:
        end_time = chunk_segments[-1]["start"] + chunk_segments[-1].get("duration", 0)
        full_text = " ".join(s["text"] for s in chunk_segments)
        chunks.append(
            VideoChunk(
                id=str(uuid.uuid4()),
                index=chunk_index,
                start_time=chunk_start,
                end_time=end_time,
                text=full_text.strip(),
                topic_label=_extract_topic_label(full_text),
            )
        )

    return chunks
