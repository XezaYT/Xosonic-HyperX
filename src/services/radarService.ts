import type { RadarStats, Track } from '../types/index.js';

class RadarService {
  private activeListeners = new Set<string>();
  private totalStreamsServed = 0;
  private trackPlays = new Map<string, { track: Track; count: number }>();

  public recordStreamStart(sessionId: string, track?: Track) {
    this.activeListeners.add(sessionId);
    this.totalStreamsServed++;

    if (track) {
      const existing = this.trackPlays.get(track.id) || { track, count: 0 };
      existing.count++;
      this.trackPlays.set(track.id, existing);
    }
  }

  public recordStreamEnd(sessionId: string) {
    this.activeListeners.delete(sessionId);
  }

  public getStats(activeRoomCount: number = 0): RadarStats {
    const trending = Array.from(this.trackPlays.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((entry) => ({
        trackId: entry.track.id,
        title: entry.track.title,
        artist: entry.track.artist,
        listeners: entry.count,
      }));

    return {
      totalActiveListeners: this.activeListeners.size,
      activeRooms: activeRoomCount,
      totalStreamsServed: this.totalStreamsServed,
      topTrending: trending,
      timestamp: Date.now(),
    };
  }
}

export const radarService = new RadarService();
