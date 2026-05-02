"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { VideoInfo } from "@/lib/types";
import VideoPlayer from "@/components/VideoPlayer";
import QuizOverlay from "@/components/QuizOverlay";
import SectionSidebar from "@/components/SectionSidebar";
import { useQuizSession } from "@/hooks/useQuizSession";
import { getSessionResults } from "@/lib/api";

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function WatchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoId = searchParams.get("v");

  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [ended, setEnded] = useState(false);
  const [loading, setLoading] = useState(true);

  const playerRef = useRef<any>(null);
  const quiz = useQuizSession();

  useEffect(() => {
    if (!videoId) { router.replace("/"); return; }

    const stored = localStorage.getItem(`video:${videoId}`);
    if (!stored) { router.replace("/"); return; }

    const info: VideoInfo = JSON.parse(stored);
    setVideoInfo(info);
    setLoading(false);
  }, [videoId, router]);

  useEffect(() => {
    if (!videoInfo || !playerReady) return;
    quiz.initSession(videoInfo).catch(console.error);
  }, [videoInfo, playerReady]);

  const pause = useCallback(() => { playerRef.current?.pauseVideo(); }, []);
  const resume = useCallback(() => { playerRef.current?.playVideo(); }, []);

  useEffect(() => {
    quiz.setPauseResumeFns(pause, resume);
  }, [pause, resume, quiz.setPauseResumeFns]);

  const handleTimeUpdate = useCallback((t: number) => {
    setCurrentTime(t);
    if (videoInfo) {
      quiz.checkTrigger(t, videoInfo.questions);
    }
  }, [videoInfo, quiz.checkTrigger]);

  const handleEnded = useCallback(async () => {
    setEnded(true);
    if (quiz.sessionId) {
      try {
        const results = await getSessionResults(quiz.sessionId);
        localStorage.setItem(`results:${quiz.sessionId}`, JSON.stringify(results));
        localStorage.setItem(`videoInfo:${quiz.sessionId}`, JSON.stringify(videoInfo));
        router.push(`/results?session=${quiz.sessionId}`);
      } catch (err) {
        console.error("Failed to fetch results:", err);
      }
    }
  }, [quiz.sessionId, videoInfo, router]);

  const seekToChunk = useCallback((startTime: number) => {
    playerRef.current?.seekTo(startTime, true);
  }, []);

  const goToResults = useCallback(async () => {
    if (!quiz.sessionId) return;
    try {
      const results = await getSessionResults(quiz.sessionId);
      localStorage.setItem(`results:${quiz.sessionId}`, JSON.stringify(results));
      localStorage.setItem(`videoInfo:${quiz.sessionId}`, JSON.stringify(videoInfo));
      router.push(`/results?session=${quiz.sessionId}`);
    } catch (err) {
      console.error(err);
    }
  }, [quiz.sessionId, videoInfo, router]);

  if (loading || !videoInfo) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ width: 24, height: 24, margin: "0 auto 12px", color: "var(--color-text-muted)" }} />
          <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>Loading session</p>
        </div>
      </div>
    );
  }

  const totalQ = videoInfo.questions.length;
  const progress = totalQ > 0 ? Math.round((quiz.answeredCount / totalQ) * 100) : 0;
  const isQuizActive = quiz.quizState.phase === "answering" || quiz.quizState.phase === "feedback";

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--color-bg)", overflow: "hidden" }}>
      {/* Header */}
      <header style={{ flexShrink: 0, background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", padding: "0 20px", height: 52, display: "flex", alignItems: "center", gap: 16 }}>
        <a href="/" className="font-serif" style={{ fontSize: 16, color: "var(--color-text-primary)", letterSpacing: "-0.02em", flexShrink: 0 }}>
          Attentive
        </a>
        <div style={{ width: 1, height: 18, background: "var(--color-border)" }} />
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {videoInfo.title}
        </p>
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 120, height: 4, background: "var(--color-border)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "var(--color-accent)", borderRadius: 2, transition: "width 0.3s" }} />
            </div>
            <span style={{ fontSize: 12, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
              {quiz.answeredCount} / {totalQ}
            </span>
          </div>
          {quiz.answeredCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={goToResults}>
              View results
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Video column */}
        <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 16, overflow: "auto", minWidth: 0 }}>
          <div style={{ position: "relative" }}>
            <VideoPlayer
              videoId={videoInfo.video_id}
              onTimeUpdate={handleTimeUpdate}
              onPlayerReady={() => setPlayerReady(true)}
              onEnded={handleEnded}
              playerRef={playerRef}
            />

            {/* Overlay when quiz is active */}
            {isQuizActive && (
              <div style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.75)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "var(--radius-lg)",
              }}>
                <div style={{
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  padding: 24,
                  width: "min(480px, 90%)",
                  maxHeight: "80%",
                  overflow: "auto",
                }}>
                  <QuizOverlay
                    quizState={quiz.quizState as any}
                    onAnswer={quiz.handleAnswer}
                    onSkip={quiz.handleSkip}
                    onContinue={quiz.handleContinue}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Video metadata row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
                {formatSeconds(currentTime)} / {formatSeconds(videoInfo.duration)}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span className="tag tag-blue">
                {videoInfo.chunks.length} sections
              </span>
              <span className="tag tag-blue">
                {totalQ} questions
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ width: 280, flexShrink: 0, borderLeft: "1px solid var(--color-border)", background: "var(--color-surface)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {!isQuizActive ? (
            <SectionSidebar
              chunks={videoInfo.chunks}
              questions={videoInfo.questions}
              answeredIds={quiz.answeredIds}
              correctIds={quiz.correctIds}
              currentTime={currentTime}
              onSeekToChunk={seekToChunk}
            />
          ) : (
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-border)" }}>
              <p className="label" style={{ color: "var(--color-text-muted)" }}>Question active</p>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 6, lineHeight: 1.5 }}>
                Answer the question in the video to continue watching.
              </p>
            </div>
          )}

          {/* Stats footer */}
          <div style={{ marginTop: "auto", borderTop: "1px solid var(--color-border)", padding: "14px 16px", display: "flex", gap: 16 }}>
            <div>
              <p style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>Correct</p>
              <p style={{ fontSize: 18, fontWeight: 600, color: "var(--color-success)" }}>{quiz.correctCount}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>Answered</p>
              <p style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>{quiz.answeredCount}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)" }}>
        <div className="spinner" style={{ color: "var(--color-text-muted)" }} />
      </div>
    }>
      <WatchContent />
    </Suspense>
  );
}
