"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SessionResults, VideoInfo } from "@/lib/types";
import { getSessionResults } from "@/lib/api";

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (score / 100) * circumference;

  const color = score >= 75 ? "var(--color-success)" : score >= 50 ? "var(--color-warning)" : "var(--color-error)";
  const label = score >= 75 ? "Strong" : score >= 50 ? "Fair" : "Needs work";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width={140} height={140} viewBox="0 0 140 140">
        <circle cx={70} cy={70} r={radius} fill="none" stroke="var(--color-border)" strokeWidth={10} />
        <circle
          cx={70} cy={70} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
        <text x={70} y={66} textAnchor="middle" fontSize={28} fontWeight={700} fill="var(--color-text-primary)" fontFamily="var(--font-sans)">
          {score}
        </text>
        <text x={70} y={84} textAnchor="middle" fontSize={12} fill="var(--color-text-muted)" fontFamily="var(--font-sans)">
          / 100
        </text>
      </svg>
      <span style={{ fontSize: 13, fontWeight: 500, color }}>{label} attention</span>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <p className="label" style={{ color: "var(--color-text-muted)", marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const [results, setResults] = useState<SessionResults | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) { router.replace("/"); return; }

    const stored = localStorage.getItem(`results:${sessionId}`);
    const storedVideo = localStorage.getItem(`videoInfo:${sessionId}`);

    if (stored) {
      setResults(JSON.parse(stored));
      if (storedVideo) setVideoInfo(JSON.parse(storedVideo));
      setLoading(false);
      return;
    }

    getSessionResults(sessionId)
      .then((r) => {
        setResults(r);
        if (storedVideo) setVideoInfo(JSON.parse(storedVideo));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId, router]);

  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner" style={{ color: "var(--color-text-muted)" }} />
      </div>
    );
  }

  if (error || !results) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "var(--color-error)", marginBottom: 16 }}>{error || "Results not found."}</p>
          <Link href="/" className="btn btn-primary">Back to home</Link>
        </div>
      </div>
    );
  }

  const wrongCount = results.wrong_count;
  const avgSeconds = results.avg_response_time_ms > 0 ? (results.avg_response_time_ms / 1000).toFixed(1) : "-";

  const chunkPerformance: Record<number, { correct: number; total: number }> = {};
  results.question_results.forEach((r: any) => {
    const idx = r.chunk_index;
    if (!chunkPerformance[idx]) chunkPerformance[idx] = { correct: 0, total: 0 };
    chunkPerformance[idx].total += 1;
    if (r.correct) chunkPerformance[idx].correct += 1;
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <header style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" className="font-serif" style={{ fontSize: 16, color: "var(--color-text-primary)" }}>
            Attentive
          </Link>
          <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Session results</span>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>
        {videoInfo && (
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 8 }}>
            {videoInfo.title}
          </p>
        )}
        <h1 className="font-serif" style={{ fontSize: 32, letterSpacing: "-0.02em", marginBottom: 32, color: "var(--color-text-primary)" }}>
          Learning summary
        </h1>

        {/* Score + stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, marginBottom: 40, alignItems: "start" }}>
          <div className="card" style={{ padding: "32px 28px", textAlign: "center" }}>
            <p className="label" style={{ color: "var(--color-text-muted)", marginBottom: 20 }}>Attention score</p>
            <ScoreRing score={results.attention_score} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, alignContent: "start" }}>
            <StatCard label="Correct" value={results.correct_count} sub={`of ${results.total_questions} questions`} />
            <StatCard label="Incorrect" value={wrongCount} />
            <StatCard label="Skipped" value={results.skipped_count} />
            <StatCard label="Avg response" value={avgSeconds !== "-" ? `${avgSeconds}s` : "-"} sub="per question" />
          </div>
        </div>

        {/* Performance by section */}
        {Object.keys(chunkPerformance).length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "var(--color-text-primary)" }}>
              Performance by section
            </h2>
            <div className="card" style={{ overflow: "hidden" }}>
              {Object.entries(chunkPerformance)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([indexStr, perf], i, arr) => {
                  const idx = Number(indexStr);
                  const rate = perf.total > 0 ? perf.correct / perf.total : 0;
                  const isWeak = results.weak_chunk_indices.includes(idx);
                  const chunk = videoInfo?.chunks[idx];
                  const label = chunk?.topic_label || `Section ${idx + 1}`;
                  const color = rate >= 0.75 ? "var(--color-success)" : rate >= 0.5 ? "var(--color-warning)" : "var(--color-error)";

                  return (
                    <div key={idx} style={{ padding: "14px 20px", borderBottom: i < arr.length - 1 ? "1px solid var(--color-border-subtle)" : "none", display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ width: 140, flexShrink: 0 }}>
                        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {label}
                        </p>
                      </div>
                      <div style={{ flex: 1, height: 6, background: "var(--color-border)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.round(rate * 100)}%`, background: color, borderRadius: 3, transition: "width 0.8s ease" }} />
                      </div>
                      <div style={{ width: 48, textAlign: "right", flexShrink: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color }}>{Math.round(rate * 100)}%</span>
                      </div>
                      {isWeak && (
                        <span className="tag tag-red">Weak</span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Weak sections callout */}
        {results.weak_chunk_indices.length > 0 && videoInfo && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "var(--color-text-primary)" }}>
              Sections to review
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {results.weak_chunk_indices.map((idx) => {
                const chunk = videoInfo.chunks[idx];
                if (!chunk) return null;
                return (
                  <div key={idx} className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 2 }}>
                        {chunk.topic_label || `Section ${idx + 1}`}
                      </p>
                      <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                        {Math.floor(chunk.start_time / 60)}:{Math.floor(chunk.start_time % 60).toString().padStart(2, "0")} - {Math.floor(chunk.end_time / 60)}:{Math.floor(chunk.end_time % 60).toString().padStart(2, "0")}
                      </p>
                    </div>
                    {videoInfo && (
                      <Link
                        href={`/watch?v=${videoInfo.video_id}`}
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          localStorage.setItem(`video:${videoInfo.video_id}`, JSON.stringify(videoInfo));
                        }}
                      >
                        Re-watch
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/" className="btn btn-primary">
            Watch another video
          </Link>
          {videoInfo && (
            <Link
              href={`/watch?v=${videoInfo.video_id}`}
              className="btn btn-secondary"
              onClick={() => {
                if (videoInfo) localStorage.setItem(`video:${videoInfo.video_id}`, JSON.stringify(videoInfo));
              }}
            >
              Re-watch this video
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)" }}>
        <div className="spinner" style={{ color: "var(--color-text-muted)" }} />
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
