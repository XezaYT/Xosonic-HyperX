export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  durationSeconds: number;
  thumbnailUrl?: string;
  streamUrl?: string;
  format?: 'mp3' | 'opus' | 'm4a' | 'webm';
}

export interface StreamResolution {
  trackId: string;
  streamUrl: string;
  bitrate: number;
  format: string;
  contentLength?: number;
  expiresAt: number;
}

export interface LyricLine {
  timeMs: number;
  text: string;
  translatedText?: string;
  romanizedText?: string;
}

export interface LyricsData {
  trackId: string;
  synced: boolean;
  lines: LyricLine[];
}

export interface RadarStats {
  totalActiveListeners: number;
  activeRooms: number;
  totalStreamsServed: number;
  topTrending: {
    trackId: string;
    title: string;
    artist: string;
    listeners: number;
  }[];
  timestamp: number;
}

export interface RoomParticipant {
  id: string;
  isHost: boolean;
  joinedAt: number;
  latencyMs: number;
}

export interface RoomState {
  roomId: string;
  name: string;
  hostId: string;
  currentTrack: Track | null;
  positionMs: number;
  isPlaying: boolean;
  lastUpdated: number;
  participants: Map<string, RoomParticipant>;
}

export type WebSocketMessageType =
  | 'join_room'
  | 'leave_room'
  | 'room_state'
  | 'play_track'
  | 'pause'
  | 'resume'
  | 'seek'
  | 'ping'
  | 'pong'
  | 'radar_subscribe'
  | 'radar_update';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  roomId?: string;
  payload?: any;
  timestamp: number;
}
