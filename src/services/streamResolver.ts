import { request } from 'undici';
import type { Track, StreamResolution } from '../types/index.js';

class StreamResolver {
  private cache = new Map<string, StreamResolution>();
  private publicPipedInstances = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.privacy.com.de',
    'https://piped-api.lunar.icu',
    'https://api.piped.projectsegfau.lt'
  ];

  public async resolveStream(trackId: string): Promise<StreamResolution | null> {
    const cached = this.cache.get(trackId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }

    for (const instance of this.publicPipedInstances) {
      try {
        const { statusCode, body } = await request(`${instance}/streams/${trackId}`, {
          headers: { 'User-Agent': 'Xosonic-HyperX/1.0 (XrLabs)' },
          bodyTimeout: 5000,
          headersTimeout: 5000,
        });

        if (statusCode !== 200) continue;

        const data: any = await body.json();
        const audioStreams = data.audioStreams || [];
        if (!audioStreams.length) continue;

        // Pick highest bitrate audio stream
        audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
        const bestAudio = audioStreams[0];

        const resolution: StreamResolution = {
          trackId,
          streamUrl: bestAudio.url,
          bitrate: bestAudio.bitrate || 160000,
          format: bestAudio.format || 'opus',
          contentLength: bestAudio.contentLength,
          expiresAt: Date.now() + 4 * 60 * 60 * 1000, // 4 hours TTL
        };

        this.cache.set(trackId, resolution);
        return resolution;
      } catch {
        continue;
      }
    }

    return null;
  }

  public async search(query: string): Promise<Track[]> {
    for (const instance of this.publicPipedInstances) {
      try {
        const url = `${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`;
        const { statusCode, body } = await request(url, {
          headers: { 'User-Agent': 'Xosonic-HyperX/1.0 (XrLabs)' },
          bodyTimeout: 5000,
        });

        if (statusCode !== 200) continue;

        const data: any = await body.json();
        const items = data.items || [];

        return items
          .filter((item: any) => item.type === 'stream')
          .slice(0, 25)
          .map((item: any) => {
            const id = item.url ? item.url.replace('/watch?v=', '') : '';
            return {
              id,
              title: item.title || 'Unknown Title',
              artist: item.uploaderName || 'Unknown Artist',
              durationSeconds: item.duration || 0,
              thumbnailUrl: item.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
            };
          });
      } catch {
        continue;
      }
    }

    return [];
  }
}

export const streamResolver = new StreamResolver();
