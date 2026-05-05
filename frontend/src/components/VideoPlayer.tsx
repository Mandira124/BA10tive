"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface VideoPlayerProps {
  videoId: string;
  onTimeUpdate: (currentTime: number) => void;
  onPlayerReady: () => void;
  onEnded: () => void;
  playerRef: React.MutableRefObject<any>;
}

export default function VideoPlayer({
  videoId,
  onTimeUpdate,
  onPlayerReady,
  onEnded,
  playerRef,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const createdRef = useRef(false);

  useEffect(() => {
    function startPolling() {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        try {
          if (playerRef.current?.getCurrentTime) {
            onTimeUpdate(playerRef.current.getCurrentTime());
          }
        } catch (_) {}
      }, 500);
    }

    function createPlayer() {
      if (createdRef.current) return;
      if (!containerRef.current) return;
      if (!window.YT?.Player) return;

      createdRef.current = true;

      // YT.Player accepts a DOM element directly
      const player = new window.YT.Player(containerRef.current, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            onPlayerReady();
            startPolling();
          },
          onStateChange: (e: any) => {
            if (e.data === 0) onEnded();
          },
        },
      });

      playerRef.current = player;
    }

    function loadAPI() {
      if (document.querySelector('script[src*="youtube.com/iframe_api"]')) return;
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    if (window.YT?.Player) {
      // API already ready — create immediately
      createPlayer();
    } else {
      // Chain onto any existing callback
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        createPlayer();
      };
      loadAPI();
    }

    return () => {
      createdRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
      try { playerRef.current?.destroy(); } catch (_) {}
      playerRef.current = null;
    };
  }, [videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        paddingTop: "56.25%",
        background: "#000",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
    >
      {/* This div is passed directly to YT.Player as the mount target */}
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}