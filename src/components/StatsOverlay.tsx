/**
 * @license
 * Real-Time Telemetry Stats Overlay Component
 * High-precision performance debugging monitor for distributed sync
 */

import React from "react";
import { Activity, Cpu, Wifi, Zap, Shield, Radio, Server } from "lucide-react";
import { PerformanceMetrics } from "../types";

interface StatsOverlayProps {
  metrics: PerformanceMetrics;
  roomId: string;
  hostId: string;
  selfId: string;
  sequenceNumber: number;
  onClose: () => void;
}

export const StatsOverlay: React.FC<StatsOverlayProps> = ({
  metrics,
  roomId,
  hostId,
  selfId,
  sequenceNumber,
  onClose
}) => {
  const getQualityLabel = () => {
    if (metrics.rttMs < 50 && metrics.driftMs < 50) return { label: "EXCELLENT (0-50ms)", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
    if (metrics.rttMs < 120 && metrics.driftMs < 100) return { label: "GOOD (<100ms)", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" };
    if (metrics.rttMs < 250) return { label: "FAIR (<250ms)", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
    return { label: "POOR (>250ms)", color: "text-red-400 bg-red-500/10 border-red-500/30" };
  };

  const quality = getQualityLabel();

  return (
    <div className="absolute top-16 left-4 z-40 w-80 bg-neutral-950/90 border border-neutral-800 backdrop-blur-xl rounded-2xl p-4 shadow-2xl text-xs font-mono text-neutral-300 pointer-events-auto">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-semibold text-white tracking-wide">Sync Telemetry</span>
        </div>
        <button
          onClick={onClose}
          className="text-neutral-500 hover:text-white px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px]"
          id="btn-close-stats"
        >
          ESC / CLOSE
        </button>
      </div>

      <div className="space-y-2.5">
        {/* Network Quality Badge */}
        <div className="flex items-center justify-between">
          <span className="text-neutral-500 flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5" /> Network Quality
          </span>
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${quality.color}`}>
            {quality.label}
          </span>
        </div>

        {/* Sync Drift */}
        <div className="flex items-center justify-between">
          <span className="text-neutral-500 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Sync Drift
          </span>
          <span className={`font-bold ${metrics.driftMs < 100 ? "text-emerald-400" : "text-amber-400"}`}>
            {metrics.driftMs} ms
          </span>
        </div>

        {/* RTT Ping */}
        <div className="flex items-center justify-between">
          <span className="text-neutral-500 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-blue-400" /> RTT Latency
          </span>
          <span className="text-white font-medium">{metrics.rttMs} ms</span>
        </div>

        {/* NTP Clock Offset */}
        <div className="flex items-center justify-between">
          <span className="text-neutral-500 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-purple-400" /> NTP Clock Offset
          </span>
          <span className="text-white font-medium">{metrics.clockOffsetMs} ms</span>
        </div>

        {/* WebRTC Bitrate */}
        {metrics.webRtcBitrateKbps > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-neutral-500 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" /> WebRTC Bitrate
            </span>
            <span className="text-emerald-400 font-bold">{metrics.webRtcBitrateKbps} kbps</span>
          </div>
        )}

        {/* Rate Compensation */}
        <div className="flex items-center justify-between">
          <span className="text-neutral-500 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Micro-Rate Correction
          </span>
          <span className="text-cyan-400 font-medium">{metrics.playbackRateCorrection.toFixed(3)}x</span>
        </div>

        {/* Node & Sequence */}
        <div className="pt-2 border-t border-neutral-900 grid grid-cols-2 gap-2 text-[10px] text-neutral-400">
          <div>
            <div className="text-neutral-600">ROOM ID</div>
            <div className="truncate font-semibold text-white">{roomId}</div>
          </div>
          <div>
            <div className="text-neutral-600">SEQ NO</div>
            <div className="font-semibold text-white">#{sequenceNumber}</div>
          </div>
          <div>
            <div className="text-neutral-600">ROLE</div>
            <div className="font-semibold text-white">{selfId === hostId ? "HOST (MASTER)" : "PEER (CLIENT)"}</div>
          </div>
          <div>
            <div className="text-neutral-600">STATUS</div>
            <div className="font-semibold text-emerald-400">{metrics.syncStatus}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
