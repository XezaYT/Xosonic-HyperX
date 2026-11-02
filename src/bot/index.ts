import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
} from 'discord.js';
import dotenv from 'dotenv';
import { voiceManager } from './voiceManager.js';
import { streamResolver } from '../services/streamResolver.js';

dotenv.config();

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  console.log('[XosonicBot] Notice: DISCORD_BOT_TOKEN not provided. Discord Bot worker will stand by.');
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

client.once('ready', () => {
  console.log(`[XosonicBot] Logged in as ${client.user?.tag}! Ready to stream into voice channels.`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, guildId, member } = interaction;
  if (!guildId || !member) return;

  const guildMember = member as GuildMember;
  const voiceChannel = guildMember.voice.channel;

  if (commandName === 'play') {
    if (!voiceChannel) {
      await interaction.reply({
        content: '⚠️ You must be connected to a voice channel to play music.',
        ephemeral: true,
      });
      return;
    }

    const query = interaction.options.getString('query', true);
    await interaction.deferReply();

    const results = await streamResolver.search(query);
    if (results.length === 0) {
      await interaction.editReply(`❌ No tracks found for: **${query}**`);
      return;
    }

    const track = results[0];
    await voiceManager.enqueue(voiceChannel, track);

    const embed = new EmbedBuilder()
      .setColor(0x00ffcc)
      .setTitle('🎵 Added to Queue')
      .setDescription(`**[${track.title}](https://youtube.com/watch?v=${track.id})**\nArtist: ${track.artist}`)
      .setThumbnail(track.thumbnailUrl || null)
      .setFooter({ text: 'Xosonic HyperX • Powered by XrLabs' });

    await interaction.editReply({ embeds: [embed] });
  } else if (commandName === 'pause') {
    const paused = voiceManager.pause(guildId);
    await interaction.reply(paused ? '⏸️ Playback paused.' : '⚠️ No audio currently playing.');
  } else if (commandName === 'resume') {
    const resumed = voiceManager.resume(guildId);
    await interaction.reply(resumed ? '▶️ Playback resumed.' : '⚠️ Audio is not paused.');
  } else if (commandName === 'skip') {
    const skipped = voiceManager.skip(guildId);
    await interaction.reply(skipped ? '⏭️ Skipped current track.' : '⚠️ No audio currently playing to skip.');
  } else if (commandName === 'stop') {
    const stopped = voiceManager.stop(guildId);
    await interaction.reply(stopped ? '⏹️ Playback stopped and disconnected.' : '⚠️ Not connected to any voice channel.');
  } else if (commandName === 'queue') {
    const state = voiceManager.getQueue(guildId);
    if (!state || (!state.current && state.queue.length === 0)) {
      await interaction.reply('📭 The queue is currently empty.');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00ffcc)
      .setTitle('🎶 Current Queue')
      .setDescription(
        `**Now Playing:** ${state.current ? state.current.title : 'None'}\n\n` +
          state.queue
            .slice(0, 10)
            .map((t, idx) => `**${idx + 1}.** ${t.title} - ${t.artist}`)
            .join('\n')
      )
      .setFooter({ text: `Total songs: ${state.queue.length + (state.current ? 1 : 0)}` });

    await interaction.reply({ embeds: [embed] });
  } else if (commandName === 'nowplaying') {
    const state = voiceManager.getQueue(guildId);
    if (!state || !state.current) {
      await interaction.reply('⚠️ No song currently playing.');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00ffcc)
      .setTitle('🎧 Now Playing')
      .setDescription(`**${state.current.title}**\n${state.current.artist}`)
      .setThumbnail(state.current.thumbnailUrl || null)
      .setFooter({ text: 'Xosonic HyperX' });

    await interaction.reply({ embeds: [embed] });
  } else if (commandName === 'sync') {
    const roomCode = interaction.options.getString('room_code', true);
    voiceManager.setSyncedRoom(guildId, roomCode);
    await interaction.reply(`🔄 Voice channel is now synchronized with Xosonic Room: **${roomCode}**`);
  }
});

if (token) {
  client.login(token).catch((err) => {
    console.error('[XosonicBot] Failed to login to Discord:', err);
  });
}

export { client };
