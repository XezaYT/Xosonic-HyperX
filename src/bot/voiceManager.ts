import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
  type VoiceConnection,
  type AudioPlayer,
} from '@discordjs/voice';
import type { VoiceBasedChannel } from 'discord.js';
import { streamResolver } from '../services/streamResolver.js';
import type { Track } from '../types/index.js';

interface GuildQueue {
  connection: VoiceConnection;
  player: AudioPlayer;
  queue: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  syncedRoomId: string | null;
}

class VoiceManager {
  private queues = new Map<string, GuildQueue>();

  public async getOrCreateQueue(channel: VoiceBasedChannel): Promise<GuildQueue> {
    const guildId = channel.guild.id;
    let guildQueue = this.queues.get(guildId);

    if (guildQueue && guildQueue.connection.state.status !== VoiceConnectionStatus.Destroyed) {
      return guildQueue;
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator as any,
      selfDeaf: true,
    });

    const player = createAudioPlayer();
    connection.subscribe(player);

    guildQueue = {
      connection,
      player,
      queue: [],
      currentTrack: null,
      isPlaying: false,
      syncedRoomId: null,
    };

    player.on(AudioPlayerStatus.Idle, () => {
      this.playNext(guildId);
    });

    player.on('error', (err) => {
      console.error(`[XosonicBot] Voice player error in guild ${guildId}:`, err);
      this.playNext(guildId);
    });

    this.queues.set(guildId, guildQueue);
    return guildQueue;
  }

  public async enqueue(channel: VoiceBasedChannel, track: Track) {
    const queue = await this.getOrCreateQueue(channel);
    queue.queue.push(track);

    if (!queue.isPlaying) {
      await this.playNext(channel.guild.id);
    }
  }

  public async playNext(guildId: string): Promise<boolean> {
    const queue = this.queues.get(guildId);
    if (!queue) return false;

    if (queue.queue.length === 0) {
      queue.currentTrack = null;
      queue.isPlaying = false;
      return false;
    }

    const nextTrack = queue.queue.shift()!;
    queue.currentTrack = nextTrack;

    const resolution = await streamResolver.resolveStream(nextTrack.id);
    if (!resolution) {
      console.warn(`[XosonicBot] Failed to resolve stream for ${nextTrack.id}, skipping...`);
      return this.playNext(guildId);
    }

    const resource = createAudioResource(resolution.streamUrl, {
      inputType: StreamType.Arbitrary,
      inlineVolume: true,
    });

    queue.player.play(resource);
    queue.isPlaying = true;
    return true;
  }

  public pause(guildId: string): boolean {
    const queue = this.queues.get(guildId);
    if (queue && queue.isPlaying) {
      queue.player.pause();
      queue.isPlaying = false;
      return true;
    }
    return false;
  }

  public resume(guildId: string): boolean {
    const queue = this.queues.get(guildId);
    if (queue && !queue.isPlaying) {
      queue.player.unpause();
      queue.isPlaying = true;
      return true;
    }
    return false;
  }

  public skip(guildId: string): boolean {
    const queue = this.queues.get(guildId);
    if (queue) {
      queue.player.stop();
      return true;
    }
    return false;
  }

  public stop(guildId: string): boolean {
    const queue = this.queues.get(guildId);
    if (queue) {
      queue.queue = [];
      queue.currentTrack = null;
      queue.player.stop();
      queue.connection.destroy();
      this.queues.delete(guildId);
      return true;
    }
    return false;
  }

  public getQueue(guildId: string): { current: Track | null; queue: Track[]; isPlaying: boolean } | null {
    const queue = this.queues.get(guildId);
    if (!queue) return null;
    return {
      current: queue.currentTrack,
      queue: queue.queue,
      isPlaying: queue.isPlaying,
    };
  }

  public setSyncedRoom(guildId: string, roomId: string) {
    const queue = this.queues.get(guildId);
    if (queue) {
      queue.syncedRoomId = roomId;
    }
  }
}

export const voiceManager = new VoiceManager();
