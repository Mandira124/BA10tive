"use client";

import { useState, useCallback, useRef } from "react";
import { QuizQuestion, QuizState, VideoInfo } from "@/lib/types";
import { createSession, submitAnswer } from "@/lib/api";

interface UseQuizSessionReturn {
  sessionId: string | null;
  quizState: QuizState;
  answeredIds: Set<string>;
  correctIds: Set<string>;
  answeredCount: number;
  correctCount: number;
  initSession: (info: VideoInfo) => Promise<void>;
  checkTrigger: (currentTime: number, questions: QuizQuestion[]) => void;
  handleAnswer: (answerId: string) => void;
  handleSkip: () => void;
  handleContinue: () => void;
  pausePlayer: () => void;
  resumePlayer: () => void;
  setPauseResumeFns: (pause: () => void, resume: () => void) => void;
}

export function useQuizSession(): UseQuizSessionReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [quizState, setQuizState] = useState<QuizState>({ phase: "idle" });
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [correctIds, setCorrectIds] = useState<Set<string>>(new Set());
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const sessionIdRef = useRef<string | null>(null);
  const pauseFnRef = useRef<(() => void) | null>(null);
  const resumeFnRef = useRef<(() => void) | null>(null);
  const triggeredRef = useRef<Set<string>>(new Set());
  const lastTriggerCheck = useRef<number>(0);

  const setPauseResumeFns = useCallback((pause: () => void, resume: () => void) => {
    pauseFnRef.current = pause;
    resumeFnRef.current = resume;
  }, []);

  const pausePlayer = useCallback(() => pauseFnRef.current?.(), []);
  const resumePlayer = useCallback(() => resumeFnRef.current?.(), []);

  const initSession = useCallback(async (info: VideoInfo) => {
    const { session_id } = await createSession(info.video_id, info.questions.length);
    setSessionId(session_id);
    sessionIdRef.current = session_id;
  }, []);

  const checkTrigger = useCallback((currentTime: number, questions: QuizQuestion[]) => {
    if (quizState.phase !== "idle") return;
    if (currentTime - lastTriggerCheck.current < 0.4) return;
    lastTriggerCheck.current = currentTime;

    const pending = questions.filter(
      (q) => !triggeredRef.current.has(q.id) && !answeredIds.has(q.id)
    );

    const due = pending.find((q) => currentTime >= q.trigger_time);
    if (!due) return;

    triggeredRef.current.add(due.id);
    pauseFnRef.current?.();
    setQuizState({ phase: "answering", question: due, startedAt: Date.now() });
  }, [quizState.phase, answeredIds]);

  const handleAnswer = useCallback((answerId: string) => {
    if (quizState.phase !== "answering") return;
    const { question, startedAt } = quizState;
    const responseTimeMs = Date.now() - startedAt;
    const isCorrect = answerId === question.correct_answer;

    setAnsweredIds((prev) => new Set([...prev, question.id]));
    if (isCorrect) {
      setCorrectIds((prev) => new Set([...prev, question.id]));
      setCorrectCount((c) => c + 1);
    }
    setAnsweredCount((c) => c + 1);

    if (sessionIdRef.current) {
      submitAnswer({
        session_id: sessionIdRef.current,
        question_id: question.id,
        chunk_id: question.chunk_id,
        chunk_index: question.chunk_index,
        answer: answerId,
        correct_answer: question.correct_answer,
        response_time_ms: responseTimeMs,
        skipped: false,
      }).catch(console.error);
    }

    setQuizState({ phase: "feedback", question, selectedAnswer: answerId, isCorrect, responseTimeMs });
  }, [quizState]);

  const handleSkip = useCallback(() => {
    if (quizState.phase !== "answering") return;
    const { question } = quizState;

    setAnsweredIds((prev) => new Set([...prev, question.id]));
    setAnsweredCount((c) => c + 1);

    if (sessionIdRef.current) {
      submitAnswer({
        session_id: sessionIdRef.current,
        question_id: question.id,
        chunk_id: question.chunk_id,
        chunk_index: question.chunk_index,
        answer: "__skipped__",
        correct_answer: question.correct_answer,
        response_time_ms: 0,
        skipped: true,
      }).catch(console.error);
    }

    resumeFnRef.current?.();
    setQuizState({ phase: "idle" });
  }, [quizState]);

  const handleContinue = useCallback(() => {
    resumeFnRef.current?.();
    setQuizState({ phase: "idle" });
  }, []);

  return {
    sessionId,
    quizState,
    answeredIds,
    correctIds,
    answeredCount,
    correctCount,
    initSession,
    checkTrigger,
    handleAnswer,
    handleSkip,
    handleContinue,
    pausePlayer,
    resumePlayer,
    setPauseResumeFns,
  };
}
