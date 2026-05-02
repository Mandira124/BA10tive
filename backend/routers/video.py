from fastapi import APIRouter, HTTPException
from models.schemas import ProcessVideoRequest, VideoInfo
from services.transcript_service import extract_video_id, fetch_transcript, fetch_video_metadata
from services.chunking_service import chunk_transcript
from services.quiz_service import generate_questions_for_chunk

router = APIRouter()


@router.post("/process", response_model=VideoInfo)
async def process_video(request: ProcessVideoRequest):
    video_id = extract_video_id(request.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL. Please provide a valid YouTube video link.")

    try:
        transcript = await fetch_transcript(video_id)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    if not transcript:
        raise HTTPException(status_code=422, detail="Transcript is empty. The video may not have captions.")

    metadata = await fetch_video_metadata(video_id)
    chunks = chunk_transcript(transcript)

    if not chunks:
        raise HTTPException(status_code=422, detail="Could not segment the video transcript.")

    all_questions = []
    for chunk in chunks:
        try:
            questions = generate_questions_for_chunk(chunk)
            all_questions.extend(questions)
        except Exception as e:
            print(f"Question generation failed for chunk {chunk.index}: {e}")

    last_entry = transcript[-1]
    duration = int(last_entry["start"] + last_entry.get("duration", 0))

    return VideoInfo(
        video_id=video_id,
        title=metadata["title"],
        duration=duration,
        thumbnail=metadata["thumbnail"],
        chunks=chunks,
        questions=all_questions,
    )
