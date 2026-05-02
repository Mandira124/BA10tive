"use client";

import { VideoChunk, QuizQuestion } from "@/lib/types";

interface SectionSidebarProps {
  chunks: VideoChunk[];
  questions: QuizQuestion[];
  answeredIds: Set<string>;
  correctIds: Set<string>;
  currentTime: number;
  onSeekToChunk: (startTime: number) => void;
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function SectionSidebar({
  chunks,
  questions,
  answeredIds,
  correctIds,
  currentTime,
  onSeekToChunk,
}: SectionSidebarProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-border)" }}>
        <p className="label" style={{ color: "var(--color-text-muted)" }}>Video sections</p>
      </div>
      <div style={{ overflow: "auto", flex: 1 }}>
        {chunks.map((chunk, i) => {
          const chunkQuestions = questions.filter((q) => q.chunk_id === chunk.id);
          const answered = chunkQuestions.filter((q) => answeredIds.has(q.id));
          const correct = chunkQuestions.filter((q) => correctIds.has(q.id));
          const isActive = currentTime >= chunk.start_time && currentTime < chunk.end_time;
          const isPast = currentTime >= chunk.end_time;
          const hasQuestions = chunkQuestions.length > 0;

          let statusColor = "var(--color-text-muted)";
          if (answered.length > 0) {
            const rate = correct.length / answered.length;
            statusColor = rate >= 0.5 ? "var(--color-success)" : "var(--color-error)";
          }

          return (
            <button
              key={chunk.id}
              onClick={() => onSeekToChunk(chunk.start_time)}
              style={{
                width: "100%",
                padding: "14px 16px",
                border: "none",
                borderBottom: "1px solid var(--color-border-subtle)",
                background: isActive ? "var(--color-accent-light)" : "transparent",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                transition: "background 0.12s",
              }}
            >
              <div style={{ flexShrink: 0, marginTop: 2 }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: isActive
                    ? "var(--color-accent)"
                    : isPast && hasQuestions
                    ? statusColor
                    : "var(--color-border)",
                  border: isActive ? "none" : `2px solid ${isPast && hasQuestions ? statusColor : "var(--color-border)"}`,
                  boxSizing: "border-box",
                }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                  <p style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? "var(--color-accent)" : isPast ? "var(--color-text-secondary)" : "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {chunk.topic_label || `Section ${i + 1}`}
                  </p>
                  <span style={{ fontSize: 11, color: "var(--color-text-muted)", flexShrink: 0 }}>
                    {formatSeconds(chunk.start_time)}
                  </span>
                </div>
                {hasQuestions && (
                  <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                    {chunkQuestions.map((q) => (
                      <div
                        key={q.id}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: answeredIds.has(q.id)
                            ? correctIds.has(q.id) ? "var(--color-success)" : "var(--color-error)"
                            : "var(--color-border)",
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
