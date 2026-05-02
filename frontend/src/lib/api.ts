import { VideoInfo, SessionResults } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(body.detail || `Request failed: ${response.status}`);
  }

  return response.json();
}

export async function processVideo(url: string): Promise<VideoInfo> {
  return request<VideoInfo>("/api/video/process", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function createSession(videoId: string, totalQuestions: number): Promise<{ session_id: string }> {
  return request<{ session_id: string }>("/api/quiz/session/create", {
    method: "POST",
    body: JSON.stringify({ video_id: videoId, total_questions: totalQuestions }),
  });
}

export async function submitAnswer(params: {
  session_id: string;
  question_id: string;
  chunk_id: string;
  chunk_index: number;
  answer: string;
  correct_answer: string;
  response_time_ms: number;
  skipped: boolean;
}): Promise<{ correct: boolean }> {
  return request<{ correct: boolean }>("/api/quiz/answer", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function getSessionResults(sessionId: string): Promise<SessionResults> {
  return request<SessionResults>(`/api/quiz/session/${sessionId}/results`);
}
