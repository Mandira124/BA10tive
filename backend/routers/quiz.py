import time
from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from models.schemas import (
    CreateSessionRequest,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    SessionResults,
)
import uuid

router = APIRouter()

sessions: Dict[str, Dict[str, Any]] = {}


@router.post("/session/create")
async def create_session(request: CreateSessionRequest):
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "video_id": request.video_id,
        "total_questions": request.total_questions,
        "answers": [],
        "created_at": time.time(),
    }
    return {"session_id": session_id}


@router.post("/answer", response_model=SubmitAnswerResponse)
async def submit_answer(request: SubmitAnswerRequest):
    if request.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found.")

    is_correct = (
        not request.skipped
        and request.answer.strip().lower() == request.correct_answer.strip().lower()
    )

    sessions[request.session_id]["answers"].append(
        {
            "question_id": request.question_id,
            "chunk_id": request.chunk_id,
            "chunk_index": request.chunk_index,
            "answer": request.answer,
            "correct_answer": request.correct_answer,
            "correct": is_correct,
            "response_time_ms": request.response_time_ms,
            "skipped": request.skipped,
        }
    )

    return SubmitAnswerResponse(correct=is_correct)


@router.get("/session/{session_id}/results", response_model=SessionResults)
async def get_results(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found.")

    session = sessions[session_id]
    answers = session["answers"]
    total = len(answers)

    if total == 0:
        return SessionResults(
            session_id=session_id,
            video_id=session["video_id"],
            attention_score=0,
            total_questions=0,
            correct_count=0,
            wrong_count=0,
            skipped_count=0,
            avg_response_time_ms=0,
            weak_chunk_indices=[],
            question_results=[],
        )

    correct_count = sum(1 for a in answers if a["correct"])
    skipped_count = sum(1 for a in answers if a["skipped"])
    wrong_count = total - correct_count - skipped_count

    answered_times = [a["response_time_ms"] for a in answers if not a["skipped"]]
    avg_response_time = sum(answered_times) / len(answered_times) if answered_times else 0

    chunk_performance: Dict[int, Dict] = {}
    for a in answers:
        idx = a["chunk_index"]
        if idx not in chunk_performance:
            chunk_performance[idx] = {"correct": 0, "total": 0}
        chunk_performance[idx]["total"] += 1
        if a["correct"]:
            chunk_performance[idx]["correct"] += 1

    weak_chunk_indices = [
        idx
        for idx, perf in chunk_performance.items()
        if perf["total"] > 0 and (perf["correct"] / perf["total"]) < 0.5
    ]

    correctness_rate = correct_count / total if total > 0 else 0
    skip_rate = skipped_count / total if total > 0 else 0

    # Normalize response time: 10s = excellent, 60s+ = poor
    if answered_times:
        median_time_s = sorted(answered_times)[len(answered_times) // 2] / 1000
        time_score = max(0.0, 1.0 - (median_time_s - 10) / 50)
    else:
        time_score = 0.0

    raw_score = (correctness_rate * 0.65) + (time_score * 0.20) + ((1 - skip_rate) * 0.15)
    attention_score = max(0, min(100, round(raw_score * 100)))

    return SessionResults(
        session_id=session_id,
        video_id=session["video_id"],
        attention_score=attention_score,
        total_questions=total,
        correct_count=correct_count,
        wrong_count=wrong_count,
        skipped_count=skipped_count,
        avg_response_time_ms=round(avg_response_time),
        weak_chunk_indices=sorted(weak_chunk_indices),
        question_results=answers,
    )
