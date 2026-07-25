/**
 * @license
 * SyncStream - Core Type Definitions
 */

export type SourceType = 'youtube' | 'hls' | 'dash' | 'direct' | 'vimeo' | 'twitch' | 'screenshare';

export interface VideoSource {
  id: string;
  url: string;
  title: string;
  type: SourceType;
  thumbnail?: string;
  duration?: number;
}

export type SyncStatus = 'UNSYNCED' | 'SYNCING' | 'SYNCHRONIZED' | 'BUFFERING' | 'RECOVERING';

export interface RoomState {
  roomId: string;
  hostId: string;
  source: VideoSource;
  isPlaying: boolean;
  currentTime: number; // In seconds
  playbackRate: number;
  lastStateTimestamp: number; // Server epoch ms
  sequenceNumber: number;
  members: RoomMember[];
  allowMemberControl: boolean;
}

export interface RoomMember {
  id: string;
  name: string;
  isHost: boolean;
  isBuffering: boolean;
  driftMs: number;
  rttMs: number;
  joinedAt: number;
  hasAudio: boolean;
  hasVideo: boolean;
  isSharingScreen: boolean;
  avatarColor: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface NTPPingMessage {
  type: 'NTP_PING';
  t1: number; // Client send time
}

export interface NTPPongMessage {
  type: 'NTP_PONG';
  t1: number; // Client send time
  t2: number; // Server receive time
  t3: number; // Server send time
}

export interface SyncEventPayload {
  type: 'SYNC_EVENT';
  action: 'PLAY' | 'PAUSE' | 'SEEK' | 'RATE' | 'CHANGE_SOURCE';
  currentTime: number;
  playbackRate?: number;
  source?: VideoSource;
  issuerId: string;
  serverTimestamp: number;
  sequenceNumber: number;
}

export interface WebRTCSignalPayload {
  type: 'WEBRTC_SIGNAL';
  targetPeerId: string;
  senderId: string;
  signal: RTCSessionDescriptionInit | RTCIceCandidateInit;
  signalType: 'offer' | 'answer' | 'candidate';
}

export interface PerformanceMetrics {
  rttMs: number;
  clockOffsetMs: number;
  driftMs: number;
  bufferAheadSec: number;
  fps: number;
  droppedFrames: number;
  webRtcBitrateKbps: number;
  webRtcPacketLoss: number;
  syncStatus: SyncStatus;
  playbackRateCorrection: number;
}
