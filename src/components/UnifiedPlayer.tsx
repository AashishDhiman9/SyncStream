/**
 * @license
 * Unified Multi-Source Video Player Component
 * Supports HTML5 Direct MP4/WebM, HLS (.m3u8), YouTube, Twitch, Vimeo, and WebRTC Screen Share
 */

import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { VideoSource } from "../types";

interface UnifiedPlayerProps {
  source: VideoSource;
  screenShareStream?: MediaStream | null;
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  onTimeUpdate: (currentTime: number) => void;
  onDurationChange: (duration: number) => void;
  onBufferStateChange: (isBuffering: boolean) => void;
  onPlayerReady: () => void;
  onVideoEnd?: () => void;
}

export const UnifiedPlayer: React.FC<UnifiedPlayerProps> = ({
  source,
  screenShareStream,
  isPlaying,
  currentTime,
  playbackRate,
  volume,
  isMuted,
  onTimeUpdate,
  onDurationChange,
  onBufferStateChange,
  onPlayerReady,
  onVideoEnd
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isHlsSupported, setIsHlsSupported] = useState(true);
  const [youtubePlayerReady, setYoutubePlayerReady] = useState(false);

  // 1. Direct Video & HLS & Screen Share Setup
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reset previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (screenShareStream || source.type === "screenshare") {
      if (screenShareStream) {
        video.srcObject = screenShareStream;
        video.play().catch((e) => console.warn("Screen share play warning:", e));
        onPlayerReady();
      }
      return;
    }

    if (source.type === "hls") {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferLength: 30
        });
        hlsRef.current = hls;
        hls.loadSource(source.url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          onPlayerReady();
        });

        (hls as any).on((Hls.Events as any).BUFFER_STALLED || "hlsBufferStalled", () => {
          onBufferStateChange(true);
        });

        hls.on(Hls.Events.BUFFER_APPENDED, () => {
          onBufferStateChange(false);
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Native Safari HLS
        video.src = source.url;
        onPlayerReady();
      } else {
        setIsHlsSupported(false);
      }
    } else if (source.type === "direct") {
      video.src = source.url;
      video.load();
      onPlayerReady();
    }
  }, [source, screenShareStream]);

  // 2. Playback State Synchronization Sync (Play / Pause / Seek / Rate / Volume)
  useEffect(() => {
    const video = videoRef.current;
    if (video && (source.type === "direct" || source.type === "hls" || source.type === "screenshare")) {
      // Sync Play / Pause
      if (isPlaying && video.paused) {
        video.play().catch((err) => console.warn("Autoplay policy blocked or wait:", err));
      } else if (!isPlaying && !video.paused) {
        video.pause();
      }

      // Sync Seek if position differs significantly (> 0.25s)
      if (Math.abs(video.currentTime - currentTime) > 0.25) {
        video.currentTime = currentTime;
      }

      // Sync Playback Rate
      if (video.playbackRate !== playbackRate) {
        video.playbackRate = playbackRate;
      }

      // Sync Volume & Mute
      video.volume = volume;
      video.muted = isMuted;
    }

    // YouTube Iframe PostMessage Sync
    if (source.type === "youtube" && iframeRef.current && iframeRef.current.contentWindow) {
      const win = iframeRef.current.contentWindow;
      if (isPlaying) {
        win.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
      } else {
        win.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      }
      win.postMessage(`{"event":"command","func":"seekTo","args":[${currentTime}, true]}`, '*');
      win.postMessage(`{"event":"command","func":"setPlaybackRate","args":[${playbackRate}]}`, '*');
      if (isMuted) {
        win.postMessage('{"event":"command","func":"mute","args":""}', '*');
      } else {
        win.postMessage('{"event":"command","func":"unMute","args":""}', '*');
        win.postMessage(`{"event":"command","func":"setVolume","args":[${volume * 100}]}`, '*');
      }
    }
  }, [isPlaying, currentTime, playbackRate, volume, isMuted, source.type]);

  // Handle Video HTML5 Events
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      onDurationChange(videoRef.current.duration);
    }
  };

  const handleWaiting = () => onBufferStateChange(true);
  const handlePlaying = () => onBufferStateChange(false);

  // Extract YouTube Embed URL with JS API enabled
  const getYouTubeEmbedUrl = (url: string) => {
    let videoId = "";
    if (url.includes("v=")) {
      videoId = url.split("v=")[1].split("&")[0];
    } else if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1].split("?")[0];
    }
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&controls=0&rel=0&modestbranding=1`;
  };

  const getTwitchEmbedUrl = (url: string) => {
    const channel = url.split("/").pop();
    const hostname = window.location.hostname || "localhost";
    return `https://player.twitch.tv/?channel=${channel}&parent=${hostname}&autoplay=true`;
  };

  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden flex items-center justify-center select-none shadow-2xl">
      {/* HTML5 Native / HLS / Screen Share Player */}
      {(screenShareStream || source.type === "direct" || source.type === "hls" || source.type === "screenshare") && (
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onWaiting={handleWaiting}
          onPlaying={handlePlaying}
          onEnded={onVideoEnd}
          playsInline
          autoPlay
          crossOrigin="anonymous"
          id="syncstream-video-element"
        />
      )}

      {/* YouTube Player Embed */}
      {!screenShareStream && source.type === "youtube" && (
        <iframe
          ref={iframeRef}
          src={getYouTubeEmbedUrl(source.url)}
          className="w-full h-full border-0 pointer-events-none"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          title={source.title}
          id="syncstream-youtube-iframe"
        />
      )}

      {/* Twitch Player Embed */}
      {!screenShareStream && source.type === "twitch" && (
        <iframe
          src={getTwitchEmbedUrl(source.url)}
          className="w-full h-full border-0"
          allowFullScreen
          title={source.title}
          id="syncstream-twitch-iframe"
        />
      )}

      {!isHlsSupported && source.type === "hls" && (
        <div className="p-6 text-center text-red-400 bg-red-950/40 border border-red-800/50 rounded-xl">
          HLS video playback is not supported on this browser.
        </div>
      )}
    </div>
  );
};
