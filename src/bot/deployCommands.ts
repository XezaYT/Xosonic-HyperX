import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error('[XosonicBot] Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID in environment.');
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or search query in your voice channel')
    .addStringOption((option) =>
      option.setName('query').setDescription('The song title, URL, or search term').setRequired(true)
    ),

  new SlashCommandBuilder().setName('pause').setDescription('Pause the current song'),

  new SlashCommandBuilder().setName('resume').setDescription('Resume playing the paused song'),

  new SlashCommandBuilder().setName('skip').setDescription('Skip to the next song in the queue'),

  new SlashCommandBuilder().setName('stop').setDescription('Stop playback, clear queue, and leave the voice channel'),

  new SlashCommandBuilder().setName('nowplaying').setDescription('Show information about the currently playing song'),

  new SlashCommandBuilder().setName('queue').setDescription('Show the current music queue'),

  new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Synchronize voice playback with an active Xosonic mobile or web Listen Together room')
    .addStringOption((option) =>
      option.setName('room_code').setDescription('The 6-character room code (e.g. XOS-123)').setRequired(true)
    ),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

async function deploy() {
  try {
    console.log(`[XosonicBot] Registering ${commands.length} slash commands...`);

    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId!, guildId), { body: commands });
      console.log(`[XosonicBot] Successfully registered slash commands for guild ${guildId}`);
    } else {
      await rest.put(Routes.applicationCommands(clientId!), { body: commands });
      console.log('[XosonicBot] Successfully registered global slash commands.');
    }
  } catch (err) {
    console.error('[XosonicBot] Error deploying slash commands:', err);
    process.exit(1);
  }
}

deploy();
