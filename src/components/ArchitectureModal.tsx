/**
 * @license
 * Architecture Blueprint & Distributed Systems Design Modal
 * Complete Senior Staff Engineer Specification for High-Performance Synchronized Video Platform
 */

import React, { useState } from "react";
import { X, Cpu, Server, Network, Shield, Zap, Database, Layers, Check, Terminal, Activity, Code, Globe, FileText, Radio } from "lucide-react";

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"topology" | "sync" | "webrtc" | "scale" | "pseudocode">("topology");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-fade-in select-none">
      <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans text-neutral-200">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                SyncStream — Production Distributed Systems Blueprint
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Sub-100ms Drift Synchronized Media Engine & WebRTC Screen Sharing Architecture
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 rounded-xl transition-colors"
            id="btn-close-blueprint-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-neutral-900 bg-neutral-950/60 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab("topology")}
            className={`px-3.5 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === "topology" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Network className="w-4 h-4" />
            <span>System Topology & Flow</span>
          </button>

          <button
            onClick={() => setActiveTab("sync")}
            className={`px-3.5 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === "sync" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Sync Engine & NTP Clock</span>
          </button>

          <button
            onClick={() => setActiveTab("webrtc")}
            className={`px-3.5 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === "webrtc" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>WebRTC & Media Pipeline</span>
          </button>

          <button
            onClick={() => setActiveTab("scale")}
            className={`px-3.5 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === "scale" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Scalability Matrix (2 to 100k)</span>
          </button>

          <button
            onClick={() => setActiveTab("pseudocode")}
            className={`px-3.5 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === "pseudocode" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Pseudocode & Algorithms</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm font-sans leading-relaxed">
          {/* TAB 1: System Topology & Flow */}
          {activeTab === "topology" && (
            <div className="space-y-6">
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" /> High-Level & Low-Level Architecture Topology
                </h3>
                <p className="text-neutral-400 text-xs">
                  SyncStream uses a hybrid state architecture: a centralized WebSockets authoritative clock server handles state & synchronization events while a peer-to-peer WebRTC Mesh / SFU network handles low-latency 60 FPS 4K screen share and audio streaming.
                </p>

                {/* ASCII Diagram */}
                <pre className="bg-black border border-neutral-800 p-4 rounded-xl font-mono text-[11px] text-cyan-300 overflow-x-auto leading-tight">
{`+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER (A & B)                             |
|  +---------------------------+                      +--------------------------+  |
|  |     UnifiedPlayer (HLS/YT) |                      |  UnifiedPlayer (HLS/YT)  |  |
|  |   +-------------------+   |                      |  +-------------------+   |  |
|  |   | SyncEngine (80ms) |   |                      |  | SyncEngine (80ms) |   |  |
|  |   +-------------------+   |                      |  +-------------------+   |  |
|  +-------------+-------------+                      +------------+-------------+  |
|                | NTP Probes &                                    | NTP Probes &   |
|                | Sync Events                                     | Sync Events    |
+----------------|-------------------------------------------------|----------------+
                 |                                                 |
                 v                                                 v
+-----------------------------------------------------------------------------------+
|                        CENTRAL AUTHORITATIVE NODE (Node.js/Express)               |
|   +--------------------+     +-----------------------+    +-------------------+   |
|   | NTP Clock Server   |     | Room State Repository |    | WebRTC Signaling  |   |
|   | Cristian's Algo    |     | Sequence Number Tracker|    | SDP & ICE Relay   |   |
|   +--------------------+     +-----------------------+    +-------------------+   |
+-----------------------------------------------------------------------------------+
                                           ^
                                           | WebRTC P2P Data Channel & Media Mesh
                                           v
+-----------------------------------------------------------------------------------+
|                                 WEBRTC SCREEN SHARE MESH                          |
|         Peer A (DisplayMedia 4K/60fps) <================> Peer B (Hardware Dec)   |
|                     System Audio + Mic WebAudio Mixer                             |
+-----------------------------------------------------------------------------------+`}
                </pre>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-4 space-y-2">
                  <h4 className="text-white font-semibold text-xs flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-blue-400" /> Backend Stack Justification
                  </h4>
                  <p className="text-neutral-400 text-xs">
                    <strong>Node.js & Express + `ws`:</strong> Selected for zero-copy buffer passing, low event-loop tick overhead (sub-1ms event latency), and single-thread event loop efficiency for streaming JSON/binary signaling frames.
                  </p>
                </div>

                <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-4 space-y-2">
                  <h4 className="text-white font-semibold text-xs flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-400" /> Sub-100ms Synchronization
                  </h4>
                  <p className="text-neutral-400 text-xs">
                    Uses Cristian's NTP clock synchronization algorithm with Exponential Moving Average (EMA) jitter filtering. Drift under 80ms is corrected via smooth micro-playback-rate shifts (0.965x - 1.035x) avoiding audio artifacts or frame drops.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Sync Engine & NTP Clock */}
          {activeTab === "sync" && (
            <div className="space-y-6">
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" /> Clock Synchronization & Drift Control State Machine
                </h3>
                <p className="text-neutral-400 text-xs">
                  Cristian's algorithm computes clock offset: <code className="text-cyan-300 font-mono">Offset = ((t2 - t1) + (t3 - t4)) / 2</code> and Round-Trip Time: <code className="text-cyan-300 font-mono">RTT = (t4 - t1) - (t3 - t2)</code>. Outliers in the top 40% RTT are purged before computing EMA.
                </p>

                {/* State Machine Table */}
                <div className="overflow-x-auto border border-neutral-800 rounded-xl">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-neutral-900 text-neutral-300 border-b border-neutral-800">
                      <tr>
                        <th className="p-3">State</th>
                        <th className="p-3">Drift Condition</th>
                        <th className="p-3">Correction Action</th>
                        <th className="p-3">User Experience Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900 text-neutral-400">
                      <tr>
                        <td className="p-3 font-bold text-emerald-400">SYNCHRONIZED</td>
                        <td className="p-3">Drift &lt; 80ms</td>
                        <td className="p-3">Normal playback (1.0x rate)</td>
                        <td className="p-3">Imperceptible difference</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-amber-400">SYNCING</td>
                        <td className="p-3">80ms &le; Drift &le; 1200ms</td>
                        <td className="p-3">Micro-rate adjustment (0.965x - 1.035x)</td>
                        <td className="p-3">Seamless pitch-preserved audio catchup</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-purple-400">RECOVERING</td>
                        <td className="p-3">Drift &gt; 1200ms</td>
                        <td className="p-3">Direct hard seek to expected time</td>
                        <td className="p-3">Instant catch-up shift</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-blue-400">BUFFERING</td>
                        <td className="p-3">Media stall / Underflow</td>
                        <td className="p-3">Pause playback & notify host</td>
                        <td className="p-3">Prevents desynchronization drift</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WebRTC & Media Pipeline */}
          {activeTab === "webrtc" && (
            <div className="space-y-6">
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <Radio className="w-5 h-5 text-cyan-400" /> WebRTC Screen Sharing & WebAudio API Mixing Pipeline
                </h3>

                <div className="space-y-2 text-xs text-neutral-300">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>4K @ 60 FPS Capture:</strong> Uses `getDisplayMedia` with hardware-accelerated video codecs (VP9/AV1/H.264).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Dual-Source Audio Mixer:</strong> WebAudio `AudioContext` creates a combined destination node merging system application audio with user microphone audio, incorporating gain control, echo cancellation, and noise suppression.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Adaptive Bitrate & ICE Optimization:</strong> STUN server candidates enable direct peer-to-peer UDP transmission bypassing relay bottlenecks.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Scalability Matrix */}
          {activeTab === "scale" && (
            <div className="space-y-6">
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <Globe className="w-5 h-5 text-purple-400" /> Architectural Evolution Across Scale
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-black/60 border border-neutral-800 rounded-xl p-4 space-y-2">
                    <div className="font-bold text-blue-400 text-sm">2 - 10 Users (Room Stage)</div>
                    <p className="text-neutral-400">Full Peer-to-Peer WebRTC Mesh topology + Node WebSocket server. Direct UDP signaling and minimal bandwidth requirements.</p>
                  </div>

                  <div className="bg-black/60 border border-neutral-800 rounded-xl p-4 space-y-2">
                    <div className="font-bold text-cyan-400 text-sm">10 - 1,000 Users (Watch Party Stage)</div>
                    <p className="text-neutral-400">Transition WebRTC from Mesh to SFU (Selective Forwarding Unit e.g., Mediasoup / LiveKit). Redis Pub/Sub backplane for WebSocket synchronization.</p>
                  </div>

                  <div className="bg-black/60 border border-neutral-800 rounded-xl p-4 space-y-2">
                    <div className="font-bold text-emerald-400 text-sm">1,000 - 10,000 Users (Broadcast Stage)</div>
                    <p className="text-neutral-400">HLS/LL-HLS CDN edge caching for media stream distribution with WebSockets fallback trees for sync messages.</p>
                  </div>

                  <div className="bg-black/60 border border-neutral-800 rounded-xl p-4 space-y-2">
                    <div className="font-bold text-purple-400 text-sm">100,000+ Users (Global Arena)</div>
                    <p className="text-neutral-400">Global Anycast network edge routing, geo-distributed SFU cascades, regional Redis clusters, and WebAssembly NTP engine execution.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Pseudocode & Algorithms */}
          {activeTab === "pseudocode" && (
            <div className="space-y-6">
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <Code className="w-5 h-5 text-cyan-400" /> Synchronization Engine Core Pseudocode
                </h3>

                <pre className="bg-black border border-neutral-800 p-4 rounded-xl font-mono text-[11px] text-emerald-400 overflow-x-auto leading-relaxed">
{`function evaluateSync(playerTime, roomState):
    // 1. Compute expected server playback position
    serverTimeNow = Date.now() + clockOffset
    elapsedSec = (serverTimeNow - roomState.lastStateTimestamp) / 1000.0
    expectedTime = roomState.currentTime + (elapsedSec * roomState.playbackRate)

    // 2. Compute absolute synchronization drift
    driftMs = abs(playerTime - expectedTime) * 1000

    if driftMs > 1200:
        // Hard seek catchup
        player.seekTo(expectedTime)
        player.setPlaybackRate(roomState.playbackRate)
        return RECOVERING

    else if driftMs >= 80:
        // Micro-playback rate adjustment (smooth catchup without video stutter)
        factor = (playerTime < expectedTime) ? 1.035 : 0.965
        targetRate = clamp(roomState.playbackRate * factor, 0.5, 2.0)
        player.setPlaybackRate(targetRate)
        return SYNCING

    else:
        // Synchronized state
        player.setPlaybackRate(roomState.playbackRate)
        return SYNCHRONIZED`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
