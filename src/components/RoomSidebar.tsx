/**
 * @license
 * Room Sidebar Component
 * Source Selector, Real-time Chat & Quick Emoji Reactions, Member Management, Host Controls
 */

import React, { useState } from "react";
import {
  MessageSquare,
  Users,
  Tv,
  BookOpen,
  Send,
  Crown,
  Link as LinkIcon,
  Plus,
  Play,
  CheckCircle2,
  Shield,
  Radio,
  Sliders,
  Smile
} from "lucide-react";
import { RoomMember, ChatMessage, VideoSource, SourceType } from "../types";

interface RoomSidebarProps {
  members: RoomMember[];
  chatHistory: ChatMessage[];
  currentSource: VideoSource;
  demoSources: VideoSource[];
  selfId: string;
  hostId: string;
  allowMemberControl: boolean;
  onSendChat: (text: string) => void;
  onSendReaction: (emoji: string) => void;
  onChangeSource: (source: VideoSource) => void;
  onToggleMemberControl: () => void;
  onTransferHost: (targetHostId: string) => void;
  onOpenArchitectureModal: () => void;
}

export const RoomSidebar: React.FC<RoomSidebarProps> = ({
  members,
  chatHistory,
  currentSource,
  demoSources,
  selfId,
  hostId,
  allowMemberControl,
  onSendChat,
  onSendReaction,
  onChangeSource,
  onToggleMemberControl,
  onTransferHost,
  onOpenArchitectureModal
}) => {
  const [activeTab, setActiveTab] = useState<"chat" | "sources" | "members">("chat");
  const [chatInput, setChatInput] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customType, setCustomType] = useState<SourceType>("hls");

  const isHost = selfId === hostId;

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput.trim());
    setChatInput("");
  };

  const handleCustomSourceAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    let detectedType: SourceType = customType;
    if (customUrl.includes("youtube.com") || customUrl.includes("youtu.be")) {
      detectedType = "youtube";
    } else if (customUrl.includes(".m3u8")) {
      detectedType = "hls";
    } else if (customUrl.includes("twitch.tv")) {
      detectedType = "twitch";
    } else if (customUrl.endsWith(".mp4") || customUrl.endsWith(".webm")) {
      detectedType = "direct";
    }

    const newSource: VideoSource = {
      id: `src_${Date.now()}`,
      title: customTitle.trim() || `Custom Stream (${detectedType.toUpperCase()})`,
      url: customUrl.trim(),
      type: detectedType
    };

    onChangeSource(newSource);
    setCustomUrl("");
    setCustomTitle("");
  };

  const quickEmojis = ["🎉", "❤️", "🔥", "👏", "😂", "🚀", "🍿", "😮"];

  return (
    <div className="w-full lg:w-96 h-full bg-neutral-950 border-l border-neutral-900 flex flex-col select-none">
      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-900 p-2 bg-neutral-900/50">
        <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "chat" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-neutral-400 hover:text-white"
            }`}
            id="tab-chat"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>

          <button
            onClick={() => setActiveTab("sources")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "sources" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-neutral-400 hover:text-white"
            }`}
            id="tab-sources"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Sources</span>
          </button>

          <button
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "members" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-neutral-400 hover:text-white"
            }`}
            id="tab-members"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Peers ({members.length})</span>
          </button>
        </div>

        {/* Architecture Spec Button */}
        <button
          onClick={onOpenArchitectureModal}
          className="p-2 text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/50 rounded-xl transition-all"
          title="Open Engineering Architecture Blueprint"
          id="btn-open-blueprint"
        >
          <BookOpen className="w-4 h-4" />
        </button>
      </div>

      {/* Tab 1: Chat & Reactions */}
      {activeTab === "chat" && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans text-xs">
            {chatHistory.map((msg) => (
              <div key={msg.id} className={msg.isSystem ? "text-center py-1" : "flex flex-col gap-0.5"}>
                {msg.isSystem ? (
                  <span className="inline-block px-2.5 py-1 bg-neutral-900/80 border border-neutral-800 rounded-full text-[11px] text-neutral-400 font-mono">
                    {msg.text}
                  </span>
                ) : (
                  <div className="flex flex-col bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-semibold ${msg.senderId === selfId ? "text-blue-400" : "text-neutral-300"}`}>
                        {msg.senderName} {msg.senderId === selfId && "(You)"}
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-neutral-200 text-xs leading-relaxed break-words">{msg.text}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Floating Emoji Reactions */}
          <div className="px-3 py-2 border-t border-neutral-900 flex items-center justify-between gap-1 overflow-x-auto bg-neutral-950">
            {quickEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onSendReaction(emoji)}
                className="p-1.5 hover:bg-neutral-800 rounded-lg text-base transition-transform active:scale-125"
                title={`Send ${emoji} Reaction`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleChatSubmit} className="p-3 border-t border-neutral-900 bg-neutral-900/30 flex items-center gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
              id="input-chat-message"
            />
            <button
              type="submit"
              className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
              id="btn-send-chat"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Sources Selector */}
      {activeTab === "sources" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          {/* Custom URL Stream Input */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <LinkIcon className="w-4 h-4 text-blue-400" />
              <span>Load Custom Stream URL</span>
            </div>

            <form onSubmit={handleCustomSourceAdd} className="space-y-2">
              <input
                type="text"
                placeholder="Stream Title (Optional)"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
              />
              <input
                type="url"
                placeholder="Enter HLS (.m3u8), Direct MP4, or YouTube URL..."
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                required
              />

              <div className="flex items-center gap-2 pt-1">
                <select
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value as SourceType)}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-neutral-300 focus:outline-none"
                >
                  <option value="hls">HLS Stream (.m3u8)</option>
                  <option value="direct">Direct MP4 / WebM</option>
                  <option value="youtube">YouTube Embed</option>
                  <option value="twitch">Twitch Stream</option>
                </select>

                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Load Source</span>
                </button>
              </div>
            </form>
          </div>

          {/* Preset Demo Channels */}
          <div className="space-y-2">
            <div className="text-neutral-400 font-semibold uppercase text-[10px] tracking-wider px-1">
              Preset Demo Streams
            </div>

            <div className="space-y-2">
              {demoSources.map((src) => {
                const isActive = currentSource.id === src.id;
                return (
                  <div
                    key={src.id}
                    onClick={() => onChangeSource(src)}
                    className={`group cursor-pointer p-2.5 rounded-2xl border transition-all flex items-center gap-3 ${
                      isActive
                        ? "bg-blue-600/15 border-blue-500/50 shadow-lg shadow-blue-500/10"
                        : "bg-neutral-900/40 border-neutral-800/80 hover:bg-neutral-900"
                    }`}
                  >
                    {src.thumbnail ? (
                      <img
                        src={src.thumbnail}
                        alt={src.title}
                        className="w-16 h-10 object-cover rounded-xl border border-neutral-800"
                      />
                    ) : (
                      <div className="w-16 h-10 bg-neutral-800 rounded-xl flex items-center justify-center">
                        <Tv className="w-5 h-5 text-neutral-400" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                        {src.title}
                      </div>
                      <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono flex items-center gap-1 mt-0.5">
                        <span className="px-1.5 py-0.2 bg-neutral-800 rounded">{src.type}</span>
                        {isActive && <span className="text-emerald-400 flex items-center gap-0.5">• Active</span>}
                      </div>
                    </div>

                    {isActive ? (
                      <CheckCircle2 className="w-5 h-5 text-blue-400" />
                    ) : (
                      <Play className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Peers & Room Settings */}
      {activeTab === "members" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Host Control Panel */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-purple-400" /> Room Governance
              </span>
              {isHost && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-mono font-semibold flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Host Node
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-neutral-400">Allow Members to Control Playback</span>
              <input
                type="checkbox"
                checked={allowMemberControl}
                onChange={onToggleMemberControl}
                disabled={!isHost}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer disabled:opacity-50"
              />
            </div>
          </div>

          {/* Connected Peers List */}
          <div className="space-y-2">
            <div className="text-neutral-400 font-semibold uppercase text-[10px] tracking-wider px-1">
              Active Peers in Session ({members.length})
            </div>

            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="bg-neutral-900/50 border border-neutral-800/80 rounded-2xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md"
                      style={{ backgroundColor: m.avatarColor }}
                    >
                      {m.name.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <span>{m.name}</span>
                        {m.id === selfId && <span className="text-[10px] text-blue-400">(You)</span>}
                        {m.isHost && (
                          <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded text-[9px] font-mono border border-amber-500/30">
                            HOST
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono flex items-center gap-2 mt-0.5">
                        <span>RTT: {m.rttMs}ms</span>
                        <span>• Drift: {m.driftMs}ms</span>
                      </div>
                    </div>
                  </div>

                  {isHost && m.id !== selfId && (
                    <button
                      onClick={() => onTransferHost(m.id)}
                      className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-[10px] transition-colors border border-neutral-700"
                      title="Make Host"
                    >
                      Make Host
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
