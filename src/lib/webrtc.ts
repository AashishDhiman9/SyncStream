/**
 * @license
 * WebRTC Screen Share & Low-Latency Audio/Video Pipeline
 * Includes System Audio Capture & WebAudio API Audio Mixing
 */

export interface WebRTCCallbacks {
  onSignal: (targetPeerId: string, signal: any, signalType: 'offer' | 'answer' | 'candidate') => void;
  onRemoteStream: (peerId: string, stream: MediaStream) => void;
  onRemoteAudioStream?: (peerId: string, stream: MediaStream) => void;
  onPeerDisconnected: (peerId: string) => void;
  onStatsUpdate?: (bitrateKbps: number, packetLoss: number) => void;
  onScreenShareEnded?: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" }
  ]
};

export class WebRTCManager {
  private peers = new Map<string, RTCPeerConnection>();
  private localScreenStream: MediaStream | null = null;
  private localMicStream: MediaStream | null = null;
  private mixedAudioTrack: MediaStreamTrack | null = null;
  private audioContext: AudioContext | null = null;
  private callbacks: WebRTCCallbacks;
  private selfId: string;
  private statsTimer: number | null = null;
  private renegotiatingPeers = new Set<string>();

  constructor(selfId: string, callbacks: WebRTCCallbacks) {
    this.selfId = selfId;
    this.callbacks = callbacks;
    this.startStatsMonitor();
  }

  /**
   * Start Screen Sharing with System Audio + Mic Mixing
   */
  public async startScreenShare(withMic = false): Promise<MediaStream> {
    try {
      // 1. Get Display Media with flexible constraints for cross-browser reliability
      let displayStream: MediaStream;
      try {
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
      } catch (err: any) {
        // Fallback without system audio if system audio capture failed or rejected
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });
      }

      this.localScreenStream = displayStream;

      // 2. Mix Microphone if enabled
      if (withMic) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true }
          });
          this.localMicStream = micStream;
          this.mixAudioStreams(displayStream, micStream);
        } catch (e) {
          console.warn("Microphone permission denied or not available:", e);
        }
      }

      // Handle user clicking "Stop Sharing" on browser floating banner
      const videoTrack = displayStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopScreenShare();
          if (this.callbacks.onScreenShareEnded) {
            this.callbacks.onScreenShareEnded();
          }
        };
      }

      // Add tracks to all connected peers
      this.broadcastLocalTracks();

      return displayStream;
    } catch (err) {
      console.error("Failed to start screen share:", err);
      throw err;
    }
  }

  public async startMicrophone(): Promise<MediaStream> {
    if (this.localMicStream) {
      return this.localMicStream;
    }

    const micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
    this.localMicStream = micStream;

    if (this.localScreenStream) {
      this.mixAudioStreams(this.localScreenStream, micStream);
    }

    this.broadcastLocalTracks();
    return micStream;
  }

  public stopMicrophone() {
    if (this.localMicStream) {
      this.localMicStream.getTracks().forEach(t => t.stop());
      this.localMicStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.mixedAudioTrack = null;

    for (const [peerId, pc] of this.peers.entries()) {
      pc.getSenders().forEach(sender => {
        if (sender.track?.kind === "audio") {
          try {
            pc.removeTrack(sender);
          } catch (e) {}
        }
      });
      this.addLocalTracksToPeer(pc);
      this.renegotiatePeer(peerId);
    }
  }

  /**
   * WebAudio API Audio Mixer: Mix System Audio + Mic Audio
   */
  private mixAudioStreams(systemStream: MediaStream, micStream: MediaStream) {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = this.audioContext.createMediaStreamDestination();

      const systemAudioTrack = systemStream.getAudioTracks()[0];
      if (systemAudioTrack) {
        const sysSource = this.audioContext.createMediaStreamSource(new MediaStream([systemAudioTrack]));
        const sysGain = this.audioContext.createGain();
        sysGain.gain.value = 1.0;
        sysSource.connect(sysGain);
        sysGain.connect(dest);
      }

      const micAudioTrack = micStream.getAudioTracks()[0];
      if (micAudioTrack) {
        const micSource = this.audioContext.createMediaStreamSource(new MediaStream([micAudioTrack]));
        const micGain = this.audioContext.createGain();
        micGain.gain.value = 0.8;
        micSource.connect(micGain);
        micGain.connect(dest);
      }

      this.mixedAudioTrack = dest.stream.getAudioTracks()[0];
    } catch (err) {
      console.warn("WebAudio API mixing error:", err);
    }
  }

  /**
   * Stop Screen Sharing and cleanup tracks
   */
  public stopScreenShare() {
    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach(t => t.stop());
      this.localScreenStream = null;
    }
    if (this.localMicStream) {
      this.localMicStream.getTracks().forEach(t => t.stop());
      this.localMicStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.mixedAudioTrack = null;

    // Remove video/audio senders from peer connections
    for (const pc of this.peers.values()) {
      pc.getSenders().forEach(sender => {
        if (sender.track) {
          try {
            pc.removeTrack(sender);
          } catch (e) {}
        }
      });
    }
  }

  /**
   * Connect to a remote peer (Initiate Offer)
   */
  public async createPeerConnection(peerId: string, isInitiator: boolean) {
    if (this.peers.has(peerId)) {
      const pc = this.peers.get(peerId)!;
      if (isInitiator && pc.signalingState === "stable") {
        this.addLocalTracksToPeer(pc);
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(offer);
        this.callbacks.onSignal(peerId, offer, "offer");
      }
      return pc;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peers.set(peerId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.callbacks.onSignal(peerId, event.candidate, "candidate");
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];
        if (event.track.kind === "video" || stream.getVideoTracks().length > 0) {
          this.callbacks.onRemoteStream(peerId, stream);
        } else if (event.track.kind === "audio" && this.callbacks.onRemoteAudioStream) {
          this.callbacks.onRemoteAudioStream(peerId, stream);
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
        this.closePeerConnection(peerId);
      }
    };

    // Add local stream tracks if available
    this.addLocalTracksToPeer(pc);

    if (isInitiator) {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);
      this.callbacks.onSignal(peerId, offer, "offer");
    }

    return pc;
  }

  private addLocalTracksToPeer(pc: RTCPeerConnection) {
    if (this.localScreenStream) {
      const videoTrack = this.localScreenStream.getVideoTracks()[0];
      if (videoTrack) {
        const senders = pc.getSenders();
        const hasVideoSender = senders.some(s => s.track && s.track.kind === "video");
        if (!hasVideoSender) {
          pc.addTrack(videoTrack, this.localScreenStream);
        }
      }
    }

    const audioTrack = this.mixedAudioTrack
      || this.localMicStream?.getAudioTracks()[0]
      || (this.localScreenStream ? this.localScreenStream.getAudioTracks()[0] : null);
    if (audioTrack) {
      const senders = pc.getSenders();
      const audioSender = senders.find(s => s.track && s.track.kind === "audio");
      if (audioSender && audioSender.track !== audioTrack) {
        audioSender.replaceTrack(audioTrack).catch(() => {});
      } else if (!audioSender) {
        pc.addTrack(audioTrack, this.localScreenStream || this.localMicStream || new MediaStream([audioTrack]));
      }
    }
  }

  private broadcastLocalTracks() {
    for (const [peerId, pc] of this.peers.entries()) {
      this.addLocalTracksToPeer(pc);
      this.renegotiatePeer(peerId);
    }
  }

  private async renegotiatePeer(peerId: string) {
    if (this.renegotiatingPeers.has(peerId)) return;
    const pc = this.peers.get(peerId);
    if (!pc || pc.signalingState !== "stable") return;

    this.renegotiatingPeers.add(peerId);
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);
      this.callbacks.onSignal(peerId, offer, "offer");
    } catch (err) {
      console.warn("WebRTC renegotiation failed:", err);
    } finally {
      this.renegotiatingPeers.delete(peerId);
    }
  }

  /**
   * Handle incoming WebRTC signaling message
   */
  public async handleSignal(peerId: string, signal: any, signalType: 'offer' | 'answer' | 'candidate') {
    let pc = this.peers.get(peerId);
    if (!pc) {
      pc = await this.createPeerConnection(peerId, false);
    }

    if (signalType === "offer") {
      await pc.setRemoteDescription(new RTCSessionDescription(signal));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.callbacks.onSignal(peerId, answer, "answer");
    } else if (signalType === "answer") {
      await pc.setRemoteDescription(new RTCSessionDescription(signal));
    } else if (signalType === "candidate") {
      await pc.addIceCandidate(new RTCIceCandidate(signal));
    }
  }

  public closePeerConnection(peerId: string) {
    const pc = this.peers.get(peerId);
    if (pc) {
      pc.close();
      this.peers.delete(peerId);
      this.callbacks.onPeerDisconnected(peerId);
    }
  }

  public cleanup() {
    this.stopScreenShare();
    if (this.statsTimer !== null) {
      clearInterval(this.statsTimer);
    }
    for (const peerId of this.peers.keys()) {
      this.closePeerConnection(peerId);
    }
  }

  private startStatsMonitor() {
    this.statsTimer = window.setInterval(async () => {
      let totalBitrate = 0;
      let totalPacketsLost = 0;

      for (const pc of this.peers.values()) {
        try {
          const stats = await pc.getStats();
          stats.forEach(report => {
            if (report.type === "inbound-rtp" && report.kind === "video") {
              totalBitrate += (report.bytesReceived * 8) / 1000; // kbps approx
              totalPacketsLost += report.packetsLost || 0;
            }
          });
        } catch (e) {
          // ignore
        }
      }

      if (this.callbacks.onStatsUpdate) {
        this.callbacks.onStatsUpdate(Math.round(totalBitrate), totalPacketsLost);
      }
    }, 2000);
  }
}
