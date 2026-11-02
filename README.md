# ⚡ Xosonic HyperX Engine

> High-performance TypeScript backend engine & Discord Voice Bot for the **Xosonic** ecosystem.  
> Architected by **XrLabs** • Lead Creator: **beatrix.sql**

---

## 🌟 Overview

The **Xosonic HyperX Engine** is the real-time audio backbone powering synchronized music experiences across Android, iOS Lite, Desktop, Web, and Discord.

### Key Capabilities
- 🚀 **High-Speed Audio Proxy**: Resolves streams with HTTP 206 Partial Content support for zero-lag instant scrubbing.
- 📡 **Privacy-Preserving Active Listener Radar**: Real-time anonymous telemetry that tracks global active listener pulses without storing IP addresses or identifying information.
- 🔄 **Listen Together Real-Time Sync**: Sub-50ms synchronized playback using WebSocket rooms with host-driven master timeline synchronization.
- 🎙️ **Discord Voice Bot**: Direct Opus streaming into Discord voice channels with seamless queue management and room cross-sync (`/sync`).
- 📜 **Synchronized Lyrics**: Timed LRC parsing and romanized text delivery.

---

## 🛠️ Architecture

```
Xosonic Clients (Android / iOS / Web / Discord)
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
    HTTP API (/api/*)       WebSocket (/ws)
         │                       │
 ┌───────┼───────────────────────┼───────┐
 │       ▼                       ▼       │
 │  Stream Resolver         Sync Engine  │
 │  (Piped / Innertube)     (NTP Sync)   │
 │       │                       │       │
 │       ▼                       ▼       │
 │  Audio Proxy            Privacy Radar │
 └───────────────────────────────────────┘
```

---

## 🔌 API Reference

### REST Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | System health, memory, and uptime metrics |
| `GET` | `/api/search?q={query}` | Search tracks and artists |
| `GET` | `/api/stream/{trackId}` | High-speed audio proxy with byte-range seek support |
| `GET` | `/api/lyrics?title={title}&artist={artist}` | Synchronized timed LRC lyrics |
| `GET` | `/api/radar` | Real-time privacy-preserving active listener stats |

### WebSocket Endpoint (`/ws`)
Supports bidirectional JSON messaging for Listen Together rooms and live radar telemetry:
- `join_room`, `leave_room`, `play_track`, `pause`, `resume`, `seek`, `radar_subscribe`.

---

## 🤖 Discord Slash Commands

| Command | Description |
|---|---|
| `/play <query>` | Play a song or search query in your current voice channel |
| `/pause` | Pause voice playback |
| `/resume` | Resume playback |
| `/skip` | Skip the current track |
| `/stop` | Clear queue and leave voice channel |
| `/queue` | Display current voice queue |
| `/nowplaying` | Show details of currently playing track |
| `/sync <room_code>` | Synchronize Discord voice playback with an active Xosonic room |

---

## 🚀 Quickstart

### Prerequisites
- Node.js 22+
- `pnpm` (default package manager)

```bash
# Clone
git clone https://github.com/XezaYT/Xosonic-HyperX.git
cd Xosonic-HyperX

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env

# Run development server
pnpm run dev

# Run Discord Voice Bot
pnpm run dev:bot
```

### Docker Deployment
```bash
docker compose up -d --build
```

---

## 🛡️ License

MIT License • Maintained by **XrLabs** (`beatrix.sql`).
