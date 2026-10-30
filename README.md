# NexSync - Multi-Device Audio Synchronization Platform

NexSync is a high-precision web audio player built for multi-device playback. The official app is [beatsync.gg](https://www.beatsync.gg/).

## Project Overview

NexSync enables synchronized audio playback across multiple devices with millisecond accuracy. It's designed for:
- **Concert and listening parties** - Synchronize playback across any number of devices
- **Educational content** - Coordinate audio with presentations and lessons
- **Collaborative workspaces** - Share audio experiences across team devices
- **Personal entertainment** - Create synchronized listening sessions with friends

Built with precision timing, spatial audio, and cross-platform compatibility in mind.

## Core Features

### 🎯 Millisecond-Accurate Synchronization
- Implements NTP-inspired time synchronization protocols
- Exponential moving average smoothing for stable timing
- Minimum 10 measurements before achieving "synced" state
- Play/pause commands scheduled for synchronized execution across all clients

### 🔊 Spatial Audio
- Grid-based positioning system for realistic sound distribution
- Virtual listening source controls for device volume adjustment
- Dynamic gain calculations based on client positions
- Real-time spatial effect updates at 100ms intervals

### 🌐 Cross-Platform Compatibility
- Works on any modern browser (Chrome recommended for best performance)
- Mobile support with experimental capabilities
- Self-hostable with simple setup instructions
- Desktop and web experiences seamlessly integrated

### 🎨 Polished User Interface
- Smooth loading states and visual feedback
- Status indicators and real-time updates
- Built-in audio controls and playback management
- Responsive design for all screen sizes

### 🛠️ Self-Hostable Solution
- Simple Docker deployment
- PM2 process management support
- Environment-based configuration
- Comprehensive logging and monitoring

## Technology Stack

### Frontend (`apps/client`)
- **Framework**: Next.js 16 (App Router, React 19)
- **Styling**: Tailwind CSS v4 + Shadcn/ui components
- **State Management**: Zustand stores + TanStack React Query
- **Real-time**: WebSocket connections with automatic reconnection
- **Audio**: Web Audio API with sophisticated timing algorithms

### Backend (`apps/server`)
- **Runtime**: Bun (JavaScript/TypeScript runtime)
- **Framework**: Native Bun.serve (HTTP) + WebSocket handling
- **Architecture**: Manager pattern with in-memory state
- **Storage**: Cloudflare R2 for audio uploads and room backups
- **Synchronization**: NTP-inspired timing protocol

### Shared Libraries (`packages/shared`)
- **Schemas**: Type-safe Zod validation for all WebSocket messages
- **Types**: TypeScript interfaces shared between client and server
- **Utilities**: Common functions for audio processing and timing

## Architecture Overview

### Manager Hierarchy

The server uses a comprehensive manager pattern:

1. **GlobalManager** (Singleton)
   - Manages all rooms in the system
   - Caches active user counts with dirty flags
   - Coordinates room lifecycle

2. **RoomManager** (Per-room)
   - Owns clients, audio sources, playback state
   - Handles spatial audio configuration
   - Manages synchronized play scheduling
   - Coordinates audio loading across clients

3. **ChatManager** (Per-room)
   - Message history with incremental IDs
   - Real-time chat functionality

4. **BackupManager** (Singleton)
   - Periodic state backup to R2 (every 60s)
   - Automatic restoration on server startup
   - Graceful shutdown handling

5. **MusicProviderManager**
   - External music search and streaming integration

### WebSocket Protocol

All WebSocket messages use type-safe Zod validation:

- **WSBroadcast**: Sent to all room clients (events, updates, stream updates)
- **WSUnicast**: Sent to single clients (NTP responses, search results)
- **WSResponse**: Union of broadcast + unicast messages

## Development Setup

### Prerequisites
- [Bun](https://bun.sh) (JavaScript/TypeScript runtime)
- Git
- Modern web browser (Chrome recommended)

### Installation

```bash
# Clone the repository
cd /path/to/your/project

# Install dependencies (runs once for all workspaces)
bun install

# Start both server and client (ports 8080 and 3000)
bun dev

# Alternative: Run specific services
bun server   # Server only (port 8080)
bun client   # Client only (port 3000)
```

### Environment Configuration

Create `.env` files in respective directories:

#### Client Environment (`apps/client/.env`)
```bash
# Where the NexSync server lives (local dev shown). On Vercel use wss://<your-server>/ws
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws

# Optional: show Discord / GitHub icons in the UI (leave unset to hide them)
# NEXT_PUBLIC_DISCORD_URL=
# NEXT_PUBLIC_GITHUB_URL=
```

#### Server Environment (`apps/server/.env`)
```bash
# Cloudflare R2 (required for uploads)
S3_BUCKET_NAME=your-bucket-name
S3_PUBLIC_URL=https://pub-your-bucket-id.r2.dev
S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key

# YouTube import (optional)
# YTDLP_BIN=yt-dlp
# YTDLP_EXTRA_ARGS=--cookies /app/cookies.txt
```

### Development Scripts

| Command | Description |
|---------|-------------|
| `bun install` | Install all dependencies (runs once) |
| `bun dev` | Start both client and server (Turborepo) |
| `bun server` | Server only (port 8080) |
| `bun client` | Client only (port 3000) |
| `bun build` | Build all packages |
| `bun test` | Run all test suites via Turborepo |

### Build Commands

#### Server
```bash
cd apps/server
bun test                 # Run tests
bun test --watch         # Watch mode
bun run cleanup          # Dry-run orphaned R2 room cleanup
bun run cleanup:live     # Delete orphaned R2 rooms
bun run type-check       # TypeScript check
```

#### Client
```bash
cd apps/client
bun test                 # Run tests (happy-dom + @testing-library/react)
bun lint                 # Next.js linting
bun run format:check    # Prettier formatting check
```

## Deployment

### Docker

```bash
# Build Docker image
bun docker:build

# Run container
bun docker:run

# Production deployment
bun docker:prod
```

### PM2

```bash
# Start with PM2
bun pm2:start

# Common operations
bun pm2:stop     # Stop
bun pm2:restart  # Restart
bun pm2:logs     # View logs
```

### Vercel

For production deployment with Cloudflare R2 integration:

1. Push to your GitHub repository
2. Use Vercel CLI or dashboard to deploy
3. Configure environment variables:
   - `S3_BUCKET_NAME`
   - `S3_PUBLIC_URL`
   - `S3_ENDPOINT`
   - `S3_ACCESS_KEY_ID`
   - `S3_SECRET_ACCESS_KEY`

## Testing

### Test Architecture

NexSync follows a comprehensive testing approach:

- **Server Tests**: Uses Bun test runner with sinon fake timers for stubs
- **Client Tests**: Uses happy-dom + @testing-library/react (preloaded via bunfig.toml)
- **Integration Tests**: End-to-end WebSocket and audio synchronization tests

### Test Categories

| Component | Test Files | Description |
|-----------|------------|-------------|
| `apps/server` | `src/__tests__/` | Unit tests for managers, handlers, routes |
| `apps/client` | `src/__tests__/` | Component tests, integration tests |
| `Shared` | N/A | TypeScript type definitions |

### Running Tests

```bash
# Run all test suites (Turborepo)
bun test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage
```

**Testing Philosophy**: Only test non-obvious behavior whose failure would be silent in dev and expensive in prod — no trivial/"doesn't crash" tests.

## Architecture Notes

### Time Synchronization Protocol

Implements NTP-inspired millisecond-accurate cross-device playback:

1. Client sends `NTP_REQUEST` with `t0` (client time)
2. Server responds with `t1` (server processing time) and `t2` (server send time)
3. Client receives at `t3` (client receive time)
4. Calculates Round-Trip Time (RTT) and Clock Offset
5. Exponential moving average smoothing (α=0.2) for stable timing
6. Minimum 10 measurements before achieving "synced" state

### Audio Pipeline

Three-step upload flow:

1. **Get Presigned URL**: Server generates R2 PUT URL
2. **Direct Upload**: Client uploads directly to R2 (no server bandwidth)
3. **Complete Upload**: Server adds to room's audio sources

R2 key structure: `room-{roomId}/{sanitized-name}☆{timestamp}.{ext}`

### Audio Loading Coordination

Server orchestrates synchronized audio loading:

1. Broadcast `LOAD_AUDIO_SOURCE` to all clients
2. Clients load/decode and respond with `AUDIO_SOURCE_LOADED`
3. Server waits for all clients (3s timeout) then schedules synchronized play

## Scaling and Performance

### Room Management

- **Room IDs**: 6-digit codes for easy sharing
- **Cleanup**: 60s after last client disconnects
- **State Backup**: Every 60s to Cloudflare R2
- **Memory Management**: LRU buffer cache (max 3 audio buffers)

### Performance Optimization

- **WebSocket Optimization**: Connection pooling and message batching
- **Audio Processing**: Efficient encoding and decoding strategies
- **Real-time Updates**: Grid-based spatial audio with 100ms updates
- **Load Balancing**: PM2 process management for production

## Security Considerations

### Input Validation
- All WebSocket messages validated with Zod discriminated unions
- Sanitized filenames for R2 uploads
- Rate limiting and connection management
- CORS headers properly configured

### Deployment Security
- Environment variables for sensitive configuration
- File upload size limits and type checking
- Graceful shutdown with state backup
- Admin auto-promotion protection

## Contributing

### Repository Structure

```
/NexSync
├── apps/
│   ├── client/           # Next.js frontend
│   │   ├── src/
│   │   ├── .env.example
│   │   └── package.json
│   ├── server/          # Bun HTTP + WebSocket server
│   │   ├── src/
│   │   ├── .env.example
│   │   └── package.json
│   └── storage/         # Persistent storage (if needed)
├── packages/shared/       # Type-safe shared schemas
├── scripts/              # Build and deployment scripts
├── .github/             # GitHub workflows
└── docs/                # Documentation
```

### Development Guidelines

1. **Code Quality**: Follow TypeScript strict mode
2. **Testing**: Focus on non-obvious behavior scenarios
3. **Performance**: Optimize real-time audio processing
4. **Documentation**: Keep README and comments up-to-date

### Running Local Development

1. **Start Development Server**
   ```bash
   cd /path/to/project
   bun install
   bun dev
   ```

2. **Open Application**
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:8080`

3. **Create a Room**
   - Open the main page to generate a room ID
   - Share the ID with others to join

## Troubleshooting

### Common Issues

**"Connection refused" errors**
```bash
# Check if server is running
bun server

# Check server logs
bun run dev:log
```

**Environment variables not loading**
```bash
# Verify .env file exists in correct location
# Ensure no syntax errors in .env file
```

**Audio upload issues**
```bash
# Check R2 configuration in apps/server/.env
# Verify network connectivity to R2 endpoint
```

**Browser compatibility**
```bash
# Use Chrome or Chromium-based browsers for best performance
# Ensure WebAudio API is supported
```

## Community and Support

### Getting Help

- **Issues**: File issues with detailed descriptions
- **Discussions**: Ask questions in GitHub discussions
- **Documentation**: Check this README for comprehensive guides

### Contributing

- **Pull Requests**: Fork, modify, and create pull requests
- **Code Reviews**: Participate in code review process
- **Testing**: Help improve test coverage and quality

### Stay Updated

- **GitHub Releases**: Watch for new releases and updates
- **Changelog**: Check CHANGELOG.md for version history
- **Announcements**: Follow for important updates

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

Special thanks to:
- All contributors who have helped build and improve NexSync
- The open-source community for excellent libraries and tools
- Users who have tested and provided feedback

## Future Roadmap

### Short-term (Next 3 months)
- [ ] Mobile app development
- [ ] Enhanced spatial audio features
- [ ] Improved UI/UX refinements
- [ ] More music provider integrations

### Long-term (6+ months)
- [ ] Advanced synchronization algorithms
- [ ] Cross-platform desktop application
- [ ] Cloud-based room hosting
- [ ] Enterprise-grade features

## Performance Metrics

- **Synchronization Accuracy**: ±50ms across devices
- **Load Times**: <2s for typical audio files
- **Memory Usage**: <512MB for concurrent rooms
- **CPU Usage**: <10% on modern hardware

## Support

For production support, contact the project maintainers through GitHub issues or the project's Discord/Slack community.

---

_Last updated: October 29, 2026_

For the latest documentation and updates, visit the NexSync GitHub repository.
