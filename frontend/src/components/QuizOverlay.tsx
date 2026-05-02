"use client";

import { useState } from "react";
import { QuizQuestion, QuizState } from "@/lib/types";

interface QuizOverlayProps {
  quizState: QuizState & { phase: "answering" | "feedback" };
  onAnswer: (answerId: string) => void;
  onSkip: () => void;
  onContinue: () => void;
}

function formatTime(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${s}s`;
}

export default function QuizOverlay({ quizState, onAnswer, onSkip, onContinue }: QuizOverlayProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (quizState.phase === "answering") {
    const { question } = quizState;
    return (
      <div className="fade-in" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span
              className="tag"
              style={{
                background: question.question_type === "attention_check" ? "var(--color-warning-light)" : "var(--color-accent-light)",
                color: question.question_type === "attention_check" ? "var(--color-warning)" : "var(--color-accent)",
              }}
            >
              {question.question_type === "attention_check" ? "Attention check" : "Comprehension"}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onSkip}
              style={{ fontSize: 12, color: "var(--color-text-muted)" }}
            >
              Skip
            </button>
          </div>
          <p style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.5, color: "var(--color-text-primary)" }}>
            {question.question}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          {question.options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onAnswer(opt.id)}
              onMouseEnter={() => setHovered(opt.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid",
                borderColor: hovered === opt.id ? "var(--color-accent)" : "var(--color-border)",
                borderRadius: "var(--radius)",
                background: hovered === opt.id ? "var(--color-accent-light)" : "var(--color-surface)",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                transition: "all 0.12s",
              }}
            >
              <span style={{
                flexShrink: 0,
                width: 22,
                height: 22,
                borderRadius: 4,
                border: `1px solid ${hovered === opt.id ? "var(--color-accent)" : "var(--color-border)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 600,
                color: hovered === opt.id ? "var(--color-accent)" : "var(--color-text-muted)",
                background: hovered === opt.id ? "var(--color-accent-light)" : "transparent",
                textTransform: "uppercase",
              }}>
                {opt.id}
              </span>
              <span style={{ fontSize: 14, color: "var(--color-text-primary)", lineHeight: 1.5 }}>
                {opt.text}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (quizState.phase === "feedback") {
    const { question, selectedAnswer, isCorrect, responseTimeMs } = quizState;
    const correctOpt = question.options.find((o) => o.id === question.correct_answer);

    return (
      <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{
          padding: "14px 16px",
          background: isCorrect ? "var(--color-success-light)" : "var(--color-error-light)",
          border: `1px solid ${isCorrect ? "#86efac" : "#fca5a5"}`,
          borderRadius: "var(--radius)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: isCorrect ? "var(--color-success)" : "var(--color-error)" }}>
              {isCorrect ? "Correct" : "Incorrect"}
            </span>
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{formatTime(responseTimeMs)}</span>
          </div>
          {!isCorrect && correctOpt && (
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>
              Correct answer: <strong style={{ color: "var(--color-text-primary)" }}>{correctOpt.text}</strong>
            </p>
          )}
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.55 }}>
            {question.explanation}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {question.options.map((opt) => {
            const isSelected = opt.id === selectedAnswer;
            const isCorrectOpt = opt.id === question.correct_answer;
            let borderColor = "var(--color-border)";
            let bg = "var(--color-surface)";
            if (isCorrectOpt) { borderColor = "#86efac"; bg = "var(--color-success-light)"; }
            else if (isSelected && !isCorrect) { borderColor = "#fca5a5"; bg = "var(--color-error-light)"; }

            return (
              <div key={opt.id} style={{ padding: "10px 14px", border: `1px solid ${borderColor}`, borderRadius: "var(--radius)", background: bg, display: "flex", gap: 10 }}>
                <span style={{
                  flexShrink: 0, width: 22, height: 22, borderRadius: 4, border: `1px solid ${borderColor}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                  color: isCorrectOpt ? "var(--color-success)" : isSelected ? "var(--color-error)" : "var(--color-text-muted)",
                }}>
                  {opt.id}
                </span>
                <span style={{ fontSize: 14, color: "var(--color-text-primary)", lineHeight: 1.5 }}>{opt.text}</span>
              </div>
            );
          })}
        </div>

        <button className="btn btn-primary" onClick={onContinue} style={{ width: "100%" }}>
          Continue watching
        </button>
      </div>
    );
  }

  return null;
}
