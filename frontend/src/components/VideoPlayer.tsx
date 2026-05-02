"use client";

import { useEffect, useRef, useState, useCallback } from "react";

declare global {
  interface Window {
    YT: {
      Player: new (el: HTMLDivElement, opts: object) => YouTubePlayerInstance;
      PlayerState: { PAUSED: number; PLAYING: number; ENDED: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerInstance {
  getCurrentTime: () => number;
  getDuration: () => number;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (time: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
}

interface VideoPlayerProps {
  videoId: string;
  onTimeUpdate: (currentTime: number) => void;
  onPlayerReady: () => void;
  onEnded: () => void;
  playerRef: React.MutableRefObject<YouTubePlayerInstance | null>;
}

export default function VideoPlayer({ videoId, onTimeUpdate, onPlayerReady, onEnded, playerRef }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const [apiLoaded, setApiLoaded] = useState(false);

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (playerRef.current) {
        const t = playerRef.current.getCurrentTime();
        onTimeUpdate(t);
      }
    }, 500);
  }, [onTimeUpdate, playerRef]);

  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setApiLoaded(true);
      return;
    }

    const existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = () => setApiLoaded(true);
  }, []);

  useEffect(() => {
    if (!apiLoaded || !containerRef.current) return;

    const player = new window.YT.Player(containerRef.current, {
      videoId,
      playerVars: {
        autoplay: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          onPlayerReady();
          startPolling();
        },
        onStateChange: (event: { data: number }) => {
          if (event.data === window.YT.PlayerState.ENDED) {
            onEnded();
          }
        },
      },
    });

    playerRef.current = player;

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      try { player.destroy(); } catch (_) {}
      playerRef.current = null;
    };
  }, [apiLoaded, videoId, onPlayerReady, onEnded, startPolling, playerRef]);

  return (
    <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", background: "#000", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
      <div
        ref={containerRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
    </div>
  );
}
