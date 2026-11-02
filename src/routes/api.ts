import type { FastifyPluginAsync } from 'fastify';
import { request } from 'undici';
import { streamResolver } from '../services/streamResolver.js';
import { lyricsService } from '../services/lyricsService.js';
import { radarService } from '../services/radarService.js';
import { syncEngine } from '../services/syncEngine.js';

export const apiRoutes: FastifyPluginAsync = async (fastify) => {
  // System Health
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      engine: 'Xosonic HyperX Engine',
      studio: 'XrLabs',
      lead: 'beatrix.sql',
      uptimeSeconds: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      timestamp: Date.now(),
    };
  });

  // Track Search
  fastify.get('/api/search', async (req, reply) => {
    const { q } = req.query as { q?: string };
    if (!q || q.trim().length === 0) {
      return reply.status(400).send({ error: 'Missing query parameter q' });
    }

    const tracks = await streamResolver.search(q);
    return { query: q, count: tracks.length, tracks };
  });

  // Stream Resolution & Audio Proxy (supports HTTP 206 Partial Content for instant seeking)
  fastify.get('/api/stream/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const resolution = await streamResolver.resolveStream(id);

    if (!resolution) {
      return reply.status(404).send({ error: 'Stream not found or could not be resolved' });
    }

    // Forward range header if present for seek support
    const rangeHeader = req.headers.range;
    const headers: Record<string, string> = {
      'User-Agent': 'Xosonic-HyperX/1.0 (XrLabs)',
    };
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    try {
      const sessionId = `${req.ip}-${id}`;
      radarService.recordStreamStart(sessionId, {
        id,
        title: id,
        artist: 'Xosonic Stream',
        durationSeconds: 0,
      });

      req.raw.on('close', () => {
        radarService.recordStreamEnd(sessionId);
      });

      const res = await request(resolution.streamUrl, {
        headers,
        bodyTimeout: 30000,
        headersTimeout: 10000,
      });

      const contentType = res.headers['content-type'] || 'audio/webm';
      reply.status(res.statusCode);
      reply.header('Content-Type', contentType);
      reply.header('Accept-Ranges', 'bytes');
      reply.header('Cache-Control', 'public, max-age=14400');

      if (res.headers['content-range']) {
        reply.header('Content-Range', res.headers['content-range']);
      }
      if (res.headers['content-length']) {
        reply.header('Content-Length', res.headers['content-length']);
      }

      return reply.send(res.body);
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(502).send({ error: 'Failed to proxy audio stream' });
    }
  });

  // Synchronized Lyrics
  fastify.get('/api/lyrics', async (req, reply) => {
    const { title, artist, duration } = req.query as { title?: string; artist?: string; duration?: string };
    if (!title) {
      return reply.status(400).send({ error: 'Missing title query parameter' });
    }

    const durationSeconds = duration ? parseInt(duration, 10) : undefined;
    const lyrics = await lyricsService.getLyrics(title, artist || '', durationSeconds);

    if (!lyrics) {
      return reply.status(404).send({ error: 'Lyrics not found' });
    }

    return lyrics;
  });

  // Privacy-Preserving Active Listener Radar
  fastify.get('/api/radar', async () => {
    return radarService.getStats(syncEngine.getActiveRoomCount());
  });
};
