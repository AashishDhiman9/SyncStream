/**
 * @license
 * High-Performance Custom Video Controls Bar
 * Smooth seeking, buffer track visualization, PiP, Fullscreen, and Auto-Hide
 */

import React, { useEffect, useState, useRef } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  PictureInPicture2,
  Activity,
  Share2,
  Gauge,
  Mic,
  MicOff
} from "lucide-react";
import { SyncStatus } from "../types";

interface CustomControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  syncStatus: SyncStatus;
  driftMs: number;
  rttMs: number;
  title: string;
  playbackRate: number;
  showStats: boolean;
  isSharingScreen: boolean;
  isMicEnabled: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onSetPlaybackRate: (rate: number) => void;
  onToggleStats: () => void;
  onToggleScreenShare: () => void;
  onToggleMic: () => void;
  onToggleFullscreen: () => void;
  onTogglePiP: () => void;
}

export const CustomControls: React.FC<CustomControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  syncStatus,
  driftMs,
  rttMs,
  title,
  playbackRate,
  showStats,
  isSharingScreen,
  isMicEnabled,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onSetPlaybackRate,
  onToggleStats,
  onToggleScreenShare,
  onToggleMic,
  onToggleFullscreen,
  onTogglePiP
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const hideTimeoutRef = useRef<number | null>(null);

  // Auto-hide controls when idle
  useEffect(() => {
    const handleMouseMove = () => {
      setIsVisible(true);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (isPlaying) {
        hideTimeoutRef.current = window.setTimeout(() => {
          setIsVisible(false);
          setShowSpeedMenu(false);
        }, 3000);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [isPlaying]);

  const formatTime = (timeSec: number) => {
    if (isNaN(timeSec) || timeSec < 0) return "00:00";
    const mins = Math.floor(timeSec / 60);
    const secs = Math.floor(timeSec % 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      return `${hrs}:${(mins % 60).toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const rates = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  const getStatusColor = () => {
    switch (syncStatus) {
      case "SYNCHRONIZED": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
      case "SYNCING": return "bg-amber-500/20 text-amber-400 border-amber-500/40";
      case "BUFFERING": return "bg-blue-500/20 text-blue-400 border-blue-500/40";
      case "RECOVERING": return "bg-purple-500/20 text-purple-400 border-purple-500/40";
      default: return "bg-neutral-800 text-neutral-400 border-neutral-700";
    }
  };

  return (
    <div
      className={`absolute inset-0 pointer-events-none flex flex-col justify-between p-4 transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Top Header Controls Overlay */}
      <div className="flex items-center justify-between pointer-events-auto bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3 rounded-t-xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border shadow-sm ${getStatusColor()}`}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span>{syncStatus}</span>
            <span className="opacity-60">| {driftMs}ms drift</span>
          </div>

          <h2 className="text-white text-sm font-medium truncate max-w-xs md:max-w-md" title={title}>
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* WebRTC Screen Share Button */}
          <button
            onClick={onToggleScreenShare}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all pointer-events-auto border ${
              isSharingScreen
                ? "bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30"
                : "bg-white/10 text-white border-white/10 hover:bg-white/20"
            }`}
            title="Start WebRTC Screen Share"
            id="control-btn-screenshare"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{isSharingScreen ? "Stop Screen Share" : "Screen Share"}</span>
          </button>

          {/* Microphone Toggle */}
          <button
            onClick={onToggleMic}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all pointer-events-auto border ${
              isMicEnabled
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                : "bg-white/10 text-white/80 border-white/10 hover:bg-white/20"
            }`}
            title={isMicEnabled ? "Turn microphone off" : "Talk with microphone"}
            id="control-btn-mic"
          >
            {isMicEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            <span>{isMicEnabled ? "Mic On" : "Mic Off"}</span>
          </button>

          {/* Stats Overlay Toggle */}
          <button
            onClick={onToggleStats}
            className={`p-2 rounded-lg transition-colors border ${
              showStats ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-white/10 text-white/80 border-white/10 hover:bg-white/20"
            }`}
            title="Real-Time Telemetry Stats"
            id="control-btn-stats"
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Media Controls Bar */}
      <div className="pointer-events-auto bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 rounded-b-xl backdrop-blur-md flex flex-col gap-3">
        {/* Progress Timeline Slider */}
        <div className="relative group w-full flex items-center cursor-pointer">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:h-2.5 transition-all"
            id="control-seekbar"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={onPlayPause}
              className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-transform active:scale-95 shadow-lg shadow-blue-500/30"
              id="control-btn-playpause"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2 group">
              <button onClick={onToggleMute} className="text-white/80 hover:text-white p-1" id="control-btn-mute">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1 bg-white/20 rounded appearance-none accent-blue-400 group-hover:w-24 transition-all"
                id="control-volumebar"
              />
            </div>

            {/* Time Stamp */}
            <div className="text-xs font-mono text-white/80">
              <span>{formatTime(currentTime)}</span>
              <span className="text-white/40 mx-1">/</span>
              <span className="text-white/40">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            {/* Playback Speed Menu */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="flex items-center gap-1 text-xs font-mono text-white/80 bg-white/10 px-2.5 py-1.5 rounded-lg hover:bg-white/20 border border-white/10"
                id="control-btn-speed"
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>{playbackRate}x</span>
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-10 right-0 bg-neutral-900 border border-neutral-800 rounded-xl p-1.5 shadow-xl flex flex-col gap-1 w-28 z-50">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400 px-2 py-1 font-semibold">Speed</div>
                  {rates.map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        onSetPlaybackRate(r);
                        setShowSpeedMenu(false);
                      }}
                      className={`text-xs text-left px-2 py-1.5 rounded-md transition-colors ${
                        playbackRate === r ? "bg-blue-600 text-white font-bold" : "text-neutral-300 hover:bg-neutral-800"
                      }`}
                    >
                      {r}x {r === 1.0 ? "(Normal)" : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Picture in Picture */}
            <button
              onClick={onTogglePiP}
              className="p-2 text-white/80 hover:text-white rounded-lg bg-white/10 hover:bg-white/20 border border-white/10"
              title="Picture in Picture"
              id="control-btn-pip"
            >
              <PictureInPicture2 className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={onToggleFullscreen}
              className="p-2 text-white/80 hover:text-white rounded-lg bg-white/10 hover:bg-white/20 border border-white/10"
              title="Toggle Fullscreen"
              id="control-btn-fullscreen"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
