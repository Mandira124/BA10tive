"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { processVideo } from "@/lib/api";
import { VideoInfo } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data: VideoInfo = await processVideo(url.trim());
      localStorage.setItem(`video:${data.video_id}`, JSON.stringify(data));
      router.push(`/watch?v=${data.video_id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <header style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="font-serif" style={{ fontSize: 18, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
            Attentive
          </span>
          <nav style={{ display: "flex", gap: 24 }}>
            <a href="#how-it-works" style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>How it works</a>
          </nav>
        </div>
      </header>

      <main>
        <section style={{ padding: "80px 24px 64px", textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
          <p className="label" style={{ marginBottom: 20, color: "var(--color-text-muted)" }}>
            Attention-based learning
          </p>
          <h1 className="font-serif" style={{ fontSize: "clamp(36px, 5vw, 54px)", lineHeight: 1.1, letterSpacing: "-0.02em", color: "var(--color-text-primary)", marginBottom: 20 }}>
            Watch videos.<br />Actually remember them.
          </h1>
          <p style={{ fontSize: 16, color: "var(--color-text-secondary)", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 48px" }}>
            Paste any YouTube educational video. We break it into segments, generate quiz questions from the content, and check your understanding as you watch.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 520, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                className="input"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                disabled={loading}
                style={{ flex: 1, fontSize: 15, padding: "13px 16px" }}
              />
              <button
                className="btn btn-primary btn-lg"
                type="submit"
                disabled={loading || !url.trim()}
                style={{ minWidth: 140 }}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: 15, height: 15 }} />
                    Processing
                  </>
                ) : (
                  "Start learning"
                )}
              </button>
            </div>

            {loading && (
              <p style={{ fontSize: 13, color: "var(--color-text-muted)", textAlign: "center" }}>
                Fetching transcript and generating questions. This may take 15-30 seconds.
              </p>
            )}

            {error && (
              <div style={{ padding: "12px 16px", background: "var(--color-error-light)", border: "1px solid #fca5a5", borderRadius: "var(--radius)", textAlign: "left" }}>
                <p style={{ fontSize: 13, color: "var(--color-error)", fontWeight: 500 }}>Error</p>
                <p style={{ fontSize: 13, color: "var(--color-error)", marginTop: 2 }}>{error}</p>
              </div>
            )}
          </form>

          <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 20 }}>
            Works with any YouTube video that has English captions enabled
          </p>
        </section>

        <section id="how-it-works" style={{ padding: "0 24px 96px", maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 1, border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            {[
              {
                step: "01",
                title: "Paste a video URL",
                body: "We fetch the transcript automatically. No API keys or extensions required on your end.",
              },
              {
                step: "02",
                title: "Questions are generated",
                body: "The transcript is chunked into segments. Each segment gets comprehension and attention-check questions.",
              },
              {
                step: "03",
                title: "Watch and get tested",
                body: "The video pauses at natural intervals. Answer the question, see instant feedback, then continue.",
              },
              {
                step: "04",
                title: "Review your attention score",
                body: "See which segments you struggled with, your response times, and a breakdown of your performance.",
              },
            ].map((item) => (
              <div key={item.step} style={{ padding: "32px 28px", background: "var(--color-surface)", borderRight: "1px solid var(--color-border)" }}>
                <span className="label" style={{ color: "var(--color-text-muted)", marginBottom: 14, display: "block" }}>
                  {item.step}
                </span>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10, color: "var(--color-text-primary)" }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.65 }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer style={{ borderTop: "1px solid var(--color-border)", padding: "24px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
          Attentive. Built for active learners.
        </p>
      </footer>
    </div>
  );
}
