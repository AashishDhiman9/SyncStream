/**
 * @license
 * SyncStream - Ultimate High-Performance Synchronized Video Watching Platform
 * Main React Application Orchestrator
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  RoomState,
  VideoSource,
  ChatMessage,
  RoomMember,
  PerformanceMetrics,
  SyncStatus
} from "./types";
import { NTPClockSync } from "./lib/clockSync";
import { SyncEngine } from "./lib/syncEngine";
import { WebRTCManager } from "./lib/webrtc";
import { UnifiedPlayer } from "./components/UnifiedPlayer";
import { CustomControls } from "./components/CustomControls";
import { StatsOverlay } from "./components/StatsOverlay";
import { RoomSidebar } from "./components/RoomSidebar";
import { Header } from "./components/Header";
import { ArchitectureModal } from "./components/ArchitectureModal";
import { DEFAULT_DEMO_SOURCES } from "./lib/demoSources";
import { Tv, Play, Send, Smile, MessageSquare, Shield } from "lucide-react";

const isStaticOnlyBuild = Boolean((import.meta as any).env?.VITE_STATIC_ONLY);

export default function App() {
  // App & Connection State
  const [roomId, setRoomId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [joined, setJoined] = useState<boolean>(false);
  const [selfId, setSelfId] = useState<string>("");

  // Room State
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [demoSources, setDemoSources] = useState<VideoSource[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);

  // Local Media Control States
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);

  // WebRTC Screen Sharing & Stats Overlay
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [remoteAudioStreams, setRemoteAudioStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isSharingScreen, setIsSharingScreen] = useState<boolean>(false);
  const [isMicEnabled, setIsMicEnabled] = useState<boolean>(false);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [quickChatInput, setQuickChatInput] = useState<string>("");
  const [showArchitectureModal, setShowArchitectureModal] = useState<boolean>(false);

  // Telemetry Metrics
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    rttMs: 0,
    clockOffsetMs: 0,
    driftMs: 0,
    bufferAheadSec: 0,
    fps: 60,
    droppedFrames: 0,
    webRtcBitrateKbps: 0,
    webRtcPacketLoss: 0,
    syncStatus: "UNSYNCED",
    playbackRateCorrection: 1.0
  });

  // System References
  const wsRef = useRef<WebSocket | null>(null);
  const ntpSyncRef = useRef<NTPClockSync | null>(null);
  const syncEngineRef = useRef<SyncEngine | null>(null);
  const webRtcRef = useRef<WebRTCManager | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const selfIdRef = useRef<string>("");
  const staticMicStreamRef = useRef<MediaStream | null>(null);

  // Load Demo Sources
  useEffect(() => {
    setDemoSources(DEFAULT_DEMO_SOURCES);

    if (!isStaticOnlyBuild) {
    fetch("/api/demo-sources")
      .then((res) => res.json())
      .then((data) => setDemoSources(data))
      .catch(() => {});
    }

    // Parse Room ID from URL hash or path
    const hashRoom = window.location.hash.replace("#", "").trim();
    if (hashRoom) {
      setRoomId(hashRoom);
    } else {
      setRoomId(`room_${Math.random().toString(36).substring(2, 7)}`);
    }

    setUserName(`Guest_${Math.floor(1000 + Math.random() * 9000)}`);
  }, []);

  // Handle WebSocket & Sync Engine Setup upon Joining Room
  const handleJoinRoom = useCallback(() => {
    if (!roomId.trim() || !userName.trim()) return;

    if (isStaticOnlyBuild) {
      const localSelfId = `local_${Math.random().toString(36).substring(2, 9)}`;
      const localMember: RoomMember = {
        id: localSelfId,
        name: userName,
        isHost: true,
        isBuffering: false,
        driftMs: 0,
        rttMs: 0,
        joinedAt: Date.now(),
        hasAudio: true,
        hasVideo: true,
        isSharingScreen: false,
        avatarColor: "#3B82F6"
      };

      setSelfId(localSelfId);
      selfIdRef.current = localSelfId;
      setRoomState({
        roomId,
        hostId: localSelfId,
        source: demoSources[0] || DEFAULT_DEMO_SOURCES[0],
        isPlaying: false,
        currentTime: 0,
        playbackRate: 1.0,
        lastStateTimestamp: Date.now(),
        sequenceNumber: 1,
        members: [localMember],
        allowMemberControl: true
      });
      setChatHistory([
        {
          id: `msg_${Date.now()}_local`,
          senderId: "system",
          senderName: "System",
          text: "Static preview mode is running locally in this browser.",
          timestamp: Date.now(),
          isSystem: true
        }
      ]);
      setMetrics((prev) => ({ ...prev, syncStatus: "SYNCHRONIZED" }));
      setJoined(true);
      window.location.hash = roomId;
      return;
    }

    // 1. WebSocket Setup
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    // 2. NTP Clock Sync Setup
    const ntpSync = new NTPClockSync((t1) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "NTP_PING", t1 }));
      }
    });
    ntpSyncRef.current = ntpSync;

    // 3. Sync Engine Setup
    const syncEngine = new SyncEngine(ntpSync, {
      onPlay: () => {
        // Apply play locally
      },
      onPause: () => {
        // Apply pause locally
      },
      onSeek: (targetTime) => {
        setCurrentTime(targetTime);
      },
      onSetPlaybackRate: (rate) => {
        setPlaybackRate(rate);
      },
      onStatusChange: (status, driftMs) => {
        setMetrics((prev) => ({
          ...prev,
          syncStatus: status,
          driftMs,
          rttMs: ntpSync.getRTT(),
          clockOffsetMs: ntpSync.getOffset(),
          playbackRateCorrection: playbackRate
        }));
      }
    });
    syncEngineRef.current = syncEngine;

    ws.onopen = () => {
      // Send JOIN_ROOM
      ws.send(
        JSON.stringify({
          type: "JOIN_ROOM",
          roomId,
          userName
        })
      );
      ntpSync.start(4000);
      syncEngine.start();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "NTP_PONG") {
          ntpSync.handlePong(msg.t1, msg.t2, msg.t3);
          return;
        }

        if (msg.type === "ROOM_STATE_INIT") {
          setSelfId(msg.selfId);
          selfIdRef.current = msg.selfId;
          setRoomState(msg.room);
          setChatHistory(msg.chatHistory || []);
          setJoined(true);
          window.location.hash = roomId;

          // Initialize WebRTC Manager
          const webRtc = new WebRTCManager(msg.selfId, {
            onSignal: (targetPeerId, signal, signalType) => {
              ws.send(
                JSON.stringify({
                  type: "WEBRTC_SIGNAL",
                  targetPeerId,
                  signal,
                  signalType
                })
              );
            },
            onRemoteStream: (peerId, stream) => {
              // Remote stream received for WebRTC screen share
              setScreenShareStream(stream);
            },
            onRemoteAudioStream: (peerId, stream) => {
              setRemoteAudioStreams((prev) => {
                const next = new Map(prev);
                next.set(peerId, stream);
                return next;
              });
            },
            onPeerDisconnected: (peerId) => {
              setScreenShareStream(null);
              setRemoteAudioStreams((prev) => {
                const next = new Map(prev);
                next.delete(peerId);
                return next;
              });
            },
            onStatsUpdate: (bitrateKbps) => {
              setMetrics((prev) => ({ ...prev, webRtcBitrateKbps: bitrateKbps }));
            },
            onScreenShareEnded: () => {
              setIsSharingScreen(false);
              setIsMicEnabled(false);
              setScreenShareStream(null);
              if (wsRef.current) {
                wsRef.current.send(
                  JSON.stringify({
                    type: "SYNC_EVENT",
                    action: "CHANGE_SOURCE",
                    source: demoSources[0]
                  })
                );
              }
            }
          });
          webRtcRef.current = webRtc;
          return;
        }

        if (msg.type === "SYNC_EVENT_BROADCAST") {
          setRoomState((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              isPlaying: msg.isPlaying,
              currentTime: msg.currentTime,
              playbackRate: msg.playbackRate,
              source: msg.source || prev.source,
              lastStateTimestamp: msg.serverTimestamp,
              sequenceNumber: msg.sequenceNumber
            };
          });
          return;
        }

        if (msg.type === "MEMBER_JOINED") {
          setRoomState((prev) => prev ? { ...prev, members: msg.members } : null);
          if (msg.systemMessage) setChatHistory((prev) => [...prev, msg.systemMessage]);
          if (webRtcRef.current && msg.member && msg.member.id !== selfIdRef.current) {
            webRtcRef.current.createPeerConnection(msg.member.id, true);
          }
          return;
        }

        if (msg.type === "MEMBER_LEFT") {
          setRoomState((prev) => prev ? { ...prev, members: msg.members, hostId: msg.newHostId } : null);
          if (msg.systemMessage) setChatHistory((prev) => [...prev, msg.systemMessage]);
          return;
        }

        if (msg.type === "MEMBERS_UPDATE") {
          setRoomState((prev) => prev ? { ...prev, members: msg.members } : null);
          return;
        }

        if (msg.type === "NEW_CHAT") {
          setChatHistory((prev) => [...prev, msg.message]);
          return;
        }

        if (msg.type === "REACTION_BROADCAST") {
          const newReaction = {
            id: `react_${Date.now()}_${Math.random()}`,
            emoji: msg.emoji,
            x: Math.floor(20 + Math.random() * 60)
          };
          setFloatingReactions((prev) => [...prev, newReaction]);
          setTimeout(() => {
            setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
          }, 2500);
          return;
        }

        if (msg.type === "WEBRTC_SIGNAL") {
          if (webRtcRef.current) {
            webRtcRef.current.handleSignal(msg.senderId, msg.signal, msg.signalType);
          }
          return;
        }

        if (msg.type === "ROOM_SETTINGS_UPDATED") {
          setRoomState((prev) => prev ? { ...prev, allowMemberControl: msg.allowMemberControl } : null);
          return;
        }

        if (msg.type === "HOST_CHANGED") {
          setRoomState((prev) => prev ? { ...prev, hostId: msg.newHostId, members: msg.members } : null);
          return;
        }
      } catch (err) {
        console.error("Error handling message:", err);
      }
    };
  }, [roomId, userName, demoSources]);

  // Periodic Telemetry Ping Back to Server
  useEffect(() => {
    if (!joined) return;
    const telemetryInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && syncEngineRef.current) {
        wsRef.current.send(
          JSON.stringify({
            type: "CLIENT_METRICS",
            driftMs: syncEngineRef.current.getDriftMs(),
            rttMs: ntpSyncRef.current?.getRTT() || 0,
            isBuffering,
            isSharingScreen,
            hasAudio: isMicEnabled,
            hasVideo: true
          })
        );
      }
    }, 3000);
    return () => clearInterval(telemetryInterval);
  }, [joined, isBuffering, isSharingScreen, isMicEnabled]);

  // Periodic Sync Engine Evaluation
  useEffect(() => {
    if (!joined || !roomState || !syncEngineRef.current) return;
    syncEngineRef.current.evaluateSync(currentTime, roomState, isBuffering);
  }, [currentTime, roomState, isBuffering, joined]);

  // Actions
  const handlePlayPause = () => {
    if (!roomState) return;
    const action = roomState.isPlaying ? "PAUSE" : "PLAY";
    if (isStaticOnlyBuild || !wsRef.current) {
      setRoomState((prev) => prev ? {
        ...prev,
        isPlaying: action === "PLAY",
        currentTime,
        playbackRate,
        lastStateTimestamp: Date.now(),
        sequenceNumber: prev.sequenceNumber + 1
      } : null);
      return;
    }
    wsRef.current.send(
      JSON.stringify({
        type: "SYNC_EVENT",
        action,
        currentTime,
        playbackRate
      })
    );
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    if (isStaticOnlyBuild || !wsRef.current) {
      setRoomState((prev) => prev ? {
        ...prev,
        currentTime: newTime,
        lastStateTimestamp: Date.now(),
        sequenceNumber: prev.sequenceNumber + 1
      } : null);
      return;
    }
    wsRef.current.send(
      JSON.stringify({
        type: "SYNC_EVENT",
        action: "SEEK",
        currentTime: newTime,
        playbackRate
      })
    );
  };

  const handleSetPlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (isStaticOnlyBuild || !wsRef.current) {
      setRoomState((prev) => prev ? {
        ...prev,
        playbackRate: rate,
        lastStateTimestamp: Date.now(),
        sequenceNumber: prev.sequenceNumber + 1
      } : null);
      return;
    }
    wsRef.current.send(
      JSON.stringify({
        type: "SYNC_EVENT",
        action: "RATE",
        currentTime,
        playbackRate: rate
      })
    );
  };

  const handleChangeSource = (source: VideoSource) => {
    if (isStaticOnlyBuild || !wsRef.current) {
      setCurrentTime(0);
      setRoomState((prev) => prev ? {
        ...prev,
        source,
        isPlaying: false,
        currentTime: 0,
        lastStateTimestamp: Date.now(),
        sequenceNumber: prev.sequenceNumber + 1
      } : null);
      return;
    }
    wsRef.current.send(
      JSON.stringify({
        type: "SYNC_EVENT",
        action: "CHANGE_SOURCE",
        source
      })
    );
  };

  const handleSendChat = (text: string) => {
    if (isStaticOnlyBuild || !wsRef.current) {
      setChatHistory((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          senderId: selfId,
          senderName: userName || "You",
          text,
          timestamp: Date.now()
        }
      ]);
      return;
    }
    wsRef.current.send(
      JSON.stringify({
        type: "SEND_CHAT",
        text
      })
    );
  };

  const handleSendReaction = (emoji: string) => {
    if (isStaticOnlyBuild || !wsRef.current) {
      const newReaction = {
        id: `react_${Date.now()}_${Math.random()}`,
        emoji,
        x: Math.floor(20 + Math.random() * 60)
      };
      setFloatingReactions((prev) => [...prev, newReaction]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
      }, 2500);
      return;
    }
    wsRef.current.send(
      JSON.stringify({
        type: "SEND_REACTION",
        emoji
      })
    );
  };

  const handleQuickChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickChatInput.trim()) return;
    handleSendChat(quickChatInput.trim());
    setQuickChatInput("");
  };

  const handleToggleMic = async () => {
    if (isMicEnabled) {
      if (isStaticOnlyBuild && !webRtcRef.current) {
        staticMicStreamRef.current?.getTracks().forEach((track) => track.stop());
        staticMicStreamRef.current = null;
        setIsMicEnabled(false);
        return;
      }

      webRtcRef.current?.stopMicrophone();
      setIsMicEnabled(false);
      return;
    }

    try {
      if (isStaticOnlyBuild && !webRtcRef.current) {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        micStream.getTracks().forEach((track) => {
          track.addEventListener("ended", () => setIsMicEnabled(false));
        });
        staticMicStreamRef.current = micStream;
        setIsMicEnabled(true);
        return;
      }

      await webRtcRef.current?.startMicrophone();
      setIsMicEnabled(true);
    } catch (e: any) {
      console.error("Microphone error:", e);
      alert("Unable to start microphone. Please allow mic permission in Chrome.");
    }
  };

  const handleToggleScreenShare = async () => {
    if (isStaticOnlyBuild && !webRtcRef.current) {
      if (isSharingScreen) {
        screenShareStream?.getTracks().forEach((track) => track.stop());
        setIsSharingScreen(false);
        setScreenShareStream(null);
        handleChangeSource(demoSources[0] || DEFAULT_DEMO_SOURCES[0]);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        stream.getVideoTracks()[0]?.addEventListener("ended", () => {
          setIsSharingScreen(false);
          setScreenShareStream(null);
          handleChangeSource(demoSources[0] || DEFAULT_DEMO_SOURCES[0]);
        });
        setScreenShareStream(stream);
        setIsSharingScreen(true);
        handleChangeSource({
          id: `screenshare_${selfId || "local"}`,
          title: `${userName || "User"}'s Screen Share`,
          type: "screenshare",
          url: ""
        });
      } catch (e: any) {
        console.error("Screen share error:", e);
        alert("Unable to start screen share. Chrome may have cancelled or blocked the permission prompt.");
      }
      return;
    }

    if (!webRtcRef.current) return;
    if (isSharingScreen) {
      webRtcRef.current.stopScreenShare();
      setIsSharingScreen(false);
      setIsMicEnabled(false);
      setScreenShareStream(null);
      if (wsRef.current) {
        wsRef.current.send(
          JSON.stringify({
            type: "SYNC_EVENT",
            action: "CHANGE_SOURCE",
            source: demoSources[0] || {
              id: "bbb-hls",
              title: "Big Buck Bunny 4K (HLS)",
              type: "hls",
              url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
            }
          })
        );
      }
    } else {
      try {
        const stream = await webRtcRef.current.startScreenShare(true);
        setScreenShareStream(stream);
        setIsSharingScreen(true);
        setIsMicEnabled(true);
        if (wsRef.current) {
          wsRef.current.send(
            JSON.stringify({
              type: "SYNC_EVENT",
              action: "CHANGE_SOURCE",
              source: {
                id: `screenshare_${selfId}`,
                title: `${userName || "User"}'s Screen Share`,
                type: "screenshare",
                url: ""
              }
            })
          );
        }
      } catch (e: any) {
        console.error("Screen share error:", e);
        if (e.name === "NotAllowedError") {
          alert("Screen share was cancelled or blocked by the browser.");
        } else {
          alert(`Unable to start screen share: ${e.message || "Unknown error"}`);
        }
      }
    }
  };

  const handleToggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleTogglePiP = () => {
    const videoElem = document.getElementById("syncstream-video-element") as HTMLVideoElement;
    if (videoElem) {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
      } else {
        videoElem.requestPictureInPicture().catch(() => {});
      }
    }
  };

  // Keyboard Shortcuts Listener (Space, F, M, Left/Right Seek, Up/Down Volume)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === "KeyF") {
        e.preventDefault();
        handleToggleFullscreen();
      } else if (e.code === "KeyM") {
        e.preventDefault();
        setIsMuted((prev) => !prev);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handleSeek(Math.max(0, currentTime - 5));
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleSeek(currentTime + 5);
      } else if (e.code === "ArrowUp") {
        e.preventDefault();
        setVolume((v) => Math.min(1.0, v + 0.1));
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        setVolume((v) => Math.max(0.0, v - 0.1));
      } else if (e.code === "Escape") {
        setShowStats(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentTime, roomState]);

  // Landing Join Screen
  if (!joined) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-2xl shadow-xl shadow-blue-500/20 mb-2">
              <Tv className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-wide">SyncStream</h1>
            <p className="text-xs text-neutral-400">
              Synchronized Video Watch Party & Low-Latency Screen Sharing Platform
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJoinRoom();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                placeholder="Enter your name"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Sync Room ID
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                placeholder="Room identifier"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-98 flex items-center justify-center gap-2"
              id="btn-join-room"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Enter Sync Watch Room</span>
            </button>
          </form>

          <div className="pt-4 border-t border-neutral-800 text-center">
            <button
              onClick={() => setShowArchitectureModal(true)}
              className="text-xs text-cyan-400 hover:underline inline-flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>View System Architecture & Distributed Engineering Spec</span>
            </button>
          </div>
        </div>

        <ArchitectureModal
          isOpen={showArchitectureModal}
          onClose={() => setShowArchitectureModal(false)}
        />
      </div>
    );
  }

  const currentSource = roomState?.source || demoSources[0];

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <Header
        roomId={roomId}
        userName={userName}
        syncStatus={metrics.syncStatus}
        driftMs={metrics.driftMs}
        memberCount={roomState?.members.length || 1}
        onOpenArchitectureModal={() => setShowArchitectureModal(true)}
      />

      {/* Main App Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Main Video Cinema Canvas */}
        <div className="flex-1 bg-black flex flex-col items-center justify-center relative p-2 md:p-4 overflow-hidden">
          <div
            ref={playerContainerRef}
            className="relative w-full h-full max-w-6xl max-h-[85vh] aspect-video bg-neutral-950 rounded-2xl overflow-hidden shadow-2xl border border-neutral-900 flex items-center justify-center"
          >
            {/* Unified Multi-Source Video Component */}
            {currentSource && (
              <UnifiedPlayer
                source={currentSource}
                screenShareStream={screenShareStream}
                isPlaying={roomState?.isPlaying || false}
                currentTime={currentTime}
                playbackRate={playbackRate}
                volume={volume}
                isMuted={isMuted}
                onTimeUpdate={(t) => setCurrentTime(t)}
                onDurationChange={(d) => setDuration(d)}
                onBufferStateChange={(b) => setIsBuffering(b)}
                onPlayerReady={() => {}}
              />
            )}

            {/* Custom Overlay Controls */}
            <CustomControls
              isPlaying={roomState?.isPlaying || false}
              currentTime={currentTime}
              duration={duration}
              volume={volume}
              isMuted={isMuted}
              syncStatus={metrics.syncStatus}
              driftMs={metrics.driftMs}
              rttMs={metrics.rttMs}
              title={currentSource?.title || "SyncStream Channel"}
              playbackRate={playbackRate}
              showStats={showStats}
              isSharingScreen={isSharingScreen}
              isMicEnabled={isMicEnabled}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
              onVolumeChange={(v) => setVolume(v)}
              onToggleMute={() => setIsMuted(!isMuted)}
              onSetPlaybackRate={handleSetPlaybackRate}
              onToggleStats={() => setShowStats(!showStats)}
              onToggleScreenShare={handleToggleScreenShare}
              onToggleMic={handleToggleMic}
              onToggleFullscreen={handleToggleFullscreen}
              onTogglePiP={handleTogglePiP}
            />

            <div className="absolute right-3 top-24 z-30 w-72 max-w-[calc(100%-1.5rem)] pointer-events-auto rounded-2xl border border-white/10 bg-black/55 backdrop-blur-md shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Room Chat</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-neutral-300">
                  <Smile className="w-3 h-3 text-amber-300" />
                  <span>Live</span>
                </div>
              </div>

              <div className="max-h-32 overflow-y-auto px-3 py-2 space-y-2 text-xs">
                {chatHistory.slice(-4).map((msg) => (
                  <div key={msg.id} className={msg.isSystem ? "text-neutral-400 text-[11px]" : "text-neutral-100"}>
                    {!msg.isSystem && (
                      <span className="font-semibold text-blue-300 mr-1">{msg.senderName}:</span>
                    )}
                    <span>{msg.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1 px-2 py-1.5 border-t border-white/10 overflow-x-auto">
                {["🎉", "❤️", "🔥", "👏", "😂", "🚀", "🍿", "😮"].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="h-7 w-7 shrink-0 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-transform active:scale-125"
                    title={`Send ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <form onSubmit={handleQuickChatSubmit} className="flex items-center gap-2 p-2 border-t border-white/10">
                <input
                  type="text"
                  value={quickChatInput}
                  onChange={(e) => setQuickChatInput(e.target.value)}
                  placeholder="Message..."
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-cyan-400/70"
                />
                <button
                  type="submit"
                  className="h-8 w-8 rounded-lg bg-blue-600 hover:bg-blue-500 flex items-center justify-center"
                  title="Send message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Telemetry Stats Overlay */}
            {showStats && (
              <StatsOverlay
                metrics={metrics}
                roomId={roomId}
                hostId={roomState?.hostId || ""}
                selfId={selfId}
                sequenceNumber={roomState?.sequenceNumber || 1}
                onClose={() => setShowStats(false)}
              />
            )}

            {/* Floating Quick Reaction Animations */}
            {floatingReactions.map((react) => (
              <div
                key={react.id}
                className="absolute bottom-16 text-3xl animate-bounce pointer-events-none transition-all duration-1000 opacity-90"
                style={{ left: `${react.x}%` }}
              >
                {react.emoji}
              </div>
            ))}
          </div>
        </div>

        {/* Room Sidebar */}
        <RoomSidebar
          members={roomState?.members || []}
          chatHistory={chatHistory}
          currentSource={currentSource}
          demoSources={demoSources}
          selfId={selfId}
          hostId={roomState?.hostId || ""}
          allowMemberControl={roomState?.allowMemberControl ?? true}
          onSendChat={handleSendChat}
          onSendReaction={handleSendReaction}
          onChangeSource={handleChangeSource}
          onToggleMemberControl={() => {
            if (wsRef.current) {
              wsRef.current.send(JSON.stringify({ type: "TOGGLE_MEMBER_CONTROL" }));
            }
          }}
          onTransferHost={(targetHostId) => {
            if (wsRef.current) {
              wsRef.current.send(JSON.stringify({ type: "TRANSFER_HOST", targetHostId }));
            }
          }}
          onOpenArchitectureModal={() => setShowArchitectureModal(true)}
        />
      </div>

      {/* Engineering Architecture Blueprint Modal */}
      <ArchitectureModal
        isOpen={showArchitectureModal}
        onClose={() => setShowArchitectureModal(false)}
      />

      {[...remoteAudioStreams.entries()].map(([peerId, stream]) => (
        <audio
          key={peerId}
          autoPlay
          playsInline
          ref={(audio) => {
            if (audio && audio.srcObject !== stream) {
              audio.srcObject = stream;
            }
          }}
        />
      ))}
    </div>
  );
}
