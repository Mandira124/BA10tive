export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  chunk_id: string;
  chunk_index: number;
  question_type: "mcq" | "attention_check";
  question: string;
  options: QuizOption[];
  correct_answer: string;
  explanation: string;
  trigger_time: number;
}

export interface VideoChunk {
  id: string;
  index: number;
  start_time: number;
  end_time: number;
  text: string;
  topic_label: string | null;
}

export interface VideoInfo {
  video_id: string;
  title: string;
  duration: number;
  thumbnail: string;
  chunks: VideoChunk[];
  questions: QuizQuestion[];
}

export interface QuestionResult {
  question_id: string;
  chunk_id: string;
  chunk_index: number;
  answer: string;
  correct_answer: string;
  correct: boolean;
  response_time_ms: number;
  skipped: boolean;
}

export interface SessionResults {
  session_id: string;
  video_id: string;
  attention_score: number;
  total_questions: number;
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
  avg_response_time_ms: number;
  weak_chunk_indices: number[];
  question_results: QuestionResult[];
}

export type QuizState =
  | { phase: "idle" }
  | { phase: "answering"; question: QuizQuestion; startedAt: number }
  | { phase: "feedback"; question: QuizQuestion; selectedAnswer: string; isCorrect: boolean; responseTimeMs: number }
  | { phase: "complete" };
