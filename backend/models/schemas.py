from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class ProcessVideoRequest(BaseModel):
    url: str


class VideoChunk(BaseModel):
    id: str
    index: int
    start_time: float
    end_time: float
    text: str
    topic_label: Optional[str] = None


class QuizOption(BaseModel):
    id: str
    text: str


class QuizQuestion(BaseModel):
    id: str
    chunk_id: str
    chunk_index: int
    question_type: str  # "mcq" | "attention_check"
    question: str
    options: List[QuizOption]
    correct_answer: str
    explanation: str
    trigger_time: float


class VideoInfo(BaseModel):
    video_id: str
    title: str
    duration: int
    thumbnail: str
    chunks: List[VideoChunk]
    questions: List[QuizQuestion]


class CreateSessionRequest(BaseModel):
    video_id: str
    total_questions: int


class SubmitAnswerRequest(BaseModel):
    session_id: str
    question_id: str
    chunk_id: str
    chunk_index: int
    answer: str
    correct_answer: str
    response_time_ms: float
    skipped: bool


class SubmitAnswerResponse(BaseModel):
    correct: bool


class QuestionResult(BaseModel):
    question_id: str
    chunk_id: str
    chunk_index: int
    answer: str
    correct: bool
    response_time_ms: float
    skipped: bool


class SessionResults(BaseModel):
    session_id: str
    video_id: str
    attention_score: int
    total_questions: int
    correct_count: int
    wrong_count: int
    skipped_count: int
    avg_response_time_ms: float
    weak_chunk_indices: List[int]
    question_results: List[Dict[str, Any]]
