/**
 * @license
 * Production Synchronization Engine
 * Sub-100ms Drift Correction with Micro-playback-rate Compensation
 */

import { RoomState, SyncStatus } from "../types";
import { NTPClockSync } from "./clockSync";

export interface SyncEngineCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onSeek: (targetTime: number) => void;
  onSetPlaybackRate: (rate: number) => void;
  onStatusChange: (status: SyncStatus, driftMs: number) => void;
}

export class SyncEngine {
  private ntpSync: NTPClockSync;
  private callbacks: SyncEngineCallbacks;
  private syncLoopTimer: number | null = null;
  private currentStatus: SyncStatus = "UNSYNCED";
  private lastDriftMs = 0;
  private isProcessingSeek = false;
  private seekThresholdMs = 1200; // Over 1.2s drift triggers a hard seek
  private rateAdjustThresholdMs = 80; // Between 80ms and 1200ms drift uses soft rate adjustment

  constructor(ntpSync: NTPClockSync, callbacks: SyncEngineCallbacks) {
    this.ntpSync = ntpSync;
    this.callbacks = callbacks;
  }

  public start() {
    this.stop();
    this.syncLoopTimer = window.setInterval(() => {
      this.evaluateSync();
    }, 250); // Check 4 times per second
  }

  public stop() {
    if (this.syncLoopTimer !== null) {
      clearInterval(this.syncLoopTimer);
      this.syncLoopTimer = null;
    }
  }

  /**
   * Calculate exact expected playback time based on synchronized server clock
   */
  public calculateExpectedTime(roomState: RoomState): number {
    if (!roomState.isPlaying) {
      return roomState.currentTime;
    }
    const serverTimeNow = this.ntpSync.getCorrectedServerTime();
    const elapsedSec = (serverTimeNow - roomState.lastStateTimestamp) / 1000;
    return roomState.currentTime + elapsedSec * roomState.playbackRate;
  }

  /**
   * Evaluate player position vs expected position & adjust
   */
  public evaluateSync(
    playerCurrentTime?: number,
    roomState?: RoomState | null,
    isPlayerBuffering?: boolean
  ) {
    if (this.isProcessingSeek || !roomState || playerCurrentTime === undefined) {
      return;
    }

    if (isPlayerBuffering) {
      this.setStatus("BUFFERING", this.lastDriftMs);
      return;
    }

    const expectedTime = this.calculateExpectedTime(roomState);
    const driftSec = playerCurrentTime - expectedTime;
    const driftMs = Math.round(driftSec * 1000);
    const absDriftMs = Math.abs(driftMs);
    this.lastDriftMs = absDriftMs;

    // Handle Paused state sync
    if (!roomState.isPlaying) {
      if (absDriftMs > 100) {
        this.callbacks.onPause();
        this.callbacks.onSeek(roomState.currentTime);
      } else {
        this.setStatus("SYNCHRONIZED", absDriftMs);
      }
      return;
    }

    // 1. Hard Seek (Drift > 1200ms)
    if (absDriftMs > this.seekThresholdMs) {
      this.setStatus("RECOVERING", absDriftMs);
      this.isProcessingSeek = true;
      this.callbacks.onSeek(expectedTime);
      this.callbacks.onSetPlaybackRate(roomState.playbackRate);

      setTimeout(() => {
        this.isProcessingSeek = false;
      }, 400);
      return;
    }

    // 2. Micro Playback Rate Compensation (80ms <= Drift <= 1200ms)
    if (absDriftMs >= this.rateAdjustThresholdMs) {
      this.setStatus("SYNCING", absDriftMs);

      // If player is behind, speed up slightly; if ahead, slow down slightly
      // e.g., 0.96x or 1.04x smoothly shifts audio/video without buffering glitches
      const adjustmentFactor = driftSec < 0 ? 1.035 : 0.965;
      const targetRate = Math.max(0.5, Math.min(2.0, roomState.playbackRate * adjustmentFactor));
      this.callbacks.onSetPlaybackRate(targetRate);
      return;
    }

    // 3. Perfect Synchronized State (Drift < 80ms)
    this.setStatus("SYNCHRONIZED", absDriftMs);
    this.callbacks.onSetPlaybackRate(roomState.playbackRate);
  }

  private setStatus(status: SyncStatus, driftMs: number) {
    if (this.currentStatus !== status || Math.abs(this.lastDriftMs - driftMs) > 20) {
      this.currentStatus = status;
      this.callbacks.onStatusChange(status, driftMs);
    }
  }

  public getDriftMs(): number {
    return this.lastDriftMs;
  }
}
