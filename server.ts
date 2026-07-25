import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { RoomState, VideoSource, ChatMessage, RoomMember } from "./src/types.js";
import { DEFAULT_DEMO_SOURCES } from "./src/lib/demoSources.js";

const PORT = Number(process.env.PORT || 3000);

interface ExtendedWebSocket extends WebSocket {
  id: string;
  roomId?: string;
  userName?: string;
  isAlive?: boolean;
}

// In-memory room store
const rooms = new Map<string, RoomState>();
const roomMessages = new Map<string, ChatMessage[]>();
const clientsMap = new Map<string, ExtendedWebSocket>();

function getOrCreateRoom(roomId: string, hostId: string, hostName: string): RoomState {
  if (rooms.has(roomId)) {
    return rooms.get(roomId)!;
  }

  const initialRoom: RoomState = {
    roomId,
    hostId,
    source: DEFAULT_DEMO_SOURCES[0],
    isPlaying: false,
    currentTime: 0,
    playbackRate: 1.0,
    lastStateTimestamp: Date.now(),
    sequenceNumber: 1,
    members: [],
    allowMemberControl: true,
  };

  rooms.set(roomId, initialRoom);
  roomMessages.set(roomId, []);
  return initialRoom;
}

function calculateCurrentRoomTime(room: RoomState): number {
  if (!room.isPlaying) {
    return room.currentTime;
  }
  const elapsedSec = (Date.now() - room.lastStateTimestamp) / 1000;
  return room.currentTime + elapsedSec * room.playbackRate;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  // REST API Endpoints
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      activeRooms: rooms.size,
      connectedClients: clientsMap.size,
      timestamp: Date.now()
    });
  });

  app.get("/api/demo-sources", (req, res) => {
    res.json(DEFAULT_DEMO_SOURCES);
  });

  app.get("/api/rooms/:roomId", (req, res) => {
    const room = rooms.get(req.params.roomId);
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    const calculatedTime = calculateCurrentRoomTime(room);
    res.json({ ...room, currentTime: calculatedTime });
  });

  // WebSocket Connection Handling
  wss.on("connection", (ws: ExtendedWebSocket) => {
    ws.id = `usr_${Math.random().toString(36).substring(2, 9)}`;
    ws.isAlive = true;
    clientsMap.set(ws.id, ws);

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (rawMessage: string) => {
      try {
        const msg = JSON.parse(rawMessage.toString());

        // 1. NTP Time Probe (Cristian's Clock Sync Algorithm)
        if (msg.type === "NTP_PING") {
          const t2 = Date.now(); // Server receive time
          ws.send(
            JSON.stringify({
              type: "NTP_PONG",
              t1: msg.t1,
              t2,
              t3: Date.now() // Server send time
            })
          );
          return;
        }

        // 2. Room Join
        if (msg.type === "JOIN_ROOM") {
          const { roomId, userName } = msg;
          ws.roomId = roomId;
          ws.userName = userName || `User_${ws.id.slice(-4)}`;

          const room = getOrCreateRoom(roomId, ws.id, ws.userName);

          // Add member
          const colors = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4"];
          const newMember: RoomMember = {
            id: ws.id,
            name: ws.userName,
            isHost: room.members.length === 0 || room.hostId === ws.id,
            isBuffering: false,
            driftMs: 0,
            rttMs: 0,
            joinedAt: Date.now(),
            hasAudio: false,
            hasVideo: false,
            isSharingScreen: false,
            avatarColor: colors[Math.floor(Math.random() * colors.length)]
          };

          if (room.members.length === 0) {
            room.hostId = ws.id;
          }

          // Replace existing member if reconnecting
          const existingIdx = room.members.findIndex(m => m.id === ws.id);
          if (existingIdx >= 0) {
            room.members[existingIdx] = newMember;
          } else {
            room.members.push(newMember);
          }

          // Add system join message
          const sysMsg: ChatMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            senderId: "system",
            senderName: "System",
            text: `${ws.userName} joined the sync room.`,
            timestamp: Date.now(),
            isSystem: true
          };
          const chatHist = roomMessages.get(roomId) || [];
          chatHist.push(sysMsg);
          if (chatHist.length > 100) chatHist.shift();

          // Send current state to newly joined client
          ws.send(
            JSON.stringify({
              type: "ROOM_STATE_INIT",
              room: {
                ...room,
                currentTime: calculateCurrentRoomTime(room)
              },
              chatHistory: chatHist,
              selfId: ws.id
            })
          );

          // Broadcast member joined to others
          broadcastToRoom(roomId, {
            type: "MEMBER_JOINED",
            member: newMember,
            members: room.members,
            systemMessage: sysMsg
          });
          return;
        }

        // Must be in a room for subsequent actions
        if (!ws.roomId) return;
        const room = rooms.get(ws.roomId);
        if (!room) return;

        // 3. Playback Sync Events (PLAY, PAUSE, SEEK, RATE, CHANGE_SOURCE)
        if (msg.type === "SYNC_EVENT") {
          const { action, currentTime, playbackRate, source } = msg;

          // Non-hosts can only trigger actions if allowed
          if (!room.allowMemberControl && room.hostId !== ws.id) {
            ws.send(JSON.stringify({ type: "ERROR", message: "Only the host can control playback in this room." }));
            return;
          }

          room.sequenceNumber += 1;
          const now = Date.now();

          if (action === "PLAY") {
            room.isPlaying = true;
            room.currentTime = currentTime;
            room.lastStateTimestamp = now;
          } else if (action === "PAUSE") {
            room.isPlaying = false;
            room.currentTime = currentTime;
            room.lastStateTimestamp = now;
          } else if (action === "SEEK") {
            room.currentTime = currentTime;
            room.lastStateTimestamp = now;
          } else if (action === "RATE") {
            room.currentTime = calculateCurrentRoomTime(room);
            room.playbackRate = playbackRate || 1.0;
            room.lastStateTimestamp = now;
          } else if (action === "CHANGE_SOURCE" && source) {
            room.source = source;
            room.isPlaying = false;
            room.currentTime = 0;
            room.lastStateTimestamp = now;
          }

          // Broadcast authoritative updated state
          broadcastToRoom(ws.roomId, {
            type: "SYNC_EVENT_BROADCAST",
            action,
            issuerId: ws.id,
            issuerName: ws.userName,
            currentTime: room.currentTime,
            playbackRate: room.playbackRate,
            isPlaying: room.isPlaying,
            source: room.source,
            serverTimestamp: now,
            sequenceNumber: room.sequenceNumber
          });
          return;
        }

        // 4. Client Telemetry & Stats Update
        if (msg.type === "CLIENT_METRICS") {
          const { driftMs, rttMs, isBuffering, isSharingScreen, hasAudio, hasVideo } = msg;
          const member = room.members.find(m => m.id === ws.id);
          if (member) {
            member.driftMs = driftMs;
            member.rttMs = rttMs;
            member.isBuffering = isBuffering;
            member.isSharingScreen = isSharingScreen;
            member.hasAudio = hasAudio;
            member.hasVideo = hasVideo;

            // Broadcast metrics update to room
            broadcastToRoom(ws.roomId, {
              type: "MEMBERS_UPDATE",
              members: room.members
            });
          }
          return;
        }

        // 5. Chat & Reactions
        if (msg.type === "SEND_CHAT") {
          const chatMsg: ChatMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            senderId: ws.id,
            senderName: ws.userName || "Anonymous",
            text: msg.text,
            timestamp: Date.now()
          };
          const chatHist = roomMessages.get(ws.roomId) || [];
          chatHist.push(chatMsg);
          if (chatHist.length > 100) chatHist.shift();

          broadcastToRoom(ws.roomId, {
            type: "NEW_CHAT",
            message: chatMsg
          });
          return;
        }

        if (msg.type === "SEND_REACTION") {
          broadcastToRoom(ws.roomId, {
            type: "REACTION_BROADCAST",
            senderId: ws.id,
            senderName: ws.userName,
            emoji: msg.emoji,
            timestamp: Date.now()
          });
          return;
        }

        // 6. Host Settings & Host Transfer
        if (msg.type === "TOGGLE_MEMBER_CONTROL") {
          if (room.hostId === ws.id) {
            room.allowMemberControl = !room.allowMemberControl;
            broadcastToRoom(ws.roomId, {
              type: "ROOM_SETTINGS_UPDATED",
              allowMemberControl: room.allowMemberControl
            });
          }
          return;
        }

        if (msg.type === "TRANSFER_HOST") {
          if (room.hostId === ws.id && msg.targetHostId) {
            room.hostId = msg.targetHostId;
            room.members.forEach(m => {
              m.isHost = m.id === room.hostId;
            });
            broadcastToRoom(ws.roomId, {
              type: "HOST_CHANGED",
              newHostId: room.hostId,
              members: room.members
            });
          }
          return;
        }

        // 7. WebRTC Signaling Relay (Screen Share & Audio/Video WebRTC mesh)
        if (msg.type === "WEBRTC_SIGNAL") {
          const { targetPeerId, signal, signalType } = msg;
          const targetWs = clientsMap.get(targetPeerId);
          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(
              JSON.stringify({
                type: "WEBRTC_SIGNAL",
                senderId: ws.id,
                senderName: ws.userName,
                signal,
                signalType
              })
            );
          }
          return;
        }

      } catch (err) {
        console.error("Error processing WebSocket message:", err);
      }
    });

    ws.on("close", () => {
      clientsMap.delete(ws.id);
      if (ws.roomId) {
        const room = rooms.get(ws.roomId);
        if (room) {
          room.members = room.members.filter(m => m.id !== ws.id);

          // If host left, migrate to next member
          if (room.hostId === ws.id && room.members.length > 0) {
            room.hostId = room.members[0].id;
            room.members[0].isHost = true;
          }

          const sysMsg: ChatMessage = {
            id: `msg_${Date.now()}_sys`,
            senderId: "system",
            senderName: "System",
            text: `${ws.userName || "User"} disconnected.`,
            timestamp: Date.now(),
            isSystem: true
          };

          if (room.members.length === 0) {
            rooms.delete(ws.roomId);
            roomMessages.delete(ws.roomId);
          } else {
            broadcastToRoom(ws.roomId, {
              type: "MEMBER_LEFT",
              memberId: ws.id,
              members: room.members,
              newHostId: room.hostId,
              systemMessage: sysMsg
            });
          }
        }
      }
    });
  });

  function broadcastToRoom(roomId: string, data: any) {
    const payload = JSON.stringify(data);
    for (const client of clientsMap.values()) {
      if (client.roomId === roomId && client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  // Heartbeat ping interval
  const heartbeatInterval = setInterval(() => {
    for (const client of clientsMap.values()) {
      if (client.isAlive === false) {
        client.terminate();
        clientsMap.delete(client.id);
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  // Vite development middleware vs Static Production setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[SyncStream] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
