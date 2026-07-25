/**
 * @license
 * SyncStream Top Navigation Header Component
 */

import React, { useState } from "react";
import { Tv, Copy, Check, Shield, Activity, BookOpen, Users, Sparkles } from "lucide-react";
import { SyncStatus } from "../types";

interface HeaderProps {
  roomId: string;
  userName: string;
  syncStatus: SyncStatus;
  driftMs: number;
  memberCount: number;
  onOpenArchitectureModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  roomId,
  userName,
  syncStatus,
  driftMs,
  memberCount,
  onOpenArchitectureModal
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-16 bg-neutral-950 border-b border-neutral-900 px-4 md:px-6 flex items-center justify-between select-none">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl text-white shadow-lg shadow-blue-500/20">
          <Tv className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-black text-white tracking-wider flex items-center gap-2">
            SyncStream <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-md font-mono">v2.4 PRO</span>
          </h1>
          <p className="text-[10px] text-neutral-400 font-mono hidden sm:block">
            Sub-100ms Synchronized Co-Watching Platform
          </p>
        </div>
      </div>

      {/* Room Share & Status */}
      <div className="flex items-center gap-3">
        {/* Room ID Badge */}
        <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1 pl-3 text-xs font-mono">
          <span className="text-neutral-400 mr-2 hidden sm:inline">ROOM:</span>
          <span className="text-white font-bold mr-2">{roomId}</span>
          <button
            onClick={handleCopyRoomId}
            className="p-1.5 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-[10px]"
            title="Copy Room Share Link"
            id="btn-copy-room"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{copied ? "Copied!" : "Share"}</span>
          </button>
        </div>

        {/* Sync Health Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-mono">
          <span className={`w-2 h-2 rounded-full ${syncStatus === "SYNCHRONIZED" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
          <span className="text-neutral-300 font-medium">{driftMs}ms Drift</span>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white font-medium">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>{userName}</span>
        </div>

        {/* Architecture Spec Button */}
        <button
          onClick={onOpenArchitectureModal}
          className="p-2 text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/50 rounded-xl transition-all flex items-center gap-1.5 text-xs font-medium"
          id="btn-header-blueprint"
        >
          <BookOpen className="w-4 h-4" />
          <span className="hidden md:inline">Blueprint</span>
        </button>
      </div>
    </header>
  );
};
