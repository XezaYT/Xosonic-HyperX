import type { WebSocket } from 'ws';
import type { RoomState, RoomParticipant, Track, WebSocketMessage } from '../types/index.js';

class SyncEngine {
  private rooms = new Map<string, RoomState>();
  private sockets = new Map<string, { ws: WebSocket; roomId: string | null }>();

  public registerSocket(socketId: string, ws: WebSocket) {
    this.sockets.set(socketId, { ws, roomId: null });
  }

  public unregisterSocket(socketId: string) {
    const entry = this.sockets.get(socketId);
    if (entry && entry.roomId) {
      this.leaveRoom(socketId, entry.roomId);
    }
    this.sockets.delete(socketId);
  }

  public getActiveRoomCount(): number {
    return this.rooms.size;
  }

  public createOrJoinRoom(socketId: string, roomId: string, roomName: string): RoomState {
    const entry = this.sockets.get(socketId);
    if (!entry) throw new Error('Socket not found');

    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        name: roomName || `Room ${roomId}`,
        hostId: socketId,
        currentTrack: null,
        positionMs: 0,
        isPlaying: false,
        lastUpdated: Date.now(),
        participants: new Map(),
      };
      this.rooms.set(roomId, room);
    }

    const participant: RoomParticipant = {
      id: socketId,
      isHost: room.hostId === socketId,
      joinedAt: Date.now(),
      latencyMs: 0,
    };

    room.participants.set(socketId, participant);
    entry.roomId = roomId;

    this.broadcastToRoom(roomId, {
      type: 'room_state',
      roomId,
      payload: this.serializeRoom(room),
      timestamp: Date.now(),
    });

    return room;
  }

  public leaveRoom(socketId: string, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.participants.delete(socketId);

    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
    } else {
      if (room.hostId === socketId) {
        // Reassign host to the earliest joined participant
        const nextHost = Array.from(room.participants.values()).sort((a, b) => a.joinedAt - b.joinedAt)[0];
        if (nextHost) {
          room.hostId = nextHost.id;
          nextHost.isHost = true;
        }
      }

      this.broadcastToRoom(roomId, {
        type: 'room_state',
        roomId,
        payload: this.serializeRoom(room),
        timestamp: Date.now(),
      });
    }
  }

  public updatePlayback(
    socketId: string,
    roomId: string,
    action: 'play_track' | 'pause' | 'resume' | 'seek',
    payload: { track?: Track; positionMs?: number }
  ) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Only host can control playback
    if (room.hostId !== socketId) return;

    if (action === 'play_track' && payload.track) {
      room.currentTrack = payload.track;
      room.positionMs = 0;
      room.isPlaying = true;
    } else if (action === 'pause') {
      room.isPlaying = false;
      if (payload.positionMs !== undefined) room.positionMs = payload.positionMs;
    } else if (action === 'resume') {
      room.isPlaying = true;
      if (payload.positionMs !== undefined) room.positionMs = payload.positionMs;
    } else if (action === 'seek') {
      if (payload.positionMs !== undefined) room.positionMs = payload.positionMs;
    }

    room.lastUpdated = Date.now();

    this.broadcastToRoom(roomId, {
      type: 'room_state',
      roomId,
      payload: this.serializeRoom(room),
      timestamp: Date.now(),
    });
  }

  public broadcastToRoom(roomId: string, message: WebSocketMessage) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const data = JSON.stringify(message);
    for (const participantId of room.participants.keys()) {
      const client = this.sockets.get(participantId);
      if (client && client.ws.readyState === client.ws.OPEN) {
        client.ws.send(data);
      }
    }
  }

  private serializeRoom(room: RoomState) {
    return {
      roomId: room.roomId,
      name: room.name,
      hostId: room.hostId,
      currentTrack: room.currentTrack,
      positionMs: room.positionMs,
      isPlaying: room.isPlaying,
      lastUpdated: room.lastUpdated,
      participantCount: room.participants.size,
    };
  }
}

export const syncEngine = new SyncEngine();
