import type { FastifyPluginAsync } from 'fastify';
import { syncEngine } from '../services/syncEngine.js';
import { radarService } from '../services/radarService.js';
import type { WebSocketMessage } from '../types/index.js';

export const wsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/ws', { websocket: true }, (socket, req) => {
    const socketId = `sock_${Math.random().toString(36).substring(2, 9)}`;
    syncEngine.registerSocket(socketId, socket);

    socket.on('message', (rawData) => {
      try {
        const msg: WebSocketMessage = JSON.parse(rawData.toString());

        switch (msg.type) {
          case 'ping':
            socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;

          case 'join_room':
            if (msg.roomId) {
              syncEngine.createOrJoinRoom(socketId, msg.roomId, msg.payload?.name || '');
            }
            break;

          case 'leave_room':
            if (msg.roomId) {
              syncEngine.leaveRoom(socketId, msg.roomId);
            }
            break;

          case 'play_track':
          case 'pause':
          case 'resume':
          case 'seek':
            if (msg.roomId) {
              syncEngine.updatePlayback(socketId, msg.roomId, msg.type, msg.payload || {});
            }
            break;

          case 'radar_subscribe':
            socket.send(
              JSON.stringify({
                type: 'radar_update',
                payload: radarService.getStats(syncEngine.getActiveRoomCount()),
                timestamp: Date.now(),
              })
            );
            break;
        }
      } catch (err) {
        fastify.log.warn({ err }, 'Invalid WS message payload');
      }
    });

    socket.on('close', () => {
      syncEngine.unregisterSocket(socketId);
    });
  });
};
