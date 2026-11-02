import { request } from 'undici';
import type { LyricsData, LyricLine } from '../types/index.js';

class LyricsService {
  private cache = new Map<string, LyricsData>();

  public async getLyrics(trackTitle: string, artistName: string, durationSeconds?: number): Promise<LyricsData | null> {
    const cacheKey = `${trackTitle}::${artistName}`.toLowerCase();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const queryParams = new URLSearchParams({
        track_name: trackTitle,
        artist_name: artistName,
      });
      if (durationSeconds) {
        queryParams.append('duration', durationSeconds.toString());
      }

      const { statusCode, body } = await request(`https://lrclib.net/api/get?${queryParams.toString()}`, {
        headers: { 'User-Agent': 'Xosonic-HyperX/1.0 (XrLabs)' },
      });

      if (statusCode === 200) {
        const data: any = await body.json();
        if (data.syncedLyrics) {
          const lines = this.parseLrc(data.syncedLyrics);
          const result: LyricsData = {
            trackId: cacheKey,
            synced: true,
            lines,
          };
          this.cache.set(cacheKey, result);
          return result;
        } else if (data.plainLyrics) {
          const lines: LyricLine[] = data.plainLyrics
            .split('\n')
            .filter((l: string) => l.trim().length > 0)
            .map((text: string, idx: number) => ({
              timeMs: idx * 3000,
              text,
            }));
          const result: LyricsData = {
            trackId: cacheKey,
            synced: false,
            lines,
          };
          this.cache.set(cacheKey, result);
          return result;
        }
      }
    } catch {
      // Fallback
    }

    return null;
  }

  private parseLrc(lrc: string): LyricLine[] {
    const lines: LyricLine[] = [];
    const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

    for (const rawLine of lrc.split('\n')) {
      const match = rawLine.match(regex);
      if (match) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const msStr = match[3].padEnd(3, '0');
        const ms = parseInt(msStr.slice(0, 3), 10);
        const timeMs = min * 60 * 1000 + sec * 1000 + ms;
        const text = match[4].trim();

        if (text.length > 0) {
          lines.push({ timeMs, text });
        }
      }
    }

    return lines;
  }
}

export const lyricsService = new LyricsService();
